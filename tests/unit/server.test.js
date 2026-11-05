'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../../site/assets/js/logic.js');
const Server = require('../../apps-script/src/server.js');
const { memoryStore } = require('../../tools/stores.js');

const THURSDAY = () => new Date('2026-11-05T08:00:00Z');

function setup(opts = {}) {
  const store = opts.store || memoryStore(opts.settings);
  const handler = Server.createHandler({ logic, store, now: opts.now || THURSDAY });
  return { store, handler };
}

let seq = 0;
const order = (over = {}) => Object.assign({
  orderId: 'order-' + String(++seq).padStart(4, '0'), name: 'Test Customer', phone: '0540000000',
  items: { plain: 1, pesto: 1 }, method: 'delivery', address: '1 Test St, Ra\'anana', payment: 'bit',
  date: '2026-11-10', notes: '', lang: 'en'
}, over);

test('availability lists the next two bake days with what is left', () => {
  const { handler } = setup();
  handler.submit(order({ items: { plain: 5 } }));
  assert.deepEqual(handler.availability(), {
    ok: true,
    dates: [
      { date: '2026-11-10', cutoff: { date: '2026-11-08', hour: 16 }, remaining: 13, soldOut: false },
      { date: '2026-11-13', cutoff: { date: '2026-11-11', hour: 16 }, remaining: 18, soldOut: false }
    ]
  });
});

test('availability respects capacity and closed days from settings', () => {
  const { handler } = setup({ settings: { capacity: 0, closedDates: ['2026-11-13'] } });
  const a = handler.availability();
  assert.deepEqual(a.dates.map((d) => [d.date, d.soldOut]), [['2026-11-10', true], ['2026-11-17', true]]);
});

test('a good order is stored once with server-calculated prices', () => {
  const { store, handler } = setup();
  const r = handler.submit(order({ orderId: 'first-order-1', total: 1, subtotal: 1 }));
  assert.deepEqual(r, {
    ok: true, orderNumber: 1001, orderId: 'first-order-1', date: '2026-11-10', loaves: 2,
    subtotal: 85, deliveryFee: 5, total: 90, method: 'delivery', payment: 'bit'
  });
  assert.equal(store.orders.length, 1);
  const saved = store.orders[0];
  assert.equal(saved.total, 90, 'ignores the total sent by the browser');
  assert.equal(saved.status, 'new');
  assert.equal(saved.paid, false, 'never marked paid automatically');
  assert.equal(saved.weekday, 2);
  assert.equal(saved.receivedAt, '2026-11-05T08:00:00.000Z');
  assert.match(saved.reminderLink, /^https:\/\/wa\.me\/972540000000\?text=/);
  const text = decodeURIComponent(saved.reminderLink.split('text=')[1]);
  assert.equal(text, 'Hi Test Customer, this is The Bread Club. A quick reminder that your order (#1001) for ' +
    'Tuesday 10.11 comes to ₪90. You can pay by Bit to 054-911-2175 (please write your full name in the note). Thank you');
});

test('Hebrew orders get a Hebrew reminder', () => {
  const { store, handler } = setup();
  handler.submit(order({ lang: 'he', date: '2026-11-13', method: 'pickup', items: { plain: 1 } }));
  const text = decodeURIComponent(store.orders[0].reminderLink.split('text=')[1]);
  assert.equal(text, 'היי Test Customer, כאן The Bread Club. תזכורת קטנה: ההזמנה שלך (#1001) ליום שישי 13.11 ' +
    'יוצאת ₪35. אפשר לשלם בביט ל-054-911-2175 (עם השם המלא בהערה). תודה');
});

test('sending the same order twice (double tap or retry) stores it once', () => {
  const { store, handler } = setup();
  const o = order({ orderId: 'retry-me-123' });
  const first = handler.submit(o);
  const second = handler.submit(Object.assign({}, o));
  assert.equal(store.orders.length, 1);
  assert.deepEqual(second, { ok: true, duplicate: true, orderNumber: first.orderNumber, orderId: 'retry-me-123',
    date: '2026-11-10', loaves: 2, total: 90, method: 'delivery', payment: 'bit' });
});

test('a duplicate is recognized even after the cutoff has passed', () => {
  const store = memoryStore();
  const o = order({ orderId: 'late-retry-1' });
  setup({ store }).handler.submit(o);
  const later = setup({ store, now: () => new Date('2026-11-09T08:00:00Z') }).handler.submit(o);
  assert.equal(later.duplicate, true);
  assert.equal(store.orders.length, 1);
});

test('rows typed by hand without an order ID never count as duplicates', () => {
  const store = memoryStore();
  store.orders.push({ orderId: '', orderNumber: 1005, date: '2026-11-10', loaves: 2, total: 70, status: 'new' });
  const { handler } = setup({ store });
  assert.equal(handler.submit(order({ orderId: '' })).error, 'invalid');
  assert.equal(handler.submit(order({ orderId: undefined })).error, 'invalid');
  assert.equal(store.orders.length, 1);
  assert.equal(handler.submit(order()).orderNumber, 1006, 'numbering continues after hand-typed rows');
});

test('invalid orders are rejected with field errors and nothing is stored', () => {
  const { store, handler } = setup();
  const r = handler.submit(order({ phone: '12', items: {} }));
  assert.deepEqual(r, { ok: false, error: 'invalid', fields: { phone: 'invalid', items: 'empty' } });
  assert.equal(store.orders.length, 0);
  assert.equal(handler.submit(null).error, 'invalid');
});

test('orders after 4pm on the cutoff day are refused', () => {
  const { handler } = setup({ now: () => new Date('2026-11-08T14:00:00Z') }); // Sunday 16:00 Israel
  assert.deepEqual(handler.submit(order()).fields, { date: 'closed' });
});

test('the 18-loaf limit: last loaves can be taken, one more is refused', () => {
  const { store, handler } = setup();
  assert.equal(handler.submit(order({ items: { plain: 15 } })).ok, true);
  assert.deepEqual(handler.submit(order({ items: { garlic: 4 } })), { ok: false, error: 'full', date: '2026-11-10', remaining: 3 });
  assert.equal(handler.submit(order({ items: { garlic: 3 } })).ok, true);
  assert.deepEqual(handler.submit(order({ items: { plain: 1 } })), { ok: false, error: 'full', date: '2026-11-10', remaining: 0 });
  assert.equal(store.orders.length, 2);
  assert.equal(handler.submit(order({ date: '2026-11-13', items: { plain: 18 } })).ok, true, 'Friday has its own 18');
});

test('canceled orders free up their loaves', () => {
  const { store, handler } = setup();
  handler.submit(order({ items: { plain: 18 } }));
  assert.equal(handler.submit(order({ items: { plain: 1 } })).error, 'full');
  store.orders[0].status = 'canceled';
  assert.equal(handler.submit(order({ items: { plain: 1 } })).ok, true);
});

test('honeypot: bots are refused without a success message, nothing is stored', () => {
  const { store, handler } = setup();
  assert.deepEqual(handler.submit(order({ website: 'http://spam' })), { ok: false, error: 'server' });
  assert.equal(store.orders.length, 0);
});

test('menu-like names from JavaScript objects never make a zero-loaf order', () => {
  const { store, handler } = setup();
  for (const items of [{ constructor: 3 }, { toString: 1 }, {}]) {
    assert.equal(handler.submit(order({ items })).error, 'invalid', JSON.stringify(items));
  }
  assert.equal(store.orders.length, 0);
});

test('one phone number can place at most 3 orders per bake day', () => {
  const { store, handler } = setup();
  for (let i = 0; i < 3; i++) assert.equal(handler.submit(order({ items: { plain: 1 } })).ok, true);
  assert.deepEqual(handler.submit(order({ items: { plain: 1 } })), { ok: false, error: 'limit', date: '2026-11-10' });
  assert.equal(handler.submit(order({ items: { plain: 1 }, date: '2026-11-13' })).ok, true, 'other day is fine');
  assert.equal(handler.submit(order({ items: { plain: 1 }, phone: '0520000000' })).ok, true, 'other phone is fine');
  store.orders[0].status = 'canceled';
  assert.equal(handler.submit(order({ items: { plain: 1 } })).ok, true, 'canceled orders do not count');
});

test('cash orders get no payment reminder', () => {
  const { store, handler } = setup();
  handler.submit(order({ payment: 'cash' }));
  assert.equal(store.orders[0].reminderLink, '');
});

test('reminder parts wrap the total so the sheet can rebuild the message', () => {
  const o = { name: 'Dana', lang: 'en', date: '2026-11-13' };
  const parts = Server.reminderParts(logic, o, 1005);
  assert.equal(parts.before, 'Hi Dana, this is The Bread Club. A quick reminder that your order (#1005) for Friday 13.11 comes to ₪');
  assert.equal(Server.reminderText(logic, o, 77, 1005), parts.before + '77' + parts.after);
});

test('storage failures are reported, never shown as success', () => {
  const broken = { getSettings() { throw new Error('down'); }, listOrders() { throw new Error('down'); }, appendOrder() {} };
  const { handler } = setup({ store: broken });
  assert.deepEqual(handler.availability(), { ok: false, error: 'server' });
  assert.deepEqual(handler.submit(order()), { ok: false, error: 'server' });

  const store = memoryStore();
  store.appendOrder = () => { throw new Error('quota'); };
  assert.deepEqual(setup({ store }).handler.submit(order()), { ok: false, error: 'server' });
});

test('bookedLoaves ignores other days and canceled orders', () => {
  const orders = [
    { date: '2026-11-10', loaves: 3, status: 'new' },
    { date: '2026-11-10', loaves: 2, status: 'delivered' },
    { date: '2026-11-10', loaves: 9, status: 'canceled' },
    { date: '2026-11-13', loaves: 4, status: 'new' }
  ];
  assert.equal(Server.bookedLoaves(orders, '2026-11-10'), 5);
});
