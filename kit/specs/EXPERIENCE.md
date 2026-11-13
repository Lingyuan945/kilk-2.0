# kilk 2.0 项目经验总结

> 记录时间：2026-09-17 · 来源：Ling 提供的项目经验总结 + 上线版迭代实战
> 用途：**踩坑字典**——遇到"这个坑以前踩过吗"时来查，尤其是浏览器验证、radix 组件、编码、部署。
> 注：历史版本（v75-v90）记录已按用户要求清理，本文件只保留当前可复用经验。
>
> 本文是历史沉淀，不是当前状态。当前状态与待办见根目录 `AGENTS.md`。文中若出现"tsc 有 9 处错误""本机无数据库"等描述，均已过时。

## 一、技术选型

### 前端
- React 19 + Vite + TypeScript + Tailwind 4 + shadcn/ui + React Router 7 是成熟稳定的组合，构建快（~500ms）、类型安全、组件复用性好
- framer-motion 做页面过渡和共享元素动画（layoutId）效果好，但要注意 AnimatePresence 的 mode="popLayout" 避免导航切换时的布局抖动
- 路由懒加载（React.lazy + Suspense）能显著减小首屏包体积，但要确保每个懒加载页面有独立的错误边界

### 后端
- Node.js + Express + pg（PostgreSQL 驱动）比 mysql2 更稳定，参数化查询天然防 SQL 注入
- JWT 认证 + bcrypt 密码哈希是标准方案，bcrypt 的 PASSWORD_DEFAULT 会自动升级算法
- RESTful API 设计要统一响应格式 { ok, data, msg }，前端处理更简洁

### 数据库
- PostgreSQL 比 MySQL 更适合现代 Web 应用：JSONB 字段存灵活结构（开发者名片的 hero/skills/projects 等）、ILIKE 大小写不敏感搜索、序列和索引更完善
- 坑：表名 user 是 PostgreSQL 保留字，必须加双引号 "user"
- 坑：CASE WHEN $1 IS NULL THEN col ELSE $1 END 在 pg 驱动下会报 "could not determine data type of parameter"，改用动态 SET（只更新传来的字段）更可靠

## 二、开发流程

### 前后端分离
- 前端 VITE_API_BASE='/api'，开发环境用 Vite proxy 转发到后端 3001 端口，生产环境 Nginx/Apache 反代
- API 层统一封装 apiGet/apiPost/apiPut/apiDelete，自动带 Authorization header 和错误处理

### 组件设计
- 通用组件（Button/Input/Modal/Tabs）用 shadcn/ui，业务组件自己写
- 开发者名片的 6 个 JSON 区块（hero/skills/projects/timeline/socials/contacts）用**填表式模板**（ListBlock 动态行组件），用户填写文字即可，不暴露 JSON
- 表单编辑用受控组件 + 实时预览；React 受控输入状态必须用函数式更新，避免批处理互相覆盖

### 后台弹窗布局
- DialogContent 用三段式 grid：`grid-rows-[auto_minmax(0,1fr)_auto]` + 整体 max-h + overflow-hidden，标题固定、表单区独立滚动、Footer 固定通栏——避免内容超高把「保存/取消」推出视口
- 全局 textarea 若带 `field-sizing-content`，输入框会随内容无限增高，必须显式限高（如 max-h-60 overflow-y-auto）
- 弹窗宽度：编辑表单内容多时 `max-w-lg → max-w-3xl`，JSON/表单区 `md:grid-cols-2` 两列并排

## 三、部署运维

### 部署流程（固化）
1. 构建：$env:VITE_API_BASE='/api'; npx vite build
2. 打包：必须同时打 output（frontend）和 output_resource（assets）两个 tar
3. 上传：scp 到服务器 /tmp
4. 解压：frontend 解压到 /var/www/kilk2/frontend/，assets 解压到 /var/www/kilk2/frontend/assets/
5. 后端：scp 到 src/routes/，sudo systemctl restart kilk2

### 坑点
- 曾只部署 output 漏 assets 导致线上白屏 —— 双 tar 必须同时部署
- 前端部署后不需要重启服务（静态文件），但后端修改必须 systemctl restart
- 证书用 acme.sh（admin 用户运行，不要 sudo），DNS 插件 dns_ali 自动续期

### 服务器配置
- Apache 反代 Node 3001 端口，HTTPS 由 Apache 终止，Node 只跑 HTTP
- systemd 管理 Node 进程，/var/www/kilk2 属主 admin:admin
- 日志：sudo journalctl -u kilk2 --since '5 min ago' 快速排查

## 四、测试验证

### 工具链
- puppeteer-core + 无头 Edge（C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe）做端到端测试
- 登录：API fetch ('/api/auth/login') 后写 localStorage（kilk_token / kilk_user），不需要 UI 操作登录
- 截图：page.screenshot({ path, fullPage: false }) 快速验证视觉

### 测试方法论
- 先测 API 层（curl/fetch），再测 UI 层（puppeteer）
- 真实交互演练：用超管账号真实添加 / 修改 / 删除，验证完整流程，而不是只看页面渲染
- 控制台零报错是基本要求，pageerror 和 console error 都要捕获
- bodyLen 异常小（<200）可能意味着白屏或渲染失败，需要截图确认
- 数据变更类验证必须二次查询 DB 确认（前端 ok:true 不代表数据正确）

### 测试脚本踩坑（重要）
- React 受控输入：直接 `el.value = x` + dispatchEvent 不触发 onChange，必须用 native setter：
  `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el, x)` 再派发 input 事件
- JS `el.click()` 对 shadcn Tabs（data-slot="tabs-trigger"）无效，必须 `page.mouse.click(x, y)` 真实点击
- 测试脚本中途崩溃（如 ReferenceError）前，已发出的保存请求可能已成功——重复执行时注意幂等保护（如「该用户已是开发者」400）
- 页面加载：首次 goto 用首页写 token，再跳目标页；`waitUntil:'domcontentloaded'` + 3.5-4.5s 等待，networkidle2 会超时
- 无头 Edge userDataDir 用临时目录，用完 rmSync 清理

### 常见误判
- "添加成功" 不能只看页面文本 —— 模态框未关闭时 body 里也有用户文本，要检查模态框是否关闭 + 列表是否刷新
- API 返回 ok:true 不代表数据正确，要二次查询验证

## 五、安全实践

- 密码：bcrypt（PASSWORD_DEFAULT）+ 登录时自动升级旧 md5 哈希
- 认证：JWT + authRequired 中间件，adminRequired 校验角色
- 超级管理员只能有一个：不允许提升其他用户为 super，不允许降级自己
- 不能修改自己的角色（防止锁在管理后台外）
- 开发者管理仅 super 可操作，名片管理仅本人可操作（且只能改内容，不能改分类）
- 上传文件：multer 限制 500MB，文件名用时间戳 + 随机串防冲突
- 已泄露的 AccessKey/Token 要及时撤销

## 六、数据迁移

- MySQL → PostgreSQL：去掉 MySQL 特有语法（AUTO_INCREMENT → SERIAL，` backtick → 双引号，IFNULL → COALESCE，LIMIT 语法通用）
- 密码迁移：不保留旧哈希，全部用 bcrypt 重新哈希（用户密码已知时）
- 图片迁移：从服务器 /var/www/simple_site/upload 下载，放到新服务器 /var/www/kilk2/public/upload
- 孤儿图片清理：对比数据库引用和文件系统，删除未被引用的图片

## 七、项目管理

- 每次部署记录 index hash，方便核对线上版本与排查问题
- MAINTENANCE_PROGRESS.md 记录当前卡点和已完成项，跨会话恢复上下文
- GitHub 仓库：git@github.com:Lingyuan945/kilk-2.0.git，分支 main，SSH 免密
- 定时任务做维护推进检查（15 分钟无推进自动提醒），但用户喊停后要立即删除
- 每轮改动走「探查 → 修改 → 构建部署 → 无头验证（DB 复查）→ 更新进度文档」闭环

## 八、移动端适配

- 导航栏：PC 端显示文字 + 图标，移动端只显示图标（更简洁）
- 卡片布局：PC 端多列网格，移动端单列或 2×2
- 字体：移动端适当缩小，容纳更多信息
- 页脚：移动端常驻底部（小尺寸），滚动到底部时铺开展示完整内容
- 开发者阅历：移动端横向滑动卡片，PC 端纵向时间轴
- 技术支持：移动端无限滑动，PC 端网格布局

## 九、最容易踩的坑（Top 15）

1. PostgreSQL 表名 user 必须加双引号
2. pg 驱动的 CASE WHEN 参数推断错误 → 用动态 SET
3. 部署只打 frontend 漏 assets → 双 tar 必须同时
4. 模态框未关闭时 body 文本误判测试结果
5. X 图标未导入导致 ReferenceError → shadcn/ui 组件用到的图标必须显式 import
6. user 表没有 email 列 → 查询前先确认表结构
7. PGlite 嵌入式数据库不稳定 → 用真实 PostgreSQL
8. Supabase 回源 525 SSL 错误 → 阿里云服务器优先用阿里云 CDN
9. 手机端云端加速浏览器（UC / 夸克）连接重置 → 备案后可缓解，或关闭云端加速
10. 浏览器缓存导致看不到更新 → 部署后硬刷新（Ctrl+Shift+R）
11. React 快速连点多个勾选项 → 非函数式 setState 被批处理覆盖（只留最后一个）→ 用 setForm(f => ...)
12. 多选头衔分类只"第一个匹配即返回" → 开发者只出现在第一列 → 返回全部匹配分类
13. 后台弹窗无独立滚动区 → 内容高时保存按钮被推出视口 → 三段式 grid + 表单区独立滚动 + Footer 固定
14. 页脚放在 flex min-h-screen 容器外 → 内容不足一屏时页脚悬空、视口底部空白 → footer 必须作为容器内子项（main flex-1）
15. React 受控输入测试直接赋值不触发 onChange → 用 native setter + input 事件

## 十、名片系统设计要点

### 职责划分
- 后台「编辑开发者」只管理**基础信息**（用户名/姓名/头衔/排序），名片内容（tagline/bio/location/email + 6 个内容区块）由**开发者本人**在 /developer/me 管理——避免两处编辑冲突，后台表单已精简为仅基础信息

### 头衔多选
- role 用「 · 」（空格·空格）分隔存多值，varchar(80) 够用无需改库；`roleList = s.split(' · ')`
- 展示处原样显示；列表三列分类按关键词**全部匹配**（前端/后端/全栈可同列出现）
- toggle 用函数式更新防批处理覆盖

### 名片管理页表单化
- 用户诉求是「填文字即可」，不是 JSON 代码——6 个区块全部改为**填表式模板**（ListBlock 动态行：标题+hint+行表单+添加/删除按钮，字段 defs 驱动）
- 回填：parseArray 兼容后端字符串/数组两种形态；hero 字符串数组→{text} 行
- 保存：过滤全空行、tech 逗号/顿号分隔转数组、level Number()||0、projects.id 自动编号
- 隐藏区块（如 Hero 亮点）：不显示即可，保存时不提交该字段（undefined=不改），数据保留

### 新建开发者
- 默认**空白模板**（全部内容字段初始化为 []），由开发者本人填写；不要预填任何人的内容
- 用户选择：添加时从用户表搜索选择（user_id → 拉取 username/name/avatar），重复添加被 400「该用户已是开发者」保护

### 名片详情页展示
- tagline/bio/location 分行展示（不要用「—」挤一行），空一行分隔，location 带 MapPin 图标
- 底部「联系 XX」大按钮（mailto CTA）按需隐藏；联系方式区块保留

### 页脚与全局
- 版权年份动态化：`© {new Date().getFullYear()}`，禁止硬编码
- 备案号等硬编码信息集中在 SiteFooter 一处维护（移动端小条 + 桌面端完整版两处需同步）

---

核心原则：先验证再部署、小步迭代、每个改动都有回滚方案、控制台零报错是底线。
