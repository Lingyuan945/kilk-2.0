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

## 第 5 分钟 · 读项目地图

`kit/onboarding/PROJECT_MAP.md`：运行链路、路由与权限、页面职责、后端接口、数据表、已知问题。

## 第 6-7 分钟 · 读规范（按需）

- `kit/specs/TECH_SPEC.md`：架构、API 约定、数据库、部署规范
- `kit/specs/HANDOVER.md`：酒店运维模块细节、楼栋规则、路由顺序
- `kit/specs/EXPERIENCE.md`：历史踩坑与测试方法论（含 puppeteer 坑）
- `kit/specs/` 之外的根 `README.md` 是妙搭模板规范，**不是本项目业务说明**

## 第 8 分钟 · 认清环境限制

- 本机**没有数据库**，后端跑不起来，本地不做接口联调。
- 本地能做的验证：类型检查、构建、静态页预览、无头截图。
- 数据相关验证只能在服务器侧做。
- 编码坑：PowerShell 5.1 读 UTF-8 要加 `-Encoding UTF8`。

## 第 9 分钟 · 确认改动流程

`kit/rules/01-workflow.md` 的 8 步：看现状 → 改 → tsc → build → 验证 → 部署前端（双 tar）→ 部署后端（改了就重启）→ 提交 + 推送 + 快照。

## 第 10 分钟 · 收尾动作

```powershell
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "本次更新的一句话说明"
```

会在 `kit/private/backups/` 生成一个完整备份文件夹。

## 交接自检

- [ ] 我知道哪三个文件不能改
- [ ] 我知道 9 处历史类型错误不是我的锅，但也不能增加
- [ ] 我知道前端要双 tar 部署，后端改了要重启
- [ ] 我知道密钥和备份在 `kit/private/`，不能提交
- [ ] 我知道用户要中文、不要 emoji、视觉克制
