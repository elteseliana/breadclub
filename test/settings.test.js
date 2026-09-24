import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, settingsToRows } from '../src/settings.js';

const { rows, flavorRows } = settingsToRows(DEFAULT_SETTINGS);

describe('Settings tab', () => {
  it('reads back exactly what it writes', () => {
    const { settings, errors } = parseSettings(rows, flavorRows);
    expect(errors).toEqual([]);
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('has the confirmed business rules', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ deliveryFee: 5, freeDeliveryFrom: 100, speltExtraPerPair: 17, cutoffHour: 14 });
    expect(DEFAULT_SETTINGS.flavors.map((f) => [f.label, f.price, f.baker])).toEqual([
      ['Plain sourdough', 35, 'Eliana'], ['Garlic', 42, 'Shayna'], ['Rosemary garlic', 44, 'Shayna'],
      ['Cinnamon', 42, 'Shayna'], ['Olive', 44, 'Eliana'], ['Chocolate chip', 44, 'Eliana'],
      ['Pesto & sundried tomato', 50, 'Eliana'],
    ]);
  });

  it('applies edits', () => {
    const edited = rows.map(([label, value]) => {
      if (label === 'Delivery fee (₪)') return [label, '7'];
      if (label === 'Bit number') return [label, ' 050-111-2222 '];
      if (label === "Shayna's address") return [label, 'New St 5'];
      if (label.startsWith('No baking')) return [label, '2026-10-06, 2026-10-09'];
      return [label, value];
    });
    const flavors = flavorRows.map((r) => (r[0] === 'Olive' ? ['olive', 46, 'Shayna'] : r));
    const { settings, errors } = parseSettings([...edited, ['Some note', 'x']], flavors);
    expect(errors).toEqual([]);
    expect(settings).toMatchObject({ deliveryFee: 7, bitNumber: '050-111-2222', skipDates: ['2026-10-06', '2026-10-09'] });
    expect(settings.addresses.Shayna).toBe('New St 5');
    expect(settings.flavors.find((f) => f.key === 'olive')).toMatchObject({ price: 46, baker: 'Shayna' });
    expect(DEFAULT_SETTINGS.deliveryFee).toBe(5);
  });

  it('keeps the old value and reports a typo instead of changing a price', () => {
    const bad = rows.map(([label, value]) => {
      if (label === 'Delivery fee (₪)') return [label, 'five'];
      if (label === 'Free delivery from (₪)') return [label, ''];
      if (label === 'Spelt extra per pair (₪)') return [label, -1];
      if (label.startsWith('No baking')) return [label, '6/10, 2026-10-09'];
      return [label, value];
    });
    const flavors = [
      flavorRows[0],
      ['Plain sourdough', 'free', 'Eliana'],
      ['Garlic', '', 'Someone'],
      ['Flavor of the season', 40, 'Eliana'],
      ['', '', ''],
    ];
    const { settings, errors } = parseSettings(bad, flavors);
    expect(settings.deliveryFee).toBe(5);
    expect(settings.freeDeliveryFrom).toBe(100);
    expect(settings.speltExtraPerPair).toBe(17);
    expect(settings.skipDates).toEqual(['2026-10-09']);
    expect(settings.flavors[0].price).toBe(35);
    expect(settings.flavors[1]).toMatchObject({ price: 42, baker: 'Shayna' });
    expect(errors).toEqual([
      'Settings: "Delivery fee (₪)" must be a number',
      'Settings: "Free delivery from (₪)" must be a number',
      'Settings: "Spelt extra per pair (₪)" must be a number',
      "Settings: can't read date(s) 6/10 (use 2026-10-06)",
      'Settings: price for Plain sourdough must be a number',
      'Settings: price for Garlic must be a number',
      'Settings: baker for Garlic must be Eliana or Shayna',
      'Settings: unknown flavor "Flavor of the season"',
    ]);
  });

  it('reads dates that Sheets stored as real dates', () => {
    const r = rows.map(([l, v]) => {
      if (l.startsWith('No baking')) return [l, new Date(Date.UTC(2026, 9, 5, 21, 0))]; // 6 Oct 00:00 in Israel
      if (l.startsWith('Track orders from')) return [l, new Date(Date.UTC(2026, 8, 23, 21, 0))];
      return [l, v];
    });
    const { settings, errors } = parseSettings(r, flavorRows);
    expect(errors).toEqual([]);
    expect(settings.skipDates).toEqual(['2026-10-06']);
    expect(settings.trackFrom).toBe('2026-09-24');
  });

  it('reports an unreadable tracking date', () => {
    const r = rows.map(([l, v]) => (l.startsWith('Track orders from') ? [l, 'last week'] : [l, v]));
    const { settings, errors } = parseSettings(r, flavorRows);
    expect(settings.trackFrom).toBe('');
    expect(errors).toEqual(['Settings: can\'t read "Track orders from (date)" (use 2026-10-06)']);
  });

  it('allows no holiday dates', () => {
    const r = rows.map(([l, v]) => (l.startsWith('No baking') ? [l, ''] : [l, v]));
    expect(parseSettings(r, flavorRows).settings.skipDates).toEqual([]);
  });
});
