'use strict';
/*
 * Browser end-to-end tests: a real Chromium drives the real pages against the local
 * preview server (same order handler as Google Apps Script, file-backed store).
 * All customers and orders here are synthetic.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { start } = require('../../tools/dev-server.js');

const THURSDAY = '2026-11-05T08:00:00Z';
let server; let base; let browser; let dataFile;

test.before(async () => {
  dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'breadclub-')), 'orders.json');
  server = await start({ port: 0, dataFile, control: true, now: THURSDAY });
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch();
});
test.after(async () => { await browser.close(); server.close(); });

async function control(body) {
  const r = await fetch(base + '/__control', { method: 'POST', body: JSON.stringify(body) });
  assert.equal(r.status, 200);
}
async function orders() { return (await (await fetch(base + '/__orders')).json()); }
async function fresh() { await control({ reset: true, now: THURSDAY, failNext: null }); }

async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  // Google Fonts are blocked in tests (no internet); any other failed request is an error.
  p.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) p.errors.push(m.text()); });
  p.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) p.errors.push('request failed: ' + r.url()); });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); // no internet needed
  return p;
}
async function openOrder(p, query = '') {
  await p.goto(base + '/order.html?api=/api' + query);
  await p.waitForSelector('input[name="date"]', { state: 'attached' });
}
const plus = (p, id, times = 1) => (async () => {
  for (let i = 0; i < times; i++) await p.click(`.loaf[data-id="${id}"] button[data-step="1"]`);
})();
async function fillCustomer(p, over = {}) {
  const v = Object.assign({ name: 'Test Customer', phone: '054-000-0000', method: 'delivery', address: '1 Test St, Ra\'anana', payment: 'bit' }, over);
  await p.check(`input[name="method"][value="${v.method}"]`, { force: true });
  if (v.method === 'delivery') await p.fill('#address', v.address);
  await p.fill('#name', v.name);
  await p.fill('#phone', v.phone);
  await p.check(`input[name="payment"][value="${v.payment}"]`, { force: true });
}
const text = async (p, sel) => (await p.textContent(sel)).trim();

// ---- home page ----------------------------------------------------------------------------

test('home page: menu matches the printed menu, no errors, no sideways scroll', async () => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const p = await page({ viewport });
    await p.goto(base + '/');
    const items = await p.$$eval('#menu-list .menu-item', (els) => els.map((e) =>
      e.querySelector('.menu-item__name').textContent + ' ' + e.querySelector('.menu-item__price').textContent));
    assert.deepEqual(items, ['Plain sourdough 35 ₪', 'Garlic 42 ₪', 'Rosemary garlic 44 ₪', 'Cinnamon sugar 42 ₪',
      'Olive 44 ₪', 'Chocolate chip 44 ₪', 'Pesto 50 ₪']);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), viewport.width);
    assert.equal(await p.locator('text=/flavor of the season/i').count(), 0);
    const hrefs = await p.$$eval('a.btn', (as) => as.map((a) => a.getAttribute('href')));
    assert.ok(hrefs.includes('order.html'));
    const wa = await p.$$eval('a.js-wa', (as) => as.map((a) => a.href.split('?')[0]));
    assert.ok(wa.includes('https://wa.me/972549112175') && wa.includes('https://wa.me/972586786900'));
    assert.deepEqual(p.errors, []);
    await p.context().close();
  }
});

test('home page: Hebrew switch is right-to-left and remembered after reload', async () => {
  const p = await page();
  await p.goto(base + '/');
  await p.click('.nav__lang');
  assert.equal(await p.getAttribute('html', 'dir'), 'rtl');
  assert.equal(await text(p, '#menu-title'), 'התפריט');
  await p.reload();
  assert.equal(await p.getAttribute('html', 'dir'), 'rtl');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390);
  const width = await p.evaluate(() => Math.round(document.documentElement.getBoundingClientRect().width));
  assert.equal(width, 390);
  await p.click('.nav__lang');
  assert.equal(await p.getAttribute('html', 'dir'), 'ltr');
  await p.context().close();
});

// ---- ordinary order -----------------------------------------------------------------------------

test('ordinary order: live total, one stored order, Bit instructions, survives reload', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  assert.deepEqual(await p.$$eval('input[name="date"]', (els) => els.map((e) => e.value)), ['2026-11-10', '2026-11-13']);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'garlic', 2);
  await fillCustomer(p);
  assert.equal(await text(p, '#sum-subtotal'), '84 ₪');
  assert.equal(await text(p, '#sum-delivery'), '5 ₪');
  assert.equal(await text(p, '#sum-total'), '89 ₪');
  await p.fill('#notes', 'please ring twice');
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal(await text(p, '#done-title'), 'Thank you, Test');
  assert.equal(await text(p, '#done-summary'), 'Order #1001 · Tuesday 10 November · 2 loaves');
  assert.equal(await text(p, '#done-total'), '89 ₪');
  assert.equal(await text(p, '#done-bit-number'), '054-911-2175');
  assert.equal(await p.isHidden('#done-cash'), true);

  const { live } = await orders();
  assert.equal(live.length, 1);
  const o = live[0];
  assert.deepEqual([o.name, o.phone, o.date, o.method, o.address, o.payment, o.loaves, o.subtotal, o.deliveryFee, o.total, o.notes, o.paid, o.status],
    ['Test Customer', '0540000000', '2026-11-10', 'delivery', '1 Test St, Ra\'anana', 'bit', 2, 84, 5, 89, 'please ring twice', false, 'new']);
  assert.deepEqual(o.items, { garlic: 2 });

  await p.reload();
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal(await text(p, '#done-total'), '89 ₪', 'confirmation still there after reload');
  await p.click('#another');
  await p.waitForSelector('#order-form:not([hidden])');
  assert.equal(await text(p, '#sum-total'), '0 ₪', 'new order starts empty');
  assert.deepEqual(p.errors, []);
  await p.context().close();

  await control({ reload: true }); // like restarting: re-read orders from disk
  assert.equal((await orders()).live.length, 1, 'order persisted');
});

test('pickup with cash, and delivery becomes free at exactly 100 ₪', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-13"]', { force: true });
  await plus(p, 'pesto', 2);
  await p.check('input[name="method"][value="delivery"]', { force: true });
  assert.equal(await text(p, '#sum-delivery'), 'free');
  assert.equal(await text(p, '#sum-total'), '100 ₪');
  await fillCustomer(p, { method: 'pickup', payment: 'cash' });
  assert.equal(await p.isHidden('#address-field'), true);
  assert.equal(await p.isHidden('#sum-delivery-row'), true);
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal(await p.isHidden('#done-bit'), true);
  assert.equal(await text(p, '#done-cash'), 'Please have 100 ₪ in cash ready when you get your bread.');
  assert.equal(await text(p, '#done-method'), 'We\'ll send you the pickup address on WhatsApp.');
  const o = (await orders()).live[0];
  assert.deepEqual([o.method, o.payment, o.address, o.total, o.date], ['pickup', 'cash', '', 100, '2026-11-13']);
  await p.context().close();
});

// ---- invalid input ----------------------------------------------------------------------------

test('invalid input: errors shown next to fields, nothing stored', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  await p.click('#submit');
  assert.equal(await text(p, '#date-error'), 'Choose a bake day.');
  assert.equal(await text(p, '#items-error'), 'Choose at least one loaf.');
  assert.equal(await text(p, '#method-error'), 'Choose pickup or delivery.');
  assert.equal(await text(p, '#name-error'), 'Please write your full name.');
  assert.equal(await text(p, '#phone-error'), 'Please enter an Israeli mobile number, like 054-123-4567.');
  assert.equal(await text(p, '#payment-error'), 'Choose how you\'ll pay.');
  assert.equal(await p.evaluate(() => document.activeElement.name), 'date', 'focus moves to the first problem');

  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain');
  await fillCustomer(p, { phone: '12345', address: '' });
  await p.click('#submit');
  assert.equal(await text(p, '#address-error'), 'Please write the delivery address.');
  assert.equal(await p.getAttribute('#phone', 'aria-invalid'), 'true');
  assert.equal((await orders()).live.length, 0);

  await p.fill('#address', '1 Test St, Herzliya');
  await p.fill('#phone', '+972 54 000 0000');
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal((await orders()).live[0].phone, '0540000000');
  await p.context().close();
});

test('a draft survives a reload before ordering', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-13"]', { force: true });
  await plus(p, 'olive', 3);
  await fillCustomer(p);
  await p.reload();
  await p.waitForSelector('input[name="date"]', { state: 'attached' });
  assert.equal(await p.isChecked('input[name="date"][value="2026-11-13"]'), true);
  assert.equal(await text(p, '.loaf[data-id="olive"] output'), '3');
  assert.equal(await p.inputValue('#name'), 'Test Customer');
  assert.equal(await text(p, '#sum-total'), '132 ₪');
  await p.context().close();
});

// ---- capacity ---------------------------------------------------------------------------------

test('capacity: warns before ordering too many, sold-out days offer WhatsApp', async () => {
  await fresh();
  await control({ settings: { capacity: 4 } });
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain', 5);
  assert.match(await text(p, '#capacity-note'), /^Only 4 loaves left for Tuesday 10 November/);
  const wa = await p.getAttribute('#capacity-note a', 'href');
  assert.match(decodeURIComponent(wa), /^https:\/\/wa\.me\/972549112175\?text=Hi, I'd like to order for Tuesday 10 November: 5 × Plain sourdough\. Is there room\?$/);
  await fillCustomer(p);
  await p.click('#submit');
  assert.equal(await p.isVisible('#order-form'), true);
  assert.equal((await orders()).live.length, 0, 'over-capacity order was not sent');

  await p.click('.loaf[data-id="plain"] button[data-step="-1"]');
  assert.equal(await text(p, '#capacity-note'), '');
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  await p.context().close();

  const q = await page();
  await openOrder(q);
  assert.equal(await q.isDisabled('input[name="date"][value="2026-11-10"]'), true);
  assert.match(await text(q, 'label[for="date-2026-11-10"]'), /fully booked/);
  const room = await q.getAttribute('a[data-room="2026-11-10"]', 'href');
  assert.match(decodeURIComponent(room), /wa\.me\/972549112175\?text=Hi, I'd like to order for Tuesday 10 November/);
  assert.equal(await q.isDisabled('input[name="date"][value="2026-11-13"]'), false);
  await q.context().close();
});

test('capacity race: the day fills while the customer is ordering', async () => {
  await fresh();
  await control({ settings: { capacity: 5 } });
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain', 3);
  await fillCustomer(p);

  // Someone else takes 4 of the 5 loaves first.
  const other = await page();
  await openOrder(other);
  await other.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(other, 'garlic', 4);
  await fillCustomer(other, { name: 'Other Customer', phone: '052-000-0000' });
  await other.click('#submit');
  await other.waitForSelector('#done-view:not([hidden])');

  await p.click('#submit');
  await p.waitForFunction(() => /just filled up/.test(document.getElementById('form-message').textContent));
  assert.match(await text(p, '#form-message'), /Tuesday 10 November just filled up/);
  assert.ok(await p.getAttribute('#form-message a', 'href'));
  await p.waitForFunction(() => /Only 1 loaf left/.test(document.getElementById('capacity-note').textContent));
  assert.equal((await orders()).live.length, 1);
  await p.context().close(); await other.context().close();
});

test('canceling an order in the sheet frees its loaves', async () => {
  await fresh();
  await control({ settings: { capacity: 2 } });
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain', 2);
  await fillCustomer(p);
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  await control({ cancel: 1001 });
  await p.click('#another');
  await p.waitForSelector('input[name="date"]', { state: 'attached' });
  assert.equal(await p.isDisabled('input[name="date"][value="2026-11-10"]'), false);
  await p.context().close();
});

// ---- cutoff --------------------------------------------------------------------------------------

test('cutoff: ordering for Tuesday closes at 4pm Sunday, even on an open page', async () => {
  await fresh();
  await control({ now: '2026-11-08T13:58:00Z' }); // Sunday 15:58 Israel
  const p = await page();
  await openOrder(p);
  assert.match(await text(p, 'label[for="date-2026-11-10"]'), /order by Sunday, 4pm/);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain');
  await fillCustomer(p);
  await control({ now: '2026-11-08T14:00:00Z' }); // 16:00
  await p.click('#submit');
  await p.waitForFunction(() => /just closed/.test(document.getElementById('form-message').textContent));
  await p.waitForSelector('input[name="date"][value="2026-11-17"]', { state: 'attached' });
  assert.deepEqual(await p.$$eval('input[name="date"]', (els) => els.map((e) => e.value)), ['2026-11-13', '2026-11-17']);
  assert.equal((await orders()).live.length, 0);
  await p.context().close();
});

// ---- duplicates and unknown outcomes ------------------------------------------------------------------

test('double tap on "Place order" creates one order', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain');
  await fillCustomer(p);
  await control({ failNext: 'slow' });
  await p.click('#submit');
  await p.evaluate(() => {
    const b = document.getElementById('submit');
    b.disabled = false; b.click(); b.click(); // bypass the disabled button on purpose
  });
  await p.waitForSelector('#done-view:not([hidden])');
  await p.waitForTimeout(1800);
  assert.equal((await orders()).live.length, 1);
  await p.context().close();
});

test('connection lost after the order was saved: retry shows the same order, no duplicate', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'olive');
  await fillCustomer(p);
  await control({ failNext: 'drop-after-save' });
  await p.click('#submit');
  await p.waitForFunction(() => /couldn't confirm/.test(document.getElementById('form-message').textContent));
  assert.equal(await p.isVisible('#done-view'), false, 'no false confirmation');
  assert.equal((await orders()).live.length, 1, 'it was in fact saved');

  await p.reload(); // even after a reload, the retry reuses the same order ID
  await p.waitForSelector('input[name="date"]', { state: 'attached' });
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal(await text(p, '#done-summary'), 'Order #1001 · Tuesday 10 November · 1 loaf');
  assert.equal((await orders()).live.length, 1);
  await p.context().close();
});

test('server error before saving: clear message, retry succeeds once', async () => {
  await fresh();
  const p = await page();
  await openOrder(p);
  await p.check('input[name="date"][value="2026-11-13"]', { force: true });
  await plus(p, 'chocolate-chip');
  await fillCustomer(p);
  await control({ failNext: 'error-before-save' });
  await p.click('#submit');
  await p.waitForFunction(() => /couldn't confirm/.test(document.getElementById('form-message').textContent));
  assert.equal((await orders()).live.length, 0);
  assert.equal(await p.isEnabled('#submit'), true);
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal((await orders()).live.length, 1);
  await p.context().close();
});

test('bake days fail to load: message and working retry', async () => {
  await fresh();
  const p = await page();
  let fail = true;
  await p.route(/\/api\?action=availability/, (r) => (fail ? r.abort() : r.continue()));
  await p.goto(base + '/order.html?api=/api');
  await p.waitForSelector('text=couldn\'t load the bake days');
  fail = false;
  await p.click('#days button');
  await p.waitForSelector('input[name="date"]', { state: 'attached' });
  await p.context().close();
});

// ---- Hebrew, test mode, not connected -------------------------------------------------------------------

test('Hebrew order end to end', async () => {
  await fresh();
  const p = await page();
  await openOrder(p, '&lang=he');
  assert.equal(await p.getAttribute('html', 'dir'), 'rtl');
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'garlic');
  await fillCustomer(p, { name: 'לקוחה לבדיקה' });
  assert.equal(await text(p, '#submit'), 'לשליחת ההזמנה');
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  assert.equal(await text(p, '#done-title'), 'תודה, לקוחה');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.equal((await orders()).live[0].lang, 'he');
  assert.deepEqual(p.errors, []);
  await p.context().close();
});

test('test mode (?test=1) keeps test orders out of the real list', async () => {
  await fresh();
  const p = await page();
  await openOrder(p, '&test=1');
  await p.check('input[name="date"][value="2026-11-10"]', { force: true });
  await plus(p, 'plain');
  await fillCustomer(p);
  await p.click('#submit');
  await p.waitForSelector('#done-view:not([hidden])');
  const all = await orders();
  assert.equal(all.live.length, 0);
  assert.equal(all.test.length, 1);
  await p.context().close();
});

test('before Google is connected, the order page points to the current Google Form', async () => {
  const p = await page();
  await p.goto(base + '/order.html');
  await p.waitForSelector('#offline:not([hidden])');
  assert.match(await p.getAttribute('#google-form-link', 'href'), /^https:\/\/docs\.google\.com\/forms\//);
  assert.equal(await p.isHidden('#order-form'), true);
  await p.context().close();
});
