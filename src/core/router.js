const { AppError, badRequest, notFound } = require('./errors');

function compilePath(path) {
  const keys = [];
  const expression = path.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${expression}/?$`), keys };
}

class Router {
  constructor() { this.routes = []; }

  add(method, path, handler) {
    const compiled = compilePath(path);
    this.routes.push({ method, path, handler, ...compiled });
  }

  async handle(req, res, context) {
    const url = new URL(req.url, 'http://localhost');
    const route = this.routes.find((entry) => entry.method === req.method && entry.regex.test(url.pathname));
    if (!route) throw notFound('Route not found.');
    const match = route.regex.exec(url.pathname);
    const params = Object.fromEntries(route.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
    const body = await readJson(req);
    const result = await route.handler({ req, res, body, params, query: Object.fromEntries(url.searchParams), ...context });
    if (!res.writableEnded) sendJson(res, result?.status || 200, result?.body ?? result);
  }
}

async function readJson(req) {
  if (['GET', 'HEAD'].includes(req.method)) return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw badRequest('Request body must be valid JSON.'); }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function errorResponse(res, error) {
  const appError = error instanceof AppError ? error : new AppError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
  sendJson(res, appError.status, { error: { code: appError.code, message: appError.message, details: appError.details } });
}

module.exports = { Router, sendJson, errorResponse };
