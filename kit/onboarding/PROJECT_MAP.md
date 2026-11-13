# 项目地图 · kilk 2.0

> 用途：查"某个页面 / 接口 / 数据表是干什么的"。
> **当前状态（分支、提交、线上版本、待办）统一在根目录 `AGENTS.md` 第 2 节维护**，本文不重复写状态，避免两处说法打架。
> 最后核对：2026-11-13 17:30

一句话：团队内部平台，线上 <https://kilk.online>。核心业务是**多酒店客房故障登记与跟踪**，外围是公告、服务支持下载、开发者名片、用户与后台管理。

技术栈：React 19 + Vite 8 + TypeScript 5.9 + Tailwind 4 + shadcn/ui + React Router 7；后端 Node 20+ / Express 4 / PostgreSQL 16 / JWT；Apache 反代 Node 3001。

---

## 一、运行链路

```
浏览器
  → Apache 443（终止 HTTPS，FallbackResource /index.html）
      ├── /            → /var/www/kilk2/frontend      （dist/output）
      ├── /assets/     → dist/output_resource/assets
      ├── /upload/     → Alias 到 /var/www/kilk2/public/upload（Apache 直发，不经 Node）
      └── /api/*       → systemd kilk2 → Node 3001 → PostgreSQL(kilk)
```

关键点：

- 前端 API 基址来自 `VITE_API_BASE`，开发回退 `http://localhost:3001/api`。
- 构建由 `vite.config.ts` 的 `miaoda-output` 插件拆成 `dist/output` + `dist/output_resource`，并生成 `routes.json`（妙搭托管协议）。**两份必须同时部署**。
- Node **不提供** `express.static`：图片完全靠 Apache 的 `/upload/` 映射。所以本地只跑后端时图片 404 是正常现象；`local-runtime` 会把 `/upload/*` 302 到 kilk.online。
- 本地预览由 `local-runtime/server.mjs` 承担：静态托管 + `/api` 转发（探测到 3001 就转发，否则用内存 mock）。

---

## 二、前端

```
src/
├── index.tsx            入口（禁改）：StrictMode + BrowserRouter + ErrorBoundary + AuthProvider
├── app.tsx              路由表（只改 <Routes> 内）
├── index.css            全局样式：深色科技风、玻璃卡、入场动画、滚动条
├── tailwind-theme.css   :root 设计变量（HSL 空格分隔）
├── typography.css       @tailwindcss/typography 的 prose 变量
├── components/          Layout / SiteHeader / SiteFooter / AuthModal / TechBackground / Reveal ...
│   └── ui/              shadcn 组件（禁改）
├── contexts/            AuthContext（user、isAdmin、isSenior、login/logout）
├── hooks/               useSiteData（首页内容、用户资料、服务文件）
├── lib/                 api.ts（fetch 封装 + 401 清 token）、format.ts、utils.ts（cn）
├── pages/               每个页面一个目录，全部 React.lazy
└── types/               User / HomeContent / ServiceFile / LingProfile ...
```

规模：11 个页面目录、约 9.3k 行。最大的四个文件：

| 文件 | 行数 | 说明 |
|------|------|------|
| `pages/HotelPage/HotelDetailPage.tsx` | 1065 | 酒店详情：登记 / 故障列表 / 看板三段式 |
| `pages/AdminPage/AdminPage.tsx` | 735 | 后台容器，配置驱动 Tab |
| `pages/AdminPage/ServiceTab.tsx` | 520 | 服务文件与版本 |
| `pages/AdminPage/HotelTab.tsx` | 505 | 酒店 CRUD 与 JSON 配置编辑 |

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

角色：`user` → `senior` → `admin` → `super`。`isSenior` = senior/admin/super；`isAdmin` = admin/super。注册接口恒返回 403（已关闭）。

> 前端守卫只是**装饰**：详情页的编辑/流转只判断"已登录"，删除按钮仅 UI 隐藏。真正的权限在 `server/src/middleware/auth.js`。

### 重点页面

- **`HotelDetailPage.tsx`**：`module` 三段式（select / incident / dashboard）。抽屉式登记、服务端搜索筛选（250ms 防抖）、多图附件、状态流转 `pending→processing→done`（可重开）、编辑复用抽屉、删除仅 admin。楼栋自动识别 `autoBuilding(room, buildings)`：房间号首位数字 → 匹配 `编号=名称` 前缀 → 匹配 `n号楼` → 回退第一栋。
- **`AdminPage.tsx`**：配置驱动 Tab —— home（首页内容）/ notice / hotel / services / ling（渲染 `DevelopersTab`，仅 super）/ users；含用户角色、重置密码、删除确认。
- **`HotelTab.tsx`**：酒店 CRUD、启停、主题色、楼栋/类别/设备的动态行编辑（`编号=名称` 格式）。
- **`DeveloperCardManagePage.tsx`**：填表式名片编辑（不暴露 JSON），六大区块动态行。
- **`LingPage.tsx`**：名片详情（Hero / 技能条 / 技术支持 / 时间线 / 联系方式），接口失败时回退读 `/api/ling`。

### 设计语言

深色底 `hsl(228 48% 5%)` + 蓝青紫径向光晕 + 网格 overlay + canvas 粒子；工具类 `glass-card`、`text-glow`、`hover-lift`、`stagger-delay-1..10`；字体 Space Grotesk / JetBrains Mono 从 `miaoda.feishu.cn` 外链。

**不使用 framer-motion 做页面转场**：内置浏览器下动画不推进会导致白屏/叠影，`Reveal` 已改成纯 CSS。骨架屏用 `bg-slate-700/40`，不要亮蓝。

---

## 三、后端

```
server/
├── src/          运行时代码（入口、配置、路由、中间件）
├── db/           supabase_schema.sql（表结构 + 种子）、kilk_db_dump.sql（含数据，gitignore）
├── deploy/       历史部署脚本 deploy-server*.sh（在服务器上执行）
├── scripts/      一次性迁移/校验脚本 .mjs（非运行时依赖）
├── public/       运行后端的公开目录（upload 落盘处，Apache 直发）
└── .env          本机数据库/JWT 配置（无 dotenv，不自动生效）
```

```
server/src/
├── index.js           入口：cors → json → /api/health → 各路由 → 404 → 错误处理 → initDatabase() → listen
├── config.js          环境变量（无 dotenv，读 process.env，缺失回退 postgres/postgres）
├── db.js              pg Pool（max 10 / idle 30s / connect 5s / lifetime 1h）+ error 监听
├── init.js            幂等初始化：建 developers / notice / hotel_incident / hotels，并写默认酒店与默认名片；所有 DDL 走 safeExec（失败只告警）
├── middleware/auth.js authRequired / authOptional / adminRequired / seniorRequired
├── utils/password.js  bcrypt(cost 10) + 兼容 PHP $2y$ 与旧 MD5（登录时自动升级）
└── routes/            9 个文件：auth / user / hotel / admin / home / notice / service / developers / ling
```

### 主要接口

| 方法 | 路径 | 权限 |
|------|------|------|
| POST | `/api/auth/login` | 公开（注册已关闭，恒 403） |
| GET | `/api/auth/me` | 登录 |
| GET | `/api/hotels` | senior |
| GET | `/api/hotels/all` | admin |
| GET/PUT/DELETE | `/api/hotels/:id` | 读 senior，写 admin |
| GET/POST | `/api/hotel/:hotelId/incidents` | senior |
| PUT | `/api/hotel/:hotelId/incidents/:id` | senior |
| DELETE | `/api/hotel/:hotelId/incidents/:id` | admin |
| POST | `/api/hotel/upload` | **无鉴权（唯一未修的安全项）**，有 5MB + jpg/png/gif/webp 白名单 |
| GET/POST/PUT/DELETE | `/api/notice[/:id]` | 读公开，写 admin |
| GET | `/api/service/files[/:id]` | 公开 |
| POST | `/api/service/files/:id/download` | 公开（计数） |
| GET | `/api/developers`、`/api/developers/:username` | 公开 |
| GET/PUT | `/api/developers/me` | 登录 |
| GET | `/api/ling` | 公开（兼容旧接口，读 `developers` 首条） |
| * | `/api/admin/*` | admin（整组 `router.use(authRequired, adminRequired)`，17 个接口：users / developers / services） |

统一响应：`{ ok, msg, data, stats }`；401 由前端 `api.ts` 清 token 并抛错。

### 数据表（线上 9 张）

| 表 | DDL 来源 | 用途 |
|----|---------|------|
| `user` | `supabase_schema.sql` | 账号、角色、头像、部门、工号 |
| `hotels` | `init.js` + schema | 多酒店元数据 + JSONB 配置（楼栋/类别/设备） |
| `hotel_incident` | `init.js` + schema | 故障记录（按 `hotel_id` 隔离） |
| `notice` | `init.js` + schema | 公告 |
| `home_content` | `supabase_schema.sql` | 首页文案 |
| `service_file` / `service_file_item` | `supabase_schema.sql` | 服务文件与版本 |
| `developers` | `init.js` + schema | 开发者名片（旧 `ling_profile` 改名加列而来，序列仍叫 `ling_profile_id_seq`） |
| `ling_profile` | 仅线上存在 | **孤儿表**：无任何读取接口，真值已在 `developers`，可清理 |

空库启动 `init.js` 建 4 张（developers / notice / hotel_incident / hotels）+ 默认酒店与名片；其余由 `supabase_schema.sql` 建。

### 关键设计

- 故障编号自动生成 `GZYYYYMMDD-NNN`；附件字段存 JSON 数组字符串（多图）。
- 时长从创建时间起算；状态 `pending → processing → done`，可重开。
- 酒店配置 `buildings` / `categories` / `device_types` 均为 JSONB 数组，格式 `编号=名称`（编号可多位）。

---

## 四、已知问题（接手先知道，别踩）

状态标记：**[未修]** 仍需处理，**[已修]** 已解决（留档防回退）。

| # | 问题 | 状态 |
|---|------|------|
| 1 | `POST /api/hotel/upload` 无鉴权，任何人可往 Apache 直发的 `/upload/` 写图 | **[未修]** 唯一安全项 |
| 2 | 线上 assets 堆了 1051 个文件 / 27MB 历史残留 chunk（当前入口只引用一小部分） | **[未修]** |
| 3 | GitHub 默认分支 `main` 指向 9 月论坛版，clone 下来跑的不是现网系统 | **[未修]** 真值在 `main-local` |
| 4 | 线上孤儿表 `ling_profile` 仍有 1 行，无读取接口 | **[未修]** 可删 |
| 5 | 后台 `ServiceTab` 上传/删除版本后从旧闭包读 `versions`，列表不刷新 | **[未修]** |
| 6 | 后台 `parseBuildings` 支持多位编号，前台 `autoBuilding` 只取首位数字 | **[未修]** 配多位前缀会失效 |
| 7 | 运维看板用"已筛选后的"数据聚合，搜索会改变总数与完成率口径 | **[未修]** 既有行为，改前问用户 |
| 8 | 权限主要靠前端：详情页编辑/流转只判断已登录，删除按钮仅 UI 隐藏 | **[未修]** |
| 9 | 时间格式化 4 份实现、文件大小 3 份；列表无分页；`any` 与 `id: string\|number` 混用 | **[未修]** |
| 10 | `/developer/me`、`/user/:id` 无路由守卫；404 页在 Layout 外 | **[未修]** |
| 11 | `tsc` 8 处历史错误（HotelStat 缺字段、AdminPage id 比较、Select 的 modal、Layout 定时器句柄、res.ok） | **[已修]** 2026-11-13，现基线 0 |
| 12 | `LingTab.tsx` 540 行死代码、`admin.js` 11 个论坛/旧名片接口 | **[已修]** 已删除 |
| 13 | `DELETE /api/admin/users/:id` 先删 `forum_reply/forum_post`，线上表已删必 500 | **[已修]** 已去掉该步 |
| 14 | `developers` 表仓库内无 DDL，新环境无法复现名片功能 | **[已修]** `init.js` + schema 补齐 |
| 15 | `init.js` 裸 `CREATE UNIQUE INDEX` 在 owner 不符时抛 42501，导致启动即崩（曾致线上停机 57 秒） | **[已修]** 所有 DDL 走 `safeExec`，失败只告警；**不要改回去** |
| 16 | `AuthModal` 用了 Tabs 却没 `TabsList`，两个表单无法切换 | **[已修]** 已补 |

---

## 五、环境事实（会浪费时间的部分）

| 项 | 事实 |
|----|------|
| node | DSH 自带 `C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`（v24） |
| npm | `C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd`（Node 22） |
| git | 项目内 `kit/private/tools/PortableGit/cmd/git.exe`（2.56.1） |
| PostgreSQL | **已装**：16.15 Windows 便携版 `kit/private/tools/pg16/pgsql`，数据目录 `kit/private/pgdata`，端口 5432，库 `kilk`，超级用户 `postgres`。用 `kit\scripts\localdb.cmd` 启停，默认不随开机启动 |
| 后端 `.env` | 无 dotenv、无 `--env-file`，**不自动生效**；启动前必须手动设 `$env:DB_PASSWORD`，否则回退 `postgres/postgres` |
| 数据库账号 | `DB_HOST=127.0.0.1`、`DB_USER=postgres`、`DB_NAME=kilk`、`PORT=3001`（`.env` 带 BOM，解析第一行要注意） |
| SSH | `%USERPROFILE%\.ssh\id_ed25519` 已就绪；GitHub 与服务器均免密 |
| 无头浏览器 | Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`，`puppeteer-core` 可用；`local-runtime/smoke.mjs` 已封好 10 路由截图 |
| 编码 | PowerShell 5.1 读 UTF-8 需 `-Encoding UTF8`；`.cmd` 必须 CRLF + 纯 ASCII |
| 沙箱 | 受限模式下 `vite build` 报 `spawn EPERM`、`git push/fetch` 失败，需要完全权限；`tsc`、`git status/log/commit` 正常 |
| 线上权限 | 部分表 owner 是 postgres，应用账号 `kilk` 只有 DML；DDL 会报 42501（这是 `safeExec` 存在的原因） |
