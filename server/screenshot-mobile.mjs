// 手机端截图脚本：登录 kilk.online 注入 token，点击各 Tab 截取后台每个管理页
import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = 'https://kilk.online';
const OUT = 'C:\\Users\\lingyuan\\Desktop\\IT-08\\Github\\kilk 2.0\\mob_';

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'ling', password: '59420' }),
});
const { token } = await login.json();
console.log('登录 OK');

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
);

await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
await page.evaluate((t) => localStorage.setItem('kilk_token', t), token);
console.log('token 已注入');

// 进入后台
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));

// 桌面导航隐藏、手机底部导航可见：点击底部导航文字
const tabs = [
  ['首页', 'admin_home'],
  ['论坛', 'admin_forum'],
  ['服务', 'admin_service'],
  ['用户', 'admin_users'],
];

for (const [label, name] of tabs) {
  try {
    const clicked = await page.evaluate((text) => {
      const els = [...document.querySelectorAll('[data-slot="tabs-trigger"]')];
      const el = els.find((e) => e.textContent?.trim().includes(text));
      if (el) { el.click(); return true; }
      return false;
    }, label);
    await new Promise((r) => setTimeout(r, 1800));
    await page.screenshot({ path: OUT + name + '.png' });
    console.log('截图:', name, clicked ? '(点击成功)' : '(未找到)');
  } catch (e) {
    console.log('失败:', name, e.message.slice(0, 80));
  }
}

// 关于Ling（超管才有）
try {
  const clicked = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-slot="tabs-trigger"]')];
    const el = els.find((e) => e.textContent?.trim().includes('Ling'));
    if (el) { el.click(); return true; }
    return false;
  });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: OUT + 'admin_ling.png' });
  console.log('截图: admin_ling', clicked ? '(点击成功)' : '(未找到)');
} catch (e) {
  console.log('失败: admin_ling', e.message.slice(0, 80));
}

await browser.close();
console.log('完成');
