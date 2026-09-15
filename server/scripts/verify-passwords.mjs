import fs from 'node:fs';
const s = fs.readFileSync('data-export/postgresql_migration.sql', 'utf8');
// 找到 user 表 INSERT
const idx = s.indexOf('INSERT INTO "user"');
const end = s.indexOf(';', idx);
console.log('=== user 表 INSERT 片段 ===');
console.log(s.slice(idx, end + 1).slice(0, 700));
console.log('\n=== 旧哈希残留检查 ===');
console.log('md5 旧哈希残留:', s.includes('e10adc3949ba59abbe56e057f20f883e') ? '有残留!' : '已清除 ✓');
console.log('旧 bcrypt $2y$ 残留:', (s.match(/\$2y\$[^\s']+/g) || []).length > 0 ? '有残留!' : '已清除 ✓');
console.log('新 bcrypt $2a$ 数量:', (s.match(/\$2a\$[^\s']+/g) || []).length);
