const jwt = require('jsonwebtoken');

function getSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Yetkisiz: token gerekli' });
  }

  try {
    const payload = jwt.verify(token, getSecret());
    // Admin token'larında role olmayabilir (eski token); role=user reddedilir
    if (payload.role === 'user') {
      return res.status(401).json({ error: 'Yetkisiz: admin token gerekli' });
    }
    req.admin = payload;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Yetkisiz: token geçersiz veya süresi dolmuş' });
  }
}

function userAuthRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Yetkisiz: giriş yapmalısınız' });
  }

  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.role !== 'user') {
      return res.status(401).json({ error: 'Yetkisiz: kullanıcı token gerekli' });
    }
    req.user = payload;
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Yetkisiz: oturum geçersiz veya süresi dolmuş' });
  }
}

module.exports = { authRequired, userAuthRequired };
