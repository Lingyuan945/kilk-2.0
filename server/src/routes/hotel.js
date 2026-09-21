import { Router } from 'express';
import db from '../db.js';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRequired, authOptional, adminRequired } from '../middleware/auth.js';

const router = Router();

// ========== 故障附件上传（public/upload，Apache /upload/ 直接对外）==========
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../public/upload');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
    const ext = extMap[file.mimetype] || 'jpg';
    cb(null, `hotel_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`);
  },
});
const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持 jpg/png/gif/webp 格式'));
  },
});

// POST /api/hotel/upload - 故障附件上传
router.post('/upload', imageUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, msg: '未收到图片文件' });
  res.json({ ok: true, url: `/upload/${req.file.filename}` });
});

// ========== 故障记录 ==========

// 生成故障编号：GZ20260921-001
async function nextIncidentNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `GZ${ymd}-`;
  const { rows } = await db.query('SELECT COUNT(*) AS c FROM hotel_incident WHERE incident_no LIKE $1', [`${prefix}%`]);
  return `${prefix}${String(Number(rows[0]?.c ?? 0) + 1).padStart(3, '0')}`;
}

// GET /api/hotel/incidents - 列表（关键词搜索 + 状态筛选）+ 统计
router.get('/incidents', async (req, res) => {
  try {
    const { keyword, status } = req.query;
    const params = [];
    let where = '';
    if (keyword && String(keyword).trim()) {
      params.push(`%${String(keyword).trim()}%`);
      where = `WHERE (room_no ILIKE $1 OR incident_no ILIKE $1 OR description ILIKE $1 OR building ILIKE $1 OR device_type ILIKE $1)`;
    }
    if (status && ['pending', 'processing', 'done'].includes(String(status))) {
      params.push(String(status));
      where += `${where ? ' AND' : 'WHERE'} status = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT id, incident_no, room_no, building, status, category, device_type, description,
              attachment, wait_duration, total_duration, created_by, created_by_name,
              created_at, updated_at, repaired_at
       FROM hotel_incident ${where}
       ORDER BY created_at DESC, id DESC`,
      params
    );

    const { rows: stats } = await db.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending,
              COUNT(*) FILTER (WHERE status = 'processing') AS processing,
              COUNT(*) FILTER (WHERE status = 'done') AS done,
              COUNT(*) AS total
       FROM hotel_incident`
    );

    res.json({ ok: true, data: rows, stats: stats[0] });
  } catch (err) {
    console.error('[Hotel] 获取故障列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/hotel/incidents - 登记故障
router.post('/incidents', authOptional, async (req, res) => {
  try {
    const { room_no, building, status, category, device_type, description, attachment } = req.body;
    if (!room_no || !String(room_no).trim()) {
      return res.status(400).json({ ok: false, msg: '房间号码必填' });
    }
    if (!category) return res.status(400).json({ ok: false, msg: '故障类别必填' });
    if (!device_type) return res.status(400).json({ ok: false, msg: '设备类型必填' });

    const incident_no = await nextIncidentNo();
    const safeAttachment =
      typeof attachment === 'string' && attachment.startsWith('/upload/') && !attachment.includes('..') ? attachment : '';
    const createdBy = req.user?.id ?? null;
    const createdByName = req.user?.name || req.user?.username || '游客';

    const { rows } = await db.query(
      `INSERT INTO hotel_incident
        (incident_no, room_no, building, status, category, device_type, description, attachment, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        incident_no,
        String(room_no).trim(),
        String(building || '').trim(),
        status || 'pending',
        category,
        device_type,
        String(description || '').trim(),
        safeAttachment,
        createdBy,
        createdByName,
      ]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Hotel] 登记故障错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/hotel/incidents/:id - 更新状态/内容（需登录）
router.put('/incidents/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  const { status, description, category, device_type, building } = req.body;
  try {
    const { rows: cur } = await db.query('SELECT * FROM hotel_incident WHERE id = $1', [id]);
    if (cur.length === 0) return res.status(404).json({ ok: false, msg: '记录不存在' });

    const now = new Date();
    let wait = Number(cur[0].wait_duration) || 0;
    let total = Number(cur[0].total_duration) || 0;
    let repairedAt = cur[0].repaired_at;

    if (status === 'processing' && cur[0].status === 'pending') {
      wait = Math.max(1, Math.round((now - new Date(cur[0].created_at)) / 60000));
    }
    if (status === 'done' && cur[0].status !== 'done') {
      total = Math.max(1, Math.round((now - new Date(cur[0].created_at)) / 60000));
      repairedAt = now;
      if (cur[0].status === 'pending') wait = total;
    }

    const { rows } = await db.query(
      `UPDATE hotel_incident
       SET status = $1,
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           device_type = COALESCE($4, device_type),
           building = COALESCE($5, building),
           wait_duration = $6,
           total_duration = $7,
           repaired_at = COALESCE($8, repaired_at),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        status || cur[0].status,
        description ?? null,
        category ?? null,
        device_type ?? null,
        building ?? null,
        wait,
        total,
        repairedAt,
        id,
      ]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Hotel] 更新故障错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/hotel/incidents/:id - 删除记录（管理员，同步清理附件）
router.delete('/incidents/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM hotel_incident WHERE id = $1 RETURNING id, attachment', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '记录不存在' });
    const att = rows[0].attachment;
    if (att && att.startsWith('/upload/') && !att.includes('..')) {
      const fullPath = path.join(UPLOAD_DIR, path.basename(att));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[Hotel] 删除故障错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

export default router;
