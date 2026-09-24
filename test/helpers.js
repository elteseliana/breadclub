// Test helpers. All customers here are made up.
import { DEFAULT_SETTINGS } from '../src/settings.js';
import { readOrder } from '../src/order.js';

// Israel local time -> Date. Israel is UTC+3 until 25 Oct 2026, then UTC+2.
export function il(iso, hhmm = '10:00') {
  const [h, m] = hhmm.split(':').map(Number);
  const offset = iso < '2026-10-25' ? 3 : 2;
  const [y, mo, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - offset, m));
}

export const S = DEFAULT_SETTINGS;

export const HEADERS = [
  'Timestamp', 'Full name', 'Phone number',
  'Order — how many of each? [Plain sourdough]',
  'Order — how many of each? [Garlic]',
  'Order — how many of each? [Rosemary garlic]',
  'Order — how many of each? [Cinnamon]',
  'Order — how many of each? [Olive]',
  'Order — how many of each? [Chocolate chip]',
  'Order — how many of each? [Pesto & sundried tomato]',
  'Spelt — how many of each? [Plain sourdough]',
  'Spelt — how many of each? [Garlic]',
  'Spelt — how many of each? [Olive]',
  'Spelt — how many of each? [Pesto & sundried tomato]',
  'Pickup or delivery?', 'Delivery address', 'Pickup / delivery day', 'Notes or allergies', 'Payment',
];

const FLAVOR_COLUMN = {
  plain: 3, garlic: 4, rosemary: 5, cinnamon: 6, olive: 7, chocchip: 8, pesto: 9,
  'spelt:plain': 10, 'spelt:garlic': 11, 'spelt:olive': 12, 'spelt:pesto': 13,
};

// Builds a form row. `items` like { plain: 2, 'spelt:garlic': 1 }.
export function formRow({ at = il('2026-09-23'), name = 'Test Customer', phone = '050-000-0001', items = { plain: 1 },
  method = 'Pickup', address = '', day = 'Friday', notes = '', payment = 'Bit' } = {}) {
  const row = new Array(HEADERS.length).fill('');
  row[0] = at;
  row[1] = name;
  row[2] = phone;
  for (const [key, qty] of Object.entries(items)) row[FLAVOR_COLUMN[key]] = qty;
  row[14] = method === 'Delivery' ? 'Delivery (+5₪, free over 100₪)' : method;
  row[15] = address;
  row[16] = day;
  row[17] = notes;
  row[18] = payment;
  return row;
}

// An order object straight from a form row, with optional staff column values.
export function order(opts = {}, staff = {}, rowNumber = 2) {
  const headers = [...HEADERS, ...Object.keys(staff)];
  const row = [...formRow(opts), ...Object.values(staff)];
  return readOrder(headers, row, rowNumber, S);
}
