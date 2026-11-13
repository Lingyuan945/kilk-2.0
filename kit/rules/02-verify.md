# 02 · 验收清单

每次改动按顺序自查。任何一项不通过，就不要进入部署。

## 代码层

- [ ] 没改 `src/index.tsx`、`src/components/ui/*`、根 `README.md`
- [ ] 新增页面在 `src/pages/<Name>/`，路由只在 `app.tsx` 的 `<Routes>` 内注册
- [ ] `tsc -p tsconfig.app.json` **0 错误**（基线就是 0，不是"没新增"）
- [ ] `node local-runtime/build.mjs` 成功，`dist/output` 与 `dist/output_resource` 同时更新
- [ ] 产物里能搜到 `var x="/api"`（不是 `file:///` 或 `D:/.../PortableGit/api`）
- [ ] 没有提交 `kit/private/`、`.env`、`server/data-export/`、`dist`
- [ ] 没有遗留 `console.log`；错误分支有用户可见反馈，不是静默 `catch`

## 接口层（改后端时）

- [ ] 统一响应格式 `{ ok: true, data }` / `{ ok: false, msg }`
- [ ] 新接口挂了对的中间件：`authRequired` / `seniorRequired` / `adminRequired`
- [ ] 权限相关改动**前后端同时改**（前端守卫只是装饰）
- [ ] SQL 全部参数化（`$1..$n`），动态字段来自白名单
- [ ] 上传接口有大小限制 + MIME/扩展名白名单 +（新接口必须有）鉴权
- [ ] `server/src/init.js` 里的 DDL 仍包在 `safeExec()` 里，没有改回裸 `db.exec`
- [ ] `curl -s localhost:3001/api/health` 返回 `ok:true`
- [ ] **数据类改动回查过数据库**，不是只看接口返回 ok

## 前端层

- [ ] 登录/未登录两种状态都看过（权限相关必须两种都验）
- [ ] 移动端 390px 与桌面 1280px 都不溢出、不遮挡
- [ ] 控制台零报错、无 React key 告警
- [ ] 空数据、接口失败两种异常态有兜底，不出现"白屏但无提示"
- [ ] 骨架屏是深色（`bg-slate-700/40`），不使用亮蓝
- [ ] 动效只用 CSS，没有引入 framer-motion 做页面转场

## 部署层

- [ ] 前端双 tar 同时上传解压，记录了线上 `index-xxxx.js` 指纹
- [ ] 改了后端则 `systemctl restart kilk2`，`is-active` 为 active
- [ ] 重启后看过 `journalctl`，`NRestarts` 没有持续增长
- [ ] 线上页面能打开、关键接口返回 200
- [ ] `https://kilk.online` 首页引用的 js 指纹与本次构建一致

## 收尾

- [ ] `git status` 干净
- [ ] 提交信息说明改了什么、为什么（中文、动词开头）
- [ ] 已推 `origin main:main-local`（不是 `main`）
- [ ] 已执行 `snapshot.ps1` 生成备份
- [ ] 若改了架构/约定/状态，同步更新 `AGENTS.md`（第 2 节状态与日期、第 9 节待办）与相关文档

## 汇报层

- [ ] 说清了"改了哪些文件、验证到哪一步、有没有部署"
- [ ] 部署失败或出现停机，如实说明时间与影响，不淡化
- [ ] 没把"本地验证通过"说成"已上线"
