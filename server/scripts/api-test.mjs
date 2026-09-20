// kilk 2.0 本地完整 API 验证脚本
const BASE = 'http://localhost:3001/api';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = { raw: true }; }
  return { status: res.status, data };
}

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('✅ ' + name); }
  else { fail++; console.log('❌ ' + name + (detail ? ' — ' + detail : '')); }
}

// ========== 登录测试 ==========
console.log('===== 登录 =====');
const lingLogin = await req('POST', '/auth/login', { username: 'ling', password: '59420' });
check('超管 ling/95420 登录', lingLogin.status === 200 && lingLogin.data.token, lingLogin.data.msg || 'HTTP ' + lingLogin.status);
console.log('  ling 响应:', lingLogin.status, JSON.stringify(lingLogin.data).slice(0, 200));

const adminLogin = await req('POST', '/auth/login', { username: '123', password: '123456' });
check('管理员 123/123456 登录', adminLogin.status === 200 && adminLogin.data.token, adminLogin.data.msg || 'HTTP ' + adminLogin.status);

const lingToken = lingLogin.data.token;
const adminToken = adminLogin.data.token;

// ========== 公开接口 ==========
console.log('===== 公开接口 =====');
const posts = await req('GET', '/forum/posts');
check('帖子列表', posts.status === 200 && Array.isArray(posts.data.data), 'HTTP ' + posts.status);
const channels = await req('GET', '/forum/channels');
check('频道列表', channels.status === 200 && Array.isArray(channels.data.data), 'HTTP ' + channels.status);
const home = await req('GET', '/home');
check('首页内容', home.status === 200, 'HTTP ' + home.status);
const lingProfile = await req('GET', '/ling');
check('关于Ling资料', lingProfile.status === 200 && lingProfile.data.data, 'HTTP ' + lingProfile.status);
const services = await req('GET', '/service/files');
check('服务文件列表', services.status === 200, 'HTTP ' + services.status);

// 帖子详情（含评论）
if (posts.data && posts.data.data && posts.data.data.length > 0) {
  const pid = posts.data.data[0].id;
  const detail = await req('GET', '/forum/posts/' + pid);
  check('帖子详情 id=' + pid, detail.status === 200, 'HTTP ' + detail.status);
  check('帖子详情包含评论数组', detail.status === 200 && Array.isArray(detail.data.data.replies), '无 replies 字段');
  check('帖子详情包含图片数组', detail.status === 200 && Array.isArray(detail.data.data.images), '无 images 字段');
}

// ========== 管理员接口 ==========
console.log('===== 管理员接口（123 token） =====');
if (adminToken) {
  const users = await req('GET', '/admin/users', null, adminToken);
  check('用户列表', users.status === 200 && Array.isArray(users.data.data), 'HTTP ' + users.status);
  const channelsAdmin = await req('GET', '/admin/channels', null, adminToken);
  check('频道管理', channelsAdmin.status === 200, 'HTTP ' + channelsAdmin.status);
  const postsAdmin = await req('GET', '/admin/posts', null, adminToken);
  check('帖子管理', postsAdmin.status === 200, 'HTTP ' + postsAdmin.status);
  const lingAdmin = await req('PUT', '/admin/ling-profile', { name: '凌渊' }, adminToken);
  check('关于Ling管理接口(PUT)', lingAdmin.status === 200, 'HTTP ' + lingAdmin.status + ' ' + JSON.stringify(lingAdmin.data).slice(0,100));
}

// ========== 权限验证（越权测试） ==========
console.log('===== 安全性：权限控制 =====');
const noToken = await req('GET', '/admin/users');
check('未登录访问用户管理被拒', noToken.status === 401 || noToken.status === 403, 'HTTP ' + noToken.status);

// 普通用户 token（用 xwl 登录）
const userLogin = await req('POST', '/auth/login', { username: 'xwl', password: '123456' });
check('普通用户 xwl 登录', userLogin.status === 200 && userLogin.data.token, userLogin.data.msg || 'HTTP ' + userLogin.status);
if (userLogin.data.token) {
  const userToken = userLogin.data.token;
  const userAdmin = await req('GET', '/admin/users', null, userToken);
  check('普通用户访问管理后台被拒', userAdmin.status === 401 || userAdmin.status === 403, 'HTTP ' + userAdmin.status);
}

// 非法 token
const badToken = await req('GET', '/admin/users', null, 'invalid.token.here');
check('伪造 token 被拒', badToken.status === 401 || badToken.status === 403, 'HTTP ' + badToken.status);

// 不存在的用户登录
const noUser = await req('POST', '/auth/login', { username: 'notexist', password: '123' });
check('不存在用户登录被拒', noUser.status === 401 || noUser.status === 400 || noUser.status === 200 && !noUser.data.token, 'HTTP ' + noUser.status + ' ' + (noUser.data.msg||''));

console.log('\n========== 结果 ==========');
console.log('通过: ' + pass + ' | 失败: ' + fail);
process.exit(fail > 0 ? 1 : 0);
