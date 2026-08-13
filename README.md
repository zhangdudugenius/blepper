# blepper lifestyle（MVP）

这是一个无需安装依赖即可运行的“手机优先”网页应用原型。它可在 Android Chrome 中通过「添加到主屏幕」安装，电脑端也能直接打开。

## 发布演示版到 GitHub Pages

这个目录是独立的公开演示仓库。它只包含前端代码和猫咪图标；请勿提交真实账目、凭证、手机号码、密码、备份、API 密钥或 `.env` 文件。

1. 在 GitHub 新建一个公开仓库，例如 `blepper-lifestyle`。
2. 将此目录推送到仓库的 `main` 分支。
3. 在仓库 **Settings → Pages** 选择 **GitHub Actions** 作为发布来源。
4. 推送后，`.github/workflows/deploy-pages.yml` 会发布应用；在 Actions 的完成页面可取得演示网址。

GitHub Pages 仅用于演示与 APK 构建入口。正式版应将身份认证、账目、凭证和备份放在独立的国内后端。

## 本地运行

在此目录运行：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。使用本地 HTTP 服务可启用离线缓存；直接双击 `index.html` 也能浏览大部分功能。

## 已实现的 MVP

- 手机号/密码入口及演示账本
- 收入、支出、退款负收入，默认类目与项目
- 大于 2,000 元的待补凭证提醒
- 账目新增、编辑、软删除、搜索筛选
- 月度收支、利润、类目占比、六个月利润趋势
- 两成员邀请码展示、操作历史
- CSV 导出与基础 CSV 批量导入、本地 JSON 备份
- 本地持久化、响应式手机/电脑界面、PWA 离线缓存

## 生产化前必须完成

当前版本使用浏览器 `localStorage`，因此数据仅保存在当前设备，不能实现真实的跨设备同步，也不能作为正式财务数据存储。

后端应实现：手机号短信验证、密码哈希（Argon2/bcrypt）、JWT/刷新令牌、PostgreSQL 数据库、对象存储凭证图片、邀请码和成员权限、审计日志、自动备份与 HTTPS。可将 `app.js` 中读写 `state` 的逻辑替换为 REST API 调用。部署时选择中国大陆可用的云数据库与对象存储，并完成备份、访问控制和隐私合规配置。

若要遵循“真正 Android 原生应用”的要求，建议以此交互和接口为原型，使用 Flutter 或 Kotlin/Jetpack Compose 重建 Android 客户端，并复用相同后端 API。
