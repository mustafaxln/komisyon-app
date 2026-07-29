const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./db/pool');
const marketplacesRouter = require('./routes/marketplaces');
const categoriesRouter = require('./routes/categories');
const ratesRouter = require('./routes/rates');
const calculateRouter = require('./routes/calculate');
const calculationsRouter = require('./routes/calculations');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'komisyon-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      service: 'komisyon-api',
      database: 'disconnected',
      message: err.message,
    });
  }
});

app.use('/api/marketplaces', marketplacesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/calculate', calculateRouter);
app.use('/api/calculations', calculationsRouter);
app.use('/api/admin', adminRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
