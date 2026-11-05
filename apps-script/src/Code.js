/*
 * The Bread Club: Google Sheets adapter (runs only inside Google Apps Script).
 *
 * This is the thin layer between the order rules (logic.js, server.js) and the
 * spreadsheet. It is not run by the automated unit tests because it needs Google's
 * SpreadsheetApp; the same handler is exercised end to end with a file store.
 * Setup steps are in the owners' private guide (Sheet setup).
 */

var SHEETS = {
  orders: 'Website orders',
  test: 'Test orders',
  summary: 'Bake summary',
  settings: 'Settings'
};

var STATUS = ['new', 'delivered', 'canceled'];
var FIRST_ORDER_NUMBER = 1001;

// Same sections, in the same order, as the old Google Form responses; then the helper columns.
var COLUMNS = (function () {
  var cols = ['Timestamp', 'Full name', 'Phone number'];
  BreadClub.MENU.forEach(function (item) { cols.push(item.name.en); });
  return cols.concat(['Pickup or delivery', 'Payment', 'Delivery address', 'Pickup / delivery day',
    'Notes or allergies', 'Delivery date', 'Loaves', 'Subtotal ₪', 'Delivery fee ₪', 'Total ₪', 'Paid', 'Status',
    'Payment reminder', 'Order #', 'Language', 'Order ID']);
})();

function col(name) { return COLUMNS.indexOf(name); } // 0-based
function colLetter(name) {
  var n = col(name) + 1;
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function toIsoDate(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, BreadClub.RULES.timeZone, 'yyyy-MM-dd');
  return String(v || '').trim().replace(/^'/, '');
}

// ---- Store backed by the spreadsheet ---------------------------------------

/**
 * Text typed by customers must never become a formula. Sheets treats a value starting with
 * = + - @ as a formula (e.g. =IMPORTXML(...) could leak the sheet), so force it to plain text.
 */
function safeText(v) {
  var s = String(v === undefined || v === null ? '' : v);
  return /^[=+\-@\t\r\n]/.test(s) ? "'" + s : s;
}

function quoteFormulaString(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }

/** Spreadsheet formulas for one row, so totals follow any quantity Eliana edits by hand. */
function rowFormulas(r) {
  var first = colLetter(BreadClub.MENU[0].name.en);
  var lastItem = colLetter(BreadClub.MENU[BreadClub.MENU.length - 1].name.en);
  var subtotal = BreadClub.MENU.map(function (item) { return 'N(' + colLetter(item.name.en) + r + ')*' + item.price; }).join('+');
  var sub = colLetter('Subtotal ₪') + r;
  return {
    loaves: '=SUM(' + first + r + ':' + lastItem + r + ')',
    subtotal: '=' + subtotal,
    delivery: '=IF(AND(' + colLetter('Pickup or delivery') + r + '="Delivery",' + sub + '<' +
      BreadClub.RULES.freeDeliveryFrom + '),' + BreadClub.RULES.deliveryFee + ',0)',
    total: '=' + sub + '+' + colLetter('Delivery fee ₪') + r
  };
}

/** WhatsApp reminder that always uses the row's current total, and disappears once Paid is ticked. */
function reminderFormula(r, reminder) {
  var url = 'https://wa.me/972' + reminder.phone.slice(1) + '?text=';
  return '=IF(' + colLetter('Paid') + r + '=TRUE,"",HYPERLINK(' + quoteFormulaString(url) + '&ENCODEURL(' +
    quoteFormulaString(reminder.before) + '&' + colLetter('Total ₪') + r + '&' + quoteFormulaString(reminder.after) +
    '),"Send reminder"))';
}

function sheetStore(test) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(test ? SHEETS.test : SHEETS.orders);
  if (!sheet) throw new Error('Run setup() first: missing sheet');

  return {
    getSettings: function () {
      var s = ss.getSheetByName(SHEETS.settings);
      var raw = s.getRange('B2').getValue();
      var capacity = Number(raw);
      if (raw === '' || raw === null || !(capacity >= 0) || capacity % 1 !== 0) capacity = BreadClub.RULES.defaultCapacity;
      var last = s.getLastRow();
      var closed = last >= 6 ? s.getRange(6, 1, last - 5, 1).getValues()
        .map(function (r) { return toIsoDate(r[0]); })
        .filter(BreadClub.isIsoDate) : [];
      return { capacity: capacity, closedDates: closed };
    },

    listOrders: function () {
      var last = sheet.getLastRow();
      if (last < 2) return [];
      return sheet.getRange(2, 1, last - 1, COLUMNS.length).getValues().map(function (r) {
        // Count loaves from the flavor columns, so editing a quantity updates the day's count.
        var items = {};
        var counted = 0;
        BreadClub.MENU.forEach(function (item) {
          var q = Number(r[col(item.name.en)]) || 0;
          if (q > 0) { items[item.id] = q; counted += q; }
        });
        var method = r[col('Pickup or delivery')] === 'Delivery' ? 'delivery' : 'pickup';
        var digits = String(r[col('Phone number')] || '').replace(/\D/g, '');
        if (digits.length === 9) digits = '0' + digits; // a hand-typed number that lost its leading 0
        return {
          orderNumber: r[col('Order #')],
          orderId: String(r[col('Order ID')] || ''),
          date: toIsoDate(r[col('Delivery date')]),
          phone: digits,
          // A hand-typed row may only fill in "Loaves".
          loaves: counted || Number(r[col('Loaves')]) || 0,
          total: counted ? BreadClub.quote(items, method).total : Number(r[col('Total ₪')]) || 0,
          method: method,
          payment: /^cash/i.test(String(r[col('Payment')])) ? 'cash' : 'bit',
          status: String(r[col('Status')] || '').trim().toLowerCase()
        };
      });
    },

    appendOrder: function (rec, reminderFor) {
      var last = sheet.getLastRow();
      var numbers = last >= 2 ? sheet.getRange(2, col('Order #') + 1, last - 1, 1).getValues()
        .map(function (r) { return Number(r[0]) || 0; }) : [];
      var orderNumber = Math.max.apply(null, [FIRST_ORDER_NUMBER - 1].concat(numbers)) + 1;
      var rowIndex = last + 1;
      if (rowIndex > sheet.getMaxRows()) {
        // A new sheet has 1,000 rows; add more (with the same formats) when they run out.
        sheet.insertRowsAfter(sheet.getMaxRows(), 500);
        formatOrderRows(sheet);
      }
      var f = rowFormulas(rowIndex);
      var reminder = reminderFor(orderNumber);

      var row = COLUMNS.map(function () { return ''; });
      function put(name, value) { row[col(name)] = value; }
      put('Timestamp', Utilities.formatDate(new Date(rec.receivedAt), BreadClub.RULES.timeZone, 'yyyy-MM-dd HH:mm'));
      put('Full name', safeText(rec.name));
      put('Phone number', rec.phone); // plain-text column keeps the leading 0
      BreadClub.MENU.forEach(function (item) { put(item.name.en, rec.items[item.id] || ''); });
      put('Pickup or delivery', rec.method === 'delivery' ? 'Delivery' : 'Pickup');
      put('Payment', rec.payment === 'bit' ? 'Bit' : 'Cash at door');
      put('Delivery address', safeText(rec.address));
      put('Pickup / delivery day', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][rec.weekday] +
        ' ' + Number(rec.date.slice(8, 10)) + '.' + Number(rec.date.slice(5, 7)));
      put('Notes or allergies', safeText(rec.notes));
      put('Delivery date', rec.date); // column is plain-text format (set in setup), so it stays text
      put('Loaves', f.loaves);
      put('Subtotal ₪', f.subtotal);
      put('Delivery fee ₪', f.delivery);
      put('Total ₪', f.total);
      put('Paid', false);
      put('Status', rec.status);
      put('Payment reminder', reminder ? reminderFormula(rowIndex, reminder) : '');
      put('Order #', orderNumber);
      put('Language', rec.lang === 'he' ? 'Hebrew' : 'English');
      put('Order ID', safeText(rec.orderId));

      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      sheet.getRange(rowIndex, col('Paid') + 1).insertCheckboxes();
      SpreadsheetApp.flush();
      return orderNumber;
    }
  };
}

function handlerFor(test) {
  return BreadClubServer.createHandler({
    logic: BreadClub,
    store: sheetStore(test),
    now: function () { return new Date(); }
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---- Web app entry points ----------------------------------------------------

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== 'availability') return json({ ok: true, service: 'the-bread-club-orders' });
  try {
    return json(handlerFor(p.test === '1').availability());
  } catch (err) {
    return json({ ok: false, error: 'server' });
  }
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json({ ok: false, error: 'busy' });
  try {
    return json(handlerFor(payload && payload.test === true).submit(payload));
  } catch (err) {
    return json({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

// ---- One-time setup: run this from the Apps Script editor --------------------

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupOrdersSheet(ss, SHEETS.orders);
  setupOrdersSheet(ss, SHEETS.test);
  setupSettings(ss);
  setupSummary(ss);
}

function getOrCreate(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function setupOrdersSheet(ss, name) {
  var sheet = getOrCreate(ss, name);
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold').setBackground('#E6D8C2');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  formatOrderRows(sheet);
}

/** Formats, checkboxes, dropdowns and highlighting for every data row (safe to run again). */
function formatOrderRows(sheet) {
  var rows = sheet.getMaxRows() - 1;
  // Start clean, so running setup again after a layout change leaves no checkbox in the wrong column.
  sheet.getRange(2, 1, rows, sheet.getMaxColumns()).clearDataValidations().setNumberFormat('General');
  sheet.getRange(2, col('Payment') + 1, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Bit', 'Cash at door'], true).build());
  // Plain text, so a date typed by hand (2026-11-10) stays text like the website's and is summed.
  sheet.getRange(2, col('Delivery date') + 1, rows, 1).setNumberFormat('@');
  sheet.getRange(2, col('Phone number') + 1, rows, 1).setNumberFormat('@');
  sheet.getRange(2, col('Paid') + 1, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sheet.getRange(2, col('Status') + 1, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).setAllowInvalid(false).build());

  // Highlight: unpaid Bit orders (not canceled) in soft tan; canceled rows greyed out.
  // Cash orders are not flagged: they pay at the door.
  var all = sheet.getRange(2, 1, rows, COLUMNS.length);
  var paid = '$' + colLetter('Paid') + '2';
  var status = '$' + colLetter('Status') + '2';
  var first = '$' + colLetter('Order #') + '2';
  var pays = '$' + colLetter('Payment') + '2';
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(' + first + '<>"",' + status + '="canceled")')
      .setFontColor('#9C8B77').setStrikethrough(true).setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND(' + first + '<>"",' + pays + '="Bit",' + paid + '<>TRUE,' + status + '<>"canceled")')
      .setBackground('#F4E1CF').setRanges([all]).build()
  ]);
}

function setupSettings(ss) {
  var s = getOrCreate(ss, SHEETS.settings);
  if (s.getRange('A1').getValue() === '') {
    s.getRange('A1:B2').setValues([['Setting', 'Value'], ['Loaves per bake day', BreadClub.RULES.defaultCapacity]]);
    s.getRange('A4').setValue('Closed days (no orders). One date per row, e.g. 2026-12-25:');
    s.getRange('A1:B1').setFontWeight('bold');
    s.getRange('A4').setFontWeight('bold');
    s.getRange('A6:A100').setNumberFormat('yyyy-mm-dd');
    s.setColumnWidth(1, 420);
  }
}

function setupSummary(ss) {
  var s = getOrCreate(ss, SHEETS.summary);
  s.clear();
  var range = "'" + SHEETS.orders + "'!A2:" + colLetter(COLUMNS[COLUMNS.length - 1]);
  var num = colLetter('Order #');
  var d = colLetter('Delivery date');
  var st = colLetter('Status');
  var sums = BreadClub.MENU.map(function (item) { return 'sum(' + colLetter(item.name.en) + ')'; });
  sums.push('sum(' + colLetter('Loaves') + ')');
  var labels = BreadClub.MENU.map(function (item) {
    return 'sum(' + colLetter(item.name.en) + ") '" + item.name.en + "'";
  });
  labels.push('sum(' + colLetter('Loaves') + ") 'Total loaves'");

  s.getRange('A1').setValue('What to bake (canceled orders not counted)').setFontWeight('bold');
  s.getRange('A2').setFormula('=QUERY(' + range + ', "select ' + d + ', ' + sums.join(', ') +
    ' where ' + d + " is not null and " + st + " <> 'canceled' group by " + d + ' order by ' + d +
    ' desc label ' + d + " 'Delivery date', " + labels.join(', ') + '", 0)');

  s.getRange('L1').setValue('Bit orders still unpaid').setFontWeight('bold');
  var pays = colLetter('Payment');
  var paid = colLetter('Paid');
  var total = colLetter('Total ₪');
  s.getRange('L2').setFormula('=QUERY(' + range + ', "select ' + d + ', count(' + num + '), sum(' + total + ')' +
    ' where ' + d + ' is not null and ' + pays + " = 'Bit' and not " + paid + ' = true and ' + st +
    " <> 'canceled' group by " + d +
    ' order by ' + d + ' desc label ' + d + " 'Delivery date', count(" + num + ") 'Unpaid orders', sum(" + total +
    ") 'Unpaid ₪'\", 0)");
}
