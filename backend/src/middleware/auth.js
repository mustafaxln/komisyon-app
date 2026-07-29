const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Yetkisiz: token gerekli' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    req.admin = jwt.verify(token, secret);
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Yetkisiz: token geçersiz veya süresi dolmuş' });
  }
}

module.exports = { authRequired };
