import { PGlite } from '@electric-sql/pglite';

const db = new PGlite('./pg-local-data');
await db.waitReady;

await db.query(
  'UPDATE home_content SET card1_title = $1, card1_text = $2, card2_title = $3, card2_text = $4, card3_title = $5, card3_text = $6 WHERE id = 1',
  ['代码托管', 'Git 仓库管理、代码审查、版本发布，让代码协作更规范高效',
   'CI/CD 自动化', '自动构建、测试、部署，提升研发效率，减少人为失误',
   '监控告警', '服务状态监控、性能指标、异常实时告警，保障系统稳定运行']
);

const { rows } = await db.query('SELECT card1_title, card1_text, card2_title, card2_text, card3_title, card3_text FROM home_content WHERE id = 1');
const r = rows[0];
console.log('✓ 已更新为 B 方案（技术平台方向）');
console.log('卡片1:', r.card1_title, '|', r.card1_text);
console.log('卡片2:', r.card2_title, '|', r.card2_text);
console.log('卡片3:', r.card3_title, '|', r.card3_text);
await db.close();
