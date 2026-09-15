// 将 data-export/json/ 中的数据导入 PostgreSQL
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data-export/json');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Postgres@2026',
  database: 'kilk',
  max: 5,
});

// 表 -> 主键（用于跳过已存在数据）
const TABLE_KEYS = {
  user: ['id'],
  channel: ['id'],
  forum_post: ['id'],
  forum_reply: ['id'],
  service_file: ['id'],
  service_file_item: ['id'],
  home_content: ['id'],
  ling_profile: ['id'],
};

async function importTable(tableName, fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  let rows;
  try {
    rows = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.log(`[跳过] ${tableName}: 无法读取文件 ${err.message}`);
    return;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`[跳过] ${tableName}: 无数据`);
    return;
  }

  // 检查表是否存在（user 是保留字，需加引号）
  const tableCheck = await pool.query(
    `SELECT to_regclass('public.${tableName}') AS t`
  );
  if (!tableCheck.rows[0].t) {
    console.log(`[跳过] ${tableName}: 表不存在`);
    return;
  }

  // 获取表列
  const colResult = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    [tableName]
  );
  const tableCols = new Set(colResult.rows.map((r) => r.column_name));

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    // 过滤掉表中不存在的列
    const data = {};
    for (const [key, value] of Object.entries(row)) {
      if (tableCols.has(key)) {
        // MySQL 中 moderator_id=0 表示"无版主"，PostgreSQL 需要 NULL
        if (key === 'moderator_id' && value === 0) {
          data[key] = null;
        } else {
          data[key] = value;
        }
      }
    }

    // 检查主键是否已存在
    const keyCols = TABLE_KEYS[tableName] || ['id'];
    let exists = false;
    try {
      const conditions = keyCols.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
      const values = keyCols.map((k) => data[k]);
      const check = await pool.query(
        `SELECT 1 FROM "${tableName}" WHERE ${conditions} LIMIT 1`,
        values
      );
      exists = check.rows.length > 0;
    } catch (err) {
      console.log(`[错误] ${tableName} 检查存在性失败: ${err.message}`);
      continue;
    }

    if (exists) {
      skipped++;
      continue;
    }

    try {
      const cols = Object.keys(data);
      if (cols.length === 0) continue;
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const colList = cols.map((c) => `"${c}"`).join(', ');
      await pool.query(
        `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders})`,
        cols.map((c) => data[c])
      );
      inserted++;
    } catch (err) {
      console.log(`[错误] ${tableName} 插入失败 (id=${data.id}): ${err.message}`);
      skipped++;
    }
  }

  console.log(`[完成] ${tableName}: 插入 ${inserted} 条, 跳过 ${skipped} 条`);
}

async function main() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  console.log('发现 JSON 文件:', files.join(', '));

  // 按依赖顺序导入：user 和 channel 先（被引用），然后其他
  const order = ['user', 'channel', 'forum_post', 'forum_reply', 'service_file', 'service_file_item', 'home_content', 'ling_profile'];

  for (const table of order) {
    const file = files.find((f) => f.startsWith(table + '.'));
    if (file) {
      await importTable(table, file);
    } else {
      console.log(`[跳过] ${table}: 未找到对应 JSON 文件`);
    }
  }

  await pool.end();
  console.log('导入完成！');
}

main().catch((err) => {
  console.error('导入失败:', err);
  process.exit(1);
});
