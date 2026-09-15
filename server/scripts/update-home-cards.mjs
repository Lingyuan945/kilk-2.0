// 更新首页核心业务卡片为未来规划方向
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const DATA_DIR = path.resolve('pg-local-data');

const UPDATES = {
  card1_title: '项目管理',
  card1_text: '任务分配、进度跟踪、甘特图视图，让团队协作更高效透明',
  card2_title: '知识库',
  card2_text: '团队文档沉淀、技术笔记、全文检索，打造团队第二大脑',
  card3_title: '即时通讯',
  card3_text: '实时消息、群聊频道、文件传输，团队沟通零距离',
};

async function main() {
  const db = new PGlite(DATA_DIR);
  await db.waitReady;

  const sets = Object.entries(UPDATES).map(([k, v], i) => `${k} = $${i + 1}`).join(', ');
  const params = Object.values(UPDATES);

  await db.query(`UPDATE home_content SET ${sets} WHERE id = 1`, params);
  console.log('✓ home_content 已更新');

  const { rows } = await db.query('SELECT card1_title, card1_text, card2_title, card2_text, card3_title, card3_text FROM home_content WHERE id = 1');
  const r = rows[0];
  console.log('\n=== 验证 ===');
  console.log(`卡片1: ${r.card1_title} | ${r.card1_text}`);
  console.log(`卡片2: ${r.card2_title} | ${r.card2_text}`);
  console.log(`卡片3: ${r.card3_title} | ${r.card3_text}`);

  await db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
