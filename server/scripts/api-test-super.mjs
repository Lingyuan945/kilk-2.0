// kilk 2.0 超管全功能验证（含写入操作，测试后自动清理）
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

// 超管登录
const ling = await req('POST', '/auth/login', { username: 'ling', password: '59420' });
check('超管 ling 登录', ling.status === 200 && ling.data.token, ling.data.msg);
const LT = ling.data.token;

// ===== 超管管理接口 =====
console.log('\n===== 超管专有接口 =====');
const lingPut = await req('PUT', '/admin/ling-profile', { name: '凌渊' }, LT);
check('关于Ling编辑（super）', lingPut.status === 200, 'HTTP ' + lingPut.status + ' ' + JSON.stringify(lingPut.data).slice(0, 80));

const homeGet = await req('GET', '/home');
const homePut = await req('PUT', '/home', { banner_title: homeGet.data.data.banner_title, banner_desc: homeGet.data.data.banner_desc, card1_title: homeGet.data.data.card1_title, card1_text: homeGet.data.data.card1_text, card2_title: homeGet.data.data.card2_title, card2_text: homeGet.data.data.card2_text, card3_title: homeGet.data.data.card3_title, card3_text: homeGet.data.data.card3_text }, LT);
check('首页内容更新（super）', homePut.status === 200, 'HTTP ' + homePut.status + ' ' + JSON.stringify(homePut.data).slice(0, 80));

// ===== 发帖/评论功能 =====
console.log('\n===== 发帖 / 评论 =====');
const newPost = await req('POST', '/forum/posts', { title: '[自动测试] 验证帖', content: '这是一条自动验证数据，即将删除', channel_id: 1 }, LT);
check('发布帖子', newPost.status === 200 && (newPost.data.post_id || newPost.data.data), 'HTTP ' + newPost.status + ' ' + JSON.stringify(newPost.data).slice(0, 100));
const postId = newPost.data?.post_id || newPost.data?.data?.id;
if (postId) {
  const detail = await req('GET', '/forum/posts/' + postId);
  check('查看新帖详情', detail.status === 200 && detail.data.data.title.includes('验证帖'), 'HTTP ' + detail.status);

  const reply = await req('POST', '/forum/posts/' + postId + '/replies', { content: '自动测试评论' }, LT);
  check('发布评论', reply.status === 200, 'HTTP ' + reply.status + ' ' + JSON.stringify(reply.data).slice(0, 80));

  const detail2 = await req('GET', '/forum/posts/' + postId);
  check('帖子详情含新评论', detail2.status === 200 && detail2.data.data.replies.length > 0, '无评论');
}

// ===== 用户管理 =====
console.log('\n===== 用户管理 =====');
const newUser = await req('POST', '/admin/users', { username: 'test_auto', name: '自动测试', password: 'Test@123', role: 'user' }, LT);
check('新增用户', newUser.status === 200 && newUser.data.data, 'HTTP ' + newUser.status + ' ' + JSON.stringify(newUser.data).slice(0, 100));
const newUserId = newUser.data?.data?.id;
if (newUserId) {
  const editUser = await req('PUT', '/admin/users/' + newUserId + '/profile', { username: 'test_auto', name: '自动测试改名' }, LT);
  check('编辑用户资料', editUser.status === 200, 'HTTP ' + editUser.status + ' ' + JSON.stringify(editUser.data).slice(0, 80));
  const delUser = await req('DELETE', '/admin/users/' + newUserId, null, LT);
  check('删除测试用户', delUser.status === 200, 'HTTP ' + delUser.status);
}

// ===== 频道管理 =====
console.log('\n===== 频道管理 =====');
const newChan = await req('POST', '/admin/channels', { name: '自动测试频道', description: '临时' }, LT);
check('新增频道', newChan.status === 200 && newChan.data.data, 'HTTP ' + newChan.status + ' ' + JSON.stringify(newChan.data).slice(0, 80));
const chanId = newChan.data?.data?.id;
if (chanId) {
  const delChan = await req('DELETE', '/admin/channels/' + chanId, null, LT);
  check('删除测试频道', delChan.status === 200, 'HTTP ' + delChan.status);
}

// ===== 帖子管理（删除测试帖） =====
console.log('\n===== 帖子管理 =====');
if (postId) {
  const delPost = await req('DELETE', '/admin/posts/' + postId, null, LT);
  check('删除测试帖子（含评论）', delPost.status === 200, 'HTTP ' + delPost.status);
  const gone = await req('GET', '/forum/posts/' + postId);
  check('帖子已删除', gone.status === 404, 'HTTP ' + gone.status);
}

// ===== 越权验证补充 =====
console.log('\n===== 越权验证 =====');
const normal = await req('POST', '/auth/login', { username: 'xwl', password: '123456' });
if (normal.data.token) {
  const nt = normal.data.token;
  const u1 = await req('POST', '/forum/posts', { title: '越权测试', content: 'x', channel_id: 1 }, nt);
  const uid = u1.data?.data?.id;
  if (uid) {
    // 普通用户尝试删除别人的帖子（id=1 ling的帖子）
    const delOther = await req('DELETE', '/admin/posts/' + uid, null, nt);
    check('普通用户无 admin 接口权限', delOther.status === 401 || delOther.status === 403, 'HTTP ' + delOther.status);
    // 清理
    await req('DELETE', '/admin/posts/' + uid, null, LT);
  }
  const promote = await req('PUT', '/admin/users/11', { role: 'admin' }, nt);
  check('普通用户不能提升自己角色', promote.status === 401 || promote.status === 403, 'HTTP ' + promote.status);
}

console.log('\n========== 超管全功能结果 ==========');
console.log('通过: ' + pass + ' | 失败: ' + fail);
process.exit(fail > 0 ? 1 : 0);
