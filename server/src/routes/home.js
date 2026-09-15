import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

// GET /api/home - 首页内容
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM home_content WHERE id = 1 LIMIT 1');
    if (rows.length === 0) {
      return res.json({ ok: true, data: null });
    }
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Home] 获取首页内容错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/home - 更新首页内容（仅管理员）
router.put('/', authRequired, adminRequired, async (req, res) => {
  const { banner_title, banner_desc, card1_title, card1_text, card2_title, card2_text, card3_title, card3_text } = req.body;

  try {
    await db.query(
      `UPDATE home_content SET
        banner_title = $1, banner_desc = $2,
        card1_title = $3, card1_text = $4,
        card2_title = $5, card2_text = $6,
        card3_title = $7, card3_text = $8
       WHERE id = 1`,
      [banner_title || '', banner_desc || '', card1_title || '', card1_text || '', card2_title || '', card2_text || '', card3_title || '', card3_text || '']
    );
    const { rows } = await db.query('SELECT * FROM home_content WHERE id = 1 LIMIT 1');
    res.json({ ok: true, data: rows[0], msg: '首页内容已更新' });
  } catch (err) {
    console.error('[Home] 更新首页内容错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
