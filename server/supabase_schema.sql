-- kilk 2.0 Supabase 数据库表结构
-- 在 Supabase SQL Editor 中执行

-- 启用 UUID 扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 用户表 ==========
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  user_no VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  avatar TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  department VARCHAR(100) DEFAULT '',
  job_number VARCHAR(50) DEFAULT '',
  remark TEXT DEFAULT '-',
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 频道表 ==========
CREATE TABLE IF NOT EXISTS channel (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT DEFAULT '',
  moderator_id INTEGER REFERENCES "user"(id),
  sort INTEGER DEFAULT 0,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 论坛帖子表 ==========
CREATE TABLE IF NOT EXISTS forum_post (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id),
  channel_id INTEGER REFERENCES channel(id),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  create_time TIMESTAMPTZ DEFAULT NOW(),
  update_time TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 论坛评论表 ==========
CREATE TABLE IF NOT EXISTS forum_reply (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES forum_post(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "user"(id),
  content TEXT NOT NULL,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 服务文件表 ==========
CREATE TABLE IF NOT EXISTS service_file (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "user"(id),
  title VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  file_path TEXT DEFAULT '',
  file_name VARCHAR(200) DEFAULT '',
  file_size INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 服务文件版本表 ==========
CREATE TABLE IF NOT EXISTS service_file_item (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES service_file(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name VARCHAR(200),
  file_size INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  version_note TEXT DEFAULT '',
  create_time TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 首页内容表 ==========
CREATE TABLE IF NOT EXISTS home_content (
  id SERIAL PRIMARY KEY,
  banner_title VARCHAR(200) DEFAULT '',
  banner_desc TEXT DEFAULT '',
  card1_title VARCHAR(100) DEFAULT '',
  card1_text TEXT DEFAULT '',
  card2_title VARCHAR(100) DEFAULT '',
  card2_text TEXT DEFAULT '',
  card3_title VARCHAR(100) DEFAULT '',
  card3_text TEXT DEFAULT '',
  updated_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 关于 Ling 个人资料表 ==========
CREATE TABLE IF NOT EXISTS ling_profile (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100) DEFAULT '',
  tagline TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  location VARCHAR(100) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  avatar_initial VARCHAR(10) DEFAULT 'L',
  hero JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  socials JSONB DEFAULT '[]'::jsonb,
  contacts JSONB DEFAULT '[]'::jsonb,
  updated_by INTEGER REFERENCES "user"(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 索引 ==========
CREATE INDEX IF NOT EXISTS idx_forum_post_user_id ON forum_post(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_channel_id ON forum_post(channel_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_create_time ON forum_post(create_time DESC);
CREATE INDEX IF NOT EXISTS idx_forum_reply_post_id ON forum_reply(post_id);
CREATE INDEX IF NOT EXISTS idx_service_file_item_service_id ON service_file_item(service_id);

-- ========== 插入默认首页内容 ==========
INSERT INTO home_content (banner_title, banner_desc, card1_title, card1_text, card2_title, card2_text, card3_title, card3_text)
SELECT '欢迎来到kilk', '方案投递请联系：QQ：2338315916', '代码托管', '安全可靠的代码仓库，支持版本管理与团队协作', 'CI/CD 自动化', '自动化构建、测试与部署，提升开发效率', '监控告警', '实时监控系统运行状态，异常及时告警'
WHERE NOT EXISTS (SELECT 1 FROM home_content);

-- ========== 插入默认关于 Ling 资料 ==========
INSERT INTO ling_profile (name, role, tagline, bio, location, email, avatar_initial, hero, skills, projects, timeline, socials, contacts)
SELECT '凌渊', '全栈开发工程师', '用代码构建更聪明的产品', '一名热爱技术与创造的全栈开发者，专注于 Web 应用、前端体验与数据可视化。', '三亚 · 中国', '2338315916@qq.com', 'L',
'["const developer = { name: \"凌渊\", role: \"全栈开发工程师\" };"]'::jsonb,
'[{"name":"React / TypeScript","note":"组件化架构 · Hooks · 状态管理","level":90},{"name":"Node.js / 后端服务","note":"REST API · 微服务 · 数据库设计","level":82},{"name":"PHP / MySQL","note":"LAMP 栈 · 服务器运维 · 数据库优化","level":85},{"name":"Python / 数据分析","note":"Pandas · 可视化 · 自动化脚本","level":78}]'::jsonb,
'[{"id":1,"tech":["React","TypeScript","Node.js","PostgreSQL"],"year":"2026","title":"kilk 2.0 全栈平台","highlight":"React 19 + Vite + TS + Tailwind 4","description":"从零构建的全栈协作平台"}]'::jsonb,
'[{"org":"kilk 独立开发","title":"全栈开发工程师","period":"2026 — 至今","description":"独立开发并维护 kilk 平台"}]'::jsonb,
'[{"href":"https://github.com/Lingyuan945","icon":"github","label":"GitHub","handle":"@Lingyuan945"}]'::jsonb,
'[{"href":"mailto:2338315916@qq.com","label":"邮箱","value":"2338315916@qq.com"},{"href":"https://github.com/Lingyuan945","label":"GitHub","value":"github.com/Lingyuan945"},{"href":"https://kilk.online","label":"个人网站","value":"kilk.online"},{"href":"","label":"所在城市","value":"三亚 · 中国"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ling_profile);
