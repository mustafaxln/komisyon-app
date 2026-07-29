const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, base_type, region, is_active
       FROM marketplaces
       WHERE is_active = TRUE
       ORDER BY
         CASE region WHEN 'tr' THEN 0 WHEN 'global' THEN 1 ELSE 2 END,
         name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, base_type, region, is_active
       FROM marketplaces
       WHERE slug = $1`,
      [req.params.slug]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Pazaryeri bulunamadı' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
