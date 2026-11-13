# kit —— kilk 2.0 项目资料包

本目录把 kilk 2.0 的**代码之外的一切**收拢在一起：规范、规则、上手文档、可复用脚本，以及只属于这台机器的工具、密钥和备份。

## 从哪开始

| 你想知道 | 读这个 |
|---------|--------|
| 这个项目是什么、现在什么状态、我该干什么 | 根目录 [AGENTS.md](../AGENTS.md)（唯一入口，5 分钟） |
| 怎么把环境跑起来（含每一步的预期输出） | [onboarding/QUICKSTART.md](onboarding/QUICKSTART.md) |
| 某个页面 / 接口 / 数据表是干什么的 | [onboarding/PROJECT_MAP.md](onboarding/PROJECT_MAP.md) |
| 红线、流程、验收 | [rules/](rules/) 三份 |
| 架构决策、业务规则、历史踩坑 | [specs/](specs/) 三份 |

**状态只在 `AGENTS.md` 第 2 节维护**，其他文档不重复写分支/提交/线上版本，避免两处说法打架。发现不一致，以 `AGENTS.md` 为准并顺手修正那一处。

## 目录结构与上传策略

| 路径 | 内容 | 能否上传 GitHub |
|------|------|----------------|
| `kit/README.md` | 本文件，索引与规则说明 | 可以 |
| `kit/manifest.json` | 机器可读清单（目录用途、上传标记、环境事实） | 可以 |
| `kit/specs/` | 项目规范：TECH_SPEC / HANDOVER / EXPERIENCE | 可以 |
| `kit/rules/` | 智能体硬性约束、三端流程、验收清单 | 可以 |
| `kit/onboarding/` | 新智能体快速上手与项目地图 | 可以 |
| `kit/scripts/` | 构建、链路验证、快照备份、本地库启停、git 包装脚本 | 可以 |
| `kit/private/tools/` | 便携 Git（388MB）+ PostgreSQL 16 便携版 | **禁止** |
| `kit/private/pgdata/` | 本地 PostgreSQL 数据目录（含真实数据副本） | **禁止** |
| `kit/private/keys/` | SSH 私钥副本与公钥、known_hosts | **禁止** |
| `kit/private/backups/` | 每次完整更新的快照文件夹 | **禁止** |
| `kit/private/history/` | 历史维护记录 | **禁止** |
| `kit/private/archive/` | 归档：旧部署包、废弃数据、数据导出、临时 token | **禁止** |
| `kit/private/state/` | 本机状态：最近备份指针、日志 | **禁止** |
| `kit/private/sandbox/` | 沙箱 ACL 诊断报告与修复脚本 | **禁止** |
| `local-runtime/`（仓库根） | 本地预览环境：静态托管 + mock / 转发 API | 可以（uploads、screenshots 已忽略） |

`.gitignore` 已忽略 `kit/private/`、`server/data-export/`、`local-runtime/uploads/`，因此**上传与不同步两类文件物理上在同一个文件夹，但提交时会自动分开**。新增私有文件一律放进 `kit/private/`。

## 三个"不可上传"的判断标准

1. **含密钥**：任何私钥、token、`.env` 实际值。
2. **含本机绝对路径或机器状态**：备份快照、缓存、日志、诊断报告。
3. **体积大且可重建**：`node_modules`、`dist`、便携工具链。

## 备份机制

每次"一次完整更新"（改代码 → 验证 → 构建 → 部署 → 提交）结束后执行：

```powershell
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "酒店运维-楼栋识别修复"
```

产物是一个独立文件夹：

```
kit/private/backups/20261113-101530_酒店运维-楼栋识别修复/
├── source/            # 源码与配置的可读快照（不含依赖与产物）
├── repo.bundle        # 完整 git 历史（可 git clone 还原）
├── MANIFEST.json      # 提交号、分支、时间、文件数、体积、标签
├── CHANGES.md         # 本次更新涉及的提交与改动文件
└── README.md          # 如何从这份备份还原
```

同时在 `kit/private/backups/INDEX.md` 追加一行索引，便于按时间找到某次更新的状态。

## 本地环境（这台机器专属）

| 东西 | 位置 | 说明 |
|------|------|------|
| Node | `C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe` | v24，唯一可用 node |
| npm | `C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2-6\npm.cmd` | Node 22 |
| Git | `kit/private/tools/PortableGit/cmd/git.exe` | 2.56.1 |
| PostgreSQL | `kit/private/tools/pg16/pgsql` + `kit/private/pgdata` | 16.15，端口 5432，库 `kilk`，默认不启动 |
| 数据导出 | `server/data-export/` | 从服务器 pg_dump 拉回，含密码哈希，**禁止提交** |

`kit\scripts\localdb.cmd start | stop | status | psql | restore [dump]` 管理本地库。数据以服务器为准，同步方法见 QUICKSTART 第 6 步。

## 脚本清单

| 脚本 | 用途 | 典型调用 |
|------|------|---------|
| `scripts/status.ps1` | **一键体检**：分支/tsc/构建/本地服务/线上/服务器全部现场测 | `.\kit\scripts\status.ps1` |
| `scripts/git.ps1` | 调用项目内置便携 Git（免去每次写全路径） | `.\kit\scripts\git.ps1 status` |
| `scripts/build.ps1` | 类型检查 + 生产构建（写 `dist/output`） | `.\kit\scripts\build.ps1 -Typecheck` |
| `scripts/localdb.cmd` | 启停本地 PostgreSQL、连 psql、恢复导出 | `.\kit\scripts\localdb.cmd status` |
| `scripts/verify-links.ps1` | 验证 GitHub / 服务器两条 SSH 链路 | `.\kit\scripts\verify-links.ps1` |
| `scripts/snapshot.ps1` | 生成一次完整更新的备份文件夹 | `.\kit\scripts\snapshot.ps1 -Label "..."` |

脚本均为纯 ASCII 输出，避免 Windows PowerShell 5.1 的编码问题。`.cmd` 必须是 CRLF 换行（`.gitattributes` 已固定）。

## 维护约定

- 规范或状态变更时，同步更新 `manifest.json` 的 `updated` 字段与 `AGENTS.md` 第 2 节的核对日期。
- 新增脚本必须写进上面的表格。
- `kit/private/` 里的任何文件都不得 `git add -f`。
- 文档里的命令必须是**实际跑通过的**；没验证过的写法标注"未验证"，不要凭印象写。
