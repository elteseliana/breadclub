import { describe, it, expect } from 'vitest';
import { processOrders, oneTypoApart } from '../src/process.js';
import { planFor, planRows, planDates } from '../src/bakeplan.js';
import { order, il, S } from './helpers.js';

const NOW = il('2026-09-24', '12:00');
const run = (orders, now = NOW, settings = S) => processOrders(orders, settings, now);
const one = (opts, staff, now) => run([order(opts, staff)], now)[0];
const lines = (plan) => planRows(plan, S).map((r) => r.join(' | '));

describe('one order', () => {
  it('a normal order: bake date, total, bakers, unpaid, message links', () => {
    const r = one({ name: 'Dana Test', phone: '050-000-0001', items: { plain: 1 }, day: 'Friday' });
    expect(r).toMatchObject({ bakeDate: '2026-09-25', counted: true, pending: false, status: 'Unpaid', attention: [], hub: 'Eliana' });
    expect(r.price.total).toBe(35);
    expect(r.whoBakes).toBe('Eliana: 1 Plain sourdough');
    expect(r.readyFormula).toContain('https://wa.me/972500000001?text=Hi%20Dana!');
    expect(r.readyFormula).toContain(encodeURIComponent('pickup at Achi Dakar 62'));
    expect(r.reminderFormula).toContain('Remind ▶');
  });

  it('a paid order: status Paid, no reminder, ready message says paid', () => {
    const r = one({}, { 'Paid?': true, 'Money went to': 'Bit' });
    expect(r.status).toBe('Paid');
    expect(r.reminderFormula).toBe('');
    expect(r.readyFormula).toContain(encodeURIComponent('paid. Thank you!'));
  });

  it('never marks paid by itself, and needs to know where the money went', () => {
    const noWhere = one({}, { 'Paid?': true });
    expect(noWhere.attention).toContain('Paid: choose "Money went to"');
    expect(noWhere).toMatchObject({ counted: true, readyFormula: '' });
    expect(one({}, { 'Money went to': 'Eliana cash' }).attention).toContain('"Money went to" is filled but Paid? isn\'t ticked');
    expect(one({}, { 'Paid?': true, 'Money went to': 'Venmo' }).attention).toContain('"Money went to" must be one of the list options');
  });

  it('flags unpaid after 2 days (not before)', () => {
    const at = il('2026-09-20', '09:00');
    expect(one({ at, day: 'Friday' }, {}, il('2026-09-22', '08:59')).status).toBe('Unpaid');
    expect(one({ at, day: 'Friday' }, {}, il('2026-09-22', '09:00')).status).toBe('Unpaid 2 days: send reminder');
  });

  it('a free (₪0) order is "Free": no reminder, no request for money', () => {
    const r = one({ items: { rosemary: 1 } }, { 'Adjustment ₪': -44 }, il('2026-09-27'));
    expect(r).toMatchObject({ status: 'Free', counted: true, reminderFormula: '' });
    expect(r.readyFormula).not.toContain('Bit');
  });

  it('a hand-typed row with no time needs a bake date', () => {
    const r = one({ at: '' });
    expect(r.unpaidDays).toBe(0);
    expect(r.attention).toContain('No order time: fill in "Bake date (change)"');
    expect(r).toMatchObject({ counted: false, pending: true, readyFormula: '' });
    expect(one({ at: '' }, { 'Bake date (change)': '2026-10-02' })).toMatchObject({ bakeDate: '2026-10-02', counted: true });
  });

  it('checks a typed bake date', () => {
    expect(one({}, { 'Bake date (change)': il('2026-10-06', '00:00') }).bakeDate).toBe('2026-10-06');
    expect(one({}, { 'Bake date (change)': 'soon' }).attention).toContain('Can\'t read "Bake date (change)": use a date like 2026-10-02');
    expect(one({}, { 'Bake date (change)': null }).bakeDate).toBe('2026-09-25');
    const saturday = one({}, { 'Bake date (change)': '2026-10-03' });
    expect(saturday).toMatchObject({ bakeDate: '2026-10-03', counted: true, status: 'Unpaid' });
    expect(saturday.attention).toEqual(["Sat 3 Oct isn't a usual bake day"]);
    const passed = one({ at: '' }, { 'Bake date (change)': '2026-09-18' });
    expect(passed).toMatchObject({ counted: false, pending: true, status: 'Needs attention' });
    expect(passed.attention).toEqual(['"Bake date (change)" Fri 18 Sep has already passed: fix the date, or tick Paid? or Cancelled?']);
    expect(one({ at: '' }, { 'Bake date (change)': '2026-09-18', 'Paid?': true, 'Money went to': 'Bit' }).status).toBe('Paid');
    const past = one({}, { 'Bake date (change)': '2026-02-10' });
    expect(past).toMatchObject({ counted: false, pending: true, status: 'Needs attention' });
    expect(past.attention).toEqual(['"Bake date (change)" Tue 10 Feb is before the order was placed']);
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

  it('a holiday date needs a decision; "Accept" keeps it with a note', () => {
    const settings = { ...S, skipDates: ['2026-09-29'] };
    const r = processOrders([order({ day: 'Tuesday' })], settings, NOW)[0];
    expect(r.attention).toEqual(['No baking on Tue 29 Sep: Accept, or Move to next bake day (Fri 2 Oct)']);
    const accepted = processOrders([order({ day: 'Tuesday' }, { 'Late/holiday decision': 'Accept' })], settings, NOW)[0];
    expect(accepted).toMatchObject({ bakeDate: '2026-09-29', counted: true, status: 'Unpaid' });
    expect(accepted.attention).toEqual(['Accepted for Tue 29 Sep, which is marked "No baking" in Settings']);
  });

  it('flags a decision that is not one of the options', () => {
    expect(one({}, { 'Late/holiday decision': 'maybe' }).attention)
      .toContain('Late/holiday decision must be "Accept" or "Move to next bake day"');
  });

  it('an unknown day has no bake date and is held', () => {
    expect(one({ day: 'Sunday' })).toMatchObject({ bakeDate: null, counted: false, pending: true });
  });

  it('mixed order: baked, but no Ready link until a handoff place is chosen (no blank address)', () => {
    const mixed = { items: { plain: 1, garlic: 1 } };
    const r = one(mixed);
    expect(r.attention).toEqual(["Two bakers: choose Handoff at (Eliana's or Shayna's)"]);
    expect(r).toMatchObject({ counted: true, readyFormula: '', reminderFormula: '' });
    const chosen = one(mixed, { 'Handoff at': "Shayna's" });
    expect(chosen).toMatchObject({ hub: 'Shayna', attention: [] });
    expect(chosen.readyFormula).toContain(encodeURIComponent('Hakdoshim 4'));
    expect(one({ items: { garlic: 1 } }).hub).toBe('Shayna');
    expect(one(mixed, { 'Handoff at': 'park' }).attention).toContain('Handoff at must be "Eliana\'s" or "Shayna\'s"');
    expect(one({ items: { plain: 1 } }, { 'Handoff at': "Shayna's" }).hub).toBe('Shayna');
  });

  it('no loaves: no baker, held', () => {
    const r = one({ items: {} });
    expect(r.hub).toBeNull();
    expect(r).toMatchObject({ counted: false, pending: true });
    expect(r.attention).toContain('No loaves ordered');
  });

  it('no WhatsApp link for a phone it cannot read', () => {
    const r = one({ phone: '05000000011' });
    expect(r.attention).toContain('Check phone number (no WhatsApp link)');
    expect(r).toMatchObject({ counted: true, readyFormula: '', reminderFormula: '' });
  });

  it('a single spelt loaf is held back: not baked, not billed, no messages', () => {
    const r = one({ items: { 'spelt:plain': 1 } }, { 'Baked by (change)': 'nobody' });
    expect(r.attention).toEqual([
      'Spelt comes in pairs: odd number of spelt loaves',
      'Can\'t read "Baked by (change)": use Eliana, Shayna, or garlic=Eliana',
    ]);
    expect(r).toMatchObject({ counted: false, pending: true, readyFormula: '', reminderFormula: '' });
  });

  it('a garbled quantity holds the whole order (so it is never baked or billed short)', () => {
    const r = one({ items: { plain: 1, garlic: '2 please' } });
    expect(r).toMatchObject({ counted: false, pending: true, readyFormula: '' });
    expect(r.attention).toContain("Quantity for Garlic isn't a whole number");
  });

  it('a missing pickup/delivery answer holds the order', () => {
    expect(one({ method: '' })).toMatchObject({ counted: false, pending: true });
  });

  it('cancelled orders are not counted, have no links and no leftover flags', () => {
    const r = one({ at: il('2026-09-28'), day: 'Tuesday' }, { 'Cancelled?': true }, il('2026-09-28'));
    expect(r).toMatchObject({ status: 'Cancelled', counted: false, pending: false, attention: [], readyFormula: '', reminderFormula: '' });
  });

  it('at switch-over, orders for bakes that already happened are left alone; upcoming ones are tracked', () => {
    const settings = { ...S, trackFrom: '2026-09-24' };
    const [old, oldLate, oldUndated, placedBefore, typed, undated] = processOrders([
      order({ at: il('2026-09-08') }, {}, 2), // baked Fri 11 Sep
      order({ at: il('2026-09-21'), day: 'Tuesday', phone: '050-000-0005' }, {}, 3), // late for 22 Sep, never decided
      order({ at: il('2026-09-10'), day: 'Someday', phone: '050-000-0006' }, {}, 4), // no bake date, placed before
      order({ at: il('2026-09-22', '09:00'), phone: '050-000-0002' }, {}, 5), // placed before switch, for Fri 25 Sep
      order({ at: '', phone: '050-000-0003', name: 'Typed In' }, { 'Bake date (change)': '2026-09-25' }, 6),
      order({ at: '', phone: '050-000-0004' }, {}, 7), // no time, no date: needs a person
    ], settings, il('2026-09-24', '12:00'));
    for (const r of [old, oldLate, oldUndated]) {
      expect(r).toMatchObject({ status: 'Before tracking', counted: false, pending: false, attention: [], reminderFormula: '' });
    }
    expect(placedBefore).toMatchObject({ status: 'Unpaid 2 days: send reminder', counted: true, bakeDate: '2026-09-25' });
    expect(typed).toMatchObject({ status: 'Unpaid', counted: true });
    expect(undated).toMatchObject({ status: 'Needs attention', pending: true });
  });
});

describe('duplicates', () => {
  const a = { name: 'Dana Test', phone: '050-000-0001', items: { plain: 2 } };

  it('the same order sent twice is flagged, not counted twice, and nothing is deleted', () => {
    const rs = run([order(a, {}, 2), order({ ...a, at: il('2026-09-23', '10:01') }, {}, 3)]);
    expect(rs).toHaveLength(2);
    expect(rs[0]).toMatchObject({ counted: true, status: 'Unpaid' });
    expect(rs[1]).toMatchObject({ counted: false, duplicateOf: 2, status: 'Possible duplicate of row 2', attention: [] });
  });

  it('matches on phone even if the name is typed differently', () => {
    const rs = run([order(a, {}, 2), order({ ...a, name: 'dana  TEST' }, {}, 3), order({ ...a, name: 'D.', phone: '+972 50-000-0001' }, {}, 4)]);
    expect(rs.map((r) => r.duplicateOf)).toEqual([null, 2, 2]);
  });

  it('matches on name when a phone is missing or looks like a typo', () => {
    expect(run([order(a, {}, 2), order({ ...a, phone: '05000000011' }, {}, 3)])[1].duplicateOf).toBe(2);
    expect(run([order(a, {}, 2), order({ ...a, phone: '050-000-0002' }, {}, 3)])[1].duplicateOf).toBe(2);
    expect(run([order(a, {}, 2), order({ ...a, phone: '' }, {}, 3)])[1].duplicateOf).toBe(2);
  });

  it('two different people with the same name are NOT duplicates', () => {
    const rs = run([order(a, {}, 2), order({ ...a, phone: '050-999-9999' }, {}, 3)]);
    expect(rs.map((r) => r.counted)).toEqual([true, true]);
    expect(rs[1].notes).toEqual([]);
  });

  it('"Not a duplicate" keeps both', () => {
    const rs = run([order(a, {}, 2), order(a, { 'Not a duplicate': true }, 3)]);
    expect(rs.map((r) => r.counted)).toEqual([true, true]);
    expect(rs[1].notes).toEqual(['Same customer also ordered in row 2']);
  });

  it('a second, different order from the same person is kept with a note', () => {
    const rs = run([order(a, {}, 2), order({ ...a, items: { garlic: 1 } }, {}, 3)]);
    expect(rs[1]).toMatchObject({ counted: true, duplicateOf: null, notes: ['Same customer also ordered in row 2'] });
    expect(rs[1].status).toBe('Unpaid');
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

  it('spots one-digit phone typos only', () => {
    expect(oneTypoApart('0500000001', '05000000011')).toBe(true); // extra digit
    expect(oneTypoApart('05000000011', '0500000001')).toBe(true);
    expect(oneTypoApart('0500000001', '0500000002')).toBe(true); // changed digit
    expect(oneTypoApart('0500000001', '0509999999')).toBe(false);
    expect(oneTypoApart('0500000001', '050000000123')).toBe(false);
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
    order({ name: 'C', items: { garlic: 2 }, phone: '050-000-0003' }, {}, 8), // duplicate of 4
  ];
  const rs = processOrders(orders, S, il('2026-09-25'));
  // F ordered Thursday afternoon for Friday -> late, waiting.

  it('adds up loaves, batches, flour and starter per baker for one date', () => {
    const p = planFor('2026-09-25', rs, S);
    expect(p.waitingRows).toEqual([7]);
    expect(p.unfinishedRows).toEqual([]);
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
    expect(lines(planFor('2026-09-25', rs, S))).toEqual([
      'Fri 25 Sep (2026-09-25)',
      '⚠ Not counted below until fixed: row 7 (see Needs attention)',
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
      " | Row 2 A | Shayna brings 1 loaf to Eliana's (Achi Dakar 62)",
      'Deliveries',
      ' | Row 2 A | Eliana delivers to Test St 1',
      'Pickups',
      " | Row 3 B | at Eliana's (Achi Dakar 62)",
      " | Row 4 C | at Shayna's (Hakdoshim 4)",
    ]);
  });

  it('shows orders that are counted but unfinished, and never guesses a handoff place', () => {
    const r = processOrders([
      order({ items: { plain: 1, garlic: 1 }, method: 'Delivery', address: 'x' }, {}, 2),
      order({ items: { plain: 1, garlic: 2 }, phone: '050-000-0009', name: 'Z' }, {}, 3),
    ], S, NOW);
    const text = lines(planFor('2026-09-25', r, S));
    expect(text).toContain('⚠ Counted, but still needs attention: row 2, 3');
    expect(text).toContain(' | Row 2 Test Customer | ⚠ Handoff place not chosen yet');
    expect(text).toContain(' | Row 3 Z | ⚠ Handoff place not chosen yet');
    expect(text).toContain(' | Row 2 Test Customer | ⚠ (handoff not chosen) delivers to x');
    expect(text).toContain(' | Row 3 Z | ⚠ Pickup place not chosen yet');
    expect(text).toContain('Eliana: 2 loaves, 1 batch');
  });

  it('a spelt-only baker has no white flour line; odd spelt totals are warned about', () => {
    const r = processOrders([order({ items: { 'spelt:olive': 2 } }, { 'Bake date (change)': '2026-09-25' })], S, NOW);
    r[0].assignment.byBaker.Eliana[0].spelt = 3; // an odd total can only come from a hand edit; still warn
    const text = lines(planFor('2026-09-25', r, S));
    expect(text).toContain(' | Olive (spelt) | 3');
    expect(text).not.toContain(' | Olive | 0');
    expect(text).not.toContain(' | White flour bags (1 kg) | 0');
    expect(text).toContain(' | ⚠ Odd number of spelt loaves: check the orders');
  });

  it('an empty day', () => {
    expect(planRows(planFor('2026-10-06', [], S), S)).toEqual([
      ['Tue 6 Oct (2026-10-06)'], ['Eliana: 0 loaves, 0 batches'], ['Shayna: 0 loaves, 0 batches'],
    ]);
  });

  it('shows every date that has orders, not just the next two bake days (no order falls off)', () => {
    const accepted = processOrders([
      order({ day: 'Tuesday' }, { 'Late/holiday decision': 'Accept' }, 2),
      order({ phone: '050-000-0002' }, { 'Bake date (change)': '2026-10-03' }, 3),
      order({ phone: '050-000-0003' }, { 'Bake date (change)': '2026-09-01' }, 4),
      order({ phone: '050-000-0004', at: il('2026-09-28'), day: 'Tuesday' }, {}, 5),
    ], { ...S, skipDates: ['2026-09-29'] }, NOW);
    expect(planDates(accepted, ['2026-09-25', '2026-10-02'], '2026-09-24'))
      .toEqual(['2026-09-25', '2026-09-29', '2026-10-02', '2026-10-03']);
  });
});
