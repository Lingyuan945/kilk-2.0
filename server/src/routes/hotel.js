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

// ========== 酒店管理 ==========

// 辅助：解析 JSON 配置数组（兼容字符串/数组）
function parseArr(v) {
  if (Array.isArray(v)) return v.filter((x) => String(x).trim()).map((x) => String(x).trim());
  if (typeof v === 'string') return v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

// GET /api/hotels - 启用酒店列表（含每酒店故障统计），运维中心用
router.get('/hotels', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT h.id, h.name, h.code, h.theme_color, h.buildings, h.categories, h.device_types,
              h.enabled, h.sort, h.description, h.logo_url,
              COALESCE(i.pending, 0) AS pending,
              COALESCE(i.processing, 0) AS processing,
              COALESCE(i.done, 0) AS done,
              COALESCE(i.total, 0) AS total
       FROM hotels h
       LEFT JOIN (
         SELECT hotel_id,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'processing') AS processing,
                COUNT(*) FILTER (WHERE status = 'done') AS done,
                COUNT(*) AS total
         FROM hotel_incident GROUP BY hotel_id
       ) i ON i.hotel_id = h.id
       WHERE h.enabled = 1
       ORDER BY h.sort ASC, h.id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Hotel] 获取酒店列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/hotels/all - 全部酒店（含停用，后台管理用）
router.get('/hotels/all', authRequired, adminRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT h.id, h.name, h.code, h.theme_color, h.buildings, h.categories, h.device_types,
              h.enabled, h.sort, h.created_at, h.description, h.logo_url,
              COALESCE(i.pending, 0) AS pending,
              COALESCE(i.processing, 0) AS processing,
              COALESCE(i.done, 0) AS done,
              COALESCE(i.total, 0) AS total
       FROM hotels h
       LEFT JOIN (
         SELECT hotel_id,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'processing') AS processing,
                COUNT(*) FILTER (WHERE status = 'done') AS done,
                COUNT(*) AS total
         FROM hotel_incident GROUP BY hotel_id
       ) i ON i.hotel_id = h.id
       ORDER BY h.sort ASC, h.id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Hotel] 获取全部酒店错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// GET /api/hotels/:id - 单个酒店（启用状态，运维页用）
router.get('/hotels/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, code, theme_color, buildings, categories, device_types, enabled, sort, description, logo_url
       FROM hotels WHERE id = $1 AND enabled = 1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '酒店不存在或已停用' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Hotel] 获取酒店错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/hotels - 新增酒店（管理员）
router.post('/hotels', authRequired, adminRequired, async (req, res) => {
  try {
    const { name, code, theme_color, buildings, categories, device_types, enabled, sort, description, logo_url } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ ok: false, msg: '酒店名称必填' });
    const { rows } = await db.query(
      `INSERT INTO hotels (name, code, theme_color, buildings, categories, device_types, enabled, sort, description, logo_url)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
       RETURNING *`,
      [
        String(name).trim(),
        String(code || '').trim(),
        /^#[0-9a-fA-F]{6}$/.test(String(theme_color || '')) ? String(theme_color) : '#3b82f6',
        JSON.stringify(parseArr(buildings)),
        JSON.stringify(parseArr(categories)),
        JSON.stringify(parseArr(device_types)),
        enabled === 0 || enabled === false ? 0 : 1,
        Number(sort) || 0,
        String(description || '').slice(0, 500),
        String(logo_url || '').slice(0, 500),
      ]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Hotel] 新增酒店错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// PUT /api/hotels/:id - 更新酒店（管理员）
router.put('/hotels/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, theme_color, buildings, categories, device_types, enabled, sort, description, logo_url } = req.body;
    const { rows: cur } = await db.query('SELECT * FROM hotels WHERE id = $1', [id]);
    if (cur.length === 0) return res.status(404).json({ ok: false, msg: '酒店不存在' });
    const { rows } = await db.query(
      `UPDATE hotels SET
         name = COALESCE($1, name),
         code = COALESCE($2, code),
         theme_color = CASE WHEN $3::text IS NULL THEN theme_color ELSE $3::text END,
         buildings = CASE WHEN $4::jsonb IS NULL THEN buildings ELSE $4::jsonb END,
         categories = CASE WHEN $5::jsonb IS NULL THEN categories ELSE $5::jsonb END,
         device_types = CASE WHEN $6::jsonb IS NULL THEN device_types ELSE $6::jsonb END,
         enabled = COALESCE($7, enabled),
         sort = COALESCE($8, sort),
         description = COALESCE($9, description),
         logo_url = COALESCE($10, logo_url),
         updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [
        name !== undefined && name !== null ? String(name).trim() : null,
        code !== undefined && code !== null ? String(code).trim() : null,
        /^#[0-9a-fA-F]{6}$/.test(String(theme_color || '')) ? String(theme_color) : null,
        buildings !== undefined && buildings !== null ? JSON.stringify(parseArr(buildings)) : null,
        categories !== undefined && categories !== null ? JSON.stringify(parseArr(categories)) : null,
        device_types !== undefined && device_types !== null ? JSON.stringify(parseArr(device_types)) : null,
        enabled !== undefined && enabled !== null ? (enabled === 0 || enabled === false ? 0 : 1) : null,
        sort !== undefined && sort !== null ? Number(sort) : null,
        description !== undefined && description !== null ? String(description).slice(0, 500) : null,
        logo_url !== undefined && logo_url !== null ? String(logo_url).slice(0, 500) : null,
        id,
      ]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Hotel] 更新酒店错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/hotels/:id - 删除酒店（管理员，级联删除其故障记录与附件）
router.delete('/hotels/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: atts } = await db.query(
      'SELECT attachment FROM hotel_incident WHERE hotel_id = $1 AND attachment <> \'\'',
      [id]
    );
    await db.query('DELETE FROM hotel_incident WHERE hotel_id = $1', [id]);
    const { rows } = await db.query('DELETE FROM hotels WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, msg: '酒店不存在' });
    for (const a of atts) {
      const att = a.attachment;
      if (att && att.startsWith('/upload/') && !att.includes('..')) {
        const fullPath = path.join(UPLOAD_DIR, path.basename(att));
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[Hotel] 删除酒店错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// ========== 故障记录（按酒店隔离）==========

// 生成故障编号：GZ20260921-001
async function nextIncidentNo() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const prefix = `GZ${ymd}-`;
  const { rows } = await db.query('SELECT COUNT(*) AS c FROM hotel_incident WHERE incident_no LIKE $1', [`${prefix}%`]);
  return `${prefix}${String(Number(rows[0]?.c ?? 0) + 1).padStart(3, '0')}`;
}

// 校验酒店存在且启用
async function hotelExists(hotelId) {
  const { rows } = await db.query('SELECT id FROM hotels WHERE id = $1 AND enabled = 1', [hotelId]);
  return rows.length > 0;
}

// GET /api/hotel/:hotelId/incidents - 列表（关键词搜索 + 状态筛选）+ 统计
router.get('/hotel/:hotelId/incidents', async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!hotelId || !(await hotelExists(hotelId))) {
      return res.status(404).json({ ok: false, msg: '酒店不存在或已停用' });
    }
    const { keyword, status } = req.query;
    const params = [hotelId];
    let where = 'WHERE hotel_id = $1';
    if (keyword && String(keyword).trim()) {
      params.push(`%${String(keyword).trim()}%`);
      where += ` AND (room_no ILIKE $${params.length} OR incident_no ILIKE $${params.length} OR description ILIKE $${params.length} OR building ILIKE $${params.length} OR device_type ILIKE $${params.length})`;
    }
    if (status && ['pending', 'processing', 'done'].includes(String(status))) {
      params.push(String(status));
      where += ` AND status = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT id, incident_no, hotel_id, room_no, building, status, category, device_type, description,
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
       FROM hotel_incident WHERE hotel_id = $1`,
      [hotelId]
    );

    res.json({ ok: true, data: rows, stats: stats[0] });
  } catch (err) {
    console.error('[Hotel] 获取故障列表错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// POST /api/hotel/:hotelId/incidents - 登记故障
router.post('/hotel/:hotelId/incidents', authOptional, async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!hotelId || !(await hotelExists(hotelId))) {
      return res.status(404).json({ ok: false, msg: '酒店不存在或已停用' });
    }
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
        (incident_no, hotel_id, room_no, building, status, category, device_type, description, attachment, created_by, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        incident_no,
        hotelId,
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

// PUT /api/hotel/:hotelId/incidents/:id - 更新状态/内容（需登录）
router.put('/hotel/:hotelId/incidents/:id', authRequired, async (req, res) => {
  const { hotelId, id } = req.params;
  const { status, description, category, device_type, building } = req.body;
  try {
    const { rows: cur } = await db.query(
      'SELECT * FROM hotel_incident WHERE id = $1 AND hotel_id = $2',
      [id, hotelId]
    );
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
       WHERE id = $9 AND hotel_id = $10
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
        hotelId,
      ]
    );
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Hotel] 更新故障错误:', err);
    res.status(500).json({ ok: false, msg: '服务器错误' });
  }
});

// DELETE /api/hotel/:hotelId/incidents/:id - 删除记录（管理员，同步清理附件）
router.delete('/hotel/:hotelId/incidents/:id', authRequired, adminRequired, async (req, res) => {
  try {
    const { hotelId, id } = req.params;
    const { rows } = await db.query(
      'DELETE FROM hotel_incident WHERE id = $1 AND hotel_id = $2 RETURNING id, attachment',
      [id, hotelId]
    );
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
