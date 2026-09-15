// 配置文件（生产环境通过环境变量覆盖）
export const config = {
  port: process.env.PORT || 3001,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'simple_site',
    password: process.env.DB_PASSWORD || 'Simple@Site2026',
    database: process.env.DB_NAME || 'simple_site',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'kilk-2026-secret-key-change-in-production',
    expiresIn: '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
};
