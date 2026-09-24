// Who bakes each loaf. Defaults come from Settings; "Baked by (change)" can say
// "Shayna" (whole order) or "garlic=Eliana, olive=Shayna" (per flavor).
import { BAKERS } from './settings.js';

function parseBaker(text) {
  return BAKERS.find((b) => b.toLowerCase() === text.trim().toLowerCase()) ?? null;
}

export function parseBakerChange(text, settings) {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return { all: null, perFlavor: {} };
  const whole = parseBaker(trimmed);
  if (whole) return { all: whole, perFlavor: {} };
  const perFlavor = {};
  for (const part of trimmed.split(',')) {
    const [flavorText = '', bakerText = ''] = part.split('=');
    const baker = parseBaker(bakerText);
    const needle = flavorText.trim().toLowerCase();
    const flavor = needle && settings.flavors.find(
      (f) => f.key === needle || f.label.toLowerCase().startsWith(needle),
    );
    if (!baker || !flavor) {
      return { error: `Can't read "Baked by (change)": use Eliana, Shayna, or garlic=Eliana` };
    }
    perFlavor[flavor.key] = baker;
  }
  return { all: null, perFlavor };
}

// Returns { byBaker: { Eliana: [{flavor, white, spelt}], Shayna: [...] }, bakers: [...names with loaves], error? }
export function assignBakers(order, settings) {
  const change = parseBakerChange(order.staff.bakerChange, settings);
  const byBaker = { Eliana: [], Shayna: [] };
  const choose = (flavor, spelt) => {
    if (change.error) return spelt ? settings.speltBaker : flavor.baker;
    return change.all ?? change.perFlavor[flavor.key] ?? (spelt ? settings.speltBaker : flavor.baker);
  };
  for (const flavor of settings.flavors) {
    const qty = order.items[flavor.key];
    for (const [kind, count] of [['white', qty.white], ['spelt', qty.spelt]]) {
      if (!count) continue;
      const baker = choose(flavor, kind === 'spelt');
      let line = byBaker[baker].find((l) => l.flavor === flavor.key);
      if (!line) {
        line = { flavor: flavor.key, label: flavor.label, white: 0, spelt: 0 };
        byBaker[baker].push(line);
      }
      line[kind] += count;
    }
  }
  const bakers = BAKERS.filter((b) => byBaker[b].length);
  return { byBaker, bakers, error: change.error };
}

export function describeBakers(assignment) {
  return assignment.bakers
    .map((b) => `${b}: ${assignment.byBaker[b]
      .map((l) => [l.white && `${l.white} ${l.label}`, l.spelt && `${l.spelt} spelt ${l.label}`]
        .filter(Boolean).join(', '))
      .join(', ')}`)
    .join(' · ');
}
