# 项目地图 · kilk 2.0

一句话：**团队内部平台**，线上 `https://kilk.online`。核心业务是酒店运维（多酒店、客房故障登记与跟踪），外围是公告、服务支持下载、开发者名片体系、用户与后台管理。

技术栈：React 19 + Vite 8 + TypeScript 5.9 + Tailwind 4 + shadcn/ui + React Router 7；后端 Node 20+ / Express 4 / PostgreSQL / JWT；部署 Apache 反代 Node 3001。

## 一、运行链路

```
浏览器
  → Apache 443（终止 HTTPS，FallbackResource /index.html）
      ├── /            → /var/www/kilk2/frontend（dist/output）
      ├── /assets/     → dist/output_resource/assets
      ├── /upload/     → Alias 到 /var/www/kilk2/public/upload（Apache 直发，不经 Node）
      └── /api/*       → systemd kilk2 → Node 3001 → PostgreSQL(kilk)
```

- 前端 API 基址：`VITE_API_BASE`，开发回退 `http://localhost:3001/api`。
- 构建由 `vite.config.ts` 的 `miaoda-output` 插件分层到 `dist/output` + `dist/output_resource`，并生成 `routes.json`（妙搭托管协议）。
- Node **不提供** `express.static`，图片完全靠 Apache 的 `/upload/` 映射；本地直接跑 Node 会 404。

## 二、前端结构

```
src/
├── index.tsx        入口（禁改）：StrictMode + BrowserRouter(basename) + ErrorBoundary + AuthProvider
├── app.tsx          路由表（仅改 <Routes> 内）
├── index.css        全局样式：深色科技风、玻璃卡、入场动画、滚动条
├── tailwind-theme.css  :root 设计变量（HSL 空格分隔）
├── typography.css   @tailwindcss/typography 的 prose 变量
├── components/      Layout / SiteHeader / SiteFooter / AuthModal / TechBackground / Reveal ...
│   └── ui/          shadcn 组件（禁改）
├── contexts/        AuthContext（user、isAdmin、isSenior、login/logout）
├── hooks/           useSiteData（首页内容、用户资料、服务文件）
├── lib/             api.ts（fetch 封装 + 401 清 token）、format.ts、utils.ts（cn）
├── pages/           每个页面一个目录，全部 React.lazy
└── types/           User / HomeContent / ServiceFile / LingProfile 等
```

### 路由与权限

| 路由 | 守卫 | 说明 |
|------|------|------|
| `/` | 公开 | 首页；酒店运维入口仅 senior+ 可见 |
| `/hotel` | `SeniorRoute` | 酒店卡片列表 + 统计 |
| `/hotel/:hotelId` | `SeniorRoute` | 功能选择 → 故障登记 / 运维看板 |
| `/service` | 公开 | 服务支持下载（游客可下） |
| `/notice` | 公开 | 公告 |
| `/about` | 公开 | 关于我们（含开发者入口卡片） |
| `/about-ling` | 公开 | 开发者列表（导航默认隐藏） |
| `/developer/me` | 无守卫（接口 401 兜底） | 自己的名片管理 |
| `/developer/:username` | 公开 | 名片详情 |
| `/user/:id` | 无守卫 | 用户资料 |
| `/admin` | `AdminRoute` | 后台，6 个 Tab |
| `*` | — | 404（在 Layout 之外，无导航） |

角色：`user` → `senior` → `admin` → `super`。`isSenior` = senior/admin/super；`isAdmin` = admin/super。注册已关闭。

### 重点页面

- **`HotelDetailPage.tsx`（约 1050 行，最大文件）**：`module` 三段式（select / incident / dashboard）。抽屉式登记、服务端搜索筛选（250ms 防抖）、多图附件、状态流转 `pending→processing→done`（可重开）、编辑复用抽屉、删除仅 admin。楼栋自动识别 `autoBuilding(room, buildings)`：房间号首位数字 → 匹配 `编号=名称` 前缀 → 匹配 `n号楼` → 回退第一栋。
- **`AdminPage.tsx`（约 730 行）**：配置驱动 Tab —— home（首页内容）/ notice / hotel / services / ling（渲染 `DevelopersTab`，仅 super）/ users；含用户角色、重置密码、删除确认。
- **`HotelTab.tsx`**：酒店 CRUD、启停、主题色、楼栋/类别/设备的动态行编辑（`编号=名称` 格式）。
- **`DeveloperCardManagePage.tsx`**：填表式名片编辑（不暴露 JSON），六大区块动态行。
- **`LingPage.tsx`**：名片详情（Hero / 技能条 / 技术支持 / 时间线 / 联系方式），回退读 `/api/ling`。

### 设计语言

深色底 `hsl(228 48% 5%)` + 蓝青紫径向光晕 + 网格 overlay + canvas 粒子；`glass-card`、`text-glow`、`hover-lift`、`stagger-delay-1..10`；字体 Space Grotesk / JetBrains Mono 从 `miaoda.feishu.cn` 外链。**不使用 framer-motion 做页面转场**（内置浏览器下动画不推进会导致白屏/叠影），`Reveal` 也改成了纯 CSS。

## 三、后端结构

```
server/
├── src/          运行时代码（入口、配置、路由、中间件）
├── db/           数据库脚本：kilk_db_dump.sql（含数据，已忽略）、supabase_schema.sql（表结构）
├── deploy/       历史部署脚本 deploy-server*.sh（在服务器上执行）
├── scripts/      一次性迁移/校验脚本 .mjs（非运行时依赖）
├── public/       运行后端的公开目录（upload 落盘处）
├── .env          本机数据库/JWT 配置（不生效，见环境事实）
└── package.json  后端依赖
```

```
server/src/
├── index.js      入口：cors → json → /api/health → 各路由 → 404 → 错误处理 → initDatabase() → listen
├── config.js     环境变量（无 dotenv，本地 .env 不生效）
├── db.js         pg Pool（max 10 / idle 30s / connect 5s / lifetime 1h）+ error 监听
├── init.js       幂等建表：ling_profile、notice、hotel_incident、hotels + 默认红树林酒店
├── middleware/auth.js  authRequired / authOptional / adminRequired / seniorRequired
├── utils/password.js   bcrypt(cost 10) + 兼容 PHP $2y$ 与旧 MD5（登录时自动升级）
└── routes/
    ├── auth.js        登录、/me；注册恒 403
    ├── user.js        公开资料、改签名/头像/密码
    ├── hotel.js       酒店 + 故障 + 附件上传（挂 /api）
    ├── admin.js       用户/服务/开发者/首页/公告/（遗留论坛接口），全局 authRequired+adminRequired
    ├── home.js        首页内容
    ├── notice.js      公告
    ├── service.js     服务文件与下载计数
    ├── developers.js  名片列表/详情/我的
    └── ling.js        兼容旧接口，读 developers 首条
```

### 主要接口

| 方法 | 路径 | 权限 |
|------|------|------|
| POST | `/api/auth/login` | 公开 |
| GET | `/api/auth/me` | 登录 |
| GET | `/api/hotels` | senior |
| GET | `/api/hotels/all` | admin |
| GET/PUT/DELETE | `/api/hotels/:id` | 读 senior，写 admin |
| GET/POST | `/api/hotel/:hotelId/incidents` | senior |
| PUT | `/api/hotel/:hotelId/incidents/:id` | senior |
| DELETE | `/api/hotel/:hotelId/incidents/:id` | admin |
| POST | `/api/hotel/upload` | **无鉴权（待修）** |
| GET/POST/PUT/DELETE | `/api/notice[/:id]` | 读公开，写 admin |
| GET | `/api/service/files[/:id]` | 公开 |
| POST | `/api/service/files/:id/download` | 公开（计数） |
| GET | `/api/developers`、`/api/developers/:username` | 公开 |
| GET/PUT | `/api/developers/me` | 登录 |
| GET/POST/PUT/DELETE | `/api/admin/*` | admin（开发者与 ling-profile 另需 super） |

统一响应：`{ ok, msg, data, stats }`；401 由前端清 token 并抛错。

### 数据表

| 表 | 来源 | 用途 |
|----|------|------|
| `user` | 仅 `server/db/kilk_db_dump.sql` / `server/db/supabase_schema.sql` | 账号、角色、头像、部门、工号 |
| `hotels` | `init.js` 自建 | 多酒店元数据 + JSONB 配置 |
| `hotel_incident` | `init.js` 自建 | 故障记录（按 hotel_id 隔离） |
| `notice` | `init.js` 自建 | 公告 |
| `home_content` | 仅 SQL | 首页文案 |
| `service_file` / `service_file_item` | 仅 SQL | 服务文件与版本 |
| `ling_profile` | `init.js` 自建（但无读取接口，孤儿表） | 旧"关于 Ling" |
| `developers` | **仓库内无任何 DDL** | 名片数据（与 user 逻辑关联） |
| `channel` / `forum_post` / `forum_reply` / `forum_post_image` | 旧 SQL | 已废弃论坛，代码残留 |

**空库启动只能建 4 张表**，其余必须导入 SQL；`developers` 连 DDL 都没有——这是新环境无法复现的头号原因。

## 四、已知问题（接手先知道，别踩）

按严重度：

1. `tsc` 有 9 处历史错误：`HotelStat` 缺 `description`；AdminPage 的 `number/string` 比较与 `Select` 的 `modal` 属性；Layout 的 `Timeout` 类型；DeveloperCardEntry 的 `res.ok`。
2. `developers` 表无建表语句；`ling_profile` 无读取接口，两套真值源。
3. `POST /api/hotel/upload` 无鉴权；服务文件上传 500MB 且无类型白名单，文件落在 Apache 直发的 `/upload/`。
4. `admin.js` 里 10 个论坛接口是死代码，但 `DELETE /api/admin/users/:id` 仍先删 `forum_reply/forum_post`——论坛表已删的线上环境会 500。
5. `LingTab.tsx`（535 行）没有任何 import，是死代码。
6. `AuthModal` 用了 `Tabs`/`TabsContent` 却没有 `TabsList`，两个表单无法切换（注册已关闭，影响有限）。
7. 后台 `ServiceTab` 上传/删除版本后从旧闭包读 `versions`，列表不刷新。
8. 后台楼栋 `parseBuildings` 支持多位编号，前台 `autoBuilding` 只取首位数字，配置多位前缀会失效。
9. 运维看板用"已筛选后的"数据聚合，搜索/筛选会改变总数、完成率口径。
10. 权限主要靠前端：详情页编辑/流转只判断已登录，删除按钮仅 UI 隐藏。
11. 时间格式化 4 份、文件大小 3 份；列表无分页；大量 `any` 与 `id: string|number` 混用。
12. `/developer/me`、`/user/:id` 无路由守卫；404 页在 Layout 外。

## 五、环境事实（会浪费时间的部分）

| 项 | 事实 |
|----|------|
| node | 仅 DSH 自带 `C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`（v24） |
| npm | `C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd`（Node 22） |
| git | 项目内 `kit/private/tools/PortableGit/cmd/git.exe`（2.56.1） |
| PostgreSQL | **未安装**，`server/.env` 指向 127.0.0.1:5432；后端本地起不来 |
| 后端 `.env` | 无 dotenv、无 `--env-file`，本地不生效，回退 `postgres/postgres` |
| SSH | `%USERPROFILE%\.ssh\id_ed25519` 已就绪；GitHub 与服务器均免密 |
| 无头浏览器 | Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`，`puppeteer-core` 可用 |
| 编码 | PowerShell 5.1 读 UTF-8 需 `-Encoding UTF8`，否则乱码 |
| 沙箱 | 受限模式下 MSYS 程序无法建命名管道；`vite build` 会 `spawn EPERM`，`git push/fetch` 会失败——两者都需要完全权限；`tsc`、`git status/log/commit` 在沙箱内正常 |

## 六、三端状态（2026-11-13 核对）

- 本地：源码最新，`main` 分支。
- 服务器：`kilk.online` 首页引用 `index-IaKZUkHv.js`，与本地 10-06 构建一致；`/api/health` 正常；`kilk2` active。
- GitHub：`Lingyuan945/kilk-2.0`（public），最后推送 2026-09-16（`b740184`）。**与本地是两条无共同祖先的历史**，本地是其超集（内容层面），推送需先建分支再决定是否覆盖 main。
