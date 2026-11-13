# AGENTS.md · kilk 2.0

> 这是接手本项目的**唯一入口**。读完这一页你就能开始干活，不需要先读别的文档。
> 最后一次人工核对：**2026-11-13 17:30**。每次改动后请更新这个日期，过期状态比没有状态更害人。

---

## 0. 三十秒认识它

kilk 2.0 是一个**已经在生产运行**的团队内部平台：<https://kilk.online>

- **谁在用**：酒店集团的运维团队（线上 5 个账号：1 超管 / 2 管理员 / 1 高级 / 1 普通）。
- **核心业务**：多酒店客房故障登记与跟踪。选酒店 → 登记房间故障（可传图）→ 派人处理 → `pending → processing → done` 流转 → 看板统计完成率与耗时。
- **外围功能**：公告、服务支持文件下载、开发者名片、用户资料、后台管理。
- **技术栈**：React 19 + Vite 8 + TypeScript 5.9 + Tailwind 4 + shadcn/ui + React Router 7；Node 20 + Express 4 + PostgreSQL 16 + JWT；Apache 反向代理。
- **规模**：前端 11 个页面 / 9.3k 行，后端 9 个路由文件 / 2.1k 行。**一个人一天能通读，不要怕**。

**它不是妙搭（Miaoda）演示模板。** 根目录 `README.md` 是模板自带的规范说明，与本项目业务无关，也**不要改**。真正的项目说明在 `kit/` 和你正在读的这一份。

---

## 1. 三端关系（记住一句就够）

```
本地 (G:\IT-08\Github\kilk 2.0)  ──部署──▶  服务器 (120.25.179.176)  ◀──备份──  GitHub
     代码真值源                                   数据真值源
```

| 端 | 是什么 | 怎么访问 |
|----|--------|---------|
| 本地 | 唯一源码真值源，改代码只在这里改 | 就在当前目录 |
| 服务器 | 线上运行：Apache 443 → Node 3001（systemd `kilk2`）→ PostgreSQL 16 | `ssh admin@120.25.179.176`（已免密） |
| GitHub | 代码备份 `Lingyuan945/kilk-2.0` | SSH 已配好，`git push` 即可 |

**两条铁律**：

1. **代码以本地为准**，服务器上的代码是本地部署上去的副本，不要在服务器上直接改代码。
2. **数据以服务器为准**，本地库任何时候都通过导出文件从服务器同步，不要手工造数据再往线上推。

---

## 2. 现在的真实状态（改之前先读，别信旧文档）

**懒得读表就跑这条**，它现场测所有东西，输出比任何文档都准：

```powershell
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\status.ps1"
```

它打印：分支/HEAD/改动文件数、tsc 错误数、本地构建指纹与 API 基址是否正常、本地数据库与后端/预览是否在线、线上健康与入口指纹、本地与线上是否同步、服务器服务状态与重启次数。**文档与它冲突时，以它为准。**

下表是 2026-11-13 的读数：

| 项 | 事实（2026-11-13 实测） |
|----|------------------------|
| 本地代码 | `main` 分支，工作区干净（具体 HEAD 用 `status.ps1` 看，这里不钉死提交号） |
| 类型检查 | **0 错误**。历史遗留的 8 处已全部修掉，现在新增一处就是你的问题 |
| 本地构建 | `dist/output` 指纹 `index-CxRY2fll.js`，已构建但**从未部署** |
| 线上前端 | 仍是 `index-IaKZUkHv.js`（9-29 构建），比本地旧 |
| 线上后端 | 与本地源码**逐文件一致**（2026-11-13 部署过 `init.js` 与 `admin.js`） |
| 线上服务 | `kilk2` active，`/api/health` 返回 `{"ok":true}` |
| 线上数据库 | `kilk` 库 9 张表，数据很薄：5 用户 / 1 酒店 / 2 故障 / 1 公告 / 2 服务文件 / 2 名片 |
| 本地数据库 | 已装 PostgreSQL 16.15 便携版，**但默认不启动**，用 `kit\scripts\localdb.cmd start` 拉起 |
| GitHub | `origin/main` 停在 9-16 的**论坛版**（`b740184`）；现网真值在 `origin/main-local`，与本地 `main` 同步。**不要看 main** |

**以下说法已经过时，遇到请直接忽略**（旧文档里的残留，本次已同步修正，但别的笔记可能还留着）：

- ~~tsc 有 9 处历史错误~~ → 现在是 0
- ~~本机没有 PostgreSQL，后端跑不起来~~ → 已装便携版，后端可以跑
- ~~`developers` 表没有建表语句~~ → `init.js` 与 `supabase_schema.sql` 都已补齐
- ~~`LingTab.tsx` 是 540 行死代码~~ → 已删除
- ~~`admin.js` 里有 10 个论坛接口~~ → 已删除，`forum.js` 也从服务器清掉了
- ~~`POST /api/hotel/upload` 无类型白名单~~ → 现在有 5MB + 四种图片格式限制，但**仍无鉴权**（唯一遗留安全项）

---

## 3. 第一次上手：把它跑起来

先设好路径变量（每个新终端窗口都要设一次）：

```powershell
$NODE = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$GIT  = "G:\IT-08\Github\kilk 2.0\kit\private\tools\PortableGit\cmd\git.exe"
```

按你的目的选下面**一条**，不要两条都做。

### 路线 A · 我只改前端样式 / 文案，想立刻看到效果（约 3 分钟）

不需要数据库、不需要后端，`local-runtime` 自带一套内存 mock 数据。

```powershell
# 1. 构建（必须用这个包装器，原因见第 7 节坑 1）
& $NODE local-runtime\build.mjs

# 2. 起预览（双击 local-runtime\start.cmd 等效）
& $NODE local-runtime\server.mjs
```

打开 <http://127.0.0.1:5180>，用 `admin` / `admin123` 登录，所有页面可点。

### 路线 B · 我要改后端 / 改数据相关逻辑（约 8 分钟）

需要真实数据。三步各自开一个终端窗口最省事（都在项目根目录 `$ROOT` 下执行）。

```powershell
# 1. 起本地数据库（PostgreSQL 16 便携版，端口 5432，库 kilk）
kit\scripts\localdb.cmd start
kit\scripts\localdb.cmd status          # 期望 accepting connections

# 2. 起本地后端（3001）。注意：后端没有 dotenv，必须手动给 DB_PASSWORD
cd server
$env:DB_PASSWORD = (Select-String -Path .env -Pattern '^DB_PASSWORD=(.*)$').Matches.Groups[1].Value.Trim()
& $NODE src/index.js

# 3. 起预览（另开窗口，会自动探测到 3001 并转发 /api）
cd "G:\IT-08\Github\kilk 2.0"
& $NODE local-runtime\server.mjs
```

`local-runtime` 启动时会**自动探测 3001**：后端在，就把 `/api/*` 原样转发（看到的是真实库数据，改动直接落库）；后端不在，退回内存 mock。`USE_REAL_API=1` / `0` 可强制。

**本地库和线上不一致时怎么办**（比如你从别人那里接手，或服务器数据变了）：

```bash
# 在服务器上导出
ssh admin@120.25.179.176 'sudo -u postgres pg_dump -d kilk -Fc --no-owner --no-privileges -f /tmp/k.dump && sudo -u postgres pg_dump -d kilk --no-owner --no-privileges -f /tmp/k.sql && sudo chmod 644 /tmp/k.*'

# 拉回本地（这个目录已在 .gitignore，含密码哈希，永不提交）
scp admin@120.25.179.176:/tmp/k.dump server/data-export/kilk.dump
scp admin@120.25.179.176:/tmp/k.sql  server/data-export/kilk.sql
ssh admin@120.25.179.176 'sudo rm -f /tmp/k.dump /tmp/k.sql'   # 记得删，含密码哈希

# 重建本地库
kit\scripts\localdb.cmd restore
```

---

## 4. 我要改东西：改哪个文件

| 用户说的是 | 你该动的地方 |
|-----------|-------------|
| "加个页面 / 加个入口" | 新建 `src/pages/<Name>/<Name>.tsx`，在 `src/app.tsx` 的 `<Routes>` 里加一行 |
| "故障登记要加个字段" | 前端 `HotelDetailPage.tsx`（1065 行，最大文件）+ 后端 `server/src/routes/hotel.js` + `hotel_incident` 表加列 |
| "看板统计口径不对" | `HotelDetailPage.tsx` 的 dashboard 段（注意：现在用**已筛选后**的数据聚合，搜索会改变总数） |
| "后台要加个 Tab" | `AdminPage.tsx` 是配置驱动 Tab 列表，新 Tab 放 `src/pages/AdminPage/*Tab.tsx` |
| "酒店/楼栋配置要改" | 后台 `HotelTab.tsx`（楼栋格式 `编号=名称`）；前台自动识别在 `HotelPage` 的 `autoBuilding()` |
| "接口要改 / 加接口" | `server/src/routes/<name>.js`，权限中间件在 `server/src/middleware/auth.js` |
| "登录 / 权限相关" | 前端 `src/contexts/AuthContext.tsx` + 后端 `routes/auth.js` + `middleware/auth.js` |
| "样式 / 配色 / 动效" | `src/index.css`、`src/tailwind-theme.css`，组件类名 `glass-card` / `text-glow` / `hover-lift` |
| "名片页" | `LingPage.tsx`（详情）、`DeveloperCardManagePage.tsx`（编辑）、`DevelopersTab.tsx`（后台） |

**三个禁改 + 一个禁提交**：`src/index.tsx`、`src/components/ui/*`、根 `README.md` 不能动；`kit/private/*` 能改但不能提交（里面是便携工具链、备份、密钥、本地库数据）。

---

## 5. 铁律（违反即返工）

1. **禁改** `src/index.tsx`、`src/components/ui/*`、根 `README.md`。
2. **路由只在** `src/app.tsx` 的 `<Routes>` 内增删，禁止再包一层 Router。
3. **PATH 里没有 node / npm / git**，必须用固定路径（见第 3 节与 `kit/rules/01-workflow.md`）。
4. **路径含空格** `G:\IT-08\Github\kilk 2.0`，传参必须加引号；本机 shell 是 PowerShell 5.1，读 UTF-8 文件加 `-Encoding UTF8`。
5. **改完必须过 `tsc` 与 `vite build`**，基线是 0 错误。
6. **中文交流，不用 emoji**；视觉改动先说明再动手，风格克制留白，不要亮蓝大色块。
7. **密钥、`.env`、备份、便携工具链**都在 `kit/private/`，永不提交。
8. **不要在服务器上直接改代码**，也不要手工改线上数据；一切走本地 → 部署。

---

## 6. 一次改动怎么才算完成

八步，缺一步就不算完。完整命令见 `kit/rules/01-workflow.md`，验收清单见 `kit/rules/02-verify.md`。

| # | 步骤 | 判断通过的标准 |
|---|------|--------------|
| 1 | 看现状 | `git status` / `git log -5`，确认工作区没有别人的残留改动 |
| 2 | 改代码 | 遵守第 5 节铁律 |
| 3 | 类型检查 | `tsc -p tsconfig.app.json` **0 错误** |
| 4 | 构建 | `local-runtime\build.mjs` 成功，产物里 API 基址是 `/api`（见坑 1） |
| 5 | 本地验证 | 走一遍改到的页面，控制台零报错；数据类改动要**回查一次数据**，不能只看提示成功 |
| 6 | 部署 | 前端双 tar；改了 `server/` 就 scp + `systemctl restart kilk2` |
| 7 | 线上验证 | `curl https://kilk.online/api/health` 为 `ok:true`，页面能开，首页 js 指纹是新构建的 |
| 8 | 收尾 | 提交（中文、动词开头）→ 推 `origin main:main-local` → `snapshot.ps1 -Label "..."` |

**部署判断**：只改前端 → 只做第 6 步的前端部分；改了 `server/` → 必须重启服务；只改文档 → 可以只做第 8 步。

---

## 7. 会咬人的坑（按踩到的概率排序）

**1. Git Bash 里 `export VITE_API_BASE=/api` 会毁掉构建产物。**
MSYS 会把 `/api` 当成路径改写成 `D:/.../PortableGit/api`，打进产物后页面所有接口报 `Not allowed to load local resource`。**构建一律用 `node local-runtime/build.mjs`**（它自己设环境变量再调 vite），或在 PowerShell 里 `$env:VITE_API_BASE='/api'`。

**2. 前端产物是两份，只传一份线上白屏。**
`vite.config.ts` 的 `miaoda-output` 插件把产物拆成 `dist/output`（html + routes.json）和 `dist/output_resource/assets`（js/css）。**必须双 tar 同时解压到 `/var/www/kilk2/frontend/`**。

**3. 图片靠 Apache，不靠 Node。**
后端**没有** `express.static`，`/upload/` 是 Apache 的 Alias 直发。所以本地跑后端时图片 404 是正常的；`local-runtime` 会把 `/upload/*` 302 到 kilk.online 取图。

**4. 线上库的 owner 是 postgres，应用账号 `kilk` 没有 DDL 权限。**
`CREATE TABLE IF NOT EXISTS`（表已存在时）不报错，但 `CREATE UNIQUE INDEX` / `ALTER TABLE` 会报 `42501 must be owner`，而 `initDatabase()` 是在启动时 await 的，**一旦抛错进程直接退出、站点就挂**（这事真发生过，停机 57 秒）。所以 `server/src/init.js` 用 `safeExec()` 包住所有 DDL，失败只 warn。**不要把它改回裸 `db.exec`。**

**5. `.cmd` 文件必须是 CRLF + 纯 ASCII。**
写成 LF 或写中文注释，cmd.exe 会报"命令语法不正确"。`.gitattributes` 已固定 `*.cmd/*.bat` 为 CRLF，但直接用工具写文件仍会写成 LF，写完用 `file xxx.cmd` 检查。

**6. 工具调用结束会回收子进程。**
`pg_ctl start` 起的 postgres 在命令返回后就被杀。要跨调用存活，得用后台方式跑 `postgres.exe -D kit/private/pgdata`。用户自己的 cmd 窗口里跑 `localdb.cmd start` 没这个问题。

**7. 前端权限是"装饰"，后端权限才是真的。**
详情页的编辑/流转只判断"已登录"，删除按钮只是 UI 隐藏。**任何权限相关改动，必须前后端同时改**，别只改按钮。

**8. 运维看板用已筛选后的数据聚合。**
搜索框有内容时，看板的总数、完成率跟着变。这是既有行为，改之前先问用户想要哪种口径。

**9. 楼栋识别前后台不一致。**
后台 `parseBuildings` 支持多位编号（`12=十二号楼`），前台 `autoBuilding` 只取房间号**首位数字**。配多位前缀会失效。

**10. 服务器 assets 堆了 1051 个文件 / 27MB。**
历次部署的残留 chunk，当前入口只引用一小部分。清理前先备份 `frontend` 目录，别直接删。

---

## 8. 文档地图：什么时候读哪份

| 文档 | 什么时候读 |
|------|-----------|
| **AGENTS.md**（本文件） | 每次接手的第一份，也是唯一必读 |
| `kit/onboarding/QUICKSTART.md` | 要按步骤实操环境的细节（命令、预期输出、失败排查） |
| `kit/onboarding/PROJECT_MAP.md` | 要知道某个页面/接口/数据表是干什么的 |
| `kit/rules/00-constitution.md` | 动手前确认红线（禁改文件、编码、路径） |
| `kit/rules/01-workflow.md` | 执行部署，需要完整命令 |
| `kit/rules/02-verify.md` | 提交前逐项自查 |
| `kit/specs/TECH_SPEC.md` | 要理解架构决策与 API 约定 |
| `kit/specs/HANDOVER.md` | 要改酒店运维模块，需要业务规则细节（楼栋、状态机、红树林配置） |
| `kit/specs/EXPERIENCE.md` | 遇到"以前踩过这个坑"的问题，或要写浏览器验证脚本 |
| `local-runtime/README.md` | 本地预览环境怎么用、mock 数据在哪改 |

另外两个不是文档但更常用：`kit\scripts\status.ps1`（一键体检，见第 2 节）、`kit\scripts\localdb.cmd`（本地库启停）。

文档之间**不重复写状态**。状态只在本文件第 2 节维护，其他地方发现状态不一致，以这里为准并顺手修正那一处。

---

## 9. 还没做的事（接手后可以从这里挑）

按价值排序，做完记得把这条从列表里划掉：

1. **把本地前端推上线**：本地 `index-CxRY2fll.js` 已含死代码清理，线上还是 9-29 的旧包。
2. **给 `POST /api/hotel/upload` 挂鉴权**：现在任何人可往 Apache 直发的 `/upload/` 写图片，是唯一未修的安全项。
3. **清理线上 assets 旧 chunk**：27MB → 预计 3MB 内（先备份）。
4. **GitHub 默认分支切到 `main-local`**，或把本地历史覆盖 `main`：现在 clone 下来拿到的是 9 月的论坛版，是错的。
5. **删掉线上孤儿表 `ling_profile`**：它还留着 1 行数据，但没有任何读取接口，真值已在 `developers`。
6. **`HotelDetailPage.tsx` 1065 行拆分**：单文件建议上限 800 行，拆 dashboard 与抽屉两段最自然。
