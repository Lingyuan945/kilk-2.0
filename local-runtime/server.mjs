/**
 * kilk 2.0 本地预览环境（零依赖）
 *
 * 一个进程同时提供：
 *   1. 静态站点   /            → dist/output
 *   2. 静态资源   /assets/*    → dist/output_resource/assets
 *   3. 上传目录   /upload/*    → local-runtime/uploads
 *   4. mock API   /api/*       → 内存数据（data.mjs），行为对齐 server/src/routes
 *
 * 真实数据模式：若本地 3001 端口有后端在跑（server/src/index.js 连本地 PG），
 * /api/* 自动转发给它，看到的就是数据库里的真实数据；没有后端则退回 mock 数据。
 * 用 USE_REAL_API=0 强制 mock，USE_REAL_API=1 强制转发。
 *
 * 用法：node local-runtime/server.mjs   （或双击 start.cmd）
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore } from './data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATIC_DIR = path.join(ROOT, 'dist', 'output');
const ASSETS_DIR = path.join(ROOT, 'dist', 'output_resource', 'assets');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PORT = Number(process.env.PORT || 5180);
const HOST = '127.0.0.1';
const BACKEND = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:3001';

// 上游后端可用性探测：决定 /api/* 走真实数据还是 mock
let useRealApi = false;
function probeBackend() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND}/api/health`, { timeout: 1200 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}
if (process.env.USE_REAL_API === '1') useRealApi = true;
else if (process.env.USE_REAL_API !== '0') useRealApi = await probeBackend();

// 把 /api/* 原样转发给本地后端（含 multipart 上传与鉴权头）
function proxyToBackend(req, res, pathname, search) {
  const target = new URL(pathname + search, BACKEND);
  const headers = { ...req.headers, host: target.host };
  const upstream = http.request(
    { hostname: target.hostname, port: target.port, path: target.pathname + target.search, method: req.method, headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    }
  );
  upstream.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, msg: `后端不可达：${err.message}` }));
  });
  req.pipe(upstream);
}

const store = createStore();
const sessions = new Map(); // token -> userId

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 演示用占位图，让附件缩略有内容可看
const DEMO_SVGS = {
  'demo-1.svg': ['#1e293b', '#38bdf8', '客房门锁'],
  'demo-2.svg': ['#1e293b', '#f59e0b', '水管渗漏'],
};
for (const [name, [bg, fg, label]] of Object.entries(DEMO_SVGS)) {
  const p = path.join(UPLOAD_DIR, name);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(
      p,
      `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="3" opacity=".7"><circle cx="240" cy="140" r="52"/><path d="M188 140h104M240 88v104"/></g><text x="240" y="248" font-family="sans-serif" font-size="20" fill="${fg}" text-anchor="middle">${label}</text></svg>`
    );
  }
}

// ---------- 通用工具 ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const ok = (res, data, extra = {}) => sendJson(res, 200, { ok: true, data, ...extra });
const fail = (res, status, msg) => sendJson(res, status, { ok: false, msg });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 20 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(buffer, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundary = m && (m[1] || m[2]);
  if (!boundary) return { fields: {}, files: [] };
  const raw = buffer.toString('latin1');
  const segments = raw.split(`--${boundary}`);
  const fields = {};
  const files = [];
  for (const seg of segments) {
    const idx = seg.indexOf('\r\n\r\n');
    if (idx === -1) continue;
    const head = seg.slice(0, idx);
    let body = seg.slice(idx + 4);
    if (body.endsWith('\r\n')) body = body.slice(0, -2);
    const nameMatch = /name="([^"]*)"/i.exec(head);
    if (!nameMatch) continue;
    const filenameMatch = /filename="([^"]*)"/i.exec(head);
    if (filenameMatch) {
      const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(head);
      files.push({
        fieldname: nameMatch[1],
        filename: filenameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        data: Buffer.from(body, 'latin1'),
      });
    } else {
      fields[nameMatch[1]] = Buffer.from(body, 'latin1').toString('utf8');
    }
  }
  return { fields, files };
}

function currentUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const uid = sessions.get(token);
  if (!uid) return null;
  return store.users.find((u) => u.id === uid) || null;
}

const sanitize = (u) => {
  if (!u) return null;
  const { password, ...safe } = u;
  return safe;
};

const parseJsonField = (v) => {
  if (v === undefined || v === null || v === '') return [];
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  }
  return v;
};

const parseArr = (v) => {
  if (Array.isArray(v)) return v.filter((x) => String(x).trim()).map((x) => String(x).trim());
  if (typeof v === 'string') return v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  return [];
};

const nextId = (list) => (list.length ? Math.max(...list.map((x) => Number(x.id))) + 1 : 1);

function incidentStats(hotelId) {
  const list = store.incidents.filter((i) => Number(i.hotel_id) === Number(hotelId));
  return {
    pending: list.filter((i) => i.status === 'pending').length,
    processing: list.filter((i) => i.status === 'processing').length,
    done: list.filter((i) => i.status === 'done').length,
    total: list.length,
  };
}

function hotelWithStats(h, withCreated = false) {
  const s = incidentStats(h.id);
  return {
    id: h.id,
    name: h.name,
    code: h.code,
    theme_color: h.theme_color,
    buildings: parseJsonField(h.buildings),
    categories: parseJsonField(h.categories),
    device_types: parseJsonField(h.device_types),
    enabled: h.enabled,
    sort: h.sort,
    description: h.description || '',
    logo_url: h.logo_url || '',
    ...(withCreated ? { created_at: h.created_at } : {}),
    ...s,
  };
}

function serviceFileWithVersions(f) {
  const versions = store.serviceFileItems
    .filter((v) => Number(v.service_id) === Number(f.id))
    .sort((a, b) => String(b.create_time).localeCompare(String(a.create_time)));
  const author = store.users.find((u) => u.id === f.user_id);
  return {
    ...f,
    username: author?.username || '',
    author_name: author?.name || '',
    versions,
    total_downloads: versions.reduce((sum, v) => sum + Number(v.download_count || 0), 0),
  };
}

function formatDeveloper(row) {
  const user = store.users.find((u) => u.username === row.username);
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    tagline: row.tagline,
    bio: row.bio,
    location: row.location,
    email: row.email,
    avatar: user?.avatar || null,
    avatar_initial: row.avatar_initial,
    hero: parseJsonField(row.hero),
    skills: parseJsonField(row.skills),
    projects: parseJsonField(row.projects),
    timeline: parseJsonField(row.timeline),
    socials: parseJsonField(row.socials),
    contacts: parseJsonField(row.contacts),
    sort: row.sort,
    updated_at: row.updated_at,
  };
}

function saveUpload(file, prefix) {
  const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
  const ext = path.extname(file.filename || '') || `.${extMap[file.contentType] || 'bin'}`;
  const name = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.data);
  return `/upload/${name}`;
}

// ---------- API 路由 ----------

const ADMIN_ONLY = ['admin', 'super'];
const SENIOR_UP = ['senior', 'admin', 'super'];

const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  routes.push({ method, pattern, handler, need: opts.need || 'none' });
};

// 认证
route('POST', /^\/api\/auth\/login$/, async ({ res, body }) => {
  const { username, password } = body || {};
  if (!username || !password) return fail(res, 400, '请输入账号和密码');
  const user = store.users.find((u) => u.username === String(username).trim());
  if (!user || user.password !== password) return fail(res, 401, '账号或密码错误');
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  sendJson(res, 200, { ok: true, msg: '登录成功', token, user: sanitize(user) });
});

route('POST', /^\/api\/auth\/register$/, async ({ res }) => fail(res, 403, '注册通道已关闭，请联系管理员开通账号'));

route('GET', /^\/api\/auth\/me$/, async ({ res, user }) => sendJson(res, 200, { ok: true, user: sanitize(user) }), { need: 'auth' });

route('GET', /^\/api\/health$/, async ({ res }) =>
  sendJson(res, 200, { ok: true, msg: 'kilk 2.0 本地预览 API 运行中', time: new Date().toISOString() })
);

// 首页内容
route('GET', /^\/api\/home$/, async ({ res }) => ok(res, store.homeContent));

route('PUT', /^\/api\/home$/, async ({ res, body }) => {
  Object.assign(store.homeContent, {
    banner_title: body.banner_title || '',
    banner_desc: body.banner_desc || '',
    card1_title: body.card1_title || '',
    card1_text: body.card1_text || '',
    card2_title: body.card2_title || '',
    card2_text: body.card2_text || '',
    card3_title: body.card3_title || '',
    card3_text: body.card3_text || '',
  });
  sendJson(res, 200, { ok: true, data: store.homeContent, msg: '首页内容已更新' });
}, { need: 'admin' });

// 公告
route('GET', /^\/api\/notice$/, async ({ res }) => {
  const list = [...store.notices].sort(
    (a, b) => Number(b.is_pinned) - Number(a.is_pinned) || String(b.created_at).localeCompare(String(a.created_at))
  );
  ok(res, list);
});

route('GET', /^\/api\/notice\/(\d+)$/, async ({ res, params }) => {
  const n = store.notices.find((x) => Number(x.id) === Number(params[0]));
  if (!n) return fail(res, 404, '公告不存在');
  ok(res, n);
});

route('POST', /^\/api\/notice$/, async ({ res, body, user }) => {
  if (!body.title || !String(body.title).trim()) return fail(res, 400, '公告标题必填');
  if (!body.content || !String(body.content).trim()) return fail(res, 400, '公告内容必填');
  const item = {
    id: nextId(store.notices),
    title: String(body.title).trim(),
    content: String(body.content).trim(),
    is_pinned: body.is_pinned ? 1 : 0,
    author_name: user.name || user.username,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.notices.push(item);
  ok(res, item);
}, { need: 'admin' });

route('PUT', /^\/api\/notice\/(\d+)$/, async ({ res, params, body }) => {
  const n = store.notices.find((x) => Number(x.id) === Number(params[0]));
  if (!n) return fail(res, 404, '公告不存在');
  if (body.title !== undefined) n.title = String(body.title).trim();
  if (body.content !== undefined) n.content = String(body.content).trim();
  if (body.is_pinned !== undefined) n.is_pinned = body.is_pinned ? 1 : 0;
  n.updated_at = new Date().toISOString();
  ok(res, n);
}, { need: 'admin' });

route('DELETE', /^\/api\/notice\/(\d+)$/, async ({ res, params }) => {
  const idx = store.notices.findIndex((x) => Number(x.id) === Number(params[0]));
  if (idx === -1) return fail(res, 404, '公告不存在');
  store.notices.splice(idx, 1);
  sendJson(res, 200, { ok: true });
}, { need: 'admin' });

// 服务支持
route('GET', /^\/api\/service\/files$/, async ({ res }) => ok(res, store.serviceFiles.map(serviceFileWithVersions)));

route('GET', /^\/api\/service\/files\/(\d+)$/, async ({ res, params }) => {
  const f = store.serviceFiles.find((x) => Number(x.id) === Number(params[0]));
  if (!f) return fail(res, 404, '文件不存在');
  ok(res, serviceFileWithVersions(f));
});

route('POST', /^\/api\/service\/files\/(\d+)\/download$/, async ({ res, params }) => {
  const v = store.serviceFileItems.find((x) => Number(x.id) === Number(params[0]));
  if (!v) return fail(res, 404, '文件版本不存在');
  v.download_count = Number(v.download_count || 0) + 1;
  ok(res, { download_count: v.download_count });
});

// 用户
route('GET', /^\/api\/users\/(\d+)$/, async ({ res, params }) => {
  const u = store.users.find((x) => Number(x.id) === Number(params[0]));
  if (!u) return fail(res, 404, '用户不存在');
  const { password, remark, ...safe } = u;
  ok(res, safe);
});

route('PUT', /^\/api\/users\/profile$/, async ({ res, body, user }) => {
  user.signature = body.signature || '';
  if (ADMIN_ONLY.includes(user.role)) {
    user.department = body.department || '';
    user.job_number = body.job_number || '';
  }
  sendJson(res, 200, { ok: true, data: sanitize(user), msg: '资料已保存' });
}, { need: 'auth' });

route('POST', /^\/api\/users\/avatar$/, async ({ res, user, raw, contentType }) => {
  const { files } = parseMultipart(raw, contentType);
  const file = files.find((f) => f.fieldname === 'avatar') || files[0];
  if (!file) return fail(res, 400, '请选择头像文件');
  user.avatar = saveUpload(file, 'avatar');
  sendJson(res, 200, { ok: true, data: { avatar: user.avatar }, msg: '头像已更新' });
}, { need: 'auth' });

route('PUT', /^\/api\/users\/password$/, async ({ res, body, user }) => {
  const { old_password, new_password, confirm_password } = body || {};
  if (!old_password || !new_password || !confirm_password) return fail(res, 400, '请填写完整信息');
  if (new_password.length < 6) return fail(res, 400, '新密码长度至少6位');
  if (new_password !== confirm_password) return fail(res, 400, '两次输入的新密码不一致');
  if (user.password !== old_password) return fail(res, 400, '原密码不正确');
  user.password = new_password;
  sendJson(res, 200, { ok: true, msg: '密码已修改，下次登录请使用新密码' });
}, { need: 'auth' });

// 开发者名片
route('GET', /^\/api\/developers$/, async ({ res }) => {
  const list = store.developers
    .map((d) => {
      const u = store.users.find((x) => x.username === d.username);
      return {
        id: d.id,
        username: d.username,
        name: d.name,
        role: d.role,
        tagline: d.tagline,
        avatar_initial: d.avatar_initial,
        sort: d.sort,
        avatar: u?.avatar || null,
        user_id: u?.id || null,
      };
    })
    .sort((a, b) => a.sort - b.sort || a.id - b.id);
  ok(res, list);
});

route('GET', /^\/api\/developers\/me$/, async ({ res, user }) => {
  const row = store.developers.find((d) => d.username === user.username);
  if (!row) return sendJson(res, 200, { ok: true, data: null, msg: '当前用户还不是开发者' });
  ok(res, formatDeveloper(row));
}, { need: 'auth' });

route('PUT', /^\/api\/developers\/me$/, async ({ res, body, user }) => {
  const row = store.developers.find((d) => d.username === user.username);
  if (!row) return fail(res, 404, '当前用户还不是开发者');
  const strFields = ['tagline', 'bio', 'location', 'email', 'avatar_initial'];
  for (const k of strFields) if (body[k] !== undefined) row[k] = String(body[k]);
  const jsonFields = ['hero', 'skills', 'projects', 'timeline', 'socials', 'contacts'];
  for (const k of jsonFields) if (body[k] !== undefined) row[k] = JSON.stringify(body[k]);
  row.updated_at = new Date().toISOString();
  sendJson(res, 200, { ok: true, msg: '名片已更新' });
}, { need: 'auth' });

route('GET', /^\/api\/developers\/([^/]+)$/, async ({ res, params }) => {
  const row = store.developers.find((d) => d.username === decodeURIComponent(params[0]));
  if (!row) return fail(res, 404, '开发者不存在');
  ok(res, formatDeveloper(row));
});

// 兼容旧接口
route('GET', /^\/api\/ling$/, async ({ res }) => {
  const row = store.developers[0];
  ok(res, row ? formatDeveloper(row) : null);
});

// 酒店
route('GET', /^\/api\/hotels$/, async ({ res }) => {
  const list = store.hotels.filter((h) => h.enabled === 1).sort((a, b) => a.sort - b.sort || a.id - b.id);
  ok(res, list.map((h) => hotelWithStats(h)));
}, { need: 'senior' });

route('GET', /^\/api\/hotels\/all$/, async ({ res }) => {
  const list = [...store.hotels].sort((a, b) => a.sort - b.sort || a.id - b.id);
  ok(res, list.map((h) => hotelWithStats(h, true)));
}, { need: 'admin' });

route('GET', /^\/api\/hotels\/(\d+)$/, async ({ res, params }) => {
  const h = store.hotels.find((x) => Number(x.id) === Number(params[0]) && x.enabled === 1);
  if (!h) return fail(res, 404, '酒店不存在或已停用');
  ok(res, hotelWithStats(h));
}, { need: 'senior' });

route('POST', /^\/api\/hotels$/, async ({ res, body }) => {
  if (!body.name || !String(body.name).trim()) return fail(res, 400, '酒店名称必填');
  const item = {
    id: nextId(store.hotels),
    name: String(body.name).trim(),
    code: String(body.code || '').trim(),
    theme_color: /^#[0-9a-fA-F]{6}$/.test(String(body.theme_color || '')) ? String(body.theme_color) : '#3b82f6',
    buildings: parseArr(body.buildings),
    categories: parseArr(body.categories),
    device_types: parseArr(body.device_types),
    enabled: body.enabled === 0 || body.enabled === false ? 0 : 1,
    sort: Number(body.sort) || 0,
    description: String(body.description || '').slice(0, 500),
    logo_url: String(body.logo_url || '').slice(0, 500),
    created_at: new Date().toISOString(),
  };
  store.hotels.push(item);
  ok(res, hotelWithStats(item, true));
}, { need: 'admin' });

route('PUT', /^\/api\/hotels\/(\d+)$/, async ({ res, params, body }) => {
  const h = store.hotels.find((x) => Number(x.id) === Number(params[0]));
  if (!h) return fail(res, 404, '酒店不存在');
  if (body.name !== undefined && body.name !== null) h.name = String(body.name).trim();
  if (body.code !== undefined && body.code !== null) h.code = String(body.code).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(String(body.theme_color || ''))) h.theme_color = String(body.theme_color);
  if (body.buildings !== undefined) h.buildings = parseArr(body.buildings);
  if (body.categories !== undefined) h.categories = parseArr(body.categories);
  if (body.device_types !== undefined) h.device_types = parseArr(body.device_types);
  if (body.enabled !== undefined && body.enabled !== null) h.enabled = body.enabled === 0 || body.enabled === false ? 0 : 1;
  if (body.sort !== undefined && body.sort !== null) h.sort = Number(body.sort);
  if (body.description !== undefined && body.description !== null) h.description = String(body.description).slice(0, 500);
  if (body.logo_url !== undefined && body.logo_url !== null) h.logo_url = String(body.logo_url).slice(0, 500);
  ok(res, hotelWithStats(h, true));
}, { need: 'admin' });

route('DELETE', /^\/api\/hotels\/(\d+)$/, async ({ res, params }) => {
  const idx = store.hotels.findIndex((x) => Number(x.id) === Number(params[0]));
  if (idx === -1) return fail(res, 404, '酒店不存在');
  store.incidents = store.incidents.filter((i) => Number(i.hotel_id) !== Number(params[0]));
  store.hotels.splice(idx, 1);
  sendJson(res, 200, { ok: true });
}, { need: 'admin' });

// 故障记录
route('GET', /^\/api\/hotel\/(\d+)\/incidents$/, async ({ res, params, query }) => {
  const hotelId = Number(params[0]);
  const hotel = store.hotels.find((h) => Number(h.id) === hotelId && h.enabled === 1);
  if (!hotel) return fail(res, 404, '酒店不存在或已停用');
  const keyword = (query.get('keyword') || '').trim().toLowerCase();
  const status = query.get('status') || '';
  let list = store.incidents.filter((i) => Number(i.hotel_id) === hotelId);
  if (keyword) {
    list = list.filter((i) =>
      [i.room_no, i.incident_no, i.description, i.building, i.device_type]
        .some((v) => String(v || '').toLowerCase().includes(keyword))
    );
  }
  if (['pending', 'processing', 'done'].includes(status)) list = list.filter((i) => i.status === status);
  list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id);
  sendJson(res, 200, { ok: true, data: list, stats: incidentStats(hotelId) });
}, { need: 'senior' });

route('POST', /^\/api\/hotel\/(\d+)\/incidents$/, async ({ res, params, body, user }) => {
  const hotelId = Number(params[0]);
  const hotel = store.hotels.find((h) => Number(h.id) === hotelId && h.enabled === 1);
  if (!hotel) return fail(res, 404, '酒店不存在或已停用');
  if (!body.room_no || !String(body.room_no).trim()) return fail(res, 400, '房间号码必填');
  if (!body.category) return fail(res, 400, '故障类别必填');
  if (!body.device_type) return fail(res, 400, '设备类型必填');

  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `GZ${ymd}-`;
  const todayCount = store.incidents.filter((i) => String(i.incident_no).startsWith(prefix)).length;

  let atts = [];
  if (Array.isArray(body.attachment)) atts = body.attachment;
  else if (typeof body.attachment === 'string' && body.attachment) atts = [body.attachment];
  const safeAtt = atts.filter((a) => typeof a === 'string' && a.startsWith('/upload/'));

  const item = {
    id: nextId(store.incidents),
    incident_no: `${prefix}${String(todayCount + 1).padStart(3, '0')}`,
    hotel_id: hotelId,
    room_no: String(body.room_no).trim(),
    building: String(body.building || '').trim(),
    status: body.status || 'pending',
    category: body.category,
    device_type: body.device_type,
    description: String(body.description || '').trim(),
    attachment: safeAtt.length ? JSON.stringify(safeAtt) : '',
    wait_duration: 0,
    total_duration: 0,
    created_by: user.id,
    created_by_name: user.name || user.username,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    repaired_at: null,
  };
  store.incidents.push(item);
  ok(res, item);
}, { need: 'senior' });

route('PUT', /^\/api\/hotel\/(\d+)\/incidents\/(\d+)$/, async ({ res, params, body }) => {
  const [hotelId, id] = params;
  const item = store.incidents.find((i) => Number(i.id) === Number(id) && Number(i.hotel_id) === Number(hotelId));
  if (!item) return fail(res, 404, '记录不存在');

  const nowMs = Date.now();
  const created = new Date(item.created_at).getTime();
  if (body.status === 'processing' && item.status === 'pending') {
    item.wait_duration = Math.max(1, Math.round((nowMs - created) / 60000));
  }
  if (body.status === 'done' && item.status !== 'done') {
    item.total_duration = Math.max(1, Math.round((nowMs - created) / 60000));
    item.repaired_at = new Date().toISOString();
    if (item.status === 'pending') item.wait_duration = item.total_duration;
  }
  if (body.status) item.status = body.status;
  for (const k of ['description', 'category', 'device_type', 'building']) {
    if (body[k] !== undefined && body[k] !== null) item[k] = String(body[k]);
  }
  if (body.attachment !== undefined) {
    let atts = [];
    if (Array.isArray(body.attachment)) atts = body.attachment;
    else if (typeof body.attachment === 'string' && body.attachment) atts = [body.attachment];
    const safeAtt = atts.filter((a) => typeof a === 'string' && a.startsWith('/upload/'));
    item.attachment = safeAtt.length ? JSON.stringify(safeAtt) : '';
  }
  item.updated_at = new Date().toISOString();
  ok(res, item);
}, { need: 'senior' });

route('DELETE', /^\/api\/hotel\/(\d+)\/incidents\/(\d+)$/, async ({ res, params }) => {
  const [hotelId, id] = params;
  const idx = store.incidents.findIndex((i) => Number(i.id) === Number(id) && Number(i.hotel_id) === Number(hotelId));
  if (idx === -1) return fail(res, 404, '记录不存在');
  store.incidents.splice(idx, 1);
  sendJson(res, 200, { ok: true });
}, { need: 'admin' });

route('POST', /^\/api\/hotel\/upload$/, async ({ res, raw, contentType }) => {
  const { files } = parseMultipart(raw, contentType);
  const file = files.find((f) => f.fieldname === 'image') || files[0];
  if (!file) return fail(res, 400, '未收到图片文件');
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.contentType)) {
    return fail(res, 400, '仅支持 jpg/png/gif/webp 格式');
  }
  sendJson(res, 200, { ok: true, url: saveUpload(file, 'hotel') });
}, { need: 'senior' });

// 后台：用户
route('GET', /^\/api\/admin\/users$/, async ({ res, query }) => {
  const search = (query.get('search') || '').trim().toLowerCase();
  let list = [...store.users].sort((a, b) => a.id - b.id);
  if (search) {
    list = list.filter((u) =>
      [u.username, u.name, u.user_no].some((v) => String(v || '').toLowerCase().includes(search))
    );
  }
  ok(res, list.map(sanitize));
}, { need: 'admin' });

route('POST', /^\/api\/admin\/users$/, async ({ res, body }) => {
  if (!body.username || !String(body.username).trim()) return fail(res, 400, '登录账号不能为空');
  if (!body.password || String(body.password).length < 6) return fail(res, 400, '密码至少6位');
  if (store.users.some((u) => u.username === String(body.username).trim())) return fail(res, 400, '该账号已存在');
  const item = {
    id: nextId(store.users),
    user_no: `U${String(nextId(store.users)).padStart(4, '0')}`,
    username: String(body.username).trim(),
    password: String(body.password),
    name: String(body.name || body.username).trim(),
    avatar: '',
    signature: String(body.signature || ''),
    department: String(body.department || ''),
    job_number: String(body.job_number || ''),
    role: ['user', 'senior', 'admin'].includes(body.role) ? body.role : 'user',
    remark: String(body.remark || ''),
    create_time: new Date().toISOString(),
  };
  store.users.push(item);
  ok(res, sanitize(item));
}, { need: 'admin' });

route('PUT', /^\/api\/admin\/users\/(\d+)\/profile$/, async ({ res, params, body }) => {
  const u = store.users.find((x) => Number(x.id) === Number(params[0]));
  if (!u) return fail(res, 404, '用户不存在');
  for (const k of ['username', 'name', 'signature', 'department', 'job_number', 'remark']) {
    if (body[k] !== undefined) u[k] = String(body[k]);
  }
  ok(res, sanitize(u));
}, { need: 'admin' });

route('PUT', /^\/api\/admin\/users\/(\d+)\/password$/, async ({ res, params, body }) => {
  const u = store.users.find((x) => Number(x.id) === Number(params[0]));
  if (!u) return fail(res, 404, '用户不存在');
  if (!body.password || String(body.password).length < 6) return fail(res, 400, '密码至少6位');
  u.password = String(body.password);
  sendJson(res, 200, { ok: true, msg: '密码已重置' });
}, { need: 'admin' });

route('PUT', /^\/api\/admin\/users\/(\d+)$/, async ({ res, params, body, user }) => {
  const id = Number(params[0]);
  if (!['user', 'senior', 'admin', 'super'].includes(body.role)) return fail(res, 400, '无效的角色');
  if (id === user.id) return fail(res, 400, '不能修改自己的账号等级');
  if (body.role === 'super' && store.users.some((u) => u.role === 'super')) {
    return fail(res, 400, '超级管理员只能有一个，无法提升该用户');
  }
  const u = store.users.find((x) => Number(x.id) === id);
  if (!u) return fail(res, 404, '用户不存在');
  if (u.role === 'super' && body.role !== 'super') return fail(res, 400, '不能降级超级管理员账号');
  u.role = body.role;
  sendJson(res, 200, { ok: true, msg: '更新成功' });
}, { need: 'admin' });

route('DELETE', /^\/api\/admin\/users\/(\d+)$/, async ({ res, params, user }) => {
  const id = Number(params[0]);
  if (id === user.id) return fail(res, 400, '不能删除自己');
  const idx = store.users.findIndex((x) => Number(x.id) === id);
  if (idx === -1) return fail(res, 404, '用户不存在');
  store.users.splice(idx, 1);
  sendJson(res, 200, { ok: true, msg: '删除成功' });
}, { need: 'admin' });

// 后台：开发者
route('GET', /^\/api\/admin\/developers$/, async ({ res }) => ok(res, store.developers.map(formatDeveloper)), { need: 'admin' });

route('POST', /^\/api\/admin\/developers$/, async ({ res, body }) => {
  if (!body.username) return fail(res, 400, '请选择关联用户');
  const item = {
    id: nextId(store.developers),
    username: String(body.username),
    name: String(body.name || ''),
    role: String(body.role || ''),
    tagline: String(body.tagline || ''),
    bio: String(body.bio || ''),
    location: String(body.location || ''),
    email: String(body.email || ''),
    avatar_initial: String(body.avatar_initial || String(body.name || '').slice(0, 1)),
    hero: JSON.stringify(parseJsonField(body.hero)),
    skills: JSON.stringify(parseJsonField(body.skills)),
    projects: JSON.stringify(parseJsonField(body.projects)),
    timeline: JSON.stringify(parseJsonField(body.timeline)),
    socials: JSON.stringify(parseJsonField(body.socials)),
    contacts: JSON.stringify(parseJsonField(body.contacts)),
    sort: Number(body.sort) || 0,
    updated_at: new Date().toISOString(),
  };
  store.developers.push(item);
  ok(res, formatDeveloper(item));
}, { need: 'admin' });

route('PUT', /^\/api\/admin\/developers\/(\d+)$/, async ({ res, params, body }) => {
  const row = store.developers.find((d) => Number(d.id) === Number(params[0]));
  if (!row) return fail(res, 404, '开发者不存在');
  for (const k of ['username', 'name', 'role', 'tagline', 'bio', 'location', 'email', 'avatar_initial']) {
    if (body[k] !== undefined) row[k] = String(body[k]);
  }
  for (const k of ['hero', 'skills', 'projects', 'timeline', 'socials', 'contacts']) {
    if (body[k] !== undefined) row[k] = JSON.stringify(parseJsonField(body[k]));
  }
  if (body.sort !== undefined) row.sort = Number(body.sort) || 0;
  row.updated_at = new Date().toISOString();
  ok(res, formatDeveloper(row));
}, { need: 'admin' });

route('DELETE', /^\/api\/admin\/developers\/(\d+)$/, async ({ res, params }) => {
  const idx = store.developers.findIndex((d) => Number(d.id) === Number(params[0]));
  if (idx === -1) return fail(res, 404, '开发者不存在');
  store.developers.splice(idx, 1);
  sendJson(res, 200, { ok: true, msg: '开发者已删除' });
}, { need: 'admin' });

// 后台：服务文件
route('GET', /^\/api\/admin\/services$/, async ({ res }) => ok(res, store.serviceFiles.map(serviceFileWithVersions)), { need: 'admin' });

route('POST', /^\/api\/admin\/services$/, async ({ res, body, user }) => {
  if (!body.title || !String(body.title).trim()) return fail(res, 400, '文件标题必填');
  const item = {
    id: nextId(store.serviceFiles),
    title: String(body.title).trim(),
    description: String(body.description || ''),
    user_id: user.id,
    create_time: new Date().toISOString(),
  };
  store.serviceFiles.push(item);
  ok(res, serviceFileWithVersions(item));
}, { need: 'admin' });

route('PUT', /^\/api\/admin\/services\/(\d+)$/, async ({ res, params, body }) => {
  const f = store.serviceFiles.find((x) => Number(x.id) === Number(params[0]));
  if (!f) return fail(res, 404, '文件不存在');
  if (body.title !== undefined) f.title = String(body.title).trim();
  if (body.description !== undefined) f.description = String(body.description || '');
  ok(res, serviceFileWithVersions(f));
}, { need: 'admin' });

route('POST', /^\/api\/admin\/services\/upload$/, async ({ res, body, raw, contentType }) => {
  const isMultipart = String(contentType || '').includes('multipart/form-data');
  if (!isMultipart) return fail(res, 400, '请使用表单上传');
  const { fields, files } = parseMultipart(raw, contentType);
  const file = files.find((f) => f.fieldname === 'file') || files[0];
  if (!file) return fail(res, 400, '请选择文件');
  if (!fields.title || !String(fields.title).trim()) return fail(res, 400, '文件标题必填');
  const fileId = nextId(store.serviceFiles);
  const url = saveUpload(file, 'service');
  const item = {
    id: fileId,
    title: String(fields.title).trim(),
    description: String(fields.description || ''),
    user_id: 1,
    create_time: new Date().toISOString(),
  };
  store.serviceFiles.push(item);
  store.serviceFileItems.push({
    id: nextId(store.serviceFileItems),
    service_id: fileId,
    file_name: file.filename,
    file_path: url,
    file_size: `${Math.max(1, Math.round(file.data.length / 1024))} KB`,
    version: String(fields.version || 'v1.0'),
    download_count: 0,
    create_time: new Date().toISOString(),
  });
  ok(res, serviceFileWithVersions(item));
}, { need: 'admin' });

route('POST', /^\/api\/admin\/services\/(\d+)\/versions$/, async ({ res, params, raw, contentType }) => {
  const f = store.serviceFiles.find((x) => Number(x.id) === Number(params[0]));
  if (!f) return fail(res, 404, '文件不存在');
  const { fields, files } = parseMultipart(raw, contentType);
  const file = files.find((x) => x.fieldname === 'file') || files[0];
  if (!file) return fail(res, 400, '请选择文件');
  store.serviceFileItems.push({
    id: nextId(store.serviceFileItems),
    service_id: f.id,
    file_name: file.filename,
    file_path: saveUpload(file, 'service'),
    file_size: `${Math.max(1, Math.round(file.data.length / 1024))} KB`,
    version: String(fields.version || 'v1.0'),
    download_count: 0,
    create_time: new Date().toISOString(),
  });
  ok(res, serviceFileWithVersions(f));
}, { need: 'admin' });

route('DELETE', /^\/api\/admin\/services\/versions\/(\d+)$/, async ({ res, params }) => {
  const idx = store.serviceFileItems.findIndex((x) => Number(x.id) === Number(params[0]));
  if (idx === -1) return fail(res, 404, '版本不存在');
  store.serviceFileItems.splice(idx, 1);
  sendJson(res, 200, { ok: true });
}, { need: 'admin' });

route('DELETE', /^\/api\/admin\/services\/(\d+)$/, async ({ res, params }) => {
  const idx = store.serviceFiles.findIndex((x) => Number(x.id) === Number(params[0]));
  if (idx === -1) return fail(res, 404, '文件不存在');
  store.serviceFileItems = store.serviceFileItems.filter((v) => Number(v.service_id) !== Number(params[0]));
  store.serviceFiles.splice(idx, 1);
  sendJson(res, 200, { ok: true });
}, { need: 'admin' });

// ---------- 静态资源 ----------

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function safeJoin(base, rel) {
  const target = path.resolve(base, '.' + path.sep + rel);
  if (!target.startsWith(path.resolve(base))) return null;
  return target;
}

// ---------- 请求分发 ----------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = decodeURIComponent(url.pathname);

  // 静态：上传目录
  if (pathname.startsWith('/upload/')) {
    const target = safeJoin(UPLOAD_DIR, pathname.slice('/upload/'.length));
    if (target && fs.existsSync(target)) return serveFile(res, target);
    // 真实模式下，头像与附件在线上 Apache 的 /upload/ 里，直接跳过去
    if (useRealApi) {
      res.writeHead(302, { Location: `https://kilk.online${pathname}` });
      return res.end();
    }
    return target ? fail(res, 404, '文件不存在') : fail(res, 400, '非法路径');
  }

  // 静态：构建资源
  if (pathname.startsWith('/assets/')) {
    const target = safeJoin(ASSETS_DIR, pathname.slice('/assets/'.length));
    return target ? serveFile(res, target) : fail(res, 400, '非法路径');
  }

  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method Not Allowed');
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const direct = safeJoin(STATIC_DIR, rel);
    if (direct && fs.existsSync(direct) && fs.statSync(direct).isFile()) return serveFile(res, direct);
    // SPA 回退
    return serveFile(res, path.join(STATIC_DIR, 'index.html'));
  }

  // API：本地后端在线时转发，看到的是数据库真实数据
  if (useRealApi) return proxyToBackend(req, res, pathname, url.search);

  // API（mock）
  let body = {};
  let raw = Buffer.alloc(0);
  const contentType = req.headers['content-type'] || '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    raw = await readBody(req);
    if (contentType.includes('application/json') && raw.length) {
      try {
        body = JSON.parse(raw.toString('utf8'));
      } catch {
        return fail(res, 400, '请求体不是合法 JSON');
      }
    }
  }

  const user = currentUser(req);
  const matched = routes.find((r) => r.method === req.method && r.pattern.test(pathname));
  if (!matched) return fail(res, 404, `未实现的接口：${req.method} ${pathname}`);

  if (matched.need === 'auth' && !user) return fail(res, 401, '请先登录');
  if (matched.need === 'senior' && (!user || !SENIOR_UP.includes(user.role))) return fail(res, 401, '需要高级用户权限');
  if (matched.need === 'admin' && (!user || !ADMIN_ONLY.includes(user.role))) return fail(res, 403, '需要管理员权限');

  const params = (matched.pattern.exec(pathname) || []).slice(1);
  try {
    await matched.handler({ req, res, params, query: url.searchParams, body, raw, contentType, user });
  } catch (err) {
    console.error('[mock] 处理失败:', req.method, pathname, err);
    if (!res.headersSent) fail(res, 500, `本地服务异常：${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  kilk 2.0 本地预览已启动');
  console.log(`  地址：http://${HOST}:${PORT}`);
  console.log(`  站点：${STATIC_DIR}`);
  if (useRealApi) {
    console.log(`  数据：真实后端 ${BACKEND}（本地 PostgreSQL 的 kilk 库）`);
    console.log('        账号用库里的真实账号密码登录，改动会写进数据库。');
  } else {
    console.log('  数据：mock（内存，重启即还原）');
    console.log('        账号：admin/admin123（超管）  senior/senior123（高级）  user/user123（普通）');
    console.log('        想接真实数据：先起 server 后端（3001）再启动本服务。');
  }
  console.log('  Ctrl+C 结束。');
  console.log('');
});
