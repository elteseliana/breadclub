// In-memory stand-ins for the parts of Google Apps Script the app uses.
// They behave like the real services for everything the app calls (1-based rows/columns,
// grids that grow when written to, formulas stored as text).

class FakeRange {
  constructor(sheet, row, col, rows, cols) {
    Object.assign(this, { sheet, row, col, rows, cols });
  }

  getValues() {
    const out = [];
    for (let r = 0; r < this.rows; r += 1) {
      const line = [];
      for (let c = 0; c < this.cols; c += 1) line.push(this.sheet.cell(this.row + r, this.col + c));
      out.push(line);
    }
    return out;
  }

  getValue() {
    return this.getValues()[0][0];
  }

  setValues(values) {
    if (values.length !== this.rows || values.some((v) => v.length !== this.cols)) {
      throw new Error(`setValues: expected ${this.rows}x${this.cols}`);
    }
    values.forEach((line, r) => line.forEach((v, c) => this.sheet.put(this.row + r, this.col + c, v)));
    return this;
  }

  setValue(v) {
    return this.setValues([[v]]);
  }

  setDataValidation(rule) {
    this.sheet.validations.push({ col: this.col, rows: this.rows, rule });
    return this;
  }

  setNumberFormat(format) {
    this.sheet.formats.push({ col: this.col, format });
    return this;
  }

  setWrap(wrap) {
    this.sheet.wrapped.push({ col: this.col, wrap });
    return this;
  }

  getColumn() {
    return this.col;
  }

  getSheet() {
    return this.sheet;
  }
}

export class FakeSheet {
  // Like a real form-response tab, a sheet built from a grid has no spare columns
  // unless maxColumns says so; new tabs get Google's default 26.
  constructor(name, grid = [], { maxColumns } = {}) {
    this.name = name;
    this.grid = grid.map((r) => [...r]);
    this.maxColumns = maxColumns ?? Math.max(1, ...this.grid.map((r) => r.length));
    this.validations = [];
    this.formats = [];
    this.wrapped = [];
    this.rules = [];
    this.frozen = { rows: 0, columns: 0 };
    this.writes = [];
  }

  cell(r, c) {
    const v = this.grid[r - 1]?.[c - 1];
    return v === undefined ? '' : v;
  }

  put(r, c, v) {
    while (this.grid.length < r) this.grid.push([]);
    this.grid[r - 1][c - 1] = v;
    this.writes.push([r, c]);
  }

  getName() { return this.name; }

  getLastRow() {
    for (let r = this.grid.length; r > 0; r -= 1) {
      if (this.grid[r - 1].some((v) => v !== '' && v !== undefined)) return r;
    }
    return 0;
  }

  getLastColumn() {
    return this.grid.reduce((m, r) => {
      let last = 0;
      r.forEach((v, i) => { if (v !== '' && v !== undefined) last = i + 1; });
      return Math.max(m, last);
    }, 0);
  }

  getMaxRows() { return Math.max(this.grid.length, 1000); }

  getMaxColumns() { return this.maxColumns; }

  insertColumnsAfter(after, howMany) {
    if (after > this.maxColumns) throw new Error('insertColumnsAfter: out of bounds');
    this.maxColumns += howMany;
  }

  getRange(row, col, rows = 1, cols = 1) {
    if (row < 1 || col < 1 || rows < 1 || cols < 1) throw new Error('bad range');
    if (col + cols - 1 > this.maxColumns) {
      throw new Error('Exception: The coordinates of the range are outside the dimensions of the sheet.');
    }
    return new FakeRange(this, row, col, rows, cols);
  }

  getConditionalFormatRules() { return [...this.rules]; }

  setConditionalFormatRules(rules) { this.rules = [...rules]; }

  setFrozenRows(n) { this.frozen.rows = n; }

  setFrozenColumns(n) { this.frozen.columns = n; }

  setColumnWidth(col, px) { this.widths = { ...this.widths, [col]: px }; }

  clear() { this.grid = []; }
}

export class FakeSpreadsheet {
  constructor(sheets) { this.sheets = sheets; }

  getSheets() { return this.sheets; }

  getSheetByName(name) { return this.sheets.find((s) => s.name === name) ?? null; }

  insertSheet(name) {
    const s = new FakeSheet(name, [], { maxColumns: 26 });
    this.sheets.push(s);
    return s;
  }
}

export function fakeServices(ss) {
  const menus = [];
  const triggers = [];
  const lock = { held: false, waitLock() { this.held = true; }, releaseLock() { this.held = false; } };
  const builder = () => {
    const rule = {};
    const b = {
      requireCheckbox() { rule.type = 'checkbox'; return b; },
      requireValueInList(list, dropdown) { Object.assign(rule, { type: 'list', list, dropdown }); return b; },
      build() { return rule; },
    };
    return b;
  };
  const triggerBuilder = (handler) => {
    const t = { handler };
    const b = {
      forSpreadsheet(s) { t.spreadsheet = s; return b; },
      onFormSubmit() { t.kind = 'formSubmit'; return b; },
      timeBased() { t.kind = 'time'; return b; },
      atHour(h) { t.hour = h; return b; },
      everyDays(d) { t.days = d; return b; },
      create() { t.getHandlerFunction = () => handler; triggers.push(t); return t; },
    };
    return b;
  };
  const conditionalRule = () => {
    const rule = {};
    const b = {
      whenTextStartsWith(text) { rule.startsWith = text; return b; },
      setBackground(colour) { rule.background = colour; return b; },
      setRanges(ranges) { rule.ranges = ranges; return b; },
      build() { return { ...rule, getRanges: () => rule.ranges }; },
    };
    return b;
  };
  return {
    menus,
    triggers,
    lock,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      newDataValidation: builder,
      newConditionalFormatRule: conditionalRule,
      getUi: () => ({
        createMenu(title) {
          const menu = { title, items: [] };
          const m = {
            addItem(label, fn) { menu.items.push([label, fn]); return m; },
            addToUi() { menus.push(menu); },
          };
          return m;
        },
      }),
    },
    LockService: { getDocumentLock: () => lock },
    ScriptApp: {
      getProjectTriggers: () => [...triggers],
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1),
      newTrigger: triggerBuilder,
    },
  };
}
