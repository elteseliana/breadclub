import { describe, it, expect } from 'vitest';
import { priceOrder } from '../src/pricing.js';
import { order, S } from './helpers.js';

const total = (opts, staff) => priceOrder(order(opts, staff), S);

describe('order totals (examples approved by Eliana)', () => {
  it('1 plain, pickup = ₪35', () => {
    expect(total({ items: { plain: 1 } }).total).toBe(35);
  });

  it('2 garlic, delivery = ₪84 + ₪5 = ₪89', () => {
    const p = total({ items: { garlic: 2 }, method: 'Delivery', address: 'Test St 1' });
    expect(p).toMatchObject({ subtotal: 84, deliveryFee: 5, total: 89, problems: [] });
  });

  it('2 plain, delivery = ₪75 (the old Sheet wrongly said 80)', () => {
    expect(total({ items: { plain: 2 }, method: 'Delivery', address: 'x' }).total).toBe(75);
  });

  it('pesto + pesto, delivery = ₪100 with free delivery (100 or more)', () => {
    const p = total({ items: { pesto: 2 }, method: 'Delivery', address: 'x' });
    expect(p).toMatchObject({ deliveryFee: 0, total: 100 });
  });

  it('₪99 still pays delivery', () => {
    // spelt pair plain + garlic: 35 + 42 + 17 = 94, + 5 = 99
    const p = total({ items: { 'spelt:plain': 1, 'spelt:garlic': 1 }, method: 'Delivery', address: 'x' });
    expect(p).toMatchObject({ speltExtra: 17, subtotal: 94, deliveryFee: 5, total: 99 });
  });

  it('spelt extra counts toward free delivery: pesto + olive spelt = ₪111, delivery free', () => {
    const p = total({ items: { 'spelt:pesto': 1, 'spelt:olive': 1 }, method: 'Delivery', address: 'x' });
    expect(p).toMatchObject({ speltExtra: 17, deliveryFee: 0, total: 111 });
  });

  it('₪17 per pair of spelt, not per loaf', () => {
    expect(total({ items: { 'spelt:plain': 4 } })).toMatchObject({ speltExtra: 34, total: 174 });
  });

  it('a promised free loaf is ₪0 and has no problems', () => {
    const p = total({ items: { rosemary: 1 } }, { 'Adjustment ₪': -44 });
    expect(p).toMatchObject({ total: 0, problems: [] });
  });

  it('a gift with no loaves on the form is fine when there is an adjustment', () => {
    expect(total({ items: {} }, { 'Adjustment ₪': 10 }).problems).toEqual([]);
  });

  it('rejects one spelt loaf', () => {
    expect(total({ items: { 'spelt:plain': 1 } }).problems).toContain('Spelt comes in pairs: odd number of spelt loaves');
  });

  it('flags an order with no loaves', () => {
    expect(total({ items: {} }).problems).toContain('No loaves ordered');
  });

  it('flags delivery with no address', () => {
    expect(total({ method: 'Delivery' }).problems).toContain('Delivery with no address');
  });

  it('flags a negative total', () => {
    expect(total({ items: { plain: 1 } }, { 'Adjustment ₪': -50 }).problems).toContain('Total is below ₪0: check Adjustment ₪');
  });

  it('pickup never pays delivery', () => {
    expect(total({ items: { plain: 1 } }).deliveryFee).toBe(0);
  });

  it('uses prices from Settings', () => {
    const cheap = { ...S, flavors: S.flavors.map((f) => ({ ...f, price: 10 })), deliveryFee: 7 };
    expect(priceOrder(order({ items: { plain: 1 }, method: 'Delivery', address: 'x' }), cheap).total).toBe(17);
  });
});
