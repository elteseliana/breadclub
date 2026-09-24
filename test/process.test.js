import { describe, it, expect } from 'vitest';
import { processOrders } from '../src/process.js';
import { planFor, planRows } from '../src/bakeplan.js';
import { order, il, S } from './helpers.js';

const NOW = il('2026-09-24', '12:00');
const run = (orders, now = NOW, settings = S) => processOrders(orders, settings, now);
const one = (opts, staff, now) => run([order(opts, staff)], now)[0];

describe('one order', () => {
  it('a normal order: bake date, total, bakers, unpaid, message links', () => {
    const r = one({ name: 'Dana Test', phone: '050-000-0001', items: { plain: 1 }, day: 'Friday' });
    expect(r).toMatchObject({ bakeDate: '2026-09-25', counted: true, status: 'Unpaid', attention: [], hub: 'Eliana' });
    expect(r.price.total).toBe(35);
    expect(r.whoBakes).toBe('Eliana: 1 Plain sourdough');
    expect(r.readyFormula).toContain('https://wa.me/972500000001?text=Hi%20Dana!');
    expect(r.readyFormula).toContain(encodeURIComponent('pickup at Achi Dakar 62'));
    expect(r.reminderFormula).toContain('Remind ▶');
  });

  it('a paid order: status Paid, no reminder, ready message says paid', () => {
    const r = one({}, { 'Paid?': true, 'Money went to': 'Bit 054-911-2175' });
    expect(r.status).toBe('Paid');
    expect(r.reminderFormula).toBe('');
    expect(r.readyFormula).toContain(encodeURIComponent('paid. Thank you!'));
  });

  it('never marks paid by itself, and needs to know where the money went', () => {
    expect(one({}, { 'Paid?': true }).attention).toContain('Paid: choose "Money went to"');
    expect(one({}, { 'Money went to': 'Eliana cash' }).attention).toContain('"Money went to" is filled but Paid? isn\'t ticked');
    expect(one({}, { 'Paid?': true, 'Money went to': 'Venmo' }).attention).toContain('"Money went to" must be one of the list options');
  });

  it('flags unpaid after 2 days (not before)', () => {
    const at = il('2026-09-20', '09:00');
    expect(one({ at, day: 'Friday' }, {}, il('2026-09-22', '08:59')).status).toBe('Unpaid');
    expect(one({ at, day: 'Friday' }, {}, il('2026-09-22', '09:00')).status).toBe('Unpaid 2 days: send reminder');
  });

  it('a hand-typed row with no time is unpaid 0 days and needs a bake date', () => {
    const r = one({ at: '' });
    expect(r.unpaidDays).toBe(0);
    expect(r.attention).toContain('No order time: fill in "Bake date (change)"');
    expect(r.counted).toBe(false);
    expect(one({ at: '' }, { 'Bake date (change)': '2026-10-02' })).toMatchObject({ bakeDate: '2026-10-02', counted: true });
  });

  it('a bake date typed as a Date works; nonsense is flagged', () => {
    expect(one({}, { 'Bake date (change)': il('2026-10-06', '00:00') }).bakeDate).toBe('2026-10-06');
    expect(one({}, { 'Bake date (change)': 'soon' }).attention).toContain('Can\'t read "Bake date (change)": use a date like 2026-10-02');
    expect(one({}, { 'Bake date (change)': null }).bakeDate).toBe('2026-09-25');
  });

  it('a late order is NOT accepted or refused on its own', () => {
    const late = { at: il('2026-09-28'), day: 'Tuesday' };
    const r = one(late, {}, il('2026-09-28'));
    expect(r).toMatchObject({ bakeDate: '2026-09-29', pending: true, counted: false, status: 'Needs attention' });
    expect(r.attention).toEqual(['Late order for Tue 29 Sep: Accept, or Move to next bake day (Fri 2 Oct)']);
    expect(r.readyFormula).toBe('');
    expect(r.reminderFormula).toBe('');
    expect(one(late, { 'Late/holiday decision': 'Accept' })).toMatchObject({ bakeDate: '2026-09-29', counted: true });
    expect(one(late, { 'Late/holiday decision': 'Move to next bake day' })).toMatchObject({ bakeDate: '2026-10-02', counted: true });
  });

  it('a holiday date needs a decision too', () => {
    const r = processOrders([order({ day: 'Tuesday' })], { ...S, skipDates: ['2026-09-29'] }, NOW)[0];
    expect(r.attention).toEqual(['No baking on Tue 29 Sep: Accept, or Move to next bake day (Fri 25 Sep)']);
  });

  it('flags a decision that is not one of the options', () => {
    expect(one({}, { 'Late/holiday decision': 'maybe' }).attention)
      .toContain('Late/holiday decision must be "Accept" or "Move to next bake day"');
  });

  it('flags an unknown day', () => {
    const r = one({ day: 'Sunday' });
    expect(r).toMatchObject({ bakeDate: null, counted: false });
  });

  it('mixed order needs a handoff place; single-baker order does not', () => {
    const mixed = { items: { plain: 1, garlic: 1 } };
    expect(one(mixed).attention).toEqual(["Two bakers: choose Handoff at (Eliana's or Shayna's)"]);
    const chosen = one(mixed, { 'Handoff at': "Shayna's" });
    expect(chosen).toMatchObject({ hub: 'Shayna', attention: [] });
    expect(chosen.readyFormula).toContain(encodeURIComponent('Hakdoshim 4'));
    expect(one({ items: { garlic: 1 } }).hub).toBe('Shayna');
    expect(one(mixed, { 'Handoff at': 'park' }).attention).toContain('Handoff at must be "Eliana\'s" or "Shayna\'s"');
    expect(one({ items: { plain: 1 } }, { 'Handoff at': "Shayna's" }).hub).toBe('Shayna');
  });

  it('no loaves: no baker, still flagged', () => {
    const r = one({ items: {} });
    expect(r.hub).toBeNull();
    expect(r.attention).toContain('No loaves ordered');
  });

  it('no WhatsApp link for a phone it cannot read', () => {
    const r = one({ phone: '05878553349' });
    expect(r.attention).toContain('Check phone number (no WhatsApp link)');
    expect(r.readyFormula).toBe('');
    expect(r.reminderFormula).toBe('');
  });

  it('shows form, price and baker problems together', () => {
    const r = one({ items: { 'spelt:plain': 1 } }, { 'Baked by (change)': 'nobody' });
    expect(r.attention).toEqual([
      'Spelt comes in pairs: odd number of spelt loaves',
      'Can\'t read "Baked by (change)": use Eliana, Shayna, or garlic=Eliana',
    ]);
  });

  it('cancelled orders are not counted and have no links', () => {
    const r = one({}, { 'Cancelled?': true });
    expect(r).toMatchObject({ status: 'Cancelled', counted: false, readyFormula: '', reminderFormula: '' });
  });
});

describe('duplicates', () => {
  const a = { name: 'Dana Test', phone: '050-000-0001', items: { plain: 2 } };

  it('the same order sent twice is flagged, not counted twice, and nothing is deleted', () => {
    const rs = run([order(a, {}, 2), order({ ...a, at: il('2026-09-23', '10:01') }, {}, 3)]);
    expect(rs).toHaveLength(2);
    expect(rs[0]).toMatchObject({ counted: true, status: 'Unpaid' });
    expect(rs[1]).toMatchObject({ counted: false, duplicateOf: 2, status: 'Possible duplicate of row 2' });
  });

  it('matches on phone even if the name is typed differently', () => {
    const rs = run([order(a, {}, 2), order({ ...a, name: 'dana  TEST' }, {}, 3), order({ ...a, name: 'D.', phone: '+972 50-000-0001' }, {}, 4)]);
    expect(rs.map((r) => r.duplicateOf)).toEqual([null, 2, 2]);
  });

  it('matches on name even if the phone is typed differently', () => {
    const rs = run([order(a, {}, 2), order({ ...a, phone: '05000000011' }, {}, 3)]);
    expect(rs[1].duplicateOf).toBe(2);
  });

  it('"Not a duplicate" keeps both', () => {
    const rs = run([order(a, {}, 2), order(a, { 'Not a duplicate': true }, 3)]);
    expect(rs.map((r) => r.counted)).toEqual([true, true]);
    expect(rs[1].notes).toEqual(['Same customer also ordered in row 2']);
  });

  it('a second, different order from the same person is kept with a note', () => {
    const rs = run([order(a, {}, 2), order({ ...a, items: { garlic: 1 } }, {}, 3)]);
    expect(rs[1]).toMatchObject({ counted: true, duplicateOf: null, notes: ['Same customer also ordered in row 2'] });
  });

  it('different bake days, different people, cancelled and undated orders are not duplicates', () => {
    const rs = run([
      order(a, {}, 2),
      order({ ...a, day: 'Tuesday' }, {}, 3),
      order({ ...a, name: 'Other Person', phone: '050-000-0002' }, {}, 4),
      order(a, { 'Cancelled?': true }, 5),
      order({ ...a, day: 'Someday' }, {}, 6),
      order({ ...a, name: '', phone: '' }, {}, 7),
      order({ ...a, name: '', phone: '' }, {}, 8),
    ]);
    expect(rs.map((r) => r.duplicateOf)).toEqual([null, null, null, null, null, null, null]);
  });

  it('a cancelled first order does not make the re-order a duplicate', () => {
    const rs = run([order(a, { 'Cancelled?': true }, 2), order(a, {}, 3)]);
    expect(rs[1]).toMatchObject({ counted: true, duplicateOf: null });
  });
});

describe('bake plan', () => {
  const orders = [
    order({ name: 'A', items: { plain: 3, garlic: 1 }, method: 'Delivery', address: 'Test St 1' }, { 'Handoff at': "Eliana's" }, 2),
    order({ name: 'B', items: { pesto: 2, 'spelt:plain': 2 }, phone: '050-000-0002' }, {}, 3),
    order({ name: 'C', items: { garlic: 2 }, phone: '050-000-0003' }, {}, 4),
    order({ name: 'D', items: { garlic: 1 }, phone: '050-000-0004' }, { 'Cancelled?': true }, 5),
    order({ name: 'E', items: { plain: 1 }, phone: '050-000-0005', day: 'Tuesday' }, {}, 6),
    order({ name: 'F', items: { plain: 1 }, phone: '050-000-0006', at: il('2026-09-24', '15:00'), day: 'Friday' }, {}, 7),
  ];
  const rs = processOrders(orders, S, il('2026-09-25'));
  // F ordered Thursday afternoon for Friday -> late, waiting.

  it('adds up loaves, batches, flour and starter per baker for one date', () => {
    const p = planFor('2026-09-25', rs, S);
    expect(p.waiting).toBe(1);
    expect(p.bakers.Eliana).toMatchObject({
      white: 5, spelt: 2, batches: 4, whiteFlourBags: 3, speltFlourBags: 1, starterFlour: 440, starterWater: 440,
    });
    expect(p.bakers.Eliana.warnings).toEqual([
      '1 empty slot in a white batch: a late loaf could fill it',
      '7 loaves but 6 bannetons: plan a second round',
    ]);
    expect(p.bakers.Shayna).toMatchObject({ white: 3, spelt: 0, batches: 2, whiteFlourBags: 2 });
    expect(p.handoffs).toEqual([{ row: 2, name: 'A', from: 'Shayna', to: 'Eliana', loaves: 1 }]);
    expect(p.deliveries).toEqual([{ row: 2, name: 'A', hub: 'Eliana', address: 'Test St 1' }]);
    expect(p.pickups.map((x) => [x.name, x.hub])).toEqual([['B', 'Eliana'], ['C', 'Shayna']]);
  });

  it('writes readable rows', () => {
    const text = planRows(planFor('2026-09-25', rs, S), S).map((r) => r.join(' | '));
    expect(text).toEqual([
      'Fri 25 Sep (2026-09-25)',
      '⚠ 1 order(s) for this day are waiting for a decision (not counted below)',
      'Eliana: 7 loaves, 4 batches',
      ' | Plain sourdough | 3',
      ' | Plain sourdough (spelt) | 2',
      ' | Pesto & sundried tomato | 2',
      ' | White flour bags (1 kg) | 3',
      ' | Spelt flour bags (1 kg) | 1',
      ' | Starter: white flour (g) + water (g) | 440 + 440',
      ' | ⚠ 1 empty slot in a white batch: a late loaf could fill it',
      ' | ⚠ 7 loaves but 6 bannetons: plan a second round',
      'Shayna: 3 loaves, 2 batches',
      ' | Garlic | 3',
      ' | White flour bags (1 kg) | 2',
      ' | Starter: white flour (g) + water (g) | 220 + 220',
      ' | ⚠ 1 empty slot in a white batch: a late loaf could fill it',
      'Handoffs',
      " | Row 2 A | Shayna brings 1 loaf/loaves to Eliana's (Achi Dakar 62)",
      'Deliveries',
      ' | Row 2 A | Eliana delivers to Test St 1',
      'Pickups',
      " | Row 3 B | at Eliana's (Achi Dakar 62)",
      " | Row 4 C | at Shayna's (Hakdoshim 4)",
    ]);
  });

  it('shows a missing handoff place instead of guessing', () => {
    const r = processOrders([
      order({ items: { plain: 1, garlic: 1 }, method: 'Delivery', address: 'x' }, {}, 2),
      order({ items: { plain: 1, garlic: 1 }, phone: '050-000-0009', name: 'Z' }, {}, 3),
      order({ items: { 'spelt:plain': 1 }, phone: '050-000-0010', name: 'Y' }, {}, 4),
    ], S, NOW);
    const text = planRows(planFor('2026-09-25', r, S), S).map((x) => x.join(' | '));
    expect(text).toContain(' | Row 2 Test Customer | ⚠ Handoff place not chosen yet');
    expect(text).toContain(' | Row 2 Test Customer | ⚠ (handoff not chosen) delivers to x');
    expect(text).toContain(' | Row 3 Z | ⚠ Pickup place not chosen yet');
    expect(text).toContain(' | ⚠ Odd number of spelt loaves: check the orders');
  });

  it('a spelt-only flavor lists only the spelt line', () => {
    const r = processOrders([order({ items: { 'spelt:olive': 2 } })], S, NOW);
    const text = planRows(planFor('2026-09-25', r, S), S).map((x) => x.join(' | '));
    expect(text).toContain(' | Olive (spelt) | 2');
    expect(text).not.toContain(' | Olive | 0');
  });

  it('an empty day', () => {
    expect(planRows(planFor('2026-10-06', [], S), S)).toEqual([
      ['Tue 6 Oct (2026-10-06)'], ['Eliana: 0 loaves, 0 batches'], ['Shayna: 0 loaves, 0 batches'],
    ]);
  });
});
