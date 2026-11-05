'use strict';
/*
 * Runs the real generated apps-script/dist/Code.gs against a small fake of Google's
 * SpreadsheetApp, so the sheet layout, numbering, locking and parsing are tested
 * without a Google account. It is a fake: real Google behavior must still be checked
 * once with a test order after setup (see docs/SETUP-google-sheet.md).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-apps-script.js')]);
const SOURCE = fs.readFileSync(path.join(ROOT, 'apps-script', 'dist', 'Code.gs'), 'utf8');

// ---- fake Google services ----------------------------------------------------------

function a1(ref) {
  const cell = (s) => {
    const m = /^([A-Z]+)(\d+)$/.exec(s);
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    return [Number(m[2]), col];
  };
  const [a, b] = ref.split(':');
  const [r1, c1] = cell(a);
  const [r2, c2] = b ? cell(b) : [r1, c1];
  return [r1, c1, r2 - r1 + 1, c2 - c1 + 1];
}

// Mimic how Sheets stores typed values: a leading ' keeps text, number-like text becomes a number.
function stored(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (v.startsWith('=')) return v;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function fakeSheet(name) {
  const cells = new Map();
  const sheet = {
    name, formulas: new Map(), checkboxes: new Set(), validations: [], rules: [],
    get(r, c) { return cells.has(r + ',' + c) ? cells.get(r + ',' + c) : ''; },
    set(r, c, v) { cells.set(r + ',' + c, v); },
    getLastRow() {
      let last = 0;
      for (const [k, v] of cells) if (v !== '' && v !== null) last = Math.max(last, Number(k.split(',')[0]));
      return last;
    },
    getMaxRows() { return 1000; },
    getRange(r, c, nr, nc) {
      if (typeof r === 'string') [r, c, nr, nc] = a1(r);
      nr = nr || 1; nc = nc || 1;
      const range = {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sheet.get(r + i, c + j))),
        getValue: () => sheet.get(r, c),
        setValues: (rows) => {
          assert.equal(rows.length, nr); assert.equal(rows[0].length, nc, 'setValues width must match range');
          rows.forEach((row, i) => row.forEach((v, j) => sheet.set(r + i, c + j, stored(v))));
          return range;
        },
        setValue: (v) => { sheet.set(r, c, stored(v)); return range; },
        setFormula: (f) => { sheet.formulas.set(r + ',' + c, f); sheet.set(r, c, f); return range; },
        insertCheckboxes: () => { sheet.checkboxes.add(r + ',' + c); return range; },
        setDataValidation: (v) => { sheet.validations.push({ r, c, nr, nc, v }); return range; }
      };
      for (const m of ['setFontWeight', 'setBackground', 'setNumberFormat']) range[m] = () => range;
      return range;
    },
    setFrozenRows() {}, setFrozenColumns() {}, setColumnWidth() {},
    setConditionalFormatRules(rules) { sheet.rules = rules; },
    clear() { cells.clear(); sheet.formulas.clear(); }
  };
  return sheet;
}

function chain(record) {
  return new Proxy({}, { get: (_, prop) => (prop === 'build' ? () => record : (...args) => { record[prop] = args; return chain(record); }) });
}

function makeEnv(nowIso) {
  const sheets = new Map();
  const ss = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = fakeSheet(n); sheets.set(n, s); return s; }
  };
  const lock = { held: false, busy: false, tryLock() { if (lock.busy) return false; lock.held = true; return true; }, releaseLock() { lock.held = false; } };
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(env.now); }
    static now() { return new RealDate(env.now).getTime(); }
  }
  const env = {
    now: nowIso, sheets, lock,
    ctx: {
      Date: FakeDate, Intl, URLSearchParams, JSON, Math, Number, String, Object, Array, Error, encodeURIComponent,
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ss,
        flush: () => {},
        newDataValidation: () => chain({}),
        newConditionalFormatRule: () => chain({})
      },
      LockService: { getScriptLock: () => lock },
      ContentService: {
        MimeType: { JSON: 'json' },
        createTextOutput: (s) => ({ body: s, setMimeType() { return this; } })
      },
      Utilities: {
        formatDate: (d, tz, fmt) => {
          const p = {};
          new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
            .formatToParts(d).forEach((x) => { p[x.type] = x.value; });
          return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
        }
      }
    }
  };
  vm.createContext(env.ctx);
  vm.runInContext(SOURCE, env.ctx, { filename: 'Code.gs' });
  env.post = (payload) => JSON.parse(env.ctx.doPost({ postData: { contents: typeof payload === 'string' ? payload : JSON.stringify(payload) } }).body);
  env.get = (params) => JSON.parse(env.ctx.doGet({ parameter: params }).body);
  env.row = (sheetName, r) => {
    const s = sheets.get(sheetName);
    const cols = env.ctx.COLUMNS;
    const o = {};
    cols.forEach((h, i) => { o[h] = s.get(r, i + 1); });
    return o;
  };
  return env;
}

const THURSDAY = '2026-11-05T08:00:00Z';
let n = 0;
const order = (over = {}) => Object.assign({
  orderId: 'sheet-test-' + String(++n).padStart(4, '0'), name: 'Test Customer', phone: '054-000-0000',
  items: { plain: 1, pesto: 1 }, method: 'delivery', address: '1 Test St, Ra\'anana', payment: 'bit',
  date: '2026-11-10', notes: 'no sesame', lang: 'en'
}, over);

// ---- tests ---------------------------------------------------------------------------------

test('setup creates the order, test, settings and summary tabs', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  assert.deepEqual([...env.sheets.keys()].sort(), ['Bake summary', 'Settings', 'Test orders', 'Website orders']);
  const orders = env.sheets.get('Website orders');
  assert.equal(orders.get(1, 1), 'Order #');
  assert.equal(orders.get(1, env.ctx.COLUMNS.length), 'Order ID');
  assert.equal(env.sheets.get('Settings').get(2, 2), 18);
  assert.equal(orders.rules.length, 2, 'unpaid and canceled highlighting');
  const summary = env.sheets.get('Bake summary').formulas.get('2,1');
  assert.match(summary, /^=QUERY\('Website orders'!A2:Z, "select C, sum\(J\), sum\(K\), sum\(L\), sum\(M\), sum\(N\), sum\(O\), sum\(P\), sum\(Q\) where C is not null and X <> 'canceled' group by C/);
  assert.match(env.sheets.get('Bake summary').formulas.get('2,12'), /where C is not null and W = false and X <> 'canceled'/);
  // Running setup again keeps settings Eliana changed
  env.sheets.get('Settings').set(2, 2, 12);
  env.ctx.setup();
  assert.equal(env.sheets.get('Settings').get(2, 2), 12);
});

test('an order lands in the sheet as one complete row', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const r = env.post(order({ orderId: 'sheet-row-0001' }));
  assert.equal(r.ok, true);
  assert.equal(r.orderNumber, 1001);
  assert.equal(r.total, 90);
  const row = env.row('Website orders', 2);
  assert.equal(row['Order #'], 1001);
  assert.equal(row.Received, '2026-11-05 10:00', 'Israel time');
  assert.equal(row['Delivery date'], '2026-11-10');
  assert.equal(row.Day, 'Tuesday');
  assert.equal(row.Phone, '0540000000', 'leading zero kept');
  assert.equal(row['Pickup / delivery'], 'Delivery');
  assert.equal(row['Pays by'], 'Bit');
  assert.equal(row['Plain sourdough'], 1);
  assert.equal(row.Pesto, 1);
  assert.equal(row.Garlic, '');
  assert.equal(row.Loaves, 2);
  assert.equal(row['Total ₪'], 90);
  assert.equal(row['Delivery ₪'], 5);
  assert.equal(row.Paid, false);
  assert.equal(row.Status, 'new');
  assert.match(row['Payment reminder'], /^=HYPERLINK\("https:\/\/wa\.me\/972540000000\?text=[^"]+","Send reminder"\)$/);
  assert.equal(row['Order ID'], 'sheet-row-0001');
  assert.ok(env.sheets.get('Website orders').checkboxes.has('2,' + (env.ctx.COLUMNS.indexOf('Paid') + 1)));
  assert.equal(env.lock.held, false, 'lock released');
});

test('retrying the same order does not add a second row', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const o = order();
  const a = env.post(o);
  const b = env.post(o);
  assert.equal(b.duplicate, true);
  assert.equal(b.orderNumber, a.orderNumber);
  assert.equal(b.payment, 'bit');
  assert.equal(b.method, 'delivery');
  assert.equal(env.sheets.get('Website orders').getLastRow(), 2);
});

test('capacity and closed days come from the Settings tab', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const settings = env.sheets.get('Settings');
  settings.set(2, 2, 3);
  settings.set(6, 1, new Date('2026-11-12T22:00:00Z')); // a real date cell: Friday 13 Nov in Israel
  assert.deepEqual(env.get({ action: 'availability' }).dates.map((d) => d.date), ['2026-11-10', '2026-11-17']);
  assert.equal(env.post(order({ items: { plain: 3 } })).ok, true);
  assert.deepEqual(env.post(order({ items: { plain: 1 } })), { ok: false, error: 'full', date: '2026-11-10', remaining: 0 });
  assert.equal(env.post(order({ date: '2026-11-13' })).fields.date, 'closed');
  assert.equal(env.get({ action: 'availability' }).dates[0].soldOut, true);
});

test('an order canceled in the sheet frees its loaves; hand-typed rows count', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const sheet = env.sheets.get('Website orders');
  env.post(order({ items: { plain: 17 } }));
  // Eliana types a phone order by hand (no order ID) for 1 loaf
  const cols = env.ctx.COLUMNS;
  sheet.set(3, 1, 7); sheet.set(3, cols.indexOf('Delivery date') + 1, '2026-11-10');
  sheet.set(3, cols.indexOf('Loaves') + 1, 1); sheet.set(3, cols.indexOf('Status') + 1, 'New');
  assert.equal(env.post(order({ items: { plain: 1 } })).error, 'full');
  sheet.set(2, cols.indexOf('Status') + 1, 'canceled');
  const r = env.post(order({ items: { plain: 1 } }));
  assert.equal(r.ok, true);
  assert.equal(r.orderNumber, 1002);
});

test('a bad capacity value in Settings falls back to 18', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  env.sheets.get('Settings').set(2, 2, 'eighteen');
  assert.equal(env.get({ action: 'availability' }).dates[0].remaining, 18);
});

test('test orders go to the Test orders tab only', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const r = env.post(order({ test: true }));
  assert.equal(r.ok, true);
  assert.equal(env.sheets.get('Test orders').getLastRow(), 2);
  assert.equal(env.sheets.get('Website orders').getLastRow(), 1);
  assert.equal(env.get({ action: 'availability', test: '1' }).dates[0].remaining, 16);
  assert.equal(env.get({ action: 'availability' }).dates[0].remaining, 18);
});

test('bad requests, busy lock and missing setup fail safely', () => {
  const env = makeEnv(THURSDAY);
  assert.deepEqual(env.post('{not json'), { ok: false, error: 'bad_request' });
  assert.deepEqual(env.get({ action: 'availability' }), { ok: false, error: 'server' }, 'setup() not run yet');
  assert.deepEqual(env.post(order()), { ok: false, error: 'server' });
  assert.deepEqual(env.get({}), { ok: true, service: 'the-bread-club-orders' });
  env.ctx.setup();
  env.lock.busy = true;
  assert.deepEqual(env.post(order()), { ok: false, error: 'busy' });
  assert.equal(env.sheets.get('Website orders').getLastRow(), 1);
});

test('Hebrew orders are labelled and get a Hebrew reminder', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  env.post(order({ lang: 'he', method: 'pickup', payment: 'cash' }));
  const row = env.row('Website orders', 2);
  assert.equal(row.Language, 'Hebrew');
  assert.equal(row['Pays by'], 'Cash');
  assert.equal(row['Pickup / delivery'], 'Pickup');
  assert.equal(row.Address, '');
  assert.match(decodeURIComponent(row['Payment reminder']), /תזכורת קטנה/);
});
