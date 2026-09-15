// 原生 PostgreSQL 连接（稳定可靠，与 Supabase 兼容）
import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

const pool = new Pool({
  host: config.db.host,
  port: 5432,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 兼容层：提供与原代码相同的 query / exec 接口
const db = {
  async query(sql, params) {
    const result = await pool.query(sql, params);
    // 兼容 PGlite 返回格式 { rows, affectedRows }
    return {
      rows: result.rows,
      affectedRows: result.rowCount ?? 0,
    };
  },

  async exec(sql) {
    const result = await pool.query(sql);
    return result;
  },

  async close() {
    await pool.end();
  },
};

export default db;
