import puppeteer from "puppeteer-core";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "https://kilk.online";
const OUT = "C:\\Users\\lingyuan\\Desktop\\IT-08\\Github\\kilk 2.0\\mob_";
const login = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "ling", password: "59420" }) });
const { token } = await login.json();
const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 30000 });
await page.evaluate((t) => localStorage.setItem("kilk_token", t), token);
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2", timeout: 30000 });
await new Promise((r) => setTimeout(r, 3000));

async function clickTab(label) {
  const pos = await page.evaluate((text) => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const t = tabs.find(x => x.textContent?.includes(text) && x.getBoundingClientRect().width > 0);
    if (!t) return null;
    const rect = t.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, label);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  await new Promise((r) => setTimeout(r, 1600));
  return true;
}

// 首页（默认）
await page.screenshot({ path: OUT + "admin_home.png" });
console.log("截图 admin_home");

for (const [label, name] of [["论坛", "admin_forum"], ["服务", "admin_service"], ["用户", "admin_users"]]) {
  const ok = await clickTab(label);
  await page.screenshot({ path: OUT + name + ".png" });
  console.log("截图", name, ok ? "OK" : "FAIL");
}

// 关于Ling
const okLing = await clickTab("Ling");
await page.screenshot({ path: OUT + "admin_ling.png" });
console.log("截图 admin_ling", okLing ? "OK" : "FAIL");

await browser.close();
console.log("完成");
