const WINDOW_MS_GENERAL = Number(process.env.RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
const MAX_REQUESTS_GENERAL = Number(process.env.RATE_LIMIT_MAX || 300);
const WINDOW_MS_AUTH = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const MAX_REQUESTS_AUTH = Number(process.env.AUTH_RATE_LIMIT_MAX || 30);
const SCANNER_TEMP_BLOCK_MS = Number(process.env.SCANNER_BLOCK_MS || 30 * 60 * 1000);

const scannerBlocks = new Map();
const limiterStore = new Map();

const SUSPICIOUS_PATH_PARTS = [
  '.env',
  '.git',
  'wp-admin',
  'wp-login',
  'phpmyadmin',
  'phpmy-admin',
  'adminer',
  'xmlrpc.php',
  '.sql',
  'cgi-bin',
  'actuator',
  'server-status',
  'swagger-ui',
  'openapi',
  'jmx-console',
  '.DS_Store'
];

const SUSPICIOUS_UA_PARTS = [
  'sqlmap',
  'nikto',
  'masscan',
  'nmap',
  'wpscan',
  'acunetix',
  'nessus',
  'zgrab',
  'dirbuster',
  'gobuster',
  'fimap',
  'whatweb'
];

const getClientIp = (req) => {
  const xForwardedFor = String(req.headers['x-forwarded-for'] || '').trim();
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
};

const nowMs = () => Date.now();

const cleanupMapByTime = (mapRef, currentTime, windowMs) => {
  for (const [key, value] of mapRef.entries()) {
    const ts = Number(value?.updatedAt || value?.blockedUntil || 0);
    if (!ts || currentTime - ts > windowMs * 2) {
      mapRef.delete(key);
    }
  }
};

const buildLimiter = ({ windowMs, maxRequests, keyPrefix }) => {
  return (req, res, next) => {
    const currentTime = nowMs();
    cleanupMapByTime(limiterStore, currentTime, windowMs);

    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;
    const bucket = limiterStore.get(key);

    if (!bucket || currentTime > bucket.resetAt) {
      limiterStore.set(key, {
        count: 1,
        resetAt: currentTime + windowMs,
        updatedAt: currentTime
      });
      return next();
    }

    bucket.count += 1;
    bucket.updatedAt = currentTime;

    if (bucket.count > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        status: 'fail',
        message: 'Too many requests. Please try again later.'
      });
    }

    return next();
  };
};

const scanShield = (req, res, next) => {
  const currentTime = nowMs();
  cleanupMapByTime(scannerBlocks, currentTime, SCANNER_TEMP_BLOCK_MS);

  const ip = getClientIp(req);
  const pathValue = String(req.originalUrl || req.url || '').toLowerCase();
  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
  const method = String(req.method || 'GET').toUpperCase();

  const blockedState = scannerBlocks.get(ip);
  if (blockedState && currentTime < blockedState.blockedUntil) {
    return res.status(403).json({ status: 'fail', message: 'Forbidden' });
  }

  const hasSuspiciousPath = SUSPICIOUS_PATH_PARTS.some((part) => pathValue.includes(part));
  const hasSuspiciousUa = SUSPICIOUS_UA_PARTS.some((part) => userAgent.includes(part));

  const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
  if (!allowedMethods.has(method)) {
    return res.status(405).json({ status: 'fail', message: 'Method not allowed' });
  }

  if (hasSuspiciousPath || hasSuspiciousUa) {
    scannerBlocks.set(ip, {
      blockedUntil: currentTime + SCANNER_TEMP_BLOCK_MS,
      updatedAt: currentTime
    });
    return res.status(404).json({ status: 'fail', message: 'Not found' });
  }

  return next();
};

const apiGuard = (req, res, next) => {
  const rawUrl = String(req.originalUrl || '');
  if (rawUrl.length > 2048) {
    return res.status(414).json({ status: 'fail', message: 'Request URL too long' });
  }

  const queryKeys = Object.keys(req.query || {});
  if (queryKeys.length > 50) {
    return res.status(400).json({ status: 'fail', message: 'Too many query parameters' });
  }

  return next();
};

const generalLimiter = buildLimiter({
  windowMs: WINDOW_MS_GENERAL,
  maxRequests: MAX_REQUESTS_GENERAL,
  keyPrefix: 'general'
});

const authLimiter = buildLimiter({
  windowMs: WINDOW_MS_AUTH,
  maxRequests: MAX_REQUESTS_AUTH,
  keyPrefix: 'auth'
});

module.exports = {
  scanShield,
  apiGuard,
  generalLimiter,
  authLimiter
};
