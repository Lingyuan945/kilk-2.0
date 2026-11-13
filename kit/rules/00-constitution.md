# 00 · 硬性约束（不得违反）

这些是 kilk 2.0 的地基规则。违反其中任何一条，改动都不算完成。

## 禁止修改

| 文件 | 原因 |
|------|------|
| `src/index.tsx` | Provider 层级、Router、样式引入由模板管理 |
| `src/components/ui/*` | shadcn/ui 内置组件，版本锁定 |
| `README.md`（根目录） | 妙搭（Miaoda）模板规范，平台会读取 |

`src/app.tsx` 只允许在 `<Routes>` 内增删 `<Route>`，禁止再包一层 Router。

## 目录归属

| 内容 | 位置 |
|------|------|
| 页面 | `src/pages/<PageName>/<PageName>.tsx` |
| 页面专属组件 | `src/pages/<PageName>/components/` |
| 通用组件 | `src/components/` |
| Hook | `src/hooks/` |
| 工具函数 | `src/lib/` |
| 后端路由 | `server/src/routes/<name>.js` |

## 编码与文本（本项目最容易踩）

1. 所有源码、文档保存为 **UTF-8**。
2. 当前 shell 是 **Windows PowerShell 5.1**，`Get-Content` 默认按 GBK 解码，读 UTF-8 源码会显示乱码。读文件一律用 `-Encoding UTF8`，或直接用编辑器的读取能力。
3. `.ps1` 脚本内**不要写非 ASCII 字符**（无 BOM 的 UTF-8 会被 5.1 误读），注释与输出用英文。
4. 面向用户的界面文案与对话使用**中文，不使用 emoji**。

## 路径与命令

1. 项目路径含空格：`G:\IT-08\Github\kilk 2.0`。给原生程序传含空格参数时，用 `--%` 停止解析、或拆成独立的引号参数；不要拼成一整串再传。
2. 本机 **PATH 里没有 node / npm / git**，必须使用固定路径（见 `01-workflow.md`）。
3. 项目内便携 Git 位于 `kit/private/tools/PortableGit/cmd/git.exe`。

## 工程底线

1. 每次改动必须通过 **TypeScript 编译**与 **vite build**。当前仓库存在 9 处历史类型错误，允许存在但**不得新增**（见 `onboarding/PROJECT_MAP.md`）。
2. 前端可视化验证以**控制台零报错**为底线。
3. 提交信息用中文、动词开头，说明"改了什么 + 为什么"。
4. 不做版本回退（用户明确否决），历史版本记录不再保留。
5. 视觉改动**先确认再动手**：用户偏好克制、留白、浅色；已确认的亮青蓝渐变标题不要擅自改掉。

## 安全

1. `.env`、私钥、token、`kit/private/` 一律不进仓库。
2. 不要把数据库密码、JWT 密钥写进文档、脚本、提交信息。
3. 新增上传接口必须挂鉴权与类型白名单（历史遗留的 `/api/hotel/upload` 无鉴权，属待修项）。
