const { randomUUID } = require('node:crypto');

const SENSITIVE_FIELDS = new Set([
  'authorization',
  'cookie',
  'x-role',
  'x-actor-id',
  'x-org-id',
  'idempotency-key',
  'password',
  'token',
  'secret',
  'key',
  'hash',
  'phone',
  'phonehash',
  'phone_hash',
  'householdhash',
  'household_hash',
  'gpslat',
  'gpslng',
  'gps_lat',
  'gps_lng',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'filebase64',
  'file_base64',
  'filecontent',
  'file_content',
  'evidence',
  'ocrjson',
  'ocr_json',
  'verificationevidence',
  'verification_evidence',
]);

function sanitize(obj, depth = 0) {
  if (depth > 3) return '[MaxDepth]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitize(item, depth + 1));
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitize(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function createLogger(config) {
  const levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levelOrder[config.LOG_LEVEL?.toLowerCase()] ?? 1;

  function shouldLog(level) {
    return levelOrder[level] >= currentLevel;
  }

  function log(level, message, meta = {}) {
    if (!shouldLog(level)) return;
    const record = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(record) + '\n');
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    child: meta =>
      createLogger({ ...config, _childMeta: { ...(config._childMeta || {}), ...meta } }),
  };
}

function requestLogger(config) {
  const logger = createLogger(config);
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = process.hrtime.bigint();
    const sanitizedBody = sanitize(req.body);
    const sanitizedQuery = sanitize(req.query);
    const sanitizedParams = sanitize(req.params);

    logger.info('request_started', {
      requestId,
      method: req.method,
      path: req.path,
      query: sanitizedQuery,
      params: sanitizedParams,
      body: sanitizedBody,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1_000_000;
      const sanitizedResponse = sanitize(body);
      logger.info('request_completed', {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        response: sanitizedResponse,
      });
      return originalJson(body);
    };

    next();
  };
}

function errorLogger(config) {
  const logger = createLogger(config);
  return (error, req, res, next) => {
    logger.error('request_error', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode || 500,
      errorCode: error.code || 'INTERNAL_ERROR',
      message: error.message,
      stack: config.NODE_ENV === 'development' ? error.stack : undefined,
    });
    next(error);
  };
}

module.exports = { createLogger, requestLogger, errorLogger, sanitize };
