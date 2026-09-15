import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDatabase } from './init.js';

import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import userRoutes from './routes/user.js';
import serviceRoutes from './routes/service.js';
import homeRoutes from './routes/home.js';
import adminRoutes from './routes/admin.js';
import lingRoutes from './routes/ling.js';

const app = express();

// 中间件
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, msg: 'kilk 2.0 API 运行中', time: new Date().toISOString() });
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/users', userRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ling', lingRoutes);

// 404
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, msg: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ ok: false, msg: '服务器内部错误' });
});

// 初始化数据库（建表 + 种子数据）
await initDatabase();

app.listen(config.port, () => {
  console.log(`[Server] kilk 2.0 API 已启动: http://localhost:${config.port}`);
  console.log(`[Server] CORS 允许来源: ${config.cors.origin}`);
});
