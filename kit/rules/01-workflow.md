# 01 · 三端同步流程

kilk 2.0 有三端：**本地（代码真值源）→ 服务器（运行 + 数据真值源）→ GitHub（代码备份）**。

一次完整更新走下面 8 步。只改文档可以只做第 1、8 步；只改前端可以跳过第 7 步。

## 固定路径（本机）

```powershell
$NODE = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$NPM  = "C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd"
$GIT  = "G:\IT-08\Github\kilk 2.0\kit\private\tools\PortableGit\cmd\git.exe"
$ROOT = "G:\IT-08\Github\kilk 2.0"
```

- 系统 PATH 里没有 node / npm / git，找不到是正常的。
- 本机**有** PostgreSQL 16 便携版，用 `kit\scripts\localdb.cmd start` 启动，不需要 Docker。
- 服务器免密已配好（`admin@120.25.179.176`），GitHub SSH 已配好。

---

## 第 1 步 · 看清现状

```powershell
& $GIT status --short
& $GIT log --oneline -5
& $GIT branch -avv
```

工作区有未提交改动，先判断是上一轮残留还是本轮要用的，**不要直接覆盖**。当前分支应为 `main`，远端应推 `main-local`（`main` 是 9 月的论坛版历史，不要动）。

## 第 2 步 · 改代码

遵守 `00-constitution.md`。改权限逻辑必须前后端一起改。

## 第 3 步 · 类型检查

```powershell
& $NODE "node_modules\typescript\bin\tsc" -p tsconfig.app.json
```

**基线是 0 错误**（历史 8 处已清）。有任何输出都是你引入的，修完再继续。

## 第 4 步 · 生产构建

```powershell
& $NODE local-runtime\build.mjs
```

不要用 `& $NODE "node_modules\vite\bin\vite.js" build` 配 Git Bash 的 `export`，会毁掉 API 基址（见 `00-constitution.md` 路径第 4 条）。

产物两份，必须同时部署：

- `dist/output`：index.html + routes.json + 同源静态文件
- `dist/output_resource/assets`：js / css

构建完**立刻验证基址**：

```powershell
Select-String -Path dist\output_resource\assets\index-*.js -Pattern 'var \w+="/api"' | Select-Object -First 1
```

无命中 = 产物不可部署。

> 受限沙箱下 `vite build` 会因内部子进程报 `spawn EPERM`，需完全权限；`tsc` 不受影响。

## 第 5 步 · 本地验证（三级，按改动范围选最高一级）

| 级别 | 场景 | 做法 |
|------|------|------|
| L1 静态 | 改样式 / 文案 | `node local-runtime/server.mjs` → <http://127.0.0.1:5180>，mock 数据，随便点 |
| L2 真实数据 | 改前端数据逻辑 | `localdb.cmd start` + 后端 3001 + 预览 5180（预览会自动转发 `/api`） |
| L3 接口回查 | 改后端 / SQL | 用 `curl` 打真实接口，并**回查数据库**确认落库对不对 |

验证底线：**控制台零报错**；数据类改动不能只看前端提示"成功"，必须二次查询数据库或重新拉列表。

- 无头截图：Edge `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`，`puppeteer-core` 已装，`local-runtime/smoke.mjs` 是现成模板。

## 第 6 步 · 部署前端

```powershell
cd "$ROOT\dist"
tar -cf "$env:TEMP\kilk-out.tar" -C output .
tar -cf "$env:TEMP\kilk-res.tar" -C output_resource .
scp "$env:TEMP\kilk-out.tar" "$env:TEMP\kilk-res.tar" admin@120.25.179.176:/tmp/
ssh admin@120.25.179.176 "cd /var/www/kilk2/frontend && tar -xf /tmp/kilk-out.tar && tar -xf /tmp/kilk-res.tar && grep -o 'index-[A-Za-z0-9_-]*\.js' index.html | head -1"
```

静态文件，不用重启服务。记下最后打印的 `index-xxxx.js` 作为线上指纹。

## 第 7 步 · 部署后端（改了 `server/` 才做）

```powershell
scp server/src/routes/hotel.js admin@120.25.179.176:/tmp/
ssh admin@120.25.179.176 "cp /tmp/hotel.js /var/www/kilk2/src/routes/hotel.js && sudo systemctl restart kilk2 && sleep 3 && systemctl is-active kilk2 && curl -s localhost:3001/api/health"
```

**重启后必须看日志**，不能只看 `is-active`：

```powershell
ssh admin@120.25.179.176 "journalctl -u kilk2 -n 20 --no-pager && systemctl show kilk2 -p NRestarts --value"
```

- `[DB] 跳过 DDL（42501）` 是**预期日志**：线上表 owner 是 postgres，应用账号 `kilk` 只有 DML 权限。`safeExec` 故意只告警。
- 出现 `Error` 且 `NRestarts` 持续增长 = 崩溃循环，立刻把上一版本文件拷回去再 restart，不要反复试。
- 线上环境变量由 systemd `EnvironmentFile` 提供，本地 `.env` 不生效（无 dotenv）。

## 第 8 步 · 提交、推送、快照

```powershell
cd $ROOT
& $GIT add -A
& $GIT commit -m "fix: 改了什么，为什么"
& $GIT push origin main:main-local
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "..."
```

- **推 `main-local`**，不要推 `main`（两条历史无共同祖先）。
- 推送频率从低：一次完整更新验证通过后推一次。
- 快照产物：`kit/private/backups/<时间>_<标签>/`（源码快照 + git bundle + CHANGES）并在 `INDEX.md` 追加索引。

---

## 注意

- 便携 Git 的 MSYS 组件在 DSH 受限沙箱内无法创建命名管道，`push/fetch/clone` 需完全权限；`status/log/commit` 在沙箱内正常。
- 部署前确认 `dist` 是**刚构建的**，不要部署旧产物。
- 不要把"只在本地验证过"的改动说成"已上线"；也不要把"已部署"说成"已验证"，这是两件事。
