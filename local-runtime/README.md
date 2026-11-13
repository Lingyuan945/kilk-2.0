# local-runtime · 本地运行环境

把 kilk 2.0 在本地跑起来看效果，**不需要装 PostgreSQL**。

一个 Node 进程同时干四件事：托管构建产物、映射 `/upload/`、提供 `/api/*` 的 mock 接口、SPA 深链接回退。

## 启动

双击 `start.cmd`，或：

```powershell
node local-runtime\server.mjs
```

浏览器打开 <http://127.0.0.1:5180>。

如果 `dist/output` 不存在，`start.cmd` 会先跑一次构建。

## 账号

| 账号 | 密码 | 角色 | 能看到什么 |
|------|------|------|-----------|
| `admin` | `admin123` | super | 全部页面 + 后台 6 个 Tab |
| `senior` | `senior123` | senior | 首页 / 酒店运维 / 公告 / 服务 / 名片 |
| `user` | `user123` | user | 公开页面，进不去酒店运维 |

## 数据

全部在内存里（`data.mjs`），**重启即还原**。已铺好：

- 4 家酒店（含 1 家停用），3 栋 / 6 类故障 / 9 类设备的真实配置
- 14 条故障记录（待处理 / 处理中 / 已完成都有），带附件缩略图
- 3 条公告（1 条置顶）、2 个服务文件共 3 个版本、1 张开发者名片

新增 / 编辑 / 删除 / 状态流转 / 图片上传都能真的走通，写进内存后页面即时看到。

## 文件

| 文件 | 作用 |
|------|------|
| `server.mjs` | 静态托管 + mock API（零依赖，只用 node 内置模块） |
| `data.mjs` | 种子数据，想改演示内容就改这里 |
| `build.mjs` | 构建包装器，见下面「已知坑」 |
| `smoke.mjs` | 无头 Edge 跑 10 个页面，抓控制台报错并截图 |
| `start.cmd` | 一键启动 |
| `uploads/` | 上传落盘目录（已 gitignore） |
| `screenshots/` | `smoke.mjs` 的截图输出（已 gitignore） |

## 冒烟检查

```powershell
node local-runtime\smoke.mjs
```

会用 `puppeteer-core` + 本机 Edge 打开 10 个路由，输出 `screenshots/*.png`，并在控制台有报错时以非零码退出。

## 已知坑：Git Bash 会改坏 VITE_API_BASE

在 Git Bash / MSYS 下这样构建是**错的**：

```bash
export VITE_API_BASE=/api && node node_modules/vite/bin/vite.js build
```

MSYS 会把 `/api` 转成 `D:/.../PortableGit/api`，打包结果里的接口基址就变成了 file:// 路径，页面全部接口失败。

正确做法二选一：

```powershell
# PowerShell（推荐，官方流程）
$env:VITE_API_BASE = '/api'
node node_modules\vite\bin\vite.js build
```

```bash
# 或走包装器，由 Node 自己设环境变量
node local-runtime/build.mjs
```

## 和线上的差别

- 没有真实数据库，接口是内存实现，重启丢数据
- 没有 JWT 签名与 bcrypt，密码明文比对（仅本地）
- 权限只做粗粒度模拟：`user` / `senior` / `admin` 三档，`super` 等同 `admin`
- 服务文件的下载是真实文件流（`uploads/` 里的都是占位内容）
