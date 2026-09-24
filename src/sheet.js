// Connects the logic to the Google Sheet. Google services are passed in, so tests can use fakes.
// Safety rule: this code only ever writes to the COMPUTED columns, the Settings tab and the
// Bake Plan tab (plus new column headers during setup). Form answers and the columns you fill in
// are never changed or deleted.
import { DEFAULT_SETTINGS, parseSettings, settingsToRows } from './settings.js';
import {
  readOrder, isBlankRow, columnIndex, FORM_HEADERS, STAFF_HEADERS,
  PAID_TO_OPTIONS, DECISION_OPTIONS, HANDOFF_OPTIONS, TAKEN_BY_OPTIONS,
} from './order.js';
import { processOrders } from './process.js';
import { planFor, planRows, planDates } from './bakeplan.js';
import { upcomingBakeDates, formatDate, localParts } from './schedule.js';

export const SETTINGS_SHEET = 'Settings';
export const PLAN_SHEET = 'Bake Plan';
export const COMPUTED_HEADERS = ['Status', 'Needs attention', 'Ready msg', 'Reminder msg', 'Bake date', 'Who bakes', 'Total ₪'];
const CHECKBOX_HEADERS = [STAFF_HEADERS.paid, STAFF_HEADERS.cancelled, STAFF_HEADERS.notDuplicate];
const LIST_HEADERS = {
  [STAFF_HEADERS.paidTo]: PAID_TO_OPTIONS,
  [STAFF_HEADERS.decision]: DECISION_OPTIONS,
  [STAFF_HEADERS.handoff]: HANDOFF_OPTIONS,
  [STAFF_HEADERS.takenBy]: TAKEN_BY_OPTIONS,
};
// Status colours: red = unpaid too long, amber = needs a person.
export const STATUS_COLOURS = [
  ['Unpaid ', '#f4c7c3'],
  ['Needs attention', '#fce8b2'],
  ['Possible duplicate', '#fce8b2'],
];

export function findOrdersSheet(ss) {
  const sheet = ss.getSheets().find((s) => s.getLastColumn() > 0
    && String(s.getRange(1, 1).getValue()).trim() === FORM_HEADERS.timestamp);
  if (!sheet) throw new Error('No orders tab found (a tab whose first column is "Timestamp")');
  return sheet;
}

function headersOf(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((h) => String(h));
}

export function readSettings(ss) {
  const sheet = ss.getSheetByName(SETTINGS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return { settings: DEFAULT_SETTINGS, errors: [] };
  const n = sheet.getLastRow();
  return parseSettings(sheet.getRange(2, 1, n - 1, 2).getValues(), sheet.getRange(1, 4, n, 3).getValues());
}

export function createApp({ SpreadsheetApp, LockService, ScriptApp, clock = () => new Date() }) {
  const withLock = (fn) => {
    const lock = LockService.getDocumentLock();
    lock.waitLock(20000); // simple triggers only get 30 seconds in total
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  };

  const dataRows = (sheet) => Math.max(sheet.getMaxRows() - 1, 1);

  // Checkboxes and dropdowns for every row, including rows the form has added since last time.
  function applyValidations(orders, headers) {
    for (const header of CHECKBOX_HEADERS) {
      orders.getRange(2, columnIndex(headers, header) + 1, dataRows(orders), 1)
        .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    }
    for (const [header, options] of Object.entries(LIST_HEADERS)) {
      orders.getRange(2, columnIndex(headers, header) + 1, dataRows(orders), 1)
        .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(options, true).build());
    }
  }

  function applyLook(orders, headers) {
    const statusRange = orders.getRange(2, columnIndex(headers, 'Status') + 1, dataRows(orders), 1);
    const statusCol = statusRange.getColumn();
    const others = orders.getConditionalFormatRules()
      .filter((rule) => !rule.getRanges().every((r) => r.getColumn() === statusCol));
    const ours = STATUS_COLOURS.map(([text, colour]) => SpreadsheetApp.newConditionalFormatRule()
      .whenTextStartsWith(text).setBackground(colour).setRanges([statusRange]).build());
    orders.setConditionalFormatRules([...others, ...ours]);
    for (const header of COMPUTED_HEADERS) {
      // Plain text, so Sheets never turns "Fri 2 Oct" into a date shown some other way.
      orders.getRange(2, columnIndex(headers, header) + 1, dataRows(orders), 1).setNumberFormat('@');
    }
    orders.getRange(2, columnIndex(headers, 'Needs attention') + 1, dataRows(orders), 1).setWrap(true);
    orders.setFrozenRows(1);
    orders.setFrozenColumns(columnIndex(headers, FORM_HEADERS.name) + 1);
  }

  function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return withLock(() => {
      const orders = findOrdersSheet(ss);
      const existing = headersOf(orders);
      const missing = [...Object.values(STAFF_HEADERS), ...COMPUTED_HEADERS]
        .filter((h) => columnIndex(existing, h) === -1);
      const room = orders.getMaxColumns() - orders.getLastColumn();
      if (missing.length > room) orders.insertColumnsAfter(orders.getMaxColumns(), missing.length - room);
      if (missing.length) orders.getRange(1, orders.getLastColumn() + 1, 1, missing.length).setValues([missing]);
      const headers = headersOf(orders);
      applyValidations(orders, headers);
      applyLook(orders, headers);
      if (!ss.getSheetByName(SETTINGS_SHEET)) {
        const sheet = ss.insertSheet(SETTINGS_SHEET);
        const today = localParts(clock(), DEFAULT_SETTINGS.timeZone).iso;
        const { rows: settingRows, flavorRows } = settingsToRows({ ...DEFAULT_SETTINGS, trackFrom: today });
        sheet.getRange(1, 1, 1, 2).setValues([['Setting', 'Value']]);
        sheet.getRange(2, 1, settingRows.length, 2).setValues(settingRows);
        sheet.getRange(1, 4, flavorRows.length, 3).setValues(flavorRows);
      }
      for (const t of ScriptApp.getProjectTriggers()) {
        if (['onFormSubmitTrigger', 'dailyRefresh'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
      }
      ScriptApp.newTrigger('onFormSubmitTrigger').forSpreadsheet(ss).onFormSubmit().create();
      ScriptApp.newTrigger('dailyRefresh').timeBased().atHour(8).everyDays(1).create();
      refreshLocked(ss);
      return missing;
    });
  }

  function refreshLocked(ss, { withValidations = false } = {}) {
    const now = clock();
    const { settings, errors } = readSettings(ss);
    const sheet = findOrdersSheet(ss);
    const headers = headersOf(sheet);
    const missing = COMPUTED_HEADERS.filter((h) => columnIndex(headers, h) === -1);
    if (missing.length) throw new Error(`Run "Bread Club > Set up" first (missing columns: ${missing.join(', ')})`);
    if (withValidations) applyValidations(sheet, headers);
    const lastRow = sheet.getLastRow();
    const data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    const orders = [];
    data.forEach((row, i) => {
      if (!isBlankRow(headers, row)) orders.push(readOrder(headers, row, i + 2, settings));
    });
    const results = processOrders(orders, settings, now);
    const byRow = new Map(results.map((r) => [r.row, r]));
    const out = data.map((_, i) => {
      const r = byRow.get(i + 2);
      if (!r) return COMPUTED_HEADERS.map(() => '');
      return [
        r.status,
        r.attention.join('; '),
        r.readyFormula,
        r.reminderFormula,
        r.bakeDate ? formatDate(r.bakeDate) : '',
        r.whoBakes,
        r.price.total,
      ];
    });
    if (out.length) {
      COMPUTED_HEADERS.forEach((h, k) => {
        sheet.getRange(2, columnIndex(headers, h) + 1, out.length, 1).setValues(out.map((row) => [row[k]]));
      });
    }
    writePlan(ss, results, settings, errors, now);
    return { orders: orders.length, settingsErrors: errors };
  }

  function writePlan(ss, results, settings, errors, now) {
    const sheet = ss.getSheetByName(PLAN_SHEET) ?? ss.insertSheet(PLAN_SHEET);
    const rows = [['Bake Plan (updates automatically; don\'t type here)']];
    for (const e of errors) rows.push([`⚠ ${e}`]);
    const undated = results.filter((r) => r.pending && !r.bakeDate).map((r) => r.row);
    if (undated.length) rows.push([`⚠ No bake date yet: row ${undated.join(', ')} (see Needs attention)`]);
    const today = localParts(now, settings.timeZone).iso;
    for (const date of planDates(results, upcomingBakeDates(now, settings, 2), today)) {
      rows.push(['']);
      rows.push(...planRows(planFor(date, results, settings), settings));
    }
    sheet.clear();
    sheet.getRange(1, 1, rows.length, 3).setValues(rows.map((r) => [0, 1, 2].map((i) => r[i] ?? '')));
  }

  const refresh = (options) => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return withLock(() => refreshLocked(ss, options));
  };

  function onOpen() {
    SpreadsheetApp.getUi().createMenu('Bread Club')
      .addItem('Refresh now', 'refreshNow')
      .addItem('Set up (first time only)', 'setupBreadClub')
      .addToUi();
  }

  // Simple onEdit trigger: rerun when someone edits the orders or Settings, but not for
  // edits to the computed columns or the Bake Plan (those are overwritten anyway).
  function onEdit(e) {
    const sheet = e.range.getSheet();
    if (sheet.getName() === PLAN_SHEET) return null;
    if (sheet.getName() !== SETTINGS_SHEET) {
      const header = String(sheet.getRange(1, e.range.getColumn()).getValue());
      if (COMPUTED_HEADERS.includes(header) || String(sheet.getRange(1, 1).getValue()) !== FORM_HEADERS.timestamp) return null;
    }
    return refresh();
  }

  // A new form answer: also extend checkboxes and dropdowns to the new row.
  const onFormSubmit = () => refresh({ withValidations: true });

  return { setup, refresh, onFormSubmit, onOpen, onEdit };
}
