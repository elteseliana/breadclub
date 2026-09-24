// Reads one row of the Orders tab (form answers + staff columns) into an order object.
// Columns are found by header text, so reordering or adding form questions doesn't break anything.

export const FORM_HEADERS = {
  timestamp: 'Timestamp',
  name: 'Full name',
  phone: 'Phone number',
  method: 'Pickup or delivery?',
  address: 'Delivery address',
  day: 'Pickup / delivery day',
  notes: 'Notes or allergies',
  payment: 'Payment',
  takenBy: 'Order taken by',
};

// Columns Eliana and Shayna fill in. Created by setup if missing.
export const STAFF_HEADERS = {
  paid: 'Paid?',
  paidTo: 'Money went to',
  handoff: 'Handoff at',
  bakerChange: 'Baked by (change)',
  adjustment: 'Adjustment ₪',
  decision: 'Late/holiday decision',
  bakeDateChange: 'Bake date (change)',
  cancelled: 'Cancelled?',
  notDuplicate: 'Not a duplicate',
};

export const PAID_TO_OPTIONS = ['Bit 054-911-2175', 'Eliana cash', 'Shayna cash', "Shayna's mom Bit", 'Other'];
export const DECISION_OPTIONS = ['Accept', 'Move to next bake day'];
export const HANDOFF_OPTIONS = ["Eliana's", "Shayna's"];

const norm = (s) => String(s ?? '').trim().toLowerCase();

export function columnIndex(headers, header) {
  return headers.findIndex((h) => norm(h) === norm(header));
}

// Flavor columns look like "Order — how many of each? [Garlic]" (white flour) or
// "Spelt — how many of each? [Garlic]" (spelt flour).
export function flavorColumns(headers) {
  const columns = [];
  headers.forEach((h, index) => {
    const match = /\[(.+)\]\s*$/.exec(String(h));
    if (!match) return;
    const spelt = norm(h).startsWith('spelt');
    if (!spelt && !norm(h).startsWith('order')) return;
    columns.push({ index, label: match[1].trim(), spelt });
  });
  return columns;
}

function readQuantity(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

function isTicked(value) {
  return value === true || norm(value) === 'true';
}

export function readOrder(headers, row, rowNumber, settings) {
  const cell = (header) => {
    const i = columnIndex(headers, header);
    return i === -1 ? '' : row[i];
  };
  const text = (header) => String(cell(header) ?? '').trim();
  const problems = [];
  const items = {};
  for (const f of settings.flavors) items[f.key] = { white: 0, spelt: 0 };
  for (const col of flavorColumns(headers)) {
    const qty = readQuantity(row[col.index]);
    const flavor = settings.flavors.find((f) => norm(f.label) === norm(col.label));
    if (Number.isNaN(qty)) {
      problems.push(`Quantity for ${col.label} isn't a whole number`);
    } else if (qty > 0 && !flavor) {
      problems.push(`${col.label} isn't on the menu (no price)`);
    } else if (flavor) {
      items[flavor.key][col.spelt ? 'spelt' : 'white'] += qty;
    }
  }
  const methodText = norm(cell(FORM_HEADERS.method));
  let method = null;
  if (methodText.startsWith('delivery')) method = 'delivery';
  else if (methodText.startsWith('pickup')) method = 'pickup';
  else problems.push('Pickup or delivery? is missing');

  const adjustmentRaw = cell(STAFF_HEADERS.adjustment);
  let adjustment = 0;
  if (adjustmentRaw !== '' && adjustmentRaw !== null && adjustmentRaw !== undefined) {
    adjustment = Number(adjustmentRaw);
    if (!Number.isFinite(adjustment)) {
      problems.push('Adjustment ₪ must be a number (e.g. -44 for a free loaf)');
      adjustment = 0;
    }
  }
  const timestamp = cell(FORM_HEADERS.timestamp);
  return {
    row: rowNumber,
    timestamp: timestamp instanceof Date ? timestamp : null,
    name: text(FORM_HEADERS.name),
    phone: text(FORM_HEADERS.phone),
    method,
    address: text(FORM_HEADERS.address),
    dayChoice: text(FORM_HEADERS.day),
    items,
    problems,
    staff: {
      paid: isTicked(cell(STAFF_HEADERS.paid)),
      paidTo: text(STAFF_HEADERS.paidTo),
      handoff: text(STAFF_HEADERS.handoff),
      bakerChange: text(STAFF_HEADERS.bakerChange),
      adjustment,
      decision: text(STAFF_HEADERS.decision),
      bakeDateChange: cell(STAFF_HEADERS.bakeDateChange),
      cancelled: isTicked(cell(STAFF_HEADERS.cancelled)),
      notDuplicate: isTicked(cell(STAFF_HEADERS.notDuplicate)),
    },
  };
}

export function isBlankRow(headers, row) {
  const name = columnIndex(headers, FORM_HEADERS.name);
  const stamp = columnIndex(headers, FORM_HEADERS.timestamp);
  const empty = (i) => i === -1 || row[i] === '' || row[i] === null || row[i] === undefined;
  return empty(name) && empty(stamp);
}
