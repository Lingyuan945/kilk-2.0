# 快速上手 · 10 分钟接手 kilk 2.0

给刚接手这个项目的智能体。按顺序做，不要跳步。

## 第 0 分钟 · 三件事先确认

1. 当前目录是 `G:\IT-08\Github\kilk 2.0`（路径含空格）。
2. 你有可用的文件读写与命令执行能力；PATH 里**没有** node/npm/git，用本文给的固定路径。
3. 先读 `kit/rules/00-constitution.md`——违反它会白干。

## 第 1 分钟 · 知道自己站在哪

```powershell
$GIT = "G:\IT-08\Github\kilk 2.0\kit\private\tools\PortableGit\cmd\git.exe"
& $GIT status --short
& $GIT log --oneline -5
```

- 工作区干净 = 上一轮已收尾。
- 有改动 = 先看清是什么，别直接覆盖。

## 第 2 分钟 · 认清三端

| 端 | 现状 | 怎么访问 |
|----|------|---------|
| 本地 | 唯一源码真值源 | 就在当前目录 |
| 服务器 | `https://kilk.online`，Apache → Node 3001，systemd `kilk2` | `ssh admin@120.25.179.176`（已免密） |
| GitHub | `Lingyuan945/kilk-2.0` | SSH 已配好，`git push` 即可 |

## 第 3 分钟 · 跑一次类型检查，感受基线

```powershell
$NODE = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
& $NODE "node_modules\typescript\bin\tsc" -p tsconfig.app.json
```

预期：9 处历史错误（清单在 `PROJECT_MAP.md` 第四节）。**这 9 处不是你造成的**，改动只需保证不新增。

## 第 4 分钟 · 跑一次构建，确认工具链

```powershell
$env:VITE_API_BASE = '/api'
& $NODE "node_modules\vite\bin\vite.js" build
```

会重写 `dist/output` 与 `dist/output_resource`（两者需同时部署）。

注意：在受沙箱限制的执行环境里，`vite build` 会因内部子进程管道限制报 `spawn EPERM`，**需要完全权限执行**；`tsc` 不受影响。

## 第 5 分钟 · 读项目地图

`kit/onboarding/PROJECT_MAP.md`：运行链路、路由与权限、页面职责、后端接口、数据表、已知问题。

## 第 6-7 分钟 · 读规范（按需）

- `kit/specs/TECH_SPEC.md`：架构、API 约定、数据库、部署规范
- `kit/specs/HANDOVER.md`：酒店运维模块细节、楼栋规则、路由顺序
- `kit/specs/EXPERIENCE.md`：历史踩坑与测试方法论（含 puppeteer 坑）
- `kit/specs/` 之外的根 `README.md` 是妙搭模板规范，**不是本项目业务说明**

## 第 8 分钟 · 认清环境限制

- 本机**已经有数据库**：PostgreSQL 16.15 便携版，装在 `kit/private/tools/pg16/pgsql`，数据目录 `kit/private/pgdata`，端口 5432，库名 `kilk`，账号密码取自 `server/.env`。
- 启停用 `kit\scripts\localdb.cmd`（start / stop / status / psql / restore），不需要装 PostgreSQL，也不需要 Docker。
- 后端可以在本地起：`cd server` 后设好 `DB_PASSWORD`（从 `.env` 读）再 `node src/index.js`，接口打到 3001。
- 编码坑：PowerShell 5.1 读 UTF-8 要加 `-Encoding UTF8`。

## 第 8.5 分钟 · 本地库以服务器为准

线上是唯一真值源。本地库任何时候都通过与线上导出文件对齐，不要手工改本地数据后往线上推。

```bash
# 1. 服务器导出（在服务器上执行）
sudo -u postgres pg_dump -d kilk -Fc --no-owner --no-privileges -f /tmp/kilk.dump
sudo -u postgres pg_dump -d kilk --no-owner --no-privileges -f /tmp/kilk.sql

# 2. 拉回本地（server/data-export 已在 .gitignore 里）
scp admin@120.25.179.176:/tmp/kilk.dump server/data-export/
scp admin@120.25.179.176:/tmp/kilk.sql  server/data-export/

# 3. 重建本地库
kit\scripts\localdb.cmd restore
```

`server/data-export/` 含密码哈希，**永不提交**；服务器侧的 `/tmp/kilk.*` 导出完立刻删。

校验是否真的一致（比行数不够，要比内容指纹）：

```sql
select 'user'||md5(string_agg(t::text,'|' order by id)) from "user" t;  -- 逐表跑
```

## 第 9 分钟 · 确认改动流程

`kit/rules/01-workflow.md` 的 8 步：看现状 → 改 → tsc → build → 验证 → 部署前端（双 tar）→ 部署后端（改了就重启）→ 提交 + 推送 + 快照。

## 第 10 分钟 · 收尾动作

```powershell
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "本次更新的一句话说明"
```

会在 `kit/private/backups/` 生成一个完整备份文件夹。

## 交接自检

- [ ] 我知道哪三个文件不能改
- [ ] 我知道 tsc 基线是 0 错误，新增一处就算我头上
- [ ] 我知道本地库用 `localdb.cmd` 启停，且以服务器为准
- [ ] 我知道前端要双 tar 部署，后端改了要重启
- [ ] 我知道密钥和备份在 `kit/private/`，不能提交
- [ ] 我知道用户要中文、不要 emoji、视觉克制
