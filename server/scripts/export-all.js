// 导出 kilk MySQL 全部数据为明文格式（JSON + SQL）
// 连接本机 3306（SSH 隧道 → 服务器 MySQL）
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const DB = {
  host: '127.0.0.1',
  port: 3306,
  user: 'simple_site',
  password: 'Simple@Site2026',
  database: 'simple_site',
};

const OUT_DIR = path.resolve('data-export');
const JSON_DIR = path.join(OUT_DIR, 'json');
const SQL_FILE = path.join(OUT_DIR, 'simple_site_all.sql');
const SCHEMA_FILE = path.join(OUT_DIR, 'schema.json');

function mysqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  const s = String(value);
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\0/g, '\\0').replace(/\x1a/g, '\\Z') + "'";
}

async function main() {
  fs.mkdirSync(JSON_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const conn = await mysql.createConnection(DB);
  console.log('已连接 MySQL，开始导出...\n');

  const [tables] = await conn.query('SHOW TABLES');
  const tableNames = tables.map((t) => Object.values(t)[0]);
  console.log(`共 ${tableNames.length} 张表: ${tableNames.join(', ')}\n`);

  const schemaAll = {};
  const sqlLines = [];
  sqlLines.push('-- kilk simple_site 全量数据导出');
  sqlLines.push(`-- 导出时间: ${new Date().toISOString()}`);
  sqlLines.push(`-- 共 ${tableNames.length} 张表\n`);
  sqlLines.push('SET FOREIGN_KEY_CHECKS = 0;\n');

  const summary = {};

  for (const table of tableNames) {
    // 表结构
    const [cols] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    const createSQL = cols[0]['Create Table'];
    schemaAll[table] = { createSQL, columns: [] };

    const [colInfo] = await conn.query(`DESCRIBE \`${table}\``);
    schemaAll[table].columns = colInfo.map((c) => ({
      field: c.Field,
      type: c.Type,
      null: c.Null,
      key: c.Key,
      default: c.Default,
      extra: c.Extra,
    }));

    // 全部数据
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    const count = rows.length;
    summary[table] = count;

    // JSON 文件
    fs.writeFileSync(
      path.join(JSON_DIR, `${table}.json`),
      JSON.stringify(rows, null, 2),
      'utf-8'
    );

    // SQL 文件
    sqlLines.push(`-- ========== ${table} (${count} 行) ==========`);
    sqlLines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    sqlLines.push(createSQL + ';');
    if (count > 0) {
      const colNames = Object.keys(rows[0]).map((c) => `\`${c}\``).join(', ');
      const batch = [];
      for (const row of rows) {
        const values = colNames.split(', ').map((c, i) => {
          const key = Object.keys(rows[0])[i];
          return mysqlEscape(row[key]);
        });
        batch.push(`(${values.join(', ')})`);
      }
      // 分批 INSERT，避免超长
      for (let i = 0; i < batch.length; i += 200) {
        sqlLines.push(`INSERT INTO \`${table}\` (${colNames}) VALUES\n  ${batch.slice(i, i + 200).join(',\n  ')};`);
      }
    }
    sqlLines.push('');

    console.log(`✓ ${table}: ${count} 行`);
  }

  sqlLines.push('SET FOREIGN_KEY_CHECKS = 1;');
  fs.writeFileSync(SQL_FILE, sqlLines.join('\n'), 'utf-8');
  fs.writeFileSync(SCHEMA_FILE, JSON.stringify(schemaAll, null, 2), 'utf-8');
  fs.writeFileSync(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify({ exportTime: new Date().toISOString(), totalTables: tableNames.length, summary }, null, 2),
    'utf-8'
  );

  console.log('\n导出完成！');
  console.log(`输出目录: ${OUT_DIR}`);
  console.log(`JSON 文件: ${JSON_DIR} (${tableNames.length} 个)`);
  console.log(`SQL 全量文件: ${SQL_FILE}`);
  console.log(`表结构文件: ${SCHEMA_FILE}`);
  console.log(`汇总: ${path.join(OUT_DIR, 'summary.json')}`);

  await conn.end();
}

main().catch((e) => {
  console.error('导出失败:', e.message);
  process.exit(1);
});
