// 将 postgresql_migration.sql 导入本地 PGlite（嵌入式 PostgreSQL）
// 数据存放在 ./pg-local-data 目录
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.resolve('pg-local-data');
const SQL_FILE = path.resolve('data-export/postgresql_migration.sql');
const PWD_FILE = path.resolve('data-export/passwords.csv');

const TABLES = ['channel', 'content', 'forum_post', 'forum_post_image', 'forum_reply', 'forum_topic', 'forum_topic_reply', 'home_content', 'service_file', 'service_file_item', 'user'];

async function main() {
  // 清理旧数据
  if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    console.log('已清理旧数据目录');
  }

  console.log('初始化 PGlite（嵌入式 PostgreSQL 17）...');
  const db = new PGlite(DATA_DIR);
  await db.waitReady;
  console.log('PGlite 就绪，数据目录:', DATA_DIR);

  // 读取并执行迁移 SQL
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  console.log(`\n执行迁移 SQL (${sql.length} 字符, ${sql.split('\n').length} 行)...`);

  try {
    await db.exec(sql);
    console.log('✓ SQL 执行成功');
  } catch (e) {
    console.error('✗ SQL 执行失败:', e.message);
    // 尝试逐语句执行定位错误
    console.log('\n尝试逐语句执行定位错误...');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
    for (let i = 0; i < statements.length; i++) {
      try {
        await db.exec(statements[i] + ';');
      } catch (err) {
        console.error(`语句 ${i + 1} 失败:`, err.message);
        console.error('语句内容:', statements[i].slice(0, 200));
        break;
      }
    }
    process.exit(1);
  }

  // 逐表验证行数
  console.log('\n========== 数据验证 ==========');
  let totalRows = 0;
  for (const table of TABLES) {
    const res = await db.query(`SELECT count(*)::int as cnt FROM "${table}"`);
    const cnt = res.rows[0].cnt;
    totalRows += cnt;
    const status = cnt > 0 ? '✓' : '·';
    console.log(`${status} ${table.padEnd(25)} ${cnt} 行`);
  }
  console.log(`\n总计: ${totalRows} 行数据, ${TABLES.length} 张表`);

  // 验证用户数据和新密码
  console.log('\n========== 用户与密码验证 ==========');
  const users = await db.query('SELECT id, username, name, role, password FROM "user" ORDER BY id');
  const passwords = {};
  if (fs.existsSync(PWD_FILE)) {
    const lines = fs.readFileSync(PWD_FILE, 'utf8').split('\n').slice(1);
    for (const line of lines) {
      const [username, name, pwd, role] = line.split(',');
      if (username) passwords[username] = pwd;
    }
  }

  for (const u of users.rows) {
    const plainPwd = passwords[u.username];
    let pwdStatus = '无明文对照';
    if (plainPwd) {
      const match = bcrypt.compareSync(plainPwd, u.password);
      pwdStatus = match ? '✓ 密码可登录' : '✗ 密码不匹配';
    }
    console.log(`  [${u.id}] ${u.username.padEnd(8)} ${(u.name || '-').padEnd(12)} ${u.role.padEnd(8)} ${pwdStatus}`);
  }

  // 验证帖子数据
  console.log('\n========== 帖子抽样 ==========');
  const posts = await db.query('SELECT id, user_id, title, view_count, channel_id FROM forum_post ORDER BY id LIMIT 5');
  for (const p of posts.rows) {
    console.log(`  帖子#${p.id}: ${p.title} (浏览${p.view_count}, 频道${p.channel_id})`);
  }

  // 验证序列已重置
  console.log('\n========== 自增序列验证 ==========');
  const seqs = await db.query(`
    SELECT sequencename, last_value 
    FROM pg_sequences 
    WHERE schemaname = 'public' 
    ORDER BY sequencename
  `);
  for (const s of seqs.rows) {
    console.log(`  ${s.sequencename.padEnd(35)} last_value=${s.last_value}`);
  }

  console.log('\n========================================');
  console.log('✓ 本地 PostgreSQL 导入完成！');
  console.log(`  数据文件: ${DATA_DIR}`);
  console.log('  连接方式: PGlite (嵌入式，无需端口)');
  console.log('========================================');

  await db.close();
}

main().catch(e => {
  console.error('致命错误:', e);
  process.exit(1);
});
