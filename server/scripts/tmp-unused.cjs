const fs = require('fs');
const path = require('path');
const root = process.cwd();

// 收集所有 ts/tsx 文件
function walk(dir, ext, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      walk(p, ext, out);
    } else if (ext.some((x) => p.endsWith(x))) out.push(p);
  }
}
const all = [];
walk(path.join(root, 'src'), ['.ts', '.tsx'], all);

// 所有 import 引用（归一化为相对路径）
function norm(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}
const refs = new Map(); // normalized -> count
const sources = [];
for (const f of all) {
  const src = fs.readFileSync(f, 'utf8');
  sources.push(src);
  const re = /from\s+['"]([^'"]+)['"]|import\s*\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1] || m[2];
    let target;
    if (spec.startsWith('@/')) {
      target = path.resolve(root, 'src', spec.slice(2));
    } else if (spec.startsWith('.')) {
      const base = path.dirname(f);
      target = path.resolve(base, spec);
    } else {
      continue;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      // try index
      const idx = path.join(target, 'index.ts');
      if (fs.existsSync(idx)) target = idx;
    }
    if (!fs.existsSync(target)) {
      // try extensions
      for (const ext of ['.ts', '.tsx']) {
        if (fs.existsSync(target + ext)) { target = target + ext; break; }
      }
    }
    const n = norm(target);
    refs.set(n, (refs.get(n) || 0) + 1);
  }
}

// 找出从未被引用的文件
const unused = [];
for (const f of all) {
  const n = norm(f);
  if (n === 'src/index.tsx' || n === 'src/app.tsx' || n === 'src/vite-env.d.ts' || n.includes('vite.config')) continue;
  if (!refs.has(n)) unused.push(n);
}
console.log('=== 从未被引用的文件（候选删除/冗余）===');
for (const u of unused.sort()) console.log(u);

// 检查 main.tsx 是否引用 app.tsx（入口链）
console.log('\n=== index.tsx 内容 ===');
console.log(fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8').slice(0, 600));
