# 快速上手 · 30 分钟把 kilk 2.0 跑明白

给刚接手的智能体。**先读 `AGENTS.md`（5 分钟，讲清楚是什么和该干什么），再回来按本文一步步动手。**

本文只讲"怎么做"，每一步都写了预期输出和失败了怎么办。所有命令在 PowerShell 5.1 下验证过。

---

## 第 0 步 · 设好路径（每个新窗口都要）

PATH 里没有 node / npm / git，下面三条是唯一可用的：

```powershell
$NODE = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$NPM  = "C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd"
$GIT  = "G:\IT-08\Github\kilk 2.0\kit\private\tools\PortableGit\cmd\git.exe"
$ROOT = "G:\IT-08\Github\kilk 2.0"
```

自检：

```powershell
& $NODE -v      # v24.x
& $GIT --version # git version 2.56.1
```

---

## 第 1 步 · 你在哪一次提交上（1 分钟）

**先跑一键体检**，它会替你测完下面第 2 到第 4 步的所有事实：

```powershell
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\status.ps1"
```

输出会分五段：`LOCAL REPO` / `TYPECHECK` / `LOCAL BUILD` / `LOCAL SERVICES` / `SERVER`。任何一段异常，按它给的提示处理，然后再往下读。

想手工核对时再用这几条：

```powershell
cd $ROOT
& $GIT status --short
& $GIT log --oneline -5
& $GIT branch -avv
```

预期：

- `status` 为空 → 上一轮已收尾，可以放心开工。
- `status` 有改动 → 先看清是什么，**别直接覆盖**，可能是别人未完成的活。
- 分支应为 `main`，且 `origin/main-local` 指向同一个提交；`origin/main` 停在 `b740184`（9-16 的论坛版，不是现网，**别拿它当参考**）。

---

## 第 2 步 · 三端连通性（1 分钟）

```powershell
# 线上接口
curl.exe -s https://kilk.online/api/health
# 期望 {"ok":true,"msg":"kilk 2.0 API 运行中",...}

# 线上前端指纹
curl.exe -s https://kilk.online/ | Select-String -Pattern 'index-[\w-]+\.js' | Select-Object -First 1
# 期望 index-IaKZUkHv.js（9-29 的包，比本地旧）

# 服务器
ssh admin@120.25.179.176 "systemctl is-active kilk2"
# 期望 active

# GitHub
& $GIT ls-remote --heads origin
```

三条都通说明你具备完整的部署能力。`ssh` 或 `ls-remote` 卡住 → 看 `kit/scripts/verify-links.ps1`。

---

## 第 3 步 · 类型检查基线（2 分钟）

```powershell
& $NODE "node_modules\typescript\bin\tsc" -p tsconfig.app.json
```

预期：**没有任何输出**（0 错误）。

> 旧文档写的"9 处历史错误"已经过时，2026-11-13 已全部修掉。现在出现任何 `error TS` 都是**你刚引入的**，必须修掉再往下走。若报错指向 `src/components/ui/*`，说明你误改了禁改文件。

---

## 第 4 步 · 构建（3 分钟）

```powershell
& $NODE local-runtime\build.mjs
```

预期结尾：

```
✓ built in 1.3s
```

产物两份，缺一不可：

```powershell
ls dist\output            # index.html + routes.json + public 同源文件
ls dist\output_resource   # assets\*.js / *.css
(Select-String -Path dist\output\index.html -Pattern 'index-[\w-]+\.js').Matches.Value
```

**必须验证 API 基址**（这是最容易翻车的地方）：

```powershell
Select-String -Path dist\output_resource\assets\index-*.js -Pattern 'var \w+="/api"' | Select-Object -First 1
```

有命中才算构建正确。如果产物里出现 `file:///` 或 `D:/.../PortableGit/api` → 你用错了构建方式（在 Git Bash 里 `export VITE_API_BASE=/api` 会被 MSYS 改写成 Windows 路径），重跑 `build.mjs`。

> `vite build` 在受限沙箱里会因内部子进程限制报 `spawn EPERM`，需要完全权限。`tsc` 不受影响。

---

## 第 5 步 · 本地跑起来（5 分钟）

### 只想看前端（不需要数据库）

```powershell
& $NODE local-runtime\server.mjs
```

打开 <http://127.0.0.1:5180>，账号 `admin` / `admin123`。默认走内存 mock 数据，怎么点都不会弄脏真实数据。

### 要看真实数据（改后端必须走这条）

```powershell
# 窗口 1：数据库
cd $ROOT
kit\scripts\localdb.cmd start
kit\scripts\localdb.cmd status
# 期望 127.0.0.1:5432 - accepting connections

# 窗口 2：后端
cd "$ROOT\server"
$env:DB_PASSWORD = (Select-String -Path .env -Pattern '^DB_PASSWORD=(.*)$').Matches.Groups[1].Value.Trim()
& $NODE src/index.js
# 期望 [DB] ... 与 listening on 3001

# 窗口 3：预览（会自动探测 3001 并转发 /api）
cd $ROOT
& $NODE local-runtime\server.mjs
```

判断预览当前是 mock 还是真实数据：看 `local-runtime` 启动日志会打印一行"已转发到 127.0.0.1:3001"。也可以直接比对：

```powershell
curl.exe -s http://127.0.0.1:3001/api/health   # 后端本体
curl.exe -s http://127.0.0.1:5180/api/health   # 经预览转发
```

**常见失败**：

| 现象 | 原因与处理 |
|------|-----------|
| `localdb.cmd status` 无响应 | 实例没起。`localdb.cmd start`；若报端口占用，`netstat -ano \| findstr :5432` 找到旧进程先停 |
| 后端起不来，报 `password authentication failed` | `DB_PASSWORD` 没设或读错（`.env` 带 BOM，第一行要单独解析）。按上面那行命令重设 |
| 后端起不来，报 `ECONNREFUSED 5432` | 数据库没起，回到窗口 1 |
| 页面图片 404 | 正常。图片靠 Apache 的 `/upload/` 直发，Node 没有 static。预览模式下会 302 到 kilk.online 取图 |
| 页面所有接口报 `Not allowed to load local resource` | 构建产物基址坏了，回到第 4 步重构建 |

---

## 第 6 步 · 本地库以服务器为准（按需，5 分钟）

线上是唯一数据真值源。任何时候觉得本地数据可疑，就重新同步，**不要手工改本地数据再往线上推**。

```bash
# 1. 服务器导出（--no-owner 必须带，否则恢复时会撞 owner 权限）
ssh admin@120.25.179.176 'sudo -u postgres pg_dump -d kilk -Fc --no-owner --no-privileges -f /tmp/k.dump && sudo -u postgres pg_dump -d kilk --no-owner --no-privileges -f /tmp/k.sql && sudo chmod 644 /tmp/k.*'

# 2. 拉回本地
scp admin@120.25.179.176:/tmp/k.dump server/data-export/kilk.dump
scp admin@120.25.179.176:/tmp/k.sql  server/data-export/kilk.sql

# 3. 立刻删服务器上的导出（含密码哈希）
ssh admin@120.25.179.176 'sudo rm -f /tmp/k.dump /tmp/k.sql'
```

```powershell
# 4. 重建本地库（drop + create + psql -f）
kit\scripts\localdb.cmd restore
```

**校验不能只比行数，要比内容指纹**：

```powershell
kit\scripts\localdb.cmd psql
```

```sql
select 'user',     count(*), md5(coalesce(string_agg(t::text,'|' order by id),'')) from "user" t
union all select 'hotels',    count(*), md5(coalesce(string_agg(t::text,'|' order by id),'')) from hotels t
union all select 'incident',  count(*), md5(coalesce(string_agg(t::text,'|' order by id),'')) from hotel_incident t
union all select 'notice',    count(*), md5(coalesce(string_agg(t::text,'|' order by id),'')) from notice t
union all select 'developers',count(*), md5(coalesce(string_agg(t::text,'|' order by id),'')) from developers t;
```

服务器侧跑同一段（`ssh admin@... 'sudo -u postgres psql -d kilk -Atc "..."'`），三列全相同才算真一致。2026-11-13 同步后 9 张表全部一致。

> `server/data-export/` 含密码哈希，已在 `.gitignore`，**永不提交、永不外发**。

---

## 第 7 步 · 改代码（按 AGENTS.md 第 4 节找文件）

动手前确认三件事：

1. 你要改的文件不在禁改清单里（`src/index.tsx`、`src/components/ui/*`、根 `README.md`）。
2. 新增页面放 `src/pages/<Name>/<Name>.tsx`，路由只在 `src/app.tsx` 的 `<Routes>` 内加。
3. 改权限相关的东西，前后端**同时**改（前端守卫只是装饰，后端中间件才是真的）。

改完回到第 3 步重跑 tsc 与构建。

---

## 第 8 步 · 部署（只在用户明确要求时做）

### 前端（静态，不用重启）

```powershell
cd "$ROOT\dist"
tar -cf "$env:TEMP\kilk-out.tar" -C output .
tar -cf "$env:TEMP\kilk-res.tar" -C output_resource .
scp "$env:TEMP\kilk-out.tar" "$env:TEMP\kilk-res.tar" admin@120.25.179.176:/tmp/
ssh admin@120.25.179.176 "cd /var/www/kilk2/frontend && tar -xf /tmp/kilk-out.tar && tar -xf /tmp/kilk-res.tar && grep -o 'index-[A-Za-z0-9_-]*\.js' index.html | head -1"
```

最后打印的 `index-xxxx.js` 就是新的线上指纹，记下来。**两份包必须同时解压**，只传 `output` 会白屏。

### 后端（必须重启）

```powershell
scp server/src/init.js admin@120.25.179.176:/tmp/
ssh admin@120.25.179.176 "cp /tmp/init.js /var/www/kilk2/src/init.js && sudo systemctl restart kilk2 && sleep 3 && systemctl is-active kilk2 && curl -s localhost:3001/api/health"
```

重启后**必须回看日志**，别只看 `is-active`：

```powershell
ssh admin@120.25.179.176 "journalctl -u kilk2 -n 20 --no-pager"
```

看到 `[DB] 跳过 DDL（42501）` 是**正常的**（线上表 owner 是 postgres，应用账号没有 DDL 权限，`safeExec` 故意只告警）。看到 `Error` 且进程反复重启 → 立刻回滚：把上一个版本的文件拷回去再 restart。

### 线上验收

```powershell
curl.exe -s https://kilk.online/api/health
curl.exe -s https://kilk.online/ | Select-String 'index-[\w-]+\.js' | Select-Object -First 1
ssh admin@120.25.179.176 "systemctl show kilk2 -p NRestarts --value"
```

`NRestarts` 持续增长 = 在崩溃循环，不是正常状态。

---

## 第 9 步 · 提交、推送、快照（3 分钟）

```powershell
cd $ROOT
& $GIT add -A
& $GIT commit -m "fix: 具体改了什么，为什么"
& $GIT push origin main:main-local
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "一句话说明"
```

- **推到 `main-local`，不是 `main`**。`main` 是 9 月的论坛版历史，推上去会打架。
- 推送频率从低：一次完整更新验证通过后推一次，不要改一个文件推一次。
- 快照会在 `kit/private/backups/<时间>_<标签>/` 生成源码快照 + git bundle + CHANGES。

---

## 交接自检

全部勾上才算真的接手了：

- [ ] 我知道这个系统是给谁用的、核心业务是"客房故障登记与跟踪"
- [ ] 我知道代码以本地为准、数据以服务器为准
- [ ] 我用 `build.mjs` 构建过，并在产物里验证到 `var x="/api"`
- [ ] 我在本地打开过站点，登录过 `admin / admin123`
- [ ] 我跑过 `tsc`，知道基线是 0 错误
- [ ] 我知道哪三个文件不能改、哪四个目录不能提交
- [ ] 我知道前端是双 tar 部署、后端改了必须重启、DDL 失败只告警是设计
- [ ] 我知道提交要推 `main-local`，且收尾要跑 `snapshot.ps1`
