# 01 · 三端同步流程

kilk 2.0 有三端：**本地（唯一源码真值源）→ 服务器（线上运行）→ GitHub（代码库备份）**。任何一次完整更新都必须走完下面 8 步。

## 固定路径（本机）

```powershell
$NODE = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$NPM  = "C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd"
$GIT  = "G:\IT-08\Github\kilk 2.0\kit\private\tools\PortableGit\cmd\git.exe"
```

- 本机没有系统级 node/npm/git，PATH 里找不到。
- 没有 PostgreSQL：后端**无法在本机启动**，本地不跑接口联调。
- 服务器免密已配好（`admin@120.25.179.176`），GitHub SSH 已配好。

## 第 1 步 · 看清现状

```powershell
& $GIT status --short
& $GIT log --oneline -5
```

工作区若有未提交改动，先判断是上一轮的残留还是本轮要用的。

## 第 2 步 · 改代码

遵守 `00-constitution.md`。单文件超过 800 行时要考虑拆分，尤其是 `HotelDetailPage.tsx`。

## 第 3 步 · 类型检查

```powershell
& $NODE "node_modules\typescript\bin\tsc" -p tsconfig.app.json
```

当前基线有 9 处历史错误（见项目地图）。**改动不得新增错误**；如果顺手修了，记录在提交信息里。

## 第 4 步 · 生产构建

```powershell
$env:VITE_API_BASE = '/api'
& $NODE "node_modules\vite\bin\vite.js" build
```

产物：`dist/output`（index.html + public 同源文件 + routes.json）与 `dist/output_resource/assets`。**两个目录必须同时部署**，只部署 `output` 会导致线上白屏。

> 沙箱注意：受限模式下构建会报 `spawn EPERM`（vite 内部要起子进程抓输出），需完全权限执行；类型检查与 git 的本地操作不需要。

## 第 5 步 · 验证

- 静态检查：`kit/scripts/build.ps1 -Typecheck`
- 视觉验证：本机无数据库，可起 `node node_modules/vite/bin/vite.js` 看静态页；数据页需登录线上接口，或在服务器侧验证。
- 无头截图：Edge 在 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`，`puppeteer-core` 已装。
- 数据类改动必须**二次查询确认**（前端 `ok:true` 不代表数据正确）。

## 第 6 步 · 部署前端

```powershell
cd dist
tar -cf "$env:TEMP\kilk-out.tar" -C output .
tar -cf "$env:TEMP\kilk-res.tar" -C output_resource .
scp "$env:TEMP\kilk-out.tar" "$env:TEMP\kilk-res.tar" admin@120.25.179.176:/tmp/
ssh admin@120.25.179.176 "cd /var/www/kilk2/frontend && tar -xf /tmp/kilk-out.tar && tar -xf /tmp/kilk-res.tar && grep -o 'index-[A-Za-z0-9_-]*\.js' index.html | head -1"
```

前端是静态文件，不需要重启服务；记下最后那个 `index-xxxx.js` 作为线上版本指纹。

## 第 7 步 · 部署后端（仅当改了 `server/`）

```powershell
scp "server\src\routes\hotel.js" admin@120.25.179.176:/tmp/
ssh admin@120.25.179.176 "cp /tmp/hotel.js /var/www/kilk2/src/routes/hotel.js && sudo systemctl restart kilk2 && sleep 1 && curl -s localhost:3001/api/health"
```

后端改动**必须**重启 `kilk2`。线上环境变量由 systemd 的 `EnvironmentFile` 提供，本地 `.env` 不生效（无 dotenv）。

## 第 8 步 · 提交、推送、备份

```powershell
& $GIT add -A
& $GIT commit -m "fix: ..."
& $GIT push origin main        # 低频，阶段收尾时推
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "..."
```

推送频率按用户要求从低：**不每改一个文件就推**，在一次完整更新验证通过后推一次即可。

## 注意

- 便携 Git 的 MSYS 组件在 DSH 受限沙箱内无法创建命名管道，`push/fetch/clone` 需要在完全权限下执行；`status/log/commit` 在沙箱内正常。
- 你在自己的 PowerShell 里直接调用 `git.exe` 不受此限制。
- 部署前确认 `dist` 是**刚构建的**，不要部署旧产物。
