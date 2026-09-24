// End-to-end through the Sheet layer, using an in-memory spreadsheet with made-up customers.
import { describe, it, expect, beforeEach } from 'vitest';
import { createApp, readSettings, findOrdersSheet, COMPUTED_HEADERS, SETTINGS_SHEET, PLAN_SHEET } from '../src/sheet.js';
import { FakeSheet, FakeSpreadsheet, fakeServices } from './fakes.js';
import { HEADERS, formRow, il } from './helpers.js';

const FORM_WITH_PAID = [...HEADERS, 'Paid?'];

function world(rows = [], clockAt = il('2026-09-24', '12:00')) {
  const orders = new FakeSheet('Form Responses 1', [FORM_WITH_PAID, ...rows.map((r) => [...r, false])]);
  const ss = new FakeSpreadsheet([new FakeSheet('Notes', [['random']]), orders]);
  const services = fakeServices(ss);
  let now = clockAt;
  const app = createApp({ ...services, clock: () => now });
  return { ss, orders, services, app, setNow: (t) => { now = t; } };
}

const header = (sheet) => sheet.grid[0];
const col = (sheet, name) => header(sheet).indexOf(name) + 1;
const cellOf = (sheet, row, name) => sheet.cell(row, col(sheet, name));
const planText = (ss) => ss.getSheetByName(PLAN_SHEET).grid.map((r) => r.filter((v) => v !== '').join(' | '));

function submit(w, opts) {
  // A new form answer lands on the next row, form columns only (like Google Forms does).
  const r = w.orders.getLastRow() + 1;
  formRow(opts).forEach((v, i) => w.orders.put(r, i + 1, v));
  w.app.refresh();
  return r;
}

function staffSet(w, row, name, value) {
  w.orders.put(row, col(w.orders, name), value);
  return w.app.onEdit({ range: w.orders.getRange(row, col(w.orders, name)) });
}

describe('setup', () => {
  it('adds the staff and computed columns once, with checkboxes and dropdowns', () => {
    const w = world();
    const added = w.app.setup();
    expect(added).toEqual([
      'Money went to', 'Handoff at', 'Baked by (change)', 'Adjustment ₪', 'Late/holiday decision',
      'Bake date (change)', 'Cancelled?', 'Not a duplicate', ...COMPUTED_HEADERS,
    ]);
    expect(w.app.setup()).toEqual([]);
    const rules = w.orders.validations.map((v) => [header(w.orders)[v.col - 1], v.rule.type]);
    expect(rules).toContainEqual(['Paid?', 'checkbox']);
    expect(rules).toContainEqual(['Money went to', 'list']);
    expect(rules).toContainEqual(["Handoff at", 'list']);
    expect(w.services.triggers.map((t) => [t.handler, t.kind])).toEqual([
      ['onFormSubmitTrigger', 'formSubmit'], ['dailyRefresh', 'time'],
    ]);
    expect(w.services.lock.held).toBe(false);
  });

  it('leaves other scripts\' triggers alone', () => {
    const w = world();
    w.services.ScriptApp.newTrigger('oldSummaryScript').timeBased().create();
    w.app.setup();
    expect(w.services.triggers.map((t) => t.handler)).toEqual(['oldSummaryScript', 'onFormSubmitTrigger', 'dailyRefresh']);
  });

  it('creates a Settings tab with the confirmed prices and does not overwrite it later', () => {
    const w = world();
    w.app.setup();
    const settings = w.ss.getSheetByName(SETTINGS_SHEET);
    expect(settings.cell(2, 1)).toBe('Delivery fee (₪)');
    expect(settings.cell(2, 2)).toBe(5);
    settings.put(2, 2, 6);
    w.app.setup();
    expect(settings.cell(2, 2)).toBe(6);
    expect(readSettings(w.ss).settings.deliveryFee).toBe(6);
  });

  it('refuses to run before setup and says what to do', () => {
    const w = world([formRow()]);
    expect(() => w.app.refresh()).toThrow(/Set up/);
    expect(w.services.lock.held).toBe(false);
  });

  it('needs an orders tab', () => {
    const ss = new FakeSpreadsheet([new FakeSheet('Empty'), new FakeSheet('Other', [['Name']])]);
    expect(() => findOrdersSheet(ss)).toThrow(/No orders tab/);
  });

  it('adds a menu', () => {
    const w = world();
    w.app.onOpen();
    expect(w.services.menus[0]).toEqual({
      title: 'Bread Club',
      items: [['Refresh now', 'refreshNow'], ['Set up (first time only)', 'setupBreadClub']],
    });
  });
});

describe('a week of orders (synthetic customers)', () => {
  let w;
  beforeEach(() => {
    w = world();
    w.app.setup();
  });

  it('an ordinary order appears once with the right total and bake date', () => {
    const r = submit(w, { name: 'Dana Test', phone: '050-000-0001', items: { garlic: 2 }, method: 'Delivery', address: 'Test St 1' });
    expect(cellOf(w.orders, r, 'Bake date')).toBe('2026-09-25 Fri');
    expect(cellOf(w.orders, r, 'Total ₪')).toBe(89);
    expect(cellOf(w.orders, r, 'Who bakes')).toBe('Shayna: 2 Garlic');
    expect(cellOf(w.orders, r, 'Status')).toBe('Unpaid');
    expect(cellOf(w.orders, r, 'Ready msg')).toMatch(/^=HYPERLINK\("https:\/\/wa\.me\/972500000001\?text=/);
    expect(planText(w.ss)).toContain('Shayna: 2 loaves, 1 batches');
  });

  it('never changes form answers or staff columns', () => {
    const r = submit(w, { name: 'Dana Test', items: { plain: 1 } });
    staffSet(w, r, 'Paid?', true);
    staffSet(w, r, 'Money went to', 'Eliana cash');
    const before = JSON.stringify(w.orders.grid[r - 1].slice(0, col(w.orders, 'Not a duplicate')));
    w.orders.writes = [];
    w.app.refresh();
    expect(JSON.stringify(w.orders.grid[r - 1].slice(0, col(w.orders, 'Not a duplicate')))).toBe(before);
    const computedCols = COMPUTED_HEADERS.map((h) => col(w.orders, h));
    expect(w.orders.writes.every(([, c]) => computedCols.includes(c))).toBe(true);
  });

  it('marking paid is a person\'s action and survives a reload', () => {
    const r = submit(w, { name: 'Dana Test', items: { plain: 1 } });
    staffSet(w, r, 'Paid?', true);
    expect(cellOf(w.orders, r, 'Status')).toBe('Needs attention');
    staffSet(w, r, 'Money went to', 'Bit 054-911-2175');
    expect(cellOf(w.orders, r, 'Status')).toBe('Paid');
    // "Reload": a brand-new app reading the same sheet.
    const again = createApp({ ...w.services, clock: () => il('2026-09-24', '13:00') });
    again.refresh();
    expect(cellOf(w.orders, r, 'Status')).toBe('Paid');
    expect(cellOf(w.orders, r, 'Reminder msg')).toBe('');
  });

  it('a double-submitted order is flagged and counted once', () => {
    const a = submit(w, { name: 'Dana Test', items: { plain: 2 } });
    const b = submit(w, { name: 'Dana Test', items: { plain: 2 }, at: il('2026-09-23', '10:02') });
    expect(cellOf(w.orders, a, 'Status')).toBe('Unpaid');
    expect(cellOf(w.orders, b, 'Status')).toBe(`Possible duplicate of row ${a}`);
    expect(planText(w.ss)).toContain('Eliana: 2 loaves, 1 batches');
    expect(w.orders.getLastRow()).toBe(b);
  });

  it('a late order waits for a decision, then moves to Friday', () => {
    w.setNow(il('2026-09-28', '09:00'));
    const r = submit(w, { name: 'Late Test', at: il('2026-09-28', '08:00'), day: 'Tuesday', items: { olive: 1 } });
    expect(cellOf(w.orders, r, 'Status')).toBe('Needs attention');
    expect(cellOf(w.orders, r, 'Needs attention')).toMatch(/Late order for Tue 29 Sep/);
    expect(planText(w.ss)).toContain('⚠ 1 order(s) for this day are waiting for a decision (not counted below)');
    staffSet(w, r, 'Late/holiday decision', 'Move to next bake day');
    expect(cellOf(w.orders, r, 'Bake date')).toBe('2026-10-02 Fri');
    expect(planText(w.ss)).toContain('Eliana: 1 loaves, 1 batches');
  });

  it('a promised free loaf stays on the bake list at ₪0', () => {
    const r = submit(w, { name: 'Gift Test', items: { rosemary: 1 } });
    staffSet(w, r, 'Adjustment ₪', -44);
    expect(cellOf(w.orders, r, 'Total ₪')).toBe(0);
    expect(planText(w.ss)).toContain('Shayna: 1 loaves, 1 batches');
  });

  it('flags unpaid orders after 2 days on the daily refresh', () => {
    const r = submit(w, { name: 'Slow Payer', items: { plain: 1 }, at: il('2026-09-23', '09:00') });
    w.setNow(il('2026-09-25', '09:00'));
    w.app.refresh();
    expect(cellOf(w.orders, r, 'Status')).toBe('Unpaid 2 days: send reminder');
  });

  it('keeps blank rows blank and shows settings typos on the Bake Plan', () => {
    const r = submit(w, { name: 'Dana Test' });
    w.orders.put(r + 1, 1, '');
    w.orders.put(r + 2, 1, ' ');
    w.ss.getSheetByName(SETTINGS_SHEET).put(2, 2, 'five');
    w.app.refresh();
    expect(cellOf(w.orders, r + 2, 'Status')).toBe('Needs attention');
    expect(planText(w.ss)[1]).toBe('⚠ Settings: "Delivery fee (₪)" must be a number');
  });
});

describe('edit trigger', () => {
  it('reruns on edits to orders or Settings, but not to computed columns or the Bake Plan', () => {
    const w = world([formRow()]);
    w.app.setup();
    const plan = w.ss.getSheetByName(PLAN_SHEET);
    expect(w.app.onEdit({ range: plan.getRange(1, 1) })).toBeNull();
    expect(w.app.onEdit({ range: w.orders.getRange(2, col(w.orders, 'Status')) })).toBeNull();
    expect(w.app.onEdit({ range: w.ss.getSheetByName('Notes').getRange(1, 1) })).toBeNull();
    expect(w.app.onEdit({ range: w.orders.getRange(2, 2) })).toEqual({ orders: 1, settingsErrors: [] });
    expect(w.app.onEdit({ range: w.ss.getSheetByName(SETTINGS_SHEET).getRange(2, 2) }).orders).toBe(1);
  });
});

describe('real clock', () => {
  it('uses the current time when no clock is given', () => {
    const w = world([formRow()]);
    const app = createApp(w.services);
    app.setup();
    expect(app.refresh().orders).toBe(1);
  });
});

describe('empty sheets', () => {
  it('works with no orders and no Settings tab', () => {
    const w = world();
    w.app.setup();
    expect(w.app.refresh()).toEqual({ orders: 0, settingsErrors: [] });
    const empty = new FakeSpreadsheet([new FakeSheet(SETTINGS_SHEET, [['Setting', 'Value']])]);
    expect(readSettings(empty).settings.deliveryFee).toBe(5);
    expect(readSettings(new FakeSpreadsheet([])).errors).toEqual([]);
  });
});
