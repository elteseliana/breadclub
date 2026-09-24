// What each baker needs for one bake date: loaves, batches, flour, starter, handoffs, deliveries.
// A batch is 2 loaves from one 1 kg bag; the two loaves can be different flavors. Spelt batches are separate.
import { BAKERS } from './settings.js';
import { formatDate } from './schedule.js';

export function planFor(bakeDate, results, settings) {
  const orders = results.filter((r) => r.counted && r.bakeDate === bakeDate);
  const waiting = results.filter((r) => r.bakeDate === bakeDate && !r.counted && !r.order.staff.cancelled);
  const bakers = {};
  for (const name of BAKERS) {
    const lines = {};
    for (const r of orders) {
      for (const l of r.assignment.byBaker[name]) {
        lines[l.flavor] ??= { label: l.label, white: 0, spelt: 0 };
        lines[l.flavor].white += l.white;
        lines[l.flavor].spelt += l.spelt;
      }
    }
    const list = Object.values(lines);
    const white = list.reduce((n, l) => n + l.white, 0);
    const spelt = list.reduce((n, l) => n + l.spelt, 0);
    const whiteBatches = Math.ceil(white / 2);
    const speltBatches = Math.ceil(spelt / 2);
    const batches = whiteBatches + speltBatches;
    const warnings = [];
    if (white % 2 === 1) warnings.push('1 empty slot in a white batch: a late loaf could fill it');
    if (spelt % 2 === 1) warnings.push('Odd number of spelt loaves: check the orders');
    if (white + spelt > settings.bannetonsPerBaker) {
      warnings.push(`${white + spelt} loaves but ${settings.bannetonsPerBaker} bannetons: plan a second round`);
    }
    bakers[name] = {
      lines: list, white, spelt, batches,
      whiteFlourBags: whiteBatches,
      speltFlourBags: speltBatches,
      starterFlour: batches * settings.starterFlourPerBatch,
      starterWater: batches * settings.starterWaterPerBatch,
      warnings,
    };
  }
  const handoffs = orders.filter((r) => r.assignment.bakers.length === 2).map((r) => {
    const from = r.assignment.bakers.find((b) => b !== r.hub);
    const loaves = r.assignment.byBaker[from].reduce((n, l) => n + l.white + l.spelt, 0);
    return { row: r.row, name: r.order.name, from, to: r.hub, loaves };
  });
  const stops = (method) => orders.filter((r) => r.order.method === method)
    .map((r) => ({ row: r.row, name: r.order.name, hub: r.hub, address: r.order.address }));
  return { bakeDate, bakers, handoffs, deliveries: stops('delivery'), pickups: stops('pickup'), waiting: waiting.length };
}

export function planRows(plan, settings) {
  const rows = [[`${formatDate(plan.bakeDate)} (${plan.bakeDate})`]];
  if (plan.waiting) rows.push([`⚠ ${plan.waiting} order(s) for this day are waiting for a decision (not counted below)`]);
  for (const name of BAKERS) {
    const b = plan.bakers[name];
    rows.push([`${name}: ${b.white + b.spelt} loaves, ${b.batches} batches`]);
    for (const l of b.lines) {
      if (l.white) rows.push(['', l.label, l.white]);
      if (l.spelt) rows.push(['', `${l.label} (spelt)`, l.spelt]);
    }
    if (b.batches) {
      rows.push(['', 'White flour bags (1 kg)', b.whiteFlourBags]);
      if (b.speltFlourBags) rows.push(['', 'Spelt flour bags (1 kg)', b.speltFlourBags]);
      rows.push(['', 'Starter: white flour (g) + water (g)', `${b.starterFlour} + ${b.starterWater}`]);
    }
    for (const w of b.warnings) rows.push(['', `⚠ ${w}`]);
  }
  if (plan.handoffs.length) rows.push(['Handoffs']);
  for (const h of plan.handoffs) {
    rows.push(['', `Row ${h.row} ${h.name}`, h.to
      ? `${h.from} brings ${h.loaves} loaf/loaves to ${h.to}'s (${settings.addresses[h.to]})`
      : '⚠ Handoff place not chosen yet']);
  }
  if (plan.deliveries.length) rows.push(['Deliveries']);
  for (const d of plan.deliveries) {
    rows.push(['', `Row ${d.row} ${d.name}`, `${d.hub ?? '⚠ (handoff not chosen)'} delivers to ${d.address}`]);
  }
  if (plan.pickups.length) rows.push(['Pickups']);
  for (const p of plan.pickups) {
    rows.push(['', `Row ${p.row} ${p.name}`, p.hub ? `at ${p.hub}'s (${settings.addresses[p.hub]})` : '⚠ Pickup place not chosen yet']);
  }
  return rows;
}
