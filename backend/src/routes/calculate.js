const express = require('express');
const { calculate } = require('../services/calculator');
const { pool } = require('../db/pool');

const router = express.Router();

function parseBody(body = {}) {
  return {
    salePrice: body.salePrice,
    productCost: body.productCost,
    shippingCost: body.shippingCost ?? 0,
    adCost: body.adCost ?? 0,
    otherCost: body.otherCost ?? 0,
    commissionRate: body.commissionRate,
    commissionVatRate: body.commissionVatRate ?? 20,
    productVatRate: body.productVatRate ?? 20,
    baseType: body.baseType,
  };
}

function validateRequired(input) {
  if (input.salePrice === undefined || input.salePrice === null || input.salePrice === '') {
    return 'salePrice zorunlu';
  }
  if (input.commissionRate === undefined || input.commissionRate === null || input.commissionRate === '') {
    return 'commissionRate zorunlu';
  }
  if (!input.baseType) {
    return 'baseType zorunlu (ex_vat | inc_vat)';
  }
  return null;
}

// POST /api/calculate — tek hesap
router.post('/', (req, res, next) => {
  try {
    const input = parseBody(req.body);
    const error = validateRequired(input);
    if (error) {
      return res.status(400).json({ error });
    }
    const results = calculate(input);
    res.json({ inputs: input, results });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/calculate/compare — aynı maliyetlerle birden fazla pazaryeri
// body: { salePrice, productCost, ..., marketplaceIds: [1,2,3], categoryId? }
router.post('/compare', async (req, res, next) => {
  try {
    const { marketplaceIds, categoryId, commissionVatRate, productVatRate } = req.body;
    const baseInput = parseBody(req.body);

    if (!Array.isArray(marketplaceIds) || marketplaceIds.length === 0) {
      return res.status(400).json({ error: 'marketplaceIds dizisi zorunlu' });
    }
    if (baseInput.salePrice === undefined || baseInput.salePrice === null || baseInput.salePrice === '') {
      return res.status(400).json({ error: 'salePrice zorunlu' });
    }

    const params = [marketplaceIds];
    let rateJoin = `
      LEFT JOIN commission_rates cr
        ON cr.marketplace_id = m.id
    `;
    if (categoryId) {
      params.push(categoryId);
      rateJoin += ` AND cr.category_id = $${params.length}`;
    } else {
      rateJoin += ` AND cr.category_id = (
        SELECT id FROM categories WHERE slug = 'genel' LIMIT 1
      )`;
    }

    const { rows } = await pool.query(
      `
      SELECT
        m.id,
        m.name,
        m.slug,
        m.base_type,
        cr.rate_percent,
        c.name AS category_name,
        c.slug AS category_slug
      FROM marketplaces m
      ${rateJoin}
      LEFT JOIN categories c ON c.id = cr.category_id
      WHERE m.id = ANY($1::int[]) AND m.is_active = TRUE
      ORDER BY m.name
      `,
      params
    );

    const comparisons = rows.map((row) => {
      const rate = row.rate_percent != null ? Number(row.rate_percent) : null;
      if (rate == null) {
        return {
          marketplaceId: row.id,
          marketplaceName: row.name,
          marketplaceSlug: row.slug,
          baseType: row.base_type,
          categoryName: row.category_name,
          error: 'Bu pazaryeri için oran bulunamadı',
        };
      }

      const results = calculate({
        ...baseInput,
        commissionRate: rate,
        commissionVatRate: commissionVatRate ?? 20,
        productVatRate: productVatRate ?? 20,
        baseType: row.base_type,
      });

      return {
        marketplaceId: row.id,
        marketplaceName: row.name,
        marketplaceSlug: row.slug,
        baseType: row.base_type,
        categoryName: row.category_name,
        categorySlug: row.category_slug,
        commissionRate: rate,
        results,
      };
    });

    res.json({
      inputs: {
        ...baseInput,
        commissionVatRate: commissionVatRate ?? 20,
        productVatRate: productVatRate ?? 20,
        categoryId: categoryId || null,
      },
      comparisons,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
