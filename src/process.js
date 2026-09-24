// Works out everything about every order: bake date, total, bakers, flags, message drafts.
// Pure: same orders + settings + time always give the same answer, so it's safe to rerun any time.
//
// Two kinds of flags:
//  - blocking: the order isn't counted on the Bake Plan and gets no message links until someone fixes it
//    (late/holiday decision missing, unreadable quantities, odd spelt, no bake date, ...).
//  - warnings: the order is baked, but gets no message links until fixed (no handoff place, paid
//    without "Money went to", bad phone, ...), so a customer never gets a wrong or half-empty message.
import { priceOrder } from './pricing.js';
import { assignBakers, describeBakers } from './bakers.js';
import { scheduleOrder, toIsoDate, formatDate, isBakeWeekday, localParts } from './schedule.js';
import { readyMessage, reminderMessage, whatsappLink, linkFormula } from './messages.js';
import { DECISION_OPTIONS, PAID_TO_OPTIONS } from './order.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function resolveBakeDate(order, settings, flags) {
  if (order.staff.bakeDateChange !== '' && order.staff.bakeDateChange !== null) {
    const iso = toIsoDate(order.staff.bakeDateChange, settings.timeZone);
    if (!iso) {
      flags.blocking.push(`Can't read "Bake date (change)": use a date like 2026-10-02`);
      return null;
    }
    if (order.timestamp && iso < localParts(order.timestamp, settings.timeZone).iso) {
      flags.blocking.push(`"Bake date (change)" ${formatDate(iso)} is before the order was placed`);
    } else if (!isBakeWeekday(iso, settings)) {
      flags.notes.push(`${formatDate(iso)} isn't a usual bake day`);
    }
    return iso;
  }
  const s = scheduleOrder(order.timestamp, order.dayChoice, settings);
  if (s.error) {
    flags.blocking.push(s.error);
    return null;
  }
  const decision = order.staff.decision;
  if (decision && !DECISION_OPTIONS.includes(decision)) {
    flags.warnings.push(`Late/holiday decision must be "${DECISION_OPTIONS.join('" or "')}"`);
  }
  if (!s.late && !s.skipped) return s.bakeDate;
  if (decision === 'Accept') {
    if (s.skipped) flags.notes.push(`Accepted for ${formatDate(s.bakeDate)}, which is marked "No baking" in Settings`);
    return s.bakeDate;
  }
  if (decision === 'Move to next bake day') return s.nextOpen;
  flags.blocking.push(s.skipped
    ? `No baking on ${formatDate(s.bakeDate)}: Accept, or Move to next bake day (${formatDate(s.nextOpen)})`
    : `Late order for ${formatDate(s.bakeDate)}: Accept, or Move to next bake day (${formatDate(s.nextOpen)})`);
  return s.bakeDate;
}

function resolveHub(assignment, handoff, flags) {
  const h = handoff.toLowerCase();
  const chosen = h.startsWith('eliana') ? 'Eliana' : h.startsWith('shayna') ? 'Shayna' : null;
  if (handoff && !chosen) flags.warnings.push(`Handoff at must be "Eliana's" or "Shayna's"`);
  if (assignment.bakers.length === 2) {
    if (!chosen) flags.warnings.push("Two bakers: choose Handoff at (Eliana's or Shayna's)");
    return chosen;
  }
  return chosen ?? assignment.bakers[0] ?? null;
}

export function processOrder(order, settings, now) {
  const flags = { blocking: [...order.problems], warnings: [], notes: [] };
  const price = priceOrder(order, settings);
  flags.blocking.push(...price.problems);
  flags.warnings.push(...price.warnings);
  const assignment = assignBakers(order, settings);
  if (assignment.error) flags.blocking.push(assignment.error);
  const bakeDate = resolveBakeDate(order, settings, flags);
  const hub = resolveHub(assignment, order.staff.handoff, flags);

  const { paid, paidTo } = order.staff;
  if (paid && !paidTo) flags.warnings.push('Paid: choose "Money went to"');
  if (!paid && paidTo) flags.warnings.push('"Money went to" is filled but Paid? isn\'t ticked');
  if (paidTo && !PAID_TO_OPTIONS.includes(paidTo)) flags.warnings.push('"Money went to" must be one of the list options');
  const unpaidDays = !paid && order.timestamp ? Math.floor((now - order.timestamp) / DAY_MS) : 0;

  const draft = { name: order.name, method: order.method, pickupAddress: hub ? settings.addresses[hub] : '', total: price.total, paid };
  const readyUrl = whatsappLink(order.phone, readyMessage(draft, settings));
  if (!readyUrl) flags.warnings.push('Check phone number (no WhatsApp link)');

  return {
    row: order.row,
    order,
    bakeDate,
    price,
    assignment,
    hub,
    blocking: flags.blocking,
    warnings: flags.warnings,
    notes: flags.notes,
    unpaidDays,
    whoBakes: describeBakers(assignment),
    readyUrl,
    reminderUrl: readyUrl && whatsappLink(order.phone, reminderMessage(draft, settings)),
  };
}

function phoneDigits(order) {
  const digits = order.phone.replace(/\D/g, '').replace(/^9720?(?=5)/, '0');
  return digits.length >= 9 ? digits : '';
}

// True when two phone numbers differ by one typed digit (one extra, missing, or changed).
export function oneTypoApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  const rest = (x, skip) => x.slice(i + skip);
  return rest(a, 1) === rest(b, 1) || rest(a, 1) === rest(b, 0) || rest(a, 0) === rest(b, 1);
}

// Same customer: same phone; or same name when a phone is missing or looks like a typo.
// Two different people who share a name but have different phones are NOT the same customer.
function sameCustomer(x, y) {
  const [px, py] = [phoneDigits(x), phoneDigits(y)];
  const nameMatch = x.name !== '' && x.name.toLowerCase().replace(/\s+/g, ' ') === y.name.toLowerCase().replace(/\s+/g, ' ');
  if (px && py) return px === py || (nameMatch && oneTypoApart(px, py));
  return nameMatch;
}

function markDuplicates(results) {
  const keptByDate = new Map();
  for (const r of results) {
    r.duplicateOf = null;
    if (r.order.staff.cancelled || r.beforeTracking || !r.bakeDate) continue;
    const kept = keptByDate.get(r.bakeDate) ?? [];
    keptByDate.set(r.bakeDate, kept);
    const same = kept.filter((k) => sameCustomer(k.order, r.order));
    const key = JSON.stringify([r.order.items, r.order.method]);
    const twin = same.find((k) => JSON.stringify([k.order.items, k.order.method]) === key);
    if (twin && !r.order.staff.notDuplicate) {
      r.duplicateOf = twin.row;
      continue;
    }
    for (const k of same) r.notes.push(`Same customer also ordered in row ${k.row}`);
    kept.push(r);
  }
}

function statusOf(r, settings) {
  if (r.order.staff.cancelled) return 'Cancelled';
  if (r.beforeTracking) return 'Before tracking';
  if (r.duplicateOf) return `Possible duplicate of row ${r.duplicateOf}`;
  if (r.blocking.length || r.warnings.length) return 'Needs attention';
  if (r.order.staff.paid) return 'Paid';
  if (r.price.total <= 0) return 'Free';
  if (r.unpaidDays >= settings.unpaidReminderDays) return `Unpaid ${r.unpaidDays} days: send reminder`;
  return 'Unpaid';
}

export function processOrders(orders, settings, now) {
  const results = orders.map((o) => {
    const r = processOrder(o, settings, now);
    r.beforeTracking = Boolean(settings.trackFrom && o.timestamp
      && localParts(o.timestamp, settings.timeZone).iso < settings.trackFrom);
    return r;
  });
  markDuplicates(results);
  for (const r of results) {
    r.status = statusOf(r, settings);
    const skip = r.order.staff.cancelled || r.beforeTracking || r.duplicateOf;
    r.pending = !skip && r.blocking.length > 0; // a missing bake date is always a blocking flag
    r.counted = !skip && !r.pending;
    r.attention = skip ? [] : [...r.blocking, ...r.warnings, ...r.notes];
    const linksOk = r.counted && r.warnings.length === 0;
    r.readyFormula = linksOk ? linkFormula(r.readyUrl, 'Ready ▶') : '';
    r.reminderFormula = linksOk && !r.order.staff.paid && r.price.total > 0 ? linkFormula(r.reminderUrl, 'Remind ▶') : '';
  }
  return results;
}
