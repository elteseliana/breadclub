import { toIsoDate } from './schedule.js';

// Business rules confirmed by Eliana (see docs/interview-notes.md).
// The Settings tab in the Sheet overrides these; nothing changes them automatically.

export const BAKERS = ['Eliana', 'Shayna'];

export const DEFAULT_SETTINGS = Object.freeze({
  timeZone: 'Asia/Jerusalem',
  deliveryFee: 5,
  freeDeliveryFrom: 100,
  speltExtraPerPair: 17,
  speltBaker: 'Eliana',
  cutoffHour: 14,
  unpaidReminderDays: 2,
  bitNumber: '054-911-2175',
  bannetonsPerBaker: 6,
  starterFlourPerBatch: 110,
  starterWaterPerBatch: 110,
  addresses: { Eliana: 'Achi Dakar 62', Shayna: 'Hakdoshim 4' },
  // weekday: 0 = Sunday ... 6 = Saturday
  bakeDays: [
    { name: 'Tuesday', weekday: 2, cutoffWeekday: 0 },
    { name: 'Friday', weekday: 5, cutoffWeekday: 3 },
  ],
  skipDates: [],
  // Orders baked before this date are left alone (no status, no reminders, not counted).
  trackFrom: '',
  flavors: [
    { key: 'plain', label: 'Plain sourdough', price: 35, baker: 'Eliana' },
    { key: 'garlic', label: 'Garlic', price: 42, baker: 'Shayna' },
    { key: 'rosemary', label: 'Rosemary garlic', price: 44, baker: 'Shayna' },
    { key: 'cinnamon', label: 'Cinnamon', price: 42, baker: 'Shayna' },
    { key: 'olive', label: 'Olive', price: 44, baker: 'Eliana' },
    { key: 'chocchip', label: 'Chocolate chip', price: 44, baker: 'Eliana' },
    { key: 'pesto', label: 'Pesto & sundried tomato', price: 50, baker: 'Eliana' },
  ],
});

// Rows written to a new Settings tab. Column A: setting, column B: value.
export const SETTING_ROWS = [
  ['Delivery fee (₪)', 'deliveryFee'],
  ['Free delivery from (₪)', 'freeDeliveryFrom'],
  ['Spelt extra per pair (₪)', 'speltExtraPerPair'],
  ['Orders close at (hour, 24h)', 'cutoffHour'],
  ['Unpaid reminder after (days)', 'unpaidReminderDays'],
  ['Bit number', 'bitNumber'],
  ['Bannetons per baker', 'bannetonsPerBaker'],
  ["Eliana's address", 'address:Eliana'],
  ["Shayna's address", 'address:Shayna'],
  ['No baking on (dates like 2026-10-06, comma separated)', 'skipDates'],
  ['Track orders baked from (date)', 'trackFrom'],
];

const NUMBER_KEYS = new Set([
  'deliveryFee', 'freeDeliveryFrom', 'speltExtraPerPair', 'cutoffHour',
  'unpaidReminderDays', 'bannetonsPerBaker',
]);

export function settingsToRows(settings) {
  const rows = SETTING_ROWS.map(([label, key]) => {
    if (key.startsWith('address:')) return [label, settings.addresses[key.slice(8)]];
    if (key === 'skipDates') return [label, settings.skipDates.join(', ')];
    return [label, settings[key]];
  });
  const flavorRows = [['Flavor', 'Price (₪)', 'Usual baker']].concat(
    settings.flavors.map((f) => [f.label, f.price, f.baker]),
  );
  return { rows, flavorRows };
}

// Parses the Settings tab. Returns { settings, errors }. Any unreadable value keeps the default
// and is reported, so a typo never silently changes a price.
export function parseSettings(rows, flavorRows, base = DEFAULT_SETTINGS) {
  const settings = {
    ...base,
    addresses: { ...base.addresses },
    skipDates: [...base.skipDates],
    flavors: base.flavors.map((f) => ({ ...f })),
  };
  const errors = [];
  const byLabel = new Map(SETTING_ROWS);
  for (const [label, value] of rows) {
    const key = byLabel.get(String(label).trim());
    if (!key) continue;
    if (key.startsWith('address:')) {
      settings.addresses[key.slice(8)] = String(value).trim();
    } else if (key === 'skipDates') {
      const parts = value instanceof Date ? [value] : String(value).split(',').map((d) => d.trim()).filter(Boolean);
      const dates = parts.map((d) => [d, toIsoDate(d, settings.timeZone)]);
      const bad = dates.filter(([, iso]) => !iso).map(([d]) => d);
      if (bad.length) errors.push(`Settings: can't read date(s) ${bad.join(', ')} (use 2026-10-06)`);
      settings.skipDates = dates.map(([, iso]) => iso).filter(Boolean);
    } else if (key === 'trackFrom') {
      const iso = toIsoDate(value, settings.timeZone);
      if (value !== '' && !iso) errors.push(`Settings: can't read "${label}" (use 2026-10-06)`);
      settings.trackFrom = iso ?? '';
    } else if (NUMBER_KEYS.has(key)) {
      const n = Number(value);
      if (value === '' || !Number.isFinite(n) || n < 0) {
        errors.push(`Settings: "${label}" must be a number`);
      } else {
        settings[key] = n;
      }
    } else {
      settings[key] = String(value).trim();
    }
  }
  for (const [label, price, baker] of flavorRows.slice(1)) {
    const flavor = settings.flavors.find((f) => f.label.toLowerCase() === String(label).trim().toLowerCase());
    if (!flavor) {
      if (String(label).trim()) errors.push(`Settings: unknown flavor "${label}"`);
      continue;
    }
    const n = Number(price);
    if (price === '' || !Number.isFinite(n) || n < 0) errors.push(`Settings: price for ${flavor.label} must be a number`);
    else flavor.price = n;
    if (BAKERS.includes(String(baker).trim())) flavor.baker = String(baker).trim();
    else errors.push(`Settings: baker for ${flavor.label} must be Eliana or Shayna`);
  }
  return { settings, errors };
}
