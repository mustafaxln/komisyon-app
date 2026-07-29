const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

// GET /api/rates?marketplace=trendyol&category=giyim
// GET /api/rates?marketplaceId=1
router.get('/', async (req, res, next) => {
  try {
    const { marketplace, category, marketplaceId, categoryId } = req.query;

    let query = `
      SELECT
        cr.id,
        cr.rate_percent,
        cr.source_note,
        cr.updated_at,
        m.id AS marketplace_id,
        m.name AS marketplace_name,
        m.slug AS marketplace_slug,
        m.base_type,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM commission_rates cr
      JOIN marketplaces m ON m.id = cr.marketplace_id
      JOIN categories c ON c.id = cr.category_id
      WHERE 1=1
    `;
    const params = [];

    if (marketplaceId) {
      params.push(marketplaceId);
      query += ` AND m.id = $${params.length}`;
    } else if (marketplace) {
      params.push(marketplace);
      query += ` AND m.slug = $${params.length}`;
    }

    if (categoryId) {
      params.push(categoryId);
      query += ` AND c.id = $${params.length}`;
    } else if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }

    query += ' ORDER BY m.name, c.name';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
