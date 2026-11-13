/**
 * 本地预览冒烟检查：用 Edge 无头打开各页面，抓控制台报错并截图。
 * 用法：node local-runtime/smoke.mjs
 * 截图落在 local-runtime/screenshots/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = path.join(__dirname, 'screenshots');
const BASE = process.env.BASE || 'http://127.0.0.1:5180';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

fs.mkdirSync(SHOT_DIR, { recursive: true });

const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
}).then((r) => r.json());

if (!login.ok) throw new Error('登录失败，服务是否已启动？');
const token = login.token;

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`[console] ${msg.text()}`);
});
page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`));

await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
await page.evaluate((t) => localStorage.setItem('kilk_token', t), token);

const pages = [
  ['01-home', '/'],
  ['02-hotel-list', '/hotel'],
  ['03-hotel-detail', '/hotel/1'],
  ['04-notice', '/notice'],
  ['05-service', '/service'],
  ['06-about', '/about'],
  ['07-developers', '/about-ling'],
  ['08-developer-card', '/developer/ling'],
  ['09-admin', '/admin'],
  ['10-user', '/user/2'],
];

for (const [name, route] of pages) {
  const before = problems.length;
  await page.goto(BASE + route, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
  const added = problems.length - before;
  console.log(`${added === 0 ? 'OK  ' : 'ERR '} ${route}  -> ${name}.png`);
}

await browser.close();

if (problems.length) {
  console.log('\n控制台报错：');
  for (const p of problems) console.log('  ' + p);
  process.exitCode = 1;
} else {
  console.log('\n控制台零报错，全部页面渲染完成。');
}
