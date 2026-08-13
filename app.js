/* Blepper Ledger MVP — local-first prototype. Replace storageAdapter with API calls for production sync. */
const STORAGE_KEY = 'blepper-ledger-mvp-v1';
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = date => date.slice(0, 7);
const money = value => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 }).format(value || 0);
const shortDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
const uid = prefix => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const makeSeed = () => {
  const now = new Date();
  const d = offset => { const copy = new Date(now); copy.setDate(copy.getDate() + offset); return copy.toISOString().slice(0, 10); };
  return {
    ledger: { id: 'ledger_blepper', name: 'blepper lifestyle', inviteCode: 'BL-8K2M', lastBackup: new Date().toISOString() },
    user: { id: 'user_demo', name: '我', phone: '未设置' },
    members: [{ id: 'user_demo', name: '我', phone: '未设置', joinedAt: today() }],
    projects: [{ id: 'project_blepper', name: 'Blepper 手机壳项目', active: true }],
    categories: [
      { id: 'income_sales', name: '产品销售', type: 'income', active: true }, { id: 'income_refund', name: '退款', type: 'income', active: true },
      ...['公司运营', '商品采购', '包装', '运费', '差旅', '广告投放', '税费'].map((name, index) => ({ id: `expense_${index}`, name, type: 'expense', active: true }))
    ],
    records: [],
    audit: [{ id: 'a1', action: '创建账本', target: 'blepper lifestyle', user: '我', at: today() }]
  };
};

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || makeSeed();
// Keep early local prototypes aligned with the current product name.
state.ledger.name = 'blepper lifestyle';
let page = 'home';
let authMode = 'login';
let session = localStorage.getItem(`${STORAGE_KEY}:session`) === 'yes';
const $ = selector => document.querySelector(selector);

function save(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $('#syncState').textContent = '已保存';
  if (message) toast(message);
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.remove('hidden');
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}
function category(id) { return state.categories.find(item => item.id === id) || { name: '未分类' }; }
function project(id) { return state.projects.find(item => item.id === id) || { name: '未分项目' }; }
function activeRecords() { return state.records.filter(item => !item.deletedAt); }
function currentMonth() { return today().slice(0, 7); }
function recordsForMonth(month = currentMonth()) { return activeRecords().filter(item => monthKey(item.date) === month); }
function totals(records) {
  const income = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const expense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
  return { income, expense, profit: income - expense };
}
function audit(action, target) { state.audit.unshift({ id: uid('audit'), action, target, user: state.user.name, at: new Date().toISOString() }); }
function updateUserAvatar() { const avatar = $('#userAvatar'); if (avatar) avatar.textContent = state.user.name?.trim()?.[0] || '我'; }
function openApp() { $('#authView').classList.add('hidden'); $('#app').classList.remove('hidden'); updateUserAvatar(); render(); }

function shell(title, subtitle, action = '') { return `<div class="page-head"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${action}</div>`; }
function summaryCard(label, value, cls, note = '') { return `<article class="summary-card card ${cls}"><p>${label}</p><strong>${money(value)}</strong>${note ? `<div class="profit-note">${note}</div>` : ''}</article>`; }
function recordRow(record, detailed = false) {
  const cat = category(record.categoryId); const icon = record.type === 'income' ? '↓' : '↑'; const amount = record.type === 'income' ? record.amount : record.amount;
  const sign = record.type === 'expense' || amount < 0 ? '-' : '+';
  if (detailed) return `<div class="ledger-row"><span class="ledger-date">${record.date}</span><div class="record-main"><b>${cat.name}${record.receiptStatus === 'pending' ? '<span class="status">待补凭证</span>' : ''}</b><span>${record.note || '无备注'} · ${record.updatedBy}</span></div><span class="ledger-project">${project(record.projectId).name}</span><span class="record-money ${record.type}">${sign}${money(Math.abs(amount))}</span><button class="row-action" data-action="edit-record" data-id="${record.id}" aria-label="编辑">•••</button></div>`;
  return `<div class="record-row"><div class="record-icon ${record.type}">${icon}</div><div class="record-main"><b>${cat.name}${record.receiptStatus === 'pending' ? '<span class="status">待凭证</span>' : ''}</b><span>${shortDate(record.date)} · ${record.note || project(record.projectId).name}</span></div><div class="record-money ${record.type}">${sign}${money(Math.abs(amount))}</div></div>`;
}

function renderHome() {
  const monthly = recordsForMonth(); const total = totals(monthly); const recent = [...activeRecords()].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5); const pending = activeRecords().filter(r => r.receiptStatus === 'pending');
  return `${shell(`下午好，${state.user.name}`, 'Blepper 手机壳项目 · 本月经营概览', '<button class="primary" data-action="new-record">＋ 记一笔</button>')}
    <section class="summary-grid">${summaryCard('本月收入', total.income, 'income')}${summaryCard('本月支出', total.expense, 'expense')}${summaryCard('本月利润', total.profit, total.profit >= 0 ? 'income' : 'expense', '收入 − 支出')}</section>
    <section class="grid-2"><div class="card section-card"><div class="section-title"><h2>最近账目</h2><button class="text-button" data-nav="ledger">查看全部</button></div>${recent.map(r => recordRow(r)).join('')}</div>
    <aside class="card section-card"><div class="section-title"><h2>快速记账</h2></div><div class="quick-actions"><button class="quick-action" data-action="quick-record" data-type="income"><span>↓</span>记录收入</button><button class="quick-action" data-action="quick-record" data-type="expense"><span>↑</span>记录支出</button></div>${pending.length ? `<div class="pending-box" style="margin-top:16px"><h3>有 ${pending.length} 笔待补凭证</h3><p>合计 ${money(pending.reduce((s,r)=>s+r.amount,0))}，有空时补上传票据吧。</p><button class="text-button" data-nav="ledger">去处理</button></div>` : '<div class="pending-box" style="margin-top:16px"><h3>凭证很完整</h3><p>目前没有需要补充的票据。</p></div>'}</aside></section>`;
}

function renderLedger() {
  const cats = state.categories.filter(c => c.active).map(c => `<option value="${c.id}">${c.name}</option>`).join(''); const projects = state.projects.filter(p=>p.active).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  return `${shell('公司账本', '每一笔钱都有来处，也都有去处', '<button class="primary" data-action="new-record">＋ 记一笔</button>')}
    <section class="filters"><input id="filterSearch" type="search" placeholder="搜索备注" /><select id="filterType"><option value="">全部收支</option><option value="income">收入</option><option value="expense">支出</option></select><select id="filterCategory"><option value="">全部类目</option>${cats}</select><select id="filterProject"><option value="">全部项目</option>${projects}</select><select id="filterReceipt"><option value="">全部凭证</option><option value="pending">待补凭证</option></select></section>
    <section class="card ledger-table"><div id="ledgerRows"></div></section>`;
}
function updateLedgerRows() {
  const search = ($('#filterSearch')?.value || '').trim().toLowerCase(); const type = $('#filterType')?.value; const cat = $('#filterCategory')?.value; const pro = $('#filterProject')?.value; const receipt = $('#filterReceipt')?.value;
  const rows = activeRecords().filter(r => (!search || r.note.toLowerCase().includes(search)) && (!type || r.type === type) && (!cat || r.categoryId === cat) && (!pro || r.projectId === pro) && (!receipt || r.receiptStatus === receipt)).sort((a,b)=>b.date.localeCompare(a.date));
  $('#ledgerRows').innerHTML = rows.length ? rows.map(r=>recordRow(r,true)).join('') : '<div class="empty">没有符合条件的账目</div>';
}

function renderAnalysis() {
  const month = recordsForMonth(); const total = totals(month); const spend = month.filter(r=>r.type==='expense');
  const byCategory = Object.entries(spend.reduce((acc,r)=>{const name=category(r.categoryId).name; acc[name]=(acc[name]||0)+r.amount; return acc;},{})).sort((a,b)=>b[1]-a[1]); const max = byCategory[0]?.[1] || 1;
  const months = Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));return d.toISOString().slice(0,7)}); const trend = months.map(m=>({...totals(recordsForMonth(m)),m})); const trendMax=Math.max(...trend.map(t=>Math.abs(t.profit)),1);
  const projectTotal = state.projects.map(p=>({name:p.name,...totals(activeRecords().filter(r=>r.projectId===p.id))})); const pending = activeRecords().filter(r=>r.receiptStatus==='pending');
  return `${shell('经营分析', '从数字里看清 Blepper 的经营情况')}
    <section class="metric-row">${summaryCard('本月收入',total.income,'income')}${summaryCard('本月支出',total.expense,'expense')}${summaryCard('本月利润',total.profit,total.profit>=0?'income':'expense')}</section>
    <section class="analysis-grid"><article class="card section-card"><div class="section-title"><h2>支出去哪了</h2><span class="chip">本月</span></div>${byCategory.length?byCategory.map(([name,value])=>`<div class="bar-row"><span>${name}</span><div class="bar"><i style="width:${Math.max(5,value/max*100)}%"></i></div><b>${money(value)}</b></div>`).join(''):'<div class="empty">本月还没有支出记录</div>'}</article>
    <article class="card section-card"><div class="section-title"><h2>月度利润趋势</h2><span class="chip">近 6 月</span></div><div class="chart">${trend.map(t=>`<div class="chart-bar ${t.profit<0?'loss':''}" style="height:${Math.max(3,Math.abs(t.profit)/trendMax*100)}%" title="${t.m}: ${money(t.profit)}"><label>${t.m.slice(5)}月</label></div>`).join('')}</div></article>
    <article class="card section-card"><div class="section-title"><h2>项目盈利</h2><button class="text-button" data-action="add-project">添加项目</button></div>${projectTotal.map(p=>`<div class="project-line"><div><b>${p.name}</b><span>收入 ${money(p.income)} · 支出 ${money(p.expense)}</span></div><strong class="${p.profit>=0?'income':'expense'}">${money(p.profit)}</strong></div>`).join('')}</article>
    <article class="pending-box"><h3>待补凭证 ${pending.length} 笔</h3><p>涉及金额 ${money(pending.reduce((s,r)=>s+r.amount,0))}。超过 ¥2,000 的支出可以稍后补上传票据。</p><button class="text-button" data-nav="ledger">查看待补记录</button></article></section>`;
}

function renderProfile() {
  const cats = state.categories.filter(c=>c.active);
  return `${shell('我的与设置', '管理成员、数据与账本规则')}
  <section class="grid-2"><div><article class="card section-card"><div class="section-title"><h2>共同成员</h2><button class="text-button" data-action="copy-invite">邀请成员</button></div>${state.members.map(m=>`<div class="member"><span class="avatar">${m.name[0]}</span><div class="record-main"><b>${m.name}${m.id===state.user.id?'（我）':''}</b><span>${m.phone} · 可录入、修改与分析</span></div></div>`).join('')}<div class="pending-box" style="margin-top:12px"><h3>邀请码：${state.ledger.inviteCode}</h3><p>第二位成员注册时填写邀请码，即可加入同一本账。</p></div></article>
  <article class="card settings-list" style="margin-top:18px"><div class="setting"><div><h3>我的名字</h3><p>当前显示为：${state.user.name}</p></div><button data-action="edit-name">修改</button></div>
  <article class="card settings-list" style="margin-top:18px"><div class="setting"><div><h3>类目管理</h3><p>${cats.length} 个启用类目，可随时新增或停用</p></div><button data-action="add-category">管理</button></div><div class="setting"><div><h3>项目管理</h3><p>当前 ${state.projects.filter(p=>p.active).length} 个项目</p></div><button data-action="add-project">管理</button></div><div class="setting"><div><h3>操作记录</h3><p>查看账本的最近修改</p></div><button data-action="show-audit">查看</button></div></article></div>
  <div><article class="card settings-list"><div class="setting"><div><h3>导出账目</h3><p>下载 CSV，用 Excel 直接打开</p></div><button data-action="export-csv">导出</button></div><div class="setting"><div><h3>导入历史账目</h3><p>支持 CSV：日期、类型、金额、类目、项目、备注</p></div><button data-action="import-csv">导入</button></div><div class="setting"><div><h3>本地备份</h3><p>最近备份：${new Date(state.ledger.lastBackup).toLocaleString('zh-CN')}</p></div><button data-action="backup">备份</button></div><div class="setting"><div><h3>账户安全</h3><p>手机号密码登录；生产版可接入短信找回</p></div><button data-action="logout">退出</button></div></article></div></section>`;
}

function render() {
  if (!session) return;
  updateUserAvatar();
  $('#mainContent').innerHTML = page === 'home' ? renderHome() : page === 'ledger' ? renderLedger() : page === 'analysis' ? renderAnalysis() : renderProfile();
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.nav===page));
  if (page === 'ledger') updateLedgerRows();
}
function openRecord(type='income', record=null) {
  $('#recordForm').reset(); $('#recordModal').classList.remove('hidden'); $('#recordModalTitle').textContent = record ? '编辑账目' : '记一笔'; $('#recordId').value = record?.id || ''; $('#recordDate').value = record?.date || today();
  setRecordType(record?.type || type); $('#recordAmount').value = record ? Math.abs(record.amount) : ''; $('#recordNote').value = record?.note || ''; populateProjects(record?.projectId); populateCategories(record?.type || type, record?.categoryId); $('#receiptHint').textContent = record?.receiptName ? `已附凭证：${record.receiptName}` : '金额超过 ¥2,000 时，系统会提醒你后补凭证。';
}
function setRecordType(type) { $('#recordType').value=type; document.querySelectorAll('[data-type]').forEach(btn=>btn.classList.toggle('active',btn.dataset.type===type)); populateCategories(type); }
function populateCategories(type, selected) { const select=$('#recordCategory'); if(!select)return; select.innerHTML=state.categories.filter(c=>c.type===type&&c.active).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); if(selected)select.value=selected; }
function populateProjects(selected) { const select=$('#recordProject'); select.innerHTML=state.projects.filter(p=>p.active).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); if(selected)select.value=selected; }
function closeRecord(){ $('#recordModal').classList.add('hidden'); }
function saveRecord(event) {
  event.preventDefault(); const id=$('#recordId').value; const type=$('#recordType').value; const cat=category($('#recordCategory').value); let amount=Number($('#recordAmount').value);
  if (!amount || amount <= 0) return toast('请输入大于 0 的金额'); if (type==='income' && cat.id==='income_refund') amount=-amount;
  const file=$('#recordReceipt').files[0]; const existing=id?state.records.find(r=>r.id===id):null; const receiptName=file?.name||existing?.receiptName||''; const receiptStatus=receiptName?'attached':(type==='expense'&&amount>2000?'pending':'not_required');
  const value={ id:id||uid('txn'), type, amount, date:$('#recordDate').value, categoryId:cat.id, projectId:$('#recordProject').value, note:$('#recordNote').value.trim(), receiptName, receiptStatus, createdBy:existing?.createdBy||state.user.name, updatedBy:state.user.name, createdAt:existing?.createdAt||new Date().toISOString(), updatedAt:new Date().toISOString() };
  if(existing){Object.assign(existing,value);audit('修改账目',`${cat.name} ${money(Math.abs(amount))}`)}else{state.records.push(value);audit('新增账目',`${cat.name} ${money(Math.abs(amount))}`)} save(id?'账目已更新':'账目已保存'); closeRecord(); render();
}
function deleteRecord(id){const r=state.records.find(x=>x.id===id);if(!r)return;if(!confirm(`确定删除「${category(r.categoryId).name} ${money(Math.abs(r.amount))}」吗？删除后可在操作记录中追溯。`))return;r.deletedAt=new Date().toISOString();r.updatedBy=state.user.name;audit('删除账目',`${category(r.categoryId).name} ${money(Math.abs(r.amount))}`);save('账目已删除');render();}
function download(name, content, type='text/csv;charset=utf-8'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
function exportCsv(){const header='日期,类型,金额,类目,项目,备注,凭证状态\n';const body=activeRecords().map(r=>[r.date,r.type,r.amount,category(r.categoryId).name,project(r.projectId).name,`"${r.note.replaceAll('"','""')}"`,r.receiptStatus].join(',')).join('\n');download(`Blepper账本_${today()}.csv`,`\ufeff${header}${body}`);toast('CSV 已导出');}
function importCsv(file){const reader=new FileReader();reader.onload=()=>{const lines=reader.result.split(/\r?\n/).filter(Boolean);if(lines.length<2)return toast('文件中没有可导入的账目');const headers=lines[0].replace(/^\uFEFF/,'').split(',');let count=0;lines.slice(1).forEach(line=>{const cols=line.match(/(?:[^,"]+|"(?:[^"]|"")*")+/g)?.map(x=>x.replace(/^"|"$/g,'').replaceAll('""','"'))||[];const val=Object.fromEntries(headers.map((h,i)=>[h,cols[i]||'']));const type=val['类型']==='支出'||val['类型']==='expense'?'expense':'income';let amount=Number(val['金额']);let cat=state.categories.find(c=>c.name===val['类目']&&c.type===type);if(!cat){cat={id:uid('cat'),name:val['类目']||'其他',type,active:true};state.categories.push(cat)}let pro=state.projects.find(p=>p.name===val['项目']);if(!pro){pro={id:uid('project'),name:val['项目']||'未分项目',active:true};state.projects.push(pro)}if(!val['日期']||!Number.isFinite(amount))return;state.records.push({id:uid('txn'),type,amount,date:val['日期'],categoryId:cat.id,projectId:pro.id,note:val['备注']||'',receiptStatus:val['凭证状态']||'not_required',receiptName:'',createdBy:state.user.name,updatedBy:state.user.name,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});count++});audit('批量导入账目',`${count} 条`);save(`已导入 ${count} 条账目`);render()};reader.readAsText(file,'utf-8')}

document.addEventListener('click', event => {
  const nav=event.target.closest('[data-nav]'); if(nav){page=nav.dataset.nav;render();return}
  const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='new-record')openRecord(); if(action==='quick-record')openRecord(event.target.closest('[data-type]')?.dataset.type||'income'); if(action==='close-record')closeRecord(); if(action==='edit-record'){const r=state.records.find(x=>x.id===event.target.closest('[data-id]').dataset.id);openRecord(r.type,r)} if(action==='demo-login'){session=true;localStorage.setItem(`${STORAGE_KEY}:session`,'yes');openApp()} if(action==='show-profile'){page='profile';render()} if(action==='edit-name'){const name=prompt('请输入你的名字：',state.user.name);if(name&&name.trim()){const before=state.user.name;state.user.name=name.trim().slice(0,20);const member=state.members.find(m=>m.id===state.user.id);if(member)member.name=state.user.name;audit('修改用户名',`${before} → ${state.user.name}`);save('名字已更新');render()}} if(action==='copy-invite'){navigator.clipboard?.writeText(state.ledger.inviteCode);toast(`邀请码 ${state.ledger.inviteCode} 已复制`)} if(action==='export-csv')exportCsv();if(action==='import-csv')$('#importFile').click();if(action==='backup'){state.ledger.lastBackup=new Date().toISOString();download(`Blepper备份_${today()}.json`,JSON.stringify(state,null,2),'application/json');save('备份文件已下载');render()} if(action==='logout'){session=false;localStorage.removeItem(`${STORAGE_KEY}:session`);$('#app').classList.add('hidden');$('#authView').classList.remove('hidden');toast('已退出登录')} if(action==='add-category'){const name=prompt('输入新类目名称：');if(name){const type=confirm('点击“确定”创建收入类目；“取消”创建支出类目。')?'income':'expense';state.categories.push({id:uid('cat'),name:name.trim(),type,active:true});audit('新增类目',name.trim());save('类目已添加');render()}} if(action==='add-project'){const name=prompt('输入新项目名称：');if(name){state.projects.push({id:uid('project'),name:name.trim(),active:true});audit('新增项目',name.trim());save('项目已添加');render()}} if(action==='show-audit'){alert(state.audit.slice(0,12).map(a=>`${new Date(a.at).toLocaleString('zh-CN')} · ${a.user} · ${a.action}：${a.target}`).join('\n\n')||'暂无操作记录')} });
document.addEventListener('input', event=>{if(event.target.closest('.filters'))updateLedgerRows();if(event.target.id==='recordAmount'){const n=Number(event.target.value);$('#receiptHint').classList.toggle('warn',n>2000);$('#receiptHint').textContent=n>2000?'这笔金额超过 ¥2,000：可先保存，之后请补上传凭证。':'金额超过 ¥2,000 时，系统会提醒你后补凭证。'}});
document.addEventListener('change', event=>{if(event.target.closest('.filters'))updateLedgerRows();if(event.target.id==='importFile'&&event.target.files[0])importCsv(event.target.files[0]);});
document.addEventListener('click', event=>{const type=event.target.closest('[data-type]');if(type&&type.closest('.type-switch'))setRecordType(type.dataset.type);const tab=event.target.closest('[data-auth-tab]');if(tab){authMode=tab.dataset.authTab;document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b===tab));$('#inviteField').classList.toggle('hidden',authMode!=='register');$('#authSubmit').textContent=authMode==='login'?'登录':'注册并创建账本'}});
$('#recordForm').addEventListener('submit',saveRecord); $('#authForm').addEventListener('submit',event=>{event.preventDefault();const phone=$('#authPhone').value.trim();const password=$('#authPassword').value;if(!/^1\d{10}$/.test(phone))return toast('请输入 11 位手机号');if(password.length<6)return toast('密码至少 6 位');if(authMode==='register'){state.user={...state.user,phone:phone.slice(0,3)+'****'+phone.slice(-4)};if($('#authInvite').value.trim())audit('加入账本',state.ledger.name);else audit('创建账本',state.ledger.name);save()}session=true;localStorage.setItem(`${STORAGE_KEY}:session`,'yes');openApp()});
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
if(session)openApp();
