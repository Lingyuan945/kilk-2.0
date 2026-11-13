# 02 · 验收清单

每次改动按顺序自查。任何一项不通过，就不要进入部署。

## 代码层

- [ ] 没有修改 `src/index.tsx`、`src/components/ui/*`、根 `README.md`
- [ ] 新增页面放在 `src/pages/<Name>/`，路由只在 `app.tsx` 的 `<Routes>` 内注册
- [ ] 类型检查无**新增**错误（`tsc -p tsconfig.app.json`）
- [ ] `vite build` 成功，`dist/output` 与 `dist/output_resource` 同时更新
- [ ] 没有提交 `kit/private/`、`.env`、日志、`dist`
- [ ] 没有新增 `console.log` 残留；错误分支有用户可见反馈，不是静默 `catch`

## 接口层（改后端时）

- [ ] 统一响应格式 `{ ok: true, data }` / `{ ok: false, msg }`
- [ ] 新接口挂了对的中间件：`authRequired` / `seniorRequired` / `adminRequired`
- [ ] SQL 全部参数化（`$1..$n`），动态字段来自白名单
- [ ] 上传接口有大小限制 + MIME/扩展名白名单
- [ ] `curl -s localhost:3001/api/health` 返回 `ok:true`

## 前端层

- [ ] 登录/未登录两种状态都看过（权限相关改动必须两种都验）
- [ ] 移动端窄屏（390px）与桌面（1280px）都不溢出、不遮挡
- [ ] 控制台零报错、无 React key 告警
- [ ] 空数据、接口失败两种异常态有兜底，不出现"白屏但无提示"
- [ ] 骨架屏是深色（`bg-slate-700/40`），不使用亮蓝

## 部署层

- [ ] 前端双 tar 同时上传解压，记录线上 `index-xxxx.js` 指纹
- [ ] 改了后端则 `systemctl restart kilk2` 且 `systemctl is-active kilk2` 为 active
- [ ] 线上页面能打开、关键接口返回 200
- [ ] `https://kilk.online` 首页引用的 js 指纹与新构建一致

## 收尾

- [ ] `git status` 干净
- [ ] 提交信息说明改了什么、为什么
- [ ] 已按需推送 GitHub
- [ ] 已执行 `snapshot.ps1` 生成备份文件夹
- [ ] 若改变了架构/约定，同步更新 `kit/specs` 与 `kit/onboarding`
