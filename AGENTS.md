# AGENTS.md · kilk 2.0

本文件是任何智能体接手本项目的**唯一入口**。读完它，再按指向继续。

## 这是什么

kilk 2.0 是一个已上线的团队内部平台（`https://kilk.online`）：React 19 + Vite + TypeScript + Tailwind 4 前端，Node/Express + PostgreSQL 后端，Apache 反代。核心业务是**酒店运维**（多酒店、客房故障登记与状态流转），外围有公告、服务支持下载、开发者名片、用户与后台管理。

## 先读这两份

1. `kit/onboarding/QUICKSTART.md` —— 10 分钟上手，含固定命令路径
2. `kit/onboarding/PROJECT_MAP.md` —— 架构、路由、接口、数据表、已知问题

## 硬性约束（违反即返工）

- **禁改**：`src/index.tsx`、`src/components/ui/*`、根 `README.md`（妙搭模板规范）。
- 路由只在 `src/app.tsx` 的 `<Routes>` 内增删；页面放 `src/pages/<Name>/<Name>.tsx`。
- PATH 里**没有** node / npm / git，必须用项目内固定路径（见 QUICKSTART）。
- 项目路径含空格，命令传参要加引号；本机 shell 是 PowerShell 5.1，读 UTF-8 文件加 `-Encoding UTF8`。
- 改动必须通过 `tsc` 与 `vite build`；仓库有 9 处历史类型错误，**不得新增**。
- 中文交流，不用 emoji；视觉改动先确认，保持克制留白。
- 密钥、`.env`、备份、工具链都在 `kit/private/`，**永不提交**。

## 三端

| 端 | 职责 | 访问 |
|----|------|------|
| 本地 | 唯一源码真值源 | 当前目录 |
| 服务器 | 线上运行（Apache → Node 3001，systemd `kilk2`） | `ssh admin@120.25.179.176`（免密已验证） |
| GitHub | 代码库备份 `Lingyuan945/kilk-2.0` | SSH 免密已验证 |

完整流程见 `kit/rules/01-workflow.md`：改代码 → tsc → build → 验证 → 双 tar 部署前端 → 后端重启 → 提交 → 推送 → 快照。

## 资料包 `kit/`

- `kit/specs/` 项目规范（TECH_SPEC / HANDOVER / EXPERIENCE）
- `kit/rules/` 硬约束、流程、验收清单
- `kit/onboarding/` 上手与项目地图
- `kit/scripts/` `git.ps1` / `build.ps1` / `verify-links.ps1` / `snapshot.ps1`
- `kit/private/` 便携 Git、密钥副本、备份、沙箱记录（已 gitignore）

## 每次完整更新后

```powershell
powershell -ExecutionPolicy Bypass -File ".\kit\scripts\snapshot.ps1" -Label "一句话说明"
```

生成 `kit/private/backups/<时间>_<标签>/`（源码快照 + git bundle + 变更记录）并在 `INDEX.md` 追加索引。

## 当前状态（2026-11-13）

- 本地：`main` 分支，工作区干净；构建产物 `dist/output` 与线上 `index-IaKZUkHv.js` 一致。
- 服务器：`kilk2` active，`/api/health` 正常。
- GitHub：停在 2026-09-16（`b740184`），与本地是**两条无共同祖先的历史**；本地内容更全，推送前需按 `kit/README.md` 的备份策略处理，不要直接 `push --force`。
