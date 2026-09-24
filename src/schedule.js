// Bake dates and cutoffs. All calendar math happens on Israel-local dates, stored as
// 'YYYY-MM-DD' strings so a date never shifts with the computer's time zone.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    iso: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAYS.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// A cell holding a date may be a Date (Sheets) or text. Returns 'YYYY-MM-DD' or null.
export function toIsoDate(value, timeZone) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : localParts(value, timeZone).iso;
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

// "Tuesday", "Tuesday ( order by Sunday)", "friday" -> bake day config, or null.
export function parseBakeDay(choice, settings) {
  const text = String(choice ?? '').trim().toLowerCase();
  return settings.bakeDays.find((d) => text.startsWith(d.name.toLowerCase())) ?? null;
}

function cutoffFor(bakeIso, bakeDay) {
  const back = (bakeDay.weekday - bakeDay.cutoffWeekday + 7) % 7;
  return addDays(bakeIso, -back);
}

function isAfterCutoff(local, cutoffIso, settings) {
  if (local.iso !== cutoffIso) return local.iso > cutoffIso;
  return local.minutes >= settings.cutoffHour * 60;
}

function firstOnOrAfter(iso, weekdayOfIso, weekday) {
  return addDays(iso, (weekday - weekdayOfIso + 7) % 7);
}

// The first bake date after `afterIso` that is still open for an order placed at `local`
// and isn't a no-baking day. "Next" never moves an order earlier than the day it asked for.
export function nextOpenBakeDate(local, afterIso, settings) {
  const afterWeekday = new Date(`${afterIso}T00:00:00Z`).getUTCDay();
  const options = settings.bakeDays.map((day) => {
    let bake = firstOnOrAfter(addDays(afterIso, 1), (afterWeekday + 1) % 7, day.weekday);
    while (isAfterCutoff(local, cutoffFor(bake, day), settings) || settings.skipDates.includes(bake)) {
      bake = addDays(bake, 7);
    }
    return bake;
  });
  return options.sort()[0];
}

// For an order placed at `timestamp` asking for `choice` (e.g. "Friday"):
// { bakeDate, late, skipped, nextOpen } or { error }.
export function scheduleOrder(timestamp, choice, settings) {
  const day = parseBakeDay(choice, settings);
  if (!day) return { error: `Can't tell which bake day "${choice}" means` };
  if (!(timestamp instanceof Date) || Number.isNaN(timestamp.getTime())) {
    return { error: 'No order time: fill in "Bake date (change)"' };
  }
  const local = localParts(timestamp, settings.timeZone);
  const bakeDate = firstOnOrAfter(local.iso, local.weekday, day.weekday);
  return {
    bakeDate,
    late: isAfterCutoff(local, cutoffFor(bakeDate, day), settings),
    skipped: settings.skipDates.includes(bakeDate),
    nextOpen: nextOpenBakeDate(local, bakeDate, settings),
  };
}

export function isBakeWeekday(iso, settings) {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return settings.bakeDays.some((d) => d.weekday === weekday);
}

// Upcoming bake dates (today included) for the Bake Plan tab.
export function upcomingBakeDates(now, settings, count) {
  const local = localParts(now, settings.timeZone);
  const dates = [];
  for (let offset = 0; dates.length < count; offset += 1) {
    const iso = addDays(local.iso, offset);
    const weekday = (local.weekday + offset) % 7;
    if (settings.bakeDays.some((d) => d.weekday === weekday) && !settings.skipDates.includes(iso)) dates.push(iso);
  }
  return dates;
}
