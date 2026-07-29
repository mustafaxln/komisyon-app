const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug FROM categories ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
