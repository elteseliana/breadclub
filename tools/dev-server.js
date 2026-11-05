'use strict';
/*
 * Local preview server: serves the website and a stand-in for the Google Apps Script
 * order API, backed by a JSON file instead of the Google Sheet.
 *
 *   npm run dev                       -> http://localhost:8080 (orders in .data/orders.json)
 *   open http://localhost:8080/order.html?api=/api
 *
 * Environment: PORT, DATA_FILE, FAKE_NOW (ISO time), CONTROL=1 (enables /__control for tests).
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const logic = require('../site/assets/js/logic.js');
const Server = require('../apps-script/src/server.js');
const { fileStore } = require('./stores.js');

const ROOT = path.join(__dirname, '..', 'site');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json'
};

function start(opts = {}) {
  const dataFile = opts.dataFile || process.env.DATA_FILE || path.join(__dirname, '..', '.data', 'orders.json');
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const control = opts.control || process.env.CONTROL === '1';
  let now = opts.now || process.env.FAKE_NOW || null;
  let failNext = null; // 'drop-after-save' | 'error-before-save' | 'slow'
  let stores = {};

  const storeFor = (test) => {
    const key = test ? 'test' : 'live';
    if (!stores[key]) stores[key] = fileStore(test ? dataFile.replace(/\.json$/, '.test.json') : dataFile);
    return stores[key];
  };
  const handlerFor = (test) => Server.createHandler({
    logic, store: storeFor(test), now: () => (now ? new Date(now) : new Date())
  });

  const send = (res, status, body, type) => {
    res.writeHead(status, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  const readBody = (req) => new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/api') {
      const test = url.searchParams.get('test') === '1';
      if (req.method === 'GET') {
        if (url.searchParams.get('action') !== 'availability') return send(res, 200, { ok: true, service: 'local' });
        return send(res, 200, handlerFor(test).availability());
      }
      if (req.method === 'POST') {
        const raw = await readBody(req);
        let payload;
        try { payload = JSON.parse(raw); } catch (e) { return send(res, 200, { ok: false, error: 'bad_request' }); }
        const mode = failNext;
        failNext = null;
        if (mode === 'error-before-save') return send(res, 500, 'Internal error', 'text/plain');
        if (mode === 'slow') await new Promise((r) => setTimeout(r, 1500));
        const result = handlerFor(payload && payload.test === true).submit(payload);
        // Saved, but the reply is lost (like a timeout or a dropped connection).
        if (mode === 'drop-after-save') return send(res, 502, 'Bad gateway', 'text/plain');
        return send(res, 200, result);
      }
      return send(res, 405, { ok: false });
    }

    if (url.pathname === '/__control' && control && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      if ('now' in body) now = body.now;
      if ('failNext' in body) failNext = body.failNext;
      if (body.reset) {
        stores = {};
        for (const f of [dataFile, dataFile.replace(/\.json$/, '.test.json')]) if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      if (body.settings) { const s = storeFor(false); Object.assign(s.settings, body.settings); s.save(); }
      if (body.cancel) { const s = storeFor(false); s.orders.find((o) => o.orderNumber === body.cancel).status = 'canceled'; s.save(); }
      if (body.reload) stores = {}; // forget memory, re-read from disk (like a restart)
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/__orders' && control) {
      return send(res, 200, { live: storeFor(false).orders, test: storeFor(true).orders });
    }

    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
  });

  return new Promise((resolve) => {
    server.listen(opts.port ?? Number(process.env.PORT || 8080), '127.0.0.1', () => resolve(server));
  });
}

if (require.main === module) {
  start().then((s) => {
    const { port } = s.address();
    console.log(`The Bread Club preview: http://localhost:${port}/  (order page: http://localhost:${port}/order.html?api=/api)`);
  });
}

module.exports = { start };
