const express = require('express');
const { pool } = require('../db/pool');
const { calculate } = require('../services/calculator');

const router = express.Router();

// GET /api/calculations — son kayıtlar
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { rows } = await pool.query(
      `
      SELECT
        calc.id,
        calc.inputs_json,
        calc.results_json,
        calc.created_at,
        m.id AS marketplace_id,
        m.name AS marketplace_name,
        m.slug AS marketplace_slug,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM calculations calc
      LEFT JOIN marketplaces m ON m.id = calc.marketplace_id
      LEFT JOIN categories c ON c.id = calc.category_id
      ORDER BY calc.created_at DESC
      LIMIT $1
      `,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/calculations — kaydet
router.post('/', async (req, res, next) => {
  try {
    const {
      marketplaceId = null,
      categoryId = null,
      inputs,
      results,
      recalculate = false,
    } = req.body;

    if (!inputs) {
      return res.status(400).json({ error: 'inputs zorunlu' });
    }

    let finalResults = results;
    if (recalculate || !finalResults) {
      if (!inputs.baseType || inputs.commissionRate == null || inputs.salePrice == null) {
        return res.status(400).json({
          error: 'Kayıt için inputs içinde salePrice, commissionRate, baseType gerekli',
        });
      }
      finalResults = calculate(inputs);
    }

    const { rows } = await pool.query(
      `
      INSERT INTO calculations (marketplace_id, category_id, inputs_json, results_json)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
      RETURNING id, marketplace_id, category_id, inputs_json, results_json, created_at
      `,
      [
        marketplaceId,
        categoryId,
        JSON.stringify(inputs),
        JSON.stringify(finalResults),
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/calculations/:id — tek kaydı sil
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Geçersiz id' });
    }
    const { rows } = await pool.query(
      'DELETE FROM calculations WHERE id = $1 RETURNING id',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Kayıt bulunamadı' });
    }
    res.json({ ok: true, id: rows[0].id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/calculations — tüm geçmişi sil
router.delete('/', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM calculations');
    res.json({ ok: true, deleted: rowCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
