import { describe, it, expect } from 'vitest';
import { assignBakers, describeBakers, parseBakerChange } from '../src/bakers.js';
import { whatsappNumber, firstName, readyMessage, reminderMessage, whatsappLink, linkFormula } from '../src/messages.js';
import { order, S } from './helpers.js';

describe('who bakes what', () => {
  it('uses the usual split, and all spelt goes to Eliana', () => {
    const a = assignBakers(order({ items: { plain: 1, garlic: 2, 'spelt:garlic': 2 } }), S);
    expect(a.bakers).toEqual(['Eliana', 'Shayna']);
    expect(a.byBaker.Eliana).toEqual([
      { flavor: 'plain', label: 'Plain sourdough', white: 1, spelt: 0 },
      { flavor: 'garlic', label: 'Garlic', white: 0, spelt: 2 },
    ]);
    expect(a.byBaker.Shayna).toEqual([{ flavor: 'garlic', label: 'Garlic', white: 2, spelt: 0 }]);
    expect(describeBakers(a)).toBe('Eliana: 1 Plain sourdough, 2 spelt Garlic · Shayna: 2 Garlic');
  });

  it('white and spelt of the same flavor share one line', () => {
    const a = assignBakers(order({ items: { plain: 1, 'spelt:plain': 2 } }), S);
    expect(a.byBaker.Eliana).toEqual([{ flavor: 'plain', label: 'Plain sourdough', white: 1, spelt: 2 }]);
    expect(describeBakers(a)).toBe('Eliana: 1 Plain sourdough, 2 spelt Plain sourdough');
  });

  it('can move the whole order to one baker', () => {
    const a = assignBakers(order({ items: { plain: 1, garlic: 1 } }, { 'Baked by (change)': ' shayna ' }), S);
    expect(a.bakers).toEqual(['Shayna']);
  });

  it('can move single flavors', () => {
    const a = assignBakers(order({ items: { plain: 1, garlic: 1 } }, { 'Baked by (change)': 'garlic=Eliana' }), S);
    expect(a.bakers).toEqual(['Eliana']);
    expect(parseBakerChange('Pesto=Shayna, olive = Eliana', S).perFlavor).toEqual({ pesto: 'Shayna', olive: 'Eliana' });
  });

  it('reports an unreadable change and keeps the usual split', () => {
    for (const text of ['Shayn', 'garlic', 'basil=Eliana', '=Eliana']) {
      const a = assignBakers(order({ items: { plain: 1, garlic: 1 } }, { 'Baked by (change)': text }), S);
      expect(a.error).toMatch(/Can't read "Baked by \(change\)"/);
      expect(a.bakers).toEqual(['Eliana', 'Shayna']);
    }
    const spelt = assignBakers(order({ items: { 'spelt:garlic': 2 } }, { 'Baked by (change)': '??' }), S);
    expect(spelt.bakers).toEqual(['Eliana']);
  });

  it('handles no loaves', () => {
    const a = assignBakers(order({ items: {} }), S);
    expect(a.bakers).toEqual([]);
    expect(describeBakers(a)).toBe('');
    expect(parseBakerChange(undefined, S)).toEqual({ all: null, perFlavor: {} });
  });
});

describe('WhatsApp drafts', () => {
  it('turns Israeli numbers into WhatsApp numbers', () => {
    expect(whatsappNumber('054-760-3094')).toBe('972547603094');
    expect(whatsappNumber('+972 54 760 3094')).toBe('972547603094');
    expect(whatsappNumber('05878553349')).toBeNull(); // one digit too many
    expect(whatsappNumber('614 561-5765')).toBeNull(); // not an Israeli mobile
    expect(whatsappNumber(undefined)).toBeNull();
  });

  it('uses the first name', () => {
    expect(firstName('  dana test ')).toBe('Dana');
    expect(firstName('')).toBe('there');
    expect(firstName(null)).toBe('there');
  });

  it('writes the approved ready messages', () => {
    const base = { name: 'Dana Test', total: 77, pickupAddress: 'Achi Dakar 62' };
    expect(readyMessage({ ...base, method: 'pickup', paid: false }, S)).toBe(
      'Hi Dana! Your sourdough is ready for pickup at Achi Dakar 62 🍞 Total ₪77. You can Bit 054-911-2175 (please write your name in the note) or pay cash.',
    );
    expect(readyMessage({ ...base, method: 'delivery', paid: true }, S)).toBe(
      'Hi Dana! Your sourdough is on its way 🍞 Total ₪77, paid. Thank you!',
    );
    expect(reminderMessage(base, S)).toBe(
      'Hi Dana! Just a reminder that your total is ₪77. You can Bit 054-911-2175 (please write your name in the note) or pay cash. Thank you!',
    );
  });

  it('builds a link that only opens WhatsApp with the text', () => {
    const url = whatsappLink('054-760-3094', 'Hi & "bye" ₪5');
    expect(url).toBe('https://wa.me/972547603094?text=Hi%20%26%20%22bye%22%20%E2%82%AA5');
    expect(whatsappLink('123', 'x')).toBeNull();
    expect(linkFormula(url, 'Ready ▶')).toBe(`=HYPERLINK("${url}", "Ready ▶")`);
    expect(linkFormula(url, 'x')).not.toMatch(/text=[^"]*"[^,]/);
  });
});
