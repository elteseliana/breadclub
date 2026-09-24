import { describe, it, expect } from 'vitest';
import { readOrder, isBlankRow, flavorColumns, columnIndex } from '../src/order.js';
import { HEADERS, formRow, order, S, il } from './helpers.js';

describe('reading a form row', () => {
  it('reads the answers', () => {
    const o = order({ name: 'Dana Test', items: { plain: 2, garlic: '1', 'spelt:olive': 2 }, method: 'Delivery', address: 'Test St 3', day: 'Tuesday' });
    expect(o).toMatchObject({ name: 'Dana Test', method: 'delivery', address: 'Test St 3', dayChoice: 'Tuesday', problems: [] });
    expect(o.items.plain).toEqual({ white: 2, spelt: 0 });
    expect(o.items.garlic).toEqual({ white: 1, spelt: 0 });
    expect(o.items.olive).toEqual({ white: 0, spelt: 2 });
    expect(o.timestamp).toBeInstanceOf(Date);
  });

  it('reads staff columns', () => {
    const o = order({}, {
      'Paid?': 'TRUE', 'Money went to': 'Eliana cash', 'Handoff at': "Shayna's", 'Baked by (change)': 'Shayna',
      'Adjustment ₪': '-44', 'Late/holiday decision': 'Accept', 'Bake date (change)': '2026-10-02',
      'Cancelled?': false, 'Not a duplicate': true, 'Order taken by': 'Shayna',
    });
    expect(o.staff).toEqual({
      paid: true, paidTo: 'Eliana cash', handoff: "Shayna's", bakerChange: 'Shayna', adjustment: -44,
      decision: 'Accept', bakeDateChange: '2026-10-02', cancelled: false, notDuplicate: true, takenBy: 'Shayna',
    });
  });

  it('only a ticked box (or the text TRUE) counts as paid', () => {
    for (const value of ['no', 'FALSE', 'yes', 1, 'paid', '', false]) {
      expect(order({}, { 'Paid?': value }).staff.paid).toBe(false);
    }
    expect(order({}, { 'Paid?': true }).staff.paid).toBe(true);
    expect(order({}, { 'Paid?': ' true ' }).staff.paid).toBe(true);
  });

  it('works when staff columns are missing', () => {
    expect(order().staff).toMatchObject({ paid: false, paidTo: '', adjustment: 0, cancelled: false });
  });

  it('flags a flavor that is no longer on the menu only when it was ordered', () => {
    const headers = [...HEADERS, 'Order — how many of each? [Flavor of the season (ask us — price varies)]'];
    const zero = readOrder(headers, [...formRow(), 0], 2, S);
    expect(zero.problems).toEqual([]);
    const one = readOrder(headers, [...formRow(), 1], 2, S);
    expect(one.problems).toEqual(["Flavor of the season (ask us — price varies) isn't on the menu (no price)"]);
  });

  it('flags quantities that are not whole numbers', () => {
    expect(order({ items: { plain: 'two', garlic: -1, olive: 1.5 } }).problems).toEqual([
      "Quantity for Plain sourdough isn't a whole number",
      "Quantity for Garlic isn't a whole number",
      "Quantity for Olive isn't a whole number",
    ]);
  });

  it('flags a missing pickup/delivery answer and a bad adjustment', () => {
    const o = order({ method: '' }, { 'Adjustment ₪': 'free' });
    expect(o.problems).toEqual(['Pickup or delivery? is missing', 'Adjustment ₪ must be a number (e.g. -44 for a free loaf)']);
    expect(o.staff.adjustment).toBe(0);
  });

  it('treats a missing cell as empty', () => {
    const row = formRow();
    row[3] = undefined;
    row[1] = null;
    const o = readOrder(HEADERS, row, 2, S);
    expect(o.items.plain.white).toBe(0);
    expect(o.name).toBe('');
  });

  it('keeps a text timestamp as "no time" (hand-typed rows)', () => {
    expect(order({ at: '' }).timestamp).toBeNull();
  });

  it('only counts [bracket] columns that start with Order or Spelt', () => {
    expect(flavorColumns(['Notes [internal]', 'Order [Garlic]', 'Spelt — [Olive]', 'Timestamp']))
      .toEqual([{ index: 1, label: 'Garlic', spelt: false }, { index: 2, label: 'Olive', spelt: true }]);
  });

  it('ignores empty header cells', () => {
    expect(columnIndex(['Timestamp', null, 'Full name'], 'full name')).toBe(2);
  });

  it('spots blank rows', () => {
    expect(isBlankRow(HEADERS, new Array(HEADERS.length).fill(''))).toBe(true);
    expect(isBlankRow(HEADERS, formRow({ at: '' }))).toBe(false);
    expect(isBlankRow(HEADERS, formRow({ name: '', at: il('2026-09-24') }))).toBe(false);
    expect(isBlankRow(['Something'], ['x'])).toBe(true);
    expect(isBlankRow(HEADERS, [null, undefined])).toBe(true);
  });
});
