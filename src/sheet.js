// Connects the logic to the Google Sheet. Google services are passed in, so tests can use fakes.
// Safety rule: this code only ever writes to the COMPUTED columns, the Settings tab and the
// Bake Plan tab. Form answers and the columns you fill in are never changed or deleted.
import { DEFAULT_SETTINGS, parseSettings, settingsToRows } from './settings.js';
import { readOrder, isBlankRow, columnIndex, FORM_HEADERS, STAFF_HEADERS, PAID_TO_OPTIONS, DECISION_OPTIONS, HANDOFF_OPTIONS } from './order.js';
import { processOrders } from './process.js';
import { planFor, planRows } from './bakeplan.js';
import { upcomingBakeDates, formatDate } from './schedule.js';

export const SETTINGS_SHEET = 'Settings';
export const PLAN_SHEET = 'Bake Plan';
export const COMPUTED_HEADERS = ['Bake date', 'Who bakes', 'Total ₪', 'Status', 'Needs attention', 'Ready msg', 'Reminder msg'];
const CHECKBOX_HEADERS = [STAFF_HEADERS.paid, STAFF_HEADERS.cancelled, STAFF_HEADERS.notDuplicate];
const LIST_HEADERS = {
  [STAFF_HEADERS.paidTo]: PAID_TO_OPTIONS,
  [STAFF_HEADERS.decision]: DECISION_OPTIONS,
  [STAFF_HEADERS.handoff]: HANDOFF_OPTIONS,
};

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
    lock.waitLock(30000);
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  };

  function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return withLock(() => {
      const orders = findOrdersSheet(ss);
      const added = [];
      for (const header of [...Object.values(STAFF_HEADERS), ...COMPUTED_HEADERS]) {
        if (columnIndex(headersOf(orders), header) !== -1) continue;
        const col = orders.getLastColumn() + 1;
        orders.getRange(1, col).setValue(header);
        added.push(header);
      }
      const headers = headersOf(orders);
      const rows = Math.max(orders.getMaxRows() - 1, 1);
      for (const header of CHECKBOX_HEADERS) {
        orders.getRange(2, columnIndex(headers, header) + 1, rows, 1)
          .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
      }
      for (const [header, options] of Object.entries(LIST_HEADERS)) {
        orders.getRange(2, columnIndex(headers, header) + 1, rows, 1)
          .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(options, true).build());
      }
      if (!ss.getSheetByName(SETTINGS_SHEET)) {
        const sheet = ss.insertSheet(SETTINGS_SHEET);
        const { rows: settingRows, flavorRows } = settingsToRows(DEFAULT_SETTINGS);
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
      return added;
    });
  }

  function refreshLocked(ss) {
    const now = clock();
    const { settings, errors } = readSettings(ss);
    const sheet = findOrdersSheet(ss);
    const headers = headersOf(sheet);
    const missing = COMPUTED_HEADERS.filter((h) => columnIndex(headers, h) === -1);
    if (missing.length) throw new Error(`Run "Bread Club > Set up" first (missing columns: ${missing.join(', ')})`);
    const lastRow = sheet.getLastRow();
    const data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    const orders = [];
    data.forEach((row, i) => {
      if (!isBlankRow(headers, row)) orders.push(readOrder(headers, row, i + 2, settings));
    });
    const byRow = new Map(processOrders(orders, settings, now).map((r) => [r.row, r]));
    const out = data.map((_, i) => {
      const r = byRow.get(i + 2);
      if (!r) return COMPUTED_HEADERS.map(() => '');
      return [
        r.bakeDate ? `${r.bakeDate} ${formatDate(r.bakeDate).slice(0, 3)}` : '',
        r.whoBakes,
        r.price.total,
        r.status,
        [...r.attention, ...r.notes].join('; '),
        r.readyFormula,
        r.reminderFormula,
      ];
    });
    if (out.length) {
      COMPUTED_HEADERS.forEach((h, k) => {
        sheet.getRange(2, columnIndex(headers, h) + 1, out.length, 1).setValues(out.map((row) => [row[k]]));
      });
    }
    writePlan(ss, [...byRow.values()], settings, errors, now);
    return { orders: orders.length, settingsErrors: errors };
  }

  function writePlan(ss, results, settings, errors, now) {
    const sheet = ss.getSheetByName(PLAN_SHEET) ?? ss.insertSheet(PLAN_SHEET);
    const rows = [['Bake Plan (updates automatically; don\'t type here)']];
    for (const e of errors) rows.push([`⚠ ${e}`]);
    for (const date of upcomingBakeDates(now, settings, 2)) {
      rows.push(['']);
      rows.push(...planRows(planFor(date, results, settings), settings));
    }
    sheet.clear();
    sheet.getRange(1, 1, rows.length, 3).setValues(rows.map((r) => [0, 1, 2].map((i) => r[i] ?? '')));
  }

  const refresh = () => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return withLock(() => refreshLocked(ss));
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

  return { setup, refresh, onOpen, onEdit };
}
