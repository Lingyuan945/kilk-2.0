# kilk 2.0 项目技术规范文档

> **怎么读这份文档**：它讲架构决策与技术约定，不写"现在是什么状态"。分支、提交号、线上版本、待办清单一律以根目录 `AGENTS.md` 第 2 节为准。
> 文中出现的"共 9 张表""部署流程"等属于约定层面的事实，与 `AGENTS.md`、`kit/onboarding/PROJECT_MAP.md` 保持一致；若发现冲突，以后两者为准并回头修正本文。
> 最后对齐：2026-11-13

## 一、整体架构

**前后端分离 + SPA 单页应用**

```
浏览器 (React SPA)
    ↓ HTTPS
Nginx/Apache 反向代理 (kilk.online)
    ├── /            → 前端静态文件 (dist/output)
    ├── /assets/     → JS/CSS (dist/output_resource)
    ├── /api/*       → Node.js:3001
    └── /upload/*    → 上传文件静态目录
         ↓
    Node.js Express 后端
         ↓
    PostgreSQL 数据库
```

**项目本地路径**：`G:\IT-08\Github\kilk 2.0`（2026-10-18 从 C 盘迁移至移动硬盘）

---

## 二、前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 8 | 构建工具 |
| React Router | 7.13 | 路由管理 |
| Tailwind CSS | 4.2 | 样式方案 |
| Radix UI | - | 无头组件库（Dialog/Dropdown/Tabs 等） |
| Framer Motion | 12 | 动画 |
| Lucide React | 1.7 | 图标库 |
| React Hook Form | 7.72 | 表单管理 |

### 前端目录结构

```
src/
├── components/     # 通用组件
│   ├── Layout.tsx              # 全局布局
│   ├── SiteHeader.tsx          # 顶部导航（下拉式登录菜单）
│   ├── AuthModal.tsx           # 登录弹窗
│   ├── DeveloperCardEntry.tsx  # 开发者卡片入口
│   └── EmptyState.tsx          # 空状态组件
├── contexts/       # React Context
│   └── AuthContext.tsx         # 用户认证上下文
├── hooks/          # 自定义 Hooks
│   └── useSiteData.ts          # 数据请求 Hook
├── lib/            # 工具库
│   ├── api.ts                  # API 请求封装
│   └── format.ts               # 格式化工具
├── pages/          # 页面（全部懒加载）
│   ├── HomePage/               # 首页
│   ├── HotelPage/              # 酒店运维列表 + 故障登记详情
│   ├── AdminPage/              # 后台管理
│   ├── ServicePage/            # 服务支持
│   ├── NoticePage/             # 平台公告
│   ├── AboutPage/              # 关于我们
│   ├── UserProfilePage/        # 用户资料页
│   ├── DeveloperCardManagePage/ # 开发者卡片管理
│   ├── DevelopersListPage/     # 开发者列表
│   ├── LingPage/               # 开发者主页（关于 Ling）
│   └── NotFoundPage/           # 404 页面
└── types/          # TypeScript 类型定义
```

### 路由规划

| 路由 | 权限 | 说明 |
|------|------|------|
| `/` | 公开 | 首页（未登录隐藏酒店运维入口） |
| `/hotel` | senior+ | 酒店运维中心列表 |
| `/hotel/:hotelId` | senior+ | 单酒店故障登记详情（抽屉式表单） |
| `/service` | 公开 | 服务支持（游客可下载） |
| `/notice` | 公开 | 平台公告 |
| `/about` | 公开 | 关于我们 |
| `/user/:id` | 登录 | 用户资料页 |
| `/admin` | admin+ | 后台管理 |
| `/developer/me` | 登录 | 开发者卡片管理 |
| `/developer/:username` | 公开 | 开发者主页 |

### 权限体系

| 角色 | 标识 | 权限范围 |
|------|------|----------|
| 游客 | 无 | 公开页面（首页、服务支持、公告、关于） |
| 普通用户 | `user` | 登录后页面、用户资料、开发者卡片 |
| 高级用户 | `senior` | 酒店运维模块 |
| 管理员 | `admin` | 后台管理、删除操作 |
| 超级管理员 | `super` | 开发者管理标签页 |

### 前端构建规范

- 所有页面使用 `React.lazy` 懒加载，独立 chunk
- 依赖分包：`react-vendor` / `router-vendor` / `icons-vendor` / `motion-vendor` / `vendor`
- 构建产物分层：
  - `dist/output/` → index.html + 静态资源（同源）
  - `dist/output_resource/` → assets（JS/CSS）
- API 基础路径：`import.meta.env.VITE_API_BASE`（生产 `/api`）

---

## 三、后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 运行环境 |
| Express | 4.21 | Web 框架 |
| PostgreSQL | - | 数据库 |
| pg | 8.23 | PostgreSQL 驱动 |
| JWT | 9.0 | 用户认证 |
| bcryptjs | 2.4 | 密码加密 |
| multer | 2.4 | 文件上传 |
| CORS | 2.8 | 跨域处理 |

### 后端目录结构

```
server/src/
├── index.js        # 入口文件
├── config.js       # 配置管理（环境变量）
├── db.js           # 数据库连接池
├── init.js         # 数据库初始化（建表 + 种子数据）
├── middleware/
│   └── auth.js     # 认证中间件
├── routes/
│   ├── auth.js         # 登录/注册（注册已关闭）
│   ├── hotel.js        # 酒店运维 + 故障登记 + 附件上传
│   ├── admin.js        # 后台管理
│   ├── user.js         # 用户管理（资料/头像/密码）
│   ├── notice.js       # 公告
│   ├── service.js      # 服务支持
│   ├── ling.js         # 开发者主页
│   ├── developers.js   # 开发者管理
│   └── home.js         # 首页数据
└── utils/
    └── password.js     # 密码工具
```

### 中间件

| 中间件 | 说明 |
|--------|------|
| `authRequired` | 必须登录 |
| `authOptional` | 可选登录（有 token 解析，无则继续） |
| `adminRequired` | 管理员权限（admin/super） |
| `seniorRequired` | 高级用户权限（senior/admin/super） |

### API 设计规范

**统一响应格式**：
```json
{
  "ok": true,
  "msg": "操作成功",
  "data": {},
  "stats": {}
}
```

**错误格式**：
```json
{
  "ok": false,
  "msg": "错误信息"
}
```

**HTTP 状态码**：
- 200 成功
- 400 参数错误（JSON 解析失败）
- 401 未登录/token 过期（前端自动清 token）
- 403 权限不足
- 404 资源不存在
- 500 服务器错误

---

## 四、数据库设计

### 连接池配置

```javascript
{
  max: 10,                    // 最大连接数
  idleTimeoutMillis: 30000,   // 闲置连接超时 30 秒
  connectionTimeoutMillis: 5000,  // 获取连接超时 5 秒
  maxLifetimeSeconds: 3600,   // 连接最长生命周期 1 小时（自动重建）
}
```

连接池启用 `error` 事件监听，防止闲置连接断开导致进程崩溃。

### 数据表（共 9 张）

| 表名 | 用途 |
|------|------|
| `user` | 用户表（用户名、密码、角色、头像、签名、部门、工号等） |
| `hotels` | 酒店元数据（名称、楼栋、类别、设备类型 JSON 配置） |
| `hotel_incident` | 客房故障登记（房间号、楼栋、状态、附件、时长等） |
| `notice` | 平台公告 |
| `home_content` | 首页内容配置（Banner、卡片文案） |
| `ling_profile` | 开发者个人主页配置 |
| `developers` | 开发者卡片信息 |
| `service_file` | 服务支持文件分类 |
| `service_file_item` | 服务支持文件条目（版本、下载量） |

### 关键设计

- 附件存储：`attachment` 字段存 JSON 数组字符串（支持多图）
- 故障编号：自动生成 `GZYYYYMMDD-NNN` 格式
- 状态流转：`pending`（待处理）→ `processing`（处理中）→ `done`（已完成）
- 时长计算：从创建时间开始自动计算等待时长和总耗时
- 酒店配置：`buildings` / `categories` / `device_types` 均为 JSONB 数组

---

## 五、部署规范

### 服务器信息

- IP：`120.25.179.176`（阿里云）
- 用户：`admin`
- 线上域名：`https://kilk.online`
- 后端服务：systemd 管理（`kilk2.service`）
- 前端目录：`/var/www/kilk2/frontend/`
- 后端目录：`/var/www/kilk2/`
- 上传目录：`/var/www/kilk2/public/upload/`

### 部署流程（三端同步）

1. **本地开发**：修改代码
2. **Git 提交**：`git add . && git commit -m "xxx"`（不推送远端）
3. **构建**：`VITE_API_BASE=/api npx vite build`
4. **上传前端**：
   - `tar -cf dist/output` → scp → 服务器解压
   - `tar -cf dist/output_resource` → scp → 服务器解压
5. **上传后端**：
   - scp 改动的 `server/src/xxx.js` 到服务器
   - `sudo systemctl restart kilk2.service`
6. **验证**：`curl http://localhost:3001/api/health` + 线上页面检查

### 环境变量

```env
PORT=3001
DB_HOST=127.0.0.1
DB_USER=kilk
DB_PASSWORD=********
DB_NAME=kilk
JWT_SECRET=********
CORS_ORIGIN=https://kilk.online
NODE_ENV=production
```

---

## 六、代码规范要点

### 前端
- 使用 `cn()` 工具合并 Tailwind 类名
- 深色科技风设计语言（slate 色系 + 渐变色 + 网格背景）
- 响应式：移动端优先，`md:` 断点适配桌面
- 错误处理：`try/catch` + toast 提示
- 加载状态：骨架屏 / Spinner
- 抽屉式表单：故障登记使用右侧滑出抽屉，提交按钮固定底部
- 401 自动处理：API 层拦截 401 响应，自动清除 token

### 后端
- 所有路由必须有错误处理（try/catch）
- 数据库查询使用参数化（`$1, $2`），防 SQL 注入
- 权限中间件按路由粒度挂载
- 文件上传限制：故障附件 5MB（仅图片），头像 2MB
- JSON 解析错误返回 400 而非 500

---

## 七、已实现功能清单

**酒店运维模块**：
- 多酒店管理（启用/停用、排序、主题色）
- 故障登记（右侧抽屉式表单）
- 多图附件上传（支持多张）
- 故障状态流转（待处理→处理中→已完成）
- 故障编辑（内容、类别、设备、附件）
- 创建时间完整显示（年月日时分秒）
- 按酒店隔离数据
- 关键词搜索 + 状态筛选
- 故障统计（待处理/处理中/已完成/总数）

**权限体系**：
- 四级角色（user/senior/admin/super）
- 路由守卫 + API 权限双重校验
- 注册通道已关闭（仅管理员开通账号）
- 未登录隐藏酒店运维入口
- 开发者管理选项对无权限账户隐藏

**用户系统**：
- 用户资料页（头像、签名、部门、工号）
- 头像上传
- 密码修改
- 下拉式登录菜单

**其他**：
- 平台公告
- 服务支持中心（游客可下载）
- 开发者主页（关于 Ling）
- 开发者卡片管理
- 开发者列表

---

## 八、维护与清理规范

### 三端同步原则
任何代码改动必须同时完成：
1. **本地 Git 提交**（不推送远端）
2. **本地 Vite 构建**（`VITE_API_BASE=/api npx vite build`）
3. **服务器部署**（scp + systemctl restart）

### 冗余清理规范
- 废弃功能必须从三端完整移除：前端页面、路由、hooks、类型定义、后端路由、数据库表
- 数据库表删除前确认无关联依赖（CASCADE）
- 清理后必须验证：`tsc --noEmit` 编译通过、`vite build` 构建通过、线上服务正常运行
- 已移除模块：旧论坛系统（forum_post / forum_post_image / forum_reply / channel 表及相关路由页面）

### 本地环境维护
- C 盘根目录禁止存放临时文件和调试 profile（`edge-headless-*` 等）
- 用户主目录只保留必要工具配置（.ssh / .gitconfig / .vscode / Doubao 等）
- 定期清理 TEMP 目录和 Windows Temp 目录
- 项目代码统一存放于移动硬盘 `G:\IT-08\`
