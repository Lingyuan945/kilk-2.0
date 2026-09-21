# kilk 2.0 项目交接文档

> 更新时间：2026-09-21
> 版本：上线版（kilk.online）
> 用途：跨会话交接、新人上手、部署运维参考
> 配套阅读：`EXPERIENCE.md`（历史经验总集）

---

## 一、项目概况

kilk 2.0 是 Ling 开发的团队平台，线上地址 https://kilk.online。当前包含：

- **首页**：平台介绍、常用入口（酒店运维 / 服务支持 / 平台公告）
- **酒店运维**：多酒店运维中心（红树林酒店 id=1），含故障登记、运维看板（失物招领/客房巡检占位已删除）
- **服务支持**：技术支持工单
- **平台公告**：公告列表
- **关于我们**：公司介绍 + 开发者团队入口（开发者页从导航隐藏，从此进入）
- **后台管理**：/admin，超管专属，含首页/公告/酒店管理/服务支持/开发者/用户六个 Tab
- **开发者名片**：/developer/ling 等，开发者自维护名片

---

## 二、技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite + TypeScript + Tailwind 4 + shadcn/ui + React Router 7 + framer-motion |
| 后端 | Node.js + Express + pg（PostgreSQL 驱动）+ JWT |
| 数据库 | PostgreSQL，库名 `kilk` |
| 部署 | 阿里云 120.25.179.176，Apache 反代 Node 3001，systemd 管理进程 `kilk2` |
| 证书 | acme.sh（admin 用户，dns_ali 自动续期） |

---

## 三、部署架构

```
浏览器 → Apache 443（终止 HTTPS）→ Node 3001（/var/www/kilk2/src）→ PostgreSQL
                                 → /var/www/kilk2/frontend（静态前端）
```

- 前端目录：`/var/www/kilk2/frontend/`（output 根目录 + output_resource/assets）
- 后端目录：`/var/www/kilk2/src/`
- 服务器：`admin@120.25.179.176`
- 重启后端：`sudo systemctl restart kilk2`
- 日志：`sudo journalctl -u kilk2 --since '5 min ago'`

---

## 四、本地开发与部署流程（固化）

### 构建
```powershell
cd "C:\Users\lingyuan\Desktop\IT-08\Github\kilk 2.0"
$env:VITE_API_BASE='/api'; npx vite build
```
产物：`dist/output`（index.html 根）+ `dist/output_resource`（assets）

### 部署
```powershell
# 打包（Windows 无 /tmp，用 $env:TEMP）
cd dist
tar -cf "$env:TEMP\kilk-out.tar" -C output .
tar -cf "$env:TEMP\kilk-res.tar" -C output_resource .
scp "$env:TEMP\kilk-out.tar" "$env:TEMP\kilk-res.tar" admin@120.25.179.176:/tmp/
# 服务器解压
ssh admin@120.25.179.176 "cd /var/www/kilk2/frontend && tar -xf /tmp/kilk-out.tar && tar -xf /tmp/kilk-res.tar && grep -o 'index-[A-Za-z0-9_-]*\.js' index.html | head -1"
```

### 后端改动
scp 到 `/tmp/` 后 `cp` 到 `/var/www/kilk2/src/` 对应位置，再 `sudo systemctl restart kilk2`。

### Git
本地提交不推送远端。`git add ... && git commit -m "..."`。

---

## 五、本轮主线：酒店运维板块

### 5.1 数据模型
- `hotels` 表：id / name / code / theme_color / buildings / categories / device_types / enabled / sort / description / logo_url
- `hotel_incident` 表：故障记录，带 hotel_id 隔离
- buildings 存储格式：`["1=椰林酒店","2=棕榈酒店",...]`（编号=名称），兼容旧格式 `["1椰林酒店"]`

### 5.2 前台页面
- `/hotel`：运维中心，酒店卡片列表 + 统计
- `/hotel/:hotelId`：功能选择页（故障登记 / 运维看板；失物招领、客房巡检占位已于 2026-09-21 删除）
- 故障登记：输入房间号自动识别楼栋（autoBuilding），只读显示
- 运维看板：基于 incidents 纯前端统计

### 5.3 楼栋自动识别规则（autoBuilding）
1. 房间号首位数字提取前缀 N
2. 后台 buildings 解析：
   - `编号=名称` → prefix=编号, name=名称
   - 旧格式 `N名称` → prefix=N, name=去编号前缀
3. 前缀精确匹配 → 匹配不到回退第一栋
4. 名称显示自动去掉编号前缀（"1椰林酒店" → "椰林酒店"）

### 5.4 后台管理（/admin → 酒店管理 Tab）
- 酒店基础：名称 / code / 主题色 / 简介 / 封面图 URL / 启用 / 排序
- **楼栋配置**：动态增删表单，每行 [编号][名称][删除]，+ 添加楼栋
- **故障类别**：动态增删表单，每行 [名称][删除]，+ 添加故障类别
- **设备类型**：动态增删表单，每行 [名称][删除]，+ 添加设备类型

### 5.5 红树林酒店当前配置（id=1）
- name: 红树林酒店, code: hongshulin, theme_color: #38bdf8
- buildings: 1椰林 / 2棕榈 / 3大王棕 / 5皇后棕 / 6菩提 / 7木棉A / 8木棉B
- categories: 机顶盒硬件故障 / 室内光纤故障-尾纤 / 室内光纤故障-暗线 / 弱电井光纤故障 / 其他情况
- device_types: 融合网关 / 网关+魔百盒

---

## 六、导航与路由

```
NAV_ITEMS 顺序：
首页(/) → 酒店运维(/hotel) → 服务支持(/service) → 公告(/notice) → 关于我们(/about)
开发者(/developer/:name)：条件显示，从关于我们页面进入后导航栏临时出现
```

---

## 七、关键文件索引

| 文件 | 作用 |
|---|---|
| `src/pages/HotelPage/HotelPage.tsx` | 运维中心酒店列表页 |
| `src/pages/HotelPage/HotelDetailPage.tsx` | 酒店详情 + 功能选择 + 故障登记 + 运维看板 + autoBuilding |
| `src/pages/AdminPage/HotelTab.tsx` | 后台酒店管理 Tab（动态表单） |
| `src/components/ui/skeleton.tsx` | 骨架屏（bg-slate-700/40） |
| `src/pages/HomePage/HomePage.tsx` | 首页常用入口 |
| `server/src/routes/hotel.js` | 酒店 CRUD + 故障记录 API |
| `server/src/init.js` | 数据库初始化 + ALTER TABLE |

---

## 八、浏览器端验证要点（bu）

- React radix tab 切换：`bu.find("标签名")` 拿 ref 再 `bu.click(ref)`，bu.js 的 `el.click()` 对 radix 无效
- ref 会 stale（导航/操作后文档 scope 变），每次操作后重新 `bu.snapshot()` / `bu.find()`
- React 受控输入测试：必须用 native setter + dispatch input 事件
- PowerShell ssh 嵌套引号易出错，SQL 查询优先走 `/api` 接口 curl，避免 psql 双引号嵌套

---

## 九、当前待办 / 未完成

1. **失物招领模块**：✅ 已删除占位（2026-09-21）——功能选择页卡片移除，若后续实装再重建
2. **客房巡检模块**：✅ 已删除占位（2026-09-21）——功能选择页卡片移除，若后续实装再重建
3. **多酒店扩展**：hotels 表已支持，后台可新增，但前台仅红树林 id=1 在用
4. **后台论坛残留**：✅ 已清理（2026-09-21）——AdminPage.tsx 移除帖子/频道/评论管理全部 state、函数、弹窗、统计卡与死 import（AdminPost/AdminReply 接口、loadPosts/loadChannels/openAddChannel/openEditChannel/saveChannel/openEditPost/handlePostImageUpload/savePost/openManageReplies/deleteReply、频道/帖子/评论三个弹窗、帖子统计卡、MessageSquare/MessageCircle/Clock/ImagePlus/X/Eye/Search/useRef/apiUpload/formatBytes），统计卡 3 列改 2 列（用户/服务），副标题改"用户、服务管理"
5. **酒店简介/封面图**：红树林目前为空，后台可填

---

## 十、用户偏好（重要）

- 全程中文，不用 emoji
- 视觉要"高级感"：克制、留白、不要亮蓝大块
- 不做版本回退（v75-v90 老记录已删）
- 配置项要可视化动态增删，不要 textarea 每行一个
- 不引入共享元素飞行转场（已否决）
- 骨架屏不要亮蓝色（已改 slate-700/40）

---

## 十一、最容易踩的坑（本轮新增）

1. 楼栋名带编号前缀时，前台显示必须 strip 掉编号，否则"酒店名前面有数字"
2. 楼栋配置从 textarea 改动态表单后，startEdit 要解析旧数据成 {id,name} 行
3. PowerShell ssh 内嵌 psql SQL 双引号会被拆词，用 `/api` curl 查数据
4. bu 验证 radix tab 必须用 ref-first click，bu.js 模拟 click 不生效
5. 改头部样式时用户偏好"克制浅色"，但亮青蓝渐变标题用户最终要求保留——视觉改动先确认再动手
6. 路由切换白块：Suspense 必须在 Layout 内只包内容区，导航/页脚常驻

---

核心原则：先验证再部署、小步迭代、每个改动可回滚、控制台零报错是底线。
