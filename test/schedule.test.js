import { describe, it, expect } from 'vitest';
import { scheduleOrder, upcomingBakeDates, formatDate, toIsoDate, addDays, parseBakeDay, localParts } from '../src/schedule.js';
import { il, S } from './helpers.js';

describe('bake dates and cutoffs (Tue closes Sun 2pm, Fri closes Wed 2pm, Israel time)', () => {
  it('Thursday order for Tuesday -> next Tuesday, on time', () => {
    expect(scheduleOrder(il('2026-09-24'), 'Tuesday', S)).toEqual({
      bakeDate: '2026-09-29', late: false, skipped: false, nextOpen: '2026-09-29',
    });
  });

  it('Sunday 13:59 is on time for Tuesday, 14:00 is late', () => {
    expect(scheduleOrder(il('2026-09-27', '13:59'), 'Tuesday', S).late).toBe(false);
    const late = scheduleOrder(il('2026-09-27', '14:00'), 'Tuesday', S);
    expect(late).toMatchObject({ bakeDate: '2026-09-29', late: true, nextOpen: '2026-10-02' });
  });

  it('Monday order for Tuesday is late and is offered Friday', () => {
    expect(scheduleOrder(il('2026-09-28'), 'Tuesday ( order by Sunday)', S))
      .toMatchObject({ bakeDate: '2026-09-29', late: true, nextOpen: '2026-10-02' });
  });

  it('ordering on Tuesday for "Tuesday" means today and is late', () => {
    expect(scheduleOrder(il('2026-09-29', '08:00'), 'Tuesday', S)).toMatchObject({ bakeDate: '2026-09-29', late: true });
  });

  it('Wednesday 13:59 is on time for Friday; 14:00 is late and is offered next Tuesday', () => {
    expect(scheduleOrder(il('2026-09-30', '13:59'), 'Friday', S)).toMatchObject({ bakeDate: '2026-10-02', late: false });
    expect(scheduleOrder(il('2026-09-30', '14:00'), 'Friday ( order byTuesday)', S))
      .toMatchObject({ bakeDate: '2026-10-02', late: true, nextOpen: '2026-10-06' });
  });

  it('Wednesday order for Tuesday is next week and on time', () => {
    expect(scheduleOrder(il('2026-09-30', '20:00'), 'tuesday', S)).toMatchObject({ bakeDate: '2026-10-06', late: false });
  });

  it('uses Israel time, not the server clock (22:30 UTC Saturday = Sunday 01:30 in Israel)', () => {
    const t = new Date(Date.UTC(2026, 8, 26, 22, 30));
    expect(localParts(t, S.timeZone)).toEqual({ iso: '2026-09-27', weekday: 0, minutes: 90 });
  });

  it('handles winter time (UTC+2 after 25 Oct)', () => {
    expect(scheduleOrder(il('2026-11-01', '13:59'), 'Tuesday', S).late).toBe(false);
    expect(scheduleOrder(il('2026-11-01', '14:00'), 'Tuesday', S).late).toBe(true);
  });

  it('marks a skipped (holiday) date and offers the next open one', () => {
    const settings = { ...S, skipDates: ['2026-09-29'] };
    expect(scheduleOrder(il('2026-09-24'), 'Tuesday', settings))
      .toMatchObject({ bakeDate: '2026-09-29', skipped: true, late: false, nextOpen: '2026-10-02' });
  });

  it('next open date skips holidays on both days', () => {
    const settings = { ...S, skipDates: ['2026-09-29', '2026-10-02'] };
    expect(scheduleOrder(il('2026-09-28'), 'Tuesday', settings).nextOpen).toBe('2026-10-06');
  });

  it('reports an unknown day and a missing order time', () => {
    expect(scheduleOrder(il('2026-09-24'), 'Someday', S).error).toMatch(/Can't tell which bake day/);
    expect(scheduleOrder(null, 'Friday', S).error).toMatch(/No order time/);
    expect(scheduleOrder(new Date('nope'), 'Friday', S).error).toMatch(/No order time/);
  });

  it('parses day text loosely', () => {
    expect(parseBakeDay('  FRIDAY (order by Wednesday)', S).weekday).toBe(5);
    expect(parseBakeDay(undefined, S)).toBeNull();
  });
});

describe('date helpers', () => {
  it('formats dates', () => {
    expect(formatDate('2026-10-02')).toBe('Fri 2 Oct');
    expect(addDays('2026-09-29', 3)).toBe('2026-10-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('reads date cells', () => {
    expect(toIsoDate(il('2026-10-02', '00:30'), S.timeZone)).toBe('2026-10-02');
    expect(toIsoDate(new Date('bad'), S.timeZone)).toBeNull();
    expect(toIsoDate(' 2026-10-06 ', S.timeZone)).toBe('2026-10-06');
    expect(toIsoDate('next week', S.timeZone)).toBeNull();
    expect(toIsoDate(null, S.timeZone)).toBeNull();
  });

  it('lists upcoming bake dates, today included, skipping holidays', () => {
    expect(upcomingBakeDates(il('2026-09-29'), S, 2)).toEqual(['2026-09-29', '2026-10-02']);
    expect(upcomingBakeDates(il('2026-09-24'), { ...S, skipDates: ['2026-09-29'] }, 2)).toEqual(['2026-09-25', '2026-10-02']);
  });
});
