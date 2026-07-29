const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function signToken(admin) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  return jwt.sign(
    { id: admin.id, email: admin.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
}

// POST /api/admin/login
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'email ve password zorunlu' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, password_hash FROM admins WHERE email = $1',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const token = signToken(admin);
    res.json({
      token,
      admin: { id: admin.id, email: admin.email },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/me
router.get('/me', authRequired, async (req, res) => {
  res.json({ admin: req.admin });
});

// GET /api/admin/rates
router.get('/rates', authRequired, async (req, res, next) => {
  try {
    const { marketplaceId } = req.query;
    const params = [];
    let sql = `
      SELECT
        cr.id,
        cr.rate_percent,
        cr.source_note,
        cr.updated_at,
        m.id AS marketplace_id,
        m.name AS marketplace_name,
        m.slug AS marketplace_slug,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM commission_rates cr
      JOIN marketplaces m ON m.id = cr.marketplace_id
      JOIN categories c ON c.id = cr.category_id
      WHERE 1=1
    `;

    if (marketplaceId) {
      params.push(marketplaceId);
      sql += ` AND m.id = $${params.length}`;
    }

    sql += ' ORDER BY m.name, c.name';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/rates/:id
router.put('/rates/:id', authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const ratePercent = req.body.rate_percent ?? req.body.ratePercent;
    const sourceNote = req.body.source_note ?? req.body.sourceNote;

    if (ratePercent === undefined || ratePercent === null || ratePercent === '') {
      return res.status(400).json({ error: 'rate_percent zorunlu' });
    }

    const rate = Number(ratePercent);
    if (!Number.isFinite(rate) || rate < 0) {
      return res.status(400).json({ error: 'rate_percent geçersiz' });
    }

    const { rows } = await pool.query(
      `
      UPDATE commission_rates
      SET
        rate_percent = $1,
        source_note = COALESCE($2, source_note),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, marketplace_id, category_id, rate_percent, source_note, updated_at
      `,
      [rate, sourceNote ?? null, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Oran bulunamadı' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/rates
router.post('/rates', authRequired, async (req, res, next) => {
  try {
    const marketplaceId = req.body.marketplace_id ?? req.body.marketplaceId;
    const categoryId = req.body.category_id ?? req.body.categoryId;
    const ratePercent = req.body.rate_percent ?? req.body.ratePercent;
    const sourceNote = req.body.source_note ?? req.body.sourceNote ?? 'Admin eklendi';

    if (!marketplaceId || !categoryId || ratePercent === undefined || ratePercent === null) {
      return res.status(400).json({
        error: 'marketplace_id, category_id ve rate_percent zorunlu',
      });
    }

    const rate = Number(ratePercent);
    if (!Number.isFinite(rate) || rate < 0) {
      return res.status(400).json({ error: 'rate_percent geçersiz' });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (marketplace_id, category_id)
      DO UPDATE SET
        rate_percent = EXCLUDED.rate_percent,
        source_note = EXCLUDED.source_note,
        updated_at = NOW()
      RETURNING id, marketplace_id, category_id, rate_percent, source_note, updated_at
      `,
      [marketplaceId, categoryId, rate, sourceNote]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/rates/:id
router.delete('/rates/:id', authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows } = await pool.query(
      'DELETE FROM commission_rates WHERE id = $1 RETURNING id',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Oran bulunamadı' });
    }
    res.json({ ok: true, id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
