// 服务支持上传/版本管理 API 测试
const BASE = 'https://kilk.online/api';

async function main() {
  // 1. 登录
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'ling', password: '59420' }),
  });
  const login = await loginRes.json();
  const token = login.token;
  console.log('[1] 登录:', login.ok ? 'OK' : 'FAIL', login.msg || '');

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. 创建测试文件
  const fs = await import('node:fs');
  const os = await import('node:os');
  const tmpDir = os.tmpdir();
  const testFile = Buffer.from('kilk 2.0 服务支持上传测试文件内容 - ' + Date.now());
  fs.writeFileSync(`${tmpDir}/test-service-upload.txt`, testFile);
  console.log('[2] 测试文件已创建:', testFile.length, 'bytes');

  // 3. 上传文件（新增服务用）
  const fd1 = new FormData();
  fd1.append('file', new Blob([testFile], { type: 'text/plain' }), '测试服务文件.txt');
  const up1 = await fetch(`${BASE}/admin/services/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: fd1,
  });
  const up1Json = await up1.json();
  console.log('[3] 上传文件:', up1Json.ok ? 'OK url=' + up1Json.data.url : 'FAIL ' + JSON.stringify(up1Json));

  // 4. 新增服务（带文件）
  const createRes = await fetch(`${BASE}/admin/services`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '测试服务-自动验证',
      description: '自动化测试，验证后将删除',
      file_path: up1Json.data.url,
      file_name: up1Json.data.file_name,
      file_size: up1Json.data.file_size,
    }),
  });
  const create = await createRes.json();
  const serviceId = create.id;
  console.log('[4] 新增服务:', create.ok ? 'OK id=' + serviceId : 'FAIL ' + JSON.stringify(create));

  // 5. 上传新版本
  const fd2 = new FormData();
  fd2.append('file', new Blob([Buffer.from('v2 版本内容')], { type: 'text/plain' }), '测试服务v2.txt');
  fd2.append('version_note', '自动测试版本2');
  const verRes = await fetch(`${BASE}/admin/services/${serviceId}/versions`, {
    method: 'POST',
    headers: authHeaders,
    body: fd2,
  });
  const verJson = await verRes.json();
  console.log('[5] 上传版本:', verJson.ok ? 'OK' : 'FAIL ' + JSON.stringify(verJson));

  // 6. 验证列表（应有 2 个版本）
  const listRes = await fetch(`${BASE}/admin/services`, { headers: authHeaders });
  const list = await listRes.json();
  const svc = list.data.find((s) => s.id === serviceId);
  console.log('[6] 版本列表:', svc ? svc.versions.length + ' 个版本' : '服务不存在');
  if (svc) {
    svc.versions.forEach((v) => console.log('    -', v.file_name, v.file_size + 'B', v.download_count + '次', v.version_note || ''));
  }

  // 7. 验证文件可通过 URL 访问
  if (svc && svc.versions.length > 0) {
    const fileRes = await fetch(`https://kilk.online${svc.versions[0].file_path}`);
    console.log('[7] 文件可访问:', fileRes.status === 200 ? 'OK' : 'FAIL ' + fileRes.status);
  }

  // 8. 清理：删除版本和服务
  if (svc) {
    for (const v of svc.versions) {
      const delVer = await fetch(`${BASE}/admin/services/versions/${v.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      console.log('[8a] 删除版本 ' + v.id + ':', (await delVer.json()).ok ? 'OK' : 'FAIL');
    }
    const delSvc = await fetch(`${BASE}/admin/services/${serviceId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('[8b] 删除服务:', (await delSvc.json()).ok ? 'OK' : 'FAIL');
  }

  console.log('\n=== 测试完成 ===');
}

main().catch((e) => console.error('测试异常:', e.message));
