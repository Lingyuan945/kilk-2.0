import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/service/files - 服务文件列表
router.get('/files', async (req, res) => {
  try {
    const { rows: files } = await db.query(
      `SELECT f.*, u.username, u.name as author_name
       FROM service_file f
       LEFT JOIN "user" u ON f.user_id = u.id
       ORDER BY f.create_time DESC`
    );

    // 获取每个文件的版本列表
    const fileIds = files.map((f) => f.id);
    let itemsMap = {};
    if (fileIds.length > 0) {
      const { rows: items } = await db.query(
        `SELECT * FROM service_file_item WHERE service_id = ANY($1::int[]) ORDER BY create_time DESC`,
        [fileIds]
      );
      itemsMap = items.reduce((acc, item) => {
        if (!acc[item.service_id]) acc[item.service_id] = [];
        acc[item.service_id].push(item);
        return acc;
      }, {});
    }

    const data = files.map((f) => ({
      ...f,
      versions: itemsMap[f.id] || [],
      total_downloads: (itemsMap[f.id] || []).reduce((sum, v) => sum + Number(v.download_count || 0), 0),
    }));

    res.json({ ok: true, data });
  } catch (err) {
    console.error('[Service] 获取文件列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/service/files/:id - 单个文件详情
router.get('/files/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: files } = await db.query(
      `SELECT f.*, u.username, u.name as author_name
       FROM service_file f
       LEFT JOIN "user" u ON f.user_id = u.id
       WHERE f.id = $1 LIMIT 1`,
      [id]
    );

    if (files.length === 0) {
      return res.status(404).json({ ok: false, msg: '文件不存在' });
    }

    const { rows: versions } = await db.query(
      'SELECT * FROM service_file_item WHERE service_id = $1 ORDER BY create_time DESC',
      [id]
    );

    res.json({
      ok: true,
      data: {
        ...files[0],
        versions,
      },
    });
  } catch (err) {
    console.error('[Service] 获取文件详情错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
