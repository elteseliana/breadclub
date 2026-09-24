// Works out everything about every order: bake date, total, bakers, flags, message drafts.
// Pure: same orders + settings + time always give the same answer, so it's safe to rerun any time.
import { priceOrder } from './pricing.js';
import { assignBakers, describeBakers } from './bakers.js';
import { scheduleOrder, toIsoDate, formatDate } from './schedule.js';
import { readyMessage, reminderMessage, whatsappLink, linkFormula } from './messages.js';
import { DECISION_OPTIONS, PAID_TO_OPTIONS } from './order.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function resolveBakeDate(order, settings, attention) {
  if (order.staff.bakeDateChange !== '' && order.staff.bakeDateChange !== null) {
    const iso = toIsoDate(order.staff.bakeDateChange, settings.timeZone);
    if (iso) return { bakeDate: iso, pending: false };
    attention.push(`Can't read "Bake date (change)": use a date like 2026-10-02`);
    return { bakeDate: null, pending: true };
  }
  const s = scheduleOrder(order.timestamp, order.dayChoice, settings);
  if (s.error) {
    attention.push(s.error);
    return { bakeDate: null, pending: true };
  }
  const decision = order.staff.decision;
  if (decision && !DECISION_OPTIONS.includes(decision)) {
    attention.push(`Late/holiday decision must be "${DECISION_OPTIONS.join('" or "')}"`);
  }
  if (!s.late && !s.skipped) return { bakeDate: s.bakeDate, pending: false };
  if (decision === 'Accept') return { bakeDate: s.bakeDate, pending: false };
  if (decision === 'Move to next bake day') return { bakeDate: s.nextOpen, pending: false };
  attention.push(s.skipped
    ? `No baking on ${formatDate(s.bakeDate)}: Accept, or Move to next bake day (${formatDate(s.nextOpen)})`
    : `Late order for ${formatDate(s.bakeDate)}: Accept, or Move to next bake day (${formatDate(s.nextOpen)})`);
  return { bakeDate: s.bakeDate, pending: true };
}

function resolveHub(assignment, handoff, attention) {
  const h = handoff.toLowerCase();
  const chosen = h.startsWith('eliana') ? 'Eliana' : h.startsWith('shayna') ? 'Shayna' : null;
  if (handoff && !chosen) attention.push(`Handoff at must be "Eliana's" or "Shayna's"`);
  if (assignment.bakers.length === 2) {
    if (!chosen) attention.push("Two bakers: choose Handoff at (Eliana's or Shayna's)");
    return chosen;
  }
  return chosen ?? assignment.bakers[0] ?? null;
}

function identity(order) {
  const digits = order.phone.replace(/\D/g, '').replace(/^972/, '0');
  return { phone: digits.length >= 9 ? digits : '', name: order.name.toLowerCase().replace(/\s+/g, ' ') };
}

function itemsKey(order) {
  return JSON.stringify([order.items, order.method]);
}

export function processOrder(order, settings, now) {
  const attention = [...order.problems];
  const notes = [];
  const price = priceOrder(order, settings);
  attention.push(...price.problems);
  const assignment = assignBakers(order, settings);
  if (assignment.error) attention.push(assignment.error);
  const { bakeDate, pending } = resolveBakeDate(order, settings, attention);
  const hub = resolveHub(assignment, order.staff.handoff, attention);

  const { paid, paidTo } = order.staff;
  if (paid && !paidTo) attention.push('Paid: choose "Money went to"');
  if (!paid && paidTo) attention.push('"Money went to" is filled but Paid? isn\'t ticked');
  if (paidTo && !PAID_TO_OPTIONS.includes(paidTo)) attention.push('"Money went to" must be one of the list options');
  let unpaidDays = 0;
  if (!paid && order.timestamp) unpaidDays = Math.floor((now - order.timestamp) / DAY_MS);

  const draft = { name: order.name, method: order.method, pickupAddress: hub ? settings.addresses[hub] : '', total: price.total, paid };
  const readyUrl = whatsappLink(order.phone, readyMessage(draft, settings));
  const reminderUrl = whatsappLink(order.phone, reminderMessage(draft, settings));
  if (!readyUrl) attention.push('Check phone number (no WhatsApp link)');

  return {
    row: order.row,
    order,
    bakeDate,
    pending,
    price,
    assignment,
    hub,
    attention,
    notes,
    unpaidDays,
    whoBakes: describeBakers(assignment),
    readyFormula: readyUrl ? linkFormula(readyUrl, 'Ready ▶') : '',
    reminderFormula: readyUrl && !paid ? linkFormula(reminderUrl, 'Remind ▶') : '',
  };
}

function markDuplicates(results) {
  const kept = [];
  for (const r of results) {
    r.duplicateOf = null;
    if (r.order.staff.cancelled || !r.bakeDate) continue;
    const me = identity(r.order);
    const sameCustomer = kept.filter((k) => k.bakeDate === r.bakeDate && (
      (me.phone && identity(k.order).phone === me.phone) || (me.name && identity(k.order).name === me.name)));
    const twin = sameCustomer.find((k) => itemsKey(k.order) === itemsKey(r.order));
    if (twin && !r.order.staff.notDuplicate) {
      r.duplicateOf = twin.row;
      continue;
    }
    for (const k of sameCustomer) r.notes.push(`Same customer also ordered in row ${k.row}`);
    kept.push(r);
  }
}

function statusOf(r, settings) {
  if (r.order.staff.cancelled) return 'Cancelled';
  if (r.duplicateOf) return `Possible duplicate of row ${r.duplicateOf}`;
  if (r.attention.length) return 'Needs attention';
  if (r.order.staff.paid) return 'Paid';
  if (r.unpaidDays >= settings.unpaidReminderDays) return `Unpaid ${r.unpaidDays} days: send reminder`;
  return 'Unpaid';
}

export function processOrders(orders, settings, now) {
  const results = orders.map((o) => processOrder(o, settings, now));
  markDuplicates(results);
  for (const r of results) {
    r.status = statusOf(r, settings);
    r.counted = !r.order.staff.cancelled && !r.duplicateOf && !r.pending && Boolean(r.bakeDate);
    if (!r.counted) {
      r.readyFormula = '';
      r.reminderFormula = '';
    }
  }
  return results;
}
