'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../site/assets/js/logic.js');

// Israel is UTC+2 in winter and UTC+3 in summer.
const at = (iso) => L.israelNow(new Date(iso));

test('menu matches the printed menu exactly', () => {
  assert.deepEqual(
    L.MENU.map((m) => [m.name.en, m.price]),
    [['Plain sourdough', 35], ['Garlic', 42], ['Rosemary garlic', 44], ['Cinnamon sugar', 42],
      ['Olive', 44], ['Chocolate chip', 44], ['Pesto', 50]]
  );
  assert.ok(L.MENU.every((m) => m.name.he && m.section));
  assert.ok(!L.MENU.some((m) => /season/i.test(m.name.en)), 'flavor of the season was removed');
});

test('israelNow converts to Israel local time in winter and summer', () => {
  assert.deepEqual(at('2026-11-08T13:59:00Z'), { date: '2026-11-08', minutes: 15 * 60 + 59 });
  assert.deepEqual(at('2026-06-07T13:00:00Z'), { date: '2026-06-07', minutes: 16 * 60 });
  // 23:30 UTC on Saturday is already Sunday in Israel
  assert.deepEqual(at('2026-11-07T23:30:00Z'), { date: '2026-11-08', minutes: 90 });
  assert.equal(at('2026-11-07T22:00:00Z').minutes, 0, 'midnight is 0, not 24:00');
});

test('isIsoDate accepts only real calendar dates', () => {
  assert.equal(L.isIsoDate('2026-11-10'), true);
  assert.equal(L.isIsoDate('2026-02-30'), false);
  assert.equal(L.isIsoDate('2026-13-01'), false);
  assert.equal(L.isIsoDate('10/11/2026'), false);
  assert.equal(L.isIsoDate(20261110), false);
  assert.equal(L.isIsoDate(undefined), false);
});

test('addDays and weekday cross month and year boundaries', () => {
  assert.equal(L.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(L.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(L.weekday('2026-11-10'), 2);
});

test('cutoff is 4pm two days before: Sunday for Tuesday, Wednesday for Friday', () => {
  assert.deepEqual(L.cutoffFor('2026-11-10'), { date: '2026-11-08', hour: 16 }); // Tue -> Sun
  assert.deepEqual(L.cutoffFor('2026-11-13'), { date: '2026-11-11', hour: 16 }); // Fri -> Wed
  assert.equal(L.weekday(L.cutoffFor('2026-11-10').date), 0);
  assert.equal(L.weekday(L.cutoffFor('2026-11-13').date), 3);
});

test('isOrderable: open before 4pm on cutoff day, closed from 4pm', () => {
  assert.equal(L.isOrderable('2026-11-10', at('2026-11-08T13:59:00Z')), true); // Sun 15:59
  assert.equal(L.isOrderable('2026-11-10', at('2026-11-08T14:00:00Z')), false); // Sun 16:00
  assert.equal(L.isOrderable('2026-11-10', at('2026-11-07T10:00:00Z')), true); // Saturday
  assert.equal(L.isOrderable('2026-11-10', at('2026-11-09T06:00:00Z')), false); // Monday
  // Summer time: 4pm Israel is 13:00 UTC
  assert.equal(L.isOrderable('2026-06-09', at('2026-06-07T12:59:00Z')), true);
  assert.equal(L.isOrderable('2026-06-09', at('2026-06-07T13:00:00Z')), false);
});

test('upcomingDates offers the next two open bake days', () => {
  // Thursday 5 Nov: Friday 6 Nov closed (cutoff was Wed), so Tue 10 and Fri 13.
  assert.deepEqual(L.upcomingDates(at('2026-11-05T08:00:00Z'), []), ['2026-11-10', '2026-11-13']);
  // Sunday 8 Nov 15:59: Tuesday 10 still open.
  assert.deepEqual(L.upcomingDates(at('2026-11-08T13:59:00Z')), ['2026-11-10', '2026-11-13']);
  // Sunday 8 Nov 16:00: Tuesday 10 closed, next is Fri 13 and Tue 17.
  assert.deepEqual(L.upcomingDates(at('2026-11-08T14:00:00Z')), ['2026-11-13', '2026-11-17']);
  // Wednesday 11 Nov 16:00: Friday 13 closed.
  assert.deepEqual(L.upcomingDates(at('2026-11-11T14:00:00Z')), ['2026-11-17', '2026-11-20']);
});

test('upcomingDates skips closed days and respects count', () => {
  const now = at('2026-11-05T08:00:00Z');
  assert.deepEqual(L.upcomingDates(now, ['2026-11-10']), ['2026-11-13', '2026-11-17']);
  assert.deepEqual(L.upcomingDates(now, [], 3), ['2026-11-10', '2026-11-13', '2026-11-17']);
});

test('upcomingDates returns nothing when every day in range is closed', () => {
  const now = at('2026-11-05T08:00:00Z');
  const closed = [];
  for (let i = 0; i <= L.RULES.searchDays + 7; i++) closed.push(L.addDays('2026-11-05', i));
  assert.deepEqual(L.upcomingDates(now, closed), []);
});

test('quote: prices, ignores unknown items and zero quantities', () => {
  const q = L.quote({ plain: 1, garlic: 0, pesto: 1, bogus: 4 }, 'pickup');
  assert.deepEqual(q, {
    lines: [{ id: 'plain', qty: 1, price: 35, lineTotal: 35 }, { id: 'pesto', qty: 1, price: 50, lineTotal: 50 }],
    loaves: 2, subtotal: 85, deliveryFee: 0, total: 85
  });
  assert.deepEqual(L.quote(undefined, 'pickup'), { lines: [], loaves: 0, subtotal: 0, deliveryFee: 0, total: 0 });
});

test('quote: delivery is +5 below 100 and free from exactly 100', () => {
  assert.equal(L.quote({ plain: 1 }, 'delivery').total, 40); // 35 + 5
  assert.equal(L.quote({ garlic: 1, olive: 1 }, 'delivery').total, 91); // 86 + 5
  assert.equal(L.quote({ pesto: 2 }, 'delivery').deliveryFee, 0); // exactly 100
  assert.equal(L.quote({ pesto: 2 }, 'delivery').total, 100);
  assert.equal(L.quote({ plain: 2, olive: 1 }, 'delivery').total, 114); // 114, free
  assert.equal(L.quote({ plain: 1 }, 'pickup').deliveryFee, 0);
});

test('normalizePhone accepts common Israeli mobile formats only', () => {
  for (const raw of ['054-911-2175', '0549112175', '+972 54 911 2175', '972549112175', '(054) 911.2175']) {
    assert.equal(L.normalizePhone(raw), '0549112175', raw);
  }
  for (const raw of ['09-7712345', '054911217', '05491121755', '+1 212 555 0100', '', null, 549112175]) {
    assert.equal(L.normalizePhone(raw), null, String(raw));
  }
});

test('whatsappLink builds wa.me links with optional text', () => {
  assert.equal(L.whatsappLink('0586786900'), 'https://wa.me/972586786900');
  assert.equal(L.whatsappLink('0549112175', 'Hi & bye?'), 'https://wa.me/972549112175?text=Hi%20%26%20bye%3F');
});

const NOW = at('2026-11-05T08:00:00Z'); // Thursday morning
const good = () => ({
  orderId: 'abc12345-test', name: '  Test   Customer ', phone: '054 000 0000', items: { plain: 2, olive: 1 },
  method: 'delivery', address: ' 1 Ahuza St, Ra\'anana ', payment: 'bit', date: '2026-11-10', notes: ' no sesame ',
  lang: 'he'
});

test('validateOrder accepts a good order and normalizes it', () => {
  const r = L.validateOrder(good(), { now: NOW, closedDates: [] });
  assert.deepEqual(r, {
    ok: true,
    order: {
      orderId: 'abc12345-test', name: 'Test Customer', phone: '0540000000', items: { plain: 2, olive: 1 },
      method: 'delivery', address: '1 Ahuza St, Ra\'anana', payment: 'bit', date: '2026-11-10',
      notes: 'no sesame', lang: 'he'
    }
  });
});

test('validateOrder: pickup drops the address, defaults language to English, drops zero items', () => {
  const o = Object.assign(good(), { method: 'pickup', address: 'ignored', lang: 'fr', items: { plain: 1, garlic: 0 }, notes: undefined });
  const r = L.validateOrder(o, { now: NOW });
  assert.equal(r.ok, true);
  assert.equal(r.order.address, '');
  assert.equal(r.order.lang, 'en');
  assert.equal(r.order.notes, '');
  assert.deepEqual(r.order.items, { plain: 1 });
});

test('validateOrder reports every bad field', () => {
  const r = L.validateOrder({
    orderId: 'short', name: 'A', phone: '123', items: { plain: 0 }, method: 'drone',
    payment: 'card', date: '2026-11-06', notes: 'x'.repeat(501)
  }, { now: NOW, closedDates: [] });
  assert.deepEqual(r, {
    ok: false,
    errors: { orderId: 'invalid', name: 'required', phone: 'invalid', items: 'empty', method: 'required',
      payment: 'required', date: 'closed', notes: 'too_long' }
  });
});

test('validateOrder rejects bad quantities and unknown items', () => {
  const bad = [{ plain: -1 }, { plain: 1.5 }, { plain: '2' }, { plain: 100 }, { plain: NaN }, { croissant: 1 }];
  for (const items of bad) {
    const r = L.validateOrder(Object.assign(good(), { items }), { now: NOW });
    assert.equal(r.errors.items, 'invalid', JSON.stringify(items));
  }
  assert.equal(L.validateOrder(Object.assign(good(), { items: { plain: 99 } }), { now: NOW }).ok, true);
});

test('validateOrder: delivery address required and length-limited; name length-limited', () => {
  assert.equal(L.validateOrder(Object.assign(good(), { address: ' ' }), { now: NOW }).errors.address, 'required');
  assert.equal(L.validateOrder(Object.assign(good(), { address: 'x'.repeat(201) }), { now: NOW }).errors.address, 'too_long');
  assert.equal(L.validateOrder(Object.assign(good(), { name: 'x'.repeat(81) }), { now: NOW }).errors.name, 'too_long');
});

test('validateOrder: closed or invalid dates are rejected', () => {
  assert.equal(L.validateOrder(Object.assign(good(), { date: '2026-11-10' }), { now: NOW, closedDates: ['2026-11-10'] }).errors.date, 'closed');
  assert.equal(L.validateOrder(Object.assign(good(), { date: '2026-11-11' }), { now: NOW }).errors.date, 'closed'); // a Wednesday
  assert.equal(L.validateOrder(Object.assign(good(), { date: 'soon' }), { now: NOW }).errors.date, 'closed');
  assert.equal(L.validateOrder(Object.assign(good(), { date: '2026-11-24' }), { now: NOW }).errors.date, 'closed'); // too far ahead
});

test('validateOrder survives missing or non-object input', () => {
  for (const input of [null, undefined, 'order', { items: 'lots' }]) {
    const r = L.validateOrder(input, { now: NOW });
    assert.equal(r.ok, false);
    assert.equal(r.errors.items, 'empty');
  }
});

test('checkCapacity: up to 18 loaves per day', () => {
  assert.deepEqual(L.checkCapacity(0, 18, 18), { ok: true, remaining: 18 });
  assert.deepEqual(L.checkCapacity(15, 3, 18), { ok: true, remaining: 3 });
  assert.deepEqual(L.checkCapacity(15, 4, 18), { ok: false, remaining: 3 });
  assert.deepEqual(L.checkCapacity(18, 1, 18), { ok: false, remaining: 0 });
  assert.deepEqual(L.checkCapacity(20, 1, 18), { ok: false, remaining: 0 }, 'overbooked by hand never goes negative');
});
