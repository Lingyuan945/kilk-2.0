# kilk 2.0 代码维护清单

> 创建时间：2026-09-16 · 维护人：Doubao（Ling 授权）
> 目标：去除冗余代码、提升网站性能、验证全部功能

## 一、代码项目盘点

### 前端（React 19 + Vite + TS + Tailwind 4，src/ 约 477KB）
| 模块 | 路径 | 说明 |
|---|---|---|
| 入口 | src/index.tsx、app.tsx、index.css | 路由表 9 个页面 |
| 布局组件 | Layout、SiteHeader、SiteFooter | 全站外壳 |
| 业务组件 | AuthModal、ErrorFallback、CodeSphere、SkillBar、SocialIcon、TechBackground | 登录/错误边界/关于Ling |
| Hooks | useSiteData、use-mobile | 数据获取 |
| Lib | api、utils、format、animations | 请求封装/工具 |
| 页面 | HomePage、ForumPage、PostDetailPage、ServicePage、AboutPage、LingPage、UserProfilePage、AdminPage、NotFoundPage | 9 个在用页面 |
| UI 组件 | components/ui/（70 个） | shadcn/ui 全家桶 |

### 后端（Node + Express + pg，server/src/ 约 62KB）
| 模块 | 说明 |
|---|---|
| index.js / config.js / db.js / init.js | 服务入口/配置/PG连接/建表 |
| middleware/auth.js | JWT 鉴权 |
| routes/（admin、auth、forum、home、ling、service、user） | 7 组 REST API |
| utils/password.js | bcrypt 密码工具 |

## 二、优化清单（按执行顺序）

| # | 项目 | 内容 | 状态 |
|---|---|---|---|
| 1 | 死代码清理 | 删除未引用的 3 个页面（Contact/Example/Projects）+ 6 个 section + 5 个组件 + 37 个未用 ui 组件 | ⏳ |
| 2 | 死依赖移除 | 移除 framer-motion（仅死代码引用） | ⏳ |
| 3 | 路由懒加载 | React.lazy + Suspense，页面级分包，降低首屏 JS | ⏳ |
| 4 | 构建分包 | vite manualChunks 优化 vendor 拆分 | ⏳ |
| 5 | 后端冗余 | 检查中间件/路由/SQL 冗余 | ⏳ |
| 6 | 全功能验证 | 前台 6 页 + 后台 5 tab + 个人主页 + 服务支持 | ⏳ |
| 7 | 部署回归 | 服务器部署 + 手机端 360px 溢出检查 | ⏳ |
| 8 | Git 提交 | 分批提交并推送 GitHub | ⏳ |

## 三、已验证结论
- 路由表确认：ContactPage / ExamplePage / ProjectsPage / AboutPage sections / HomePage sections 均不在路由
- framer-motion 仅被死代码（Reveal、animations）引用，可整体移除
