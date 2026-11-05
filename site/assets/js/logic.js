/*
 * The Bread Club: order rules shared by the website and the Google Apps Script backend.
 *
 * Everything that decides money, dates or capacity lives here so that the browser
 * (for showing totals) and the server (for accepting orders) use the same rules.
 * The server always recalculates; it never trusts a total sent by the browser.
 */
var BreadClub = (function () {
  'use strict';

  // ---- Business rules (approved by Eliana, Nov 2026) ----------------------

  var MENU = [
    { id: 'plain', section: 'original', price: 35, name: { en: 'Plain sourdough', he: 'מחמצת קלאסית' } },
    { id: 'garlic', section: 'collection', price: 42, name: { en: 'Garlic', he: 'שום' } },
    { id: 'rosemary-garlic', section: 'collection', price: 44, name: { en: 'Rosemary garlic', he: 'שום ורוזמרין' } },
    { id: 'cinnamon-sugar', section: 'collection', price: 42, name: { en: 'Cinnamon sugar', he: 'קינמון וסוכר' } },
    { id: 'olive', section: 'collection', price: 44, name: { en: 'Olive', he: 'זיתים' } },
    { id: 'chocolate-chip', section: 'collection', price: 44, name: { en: 'Chocolate chip', he: 'שוקולד צ׳יפס' } },
    { id: 'pesto', section: 'collection', price: 50, name: { en: 'Pesto', he: 'פסטו' } }
  ];

  var RULES = {
    timeZone: 'Asia/Jerusalem',
    deliveryWeekdays: [2, 5], // Tuesday, Friday (0 = Sunday)
    cutoffDaysBefore: 2, // Tuesday -> Sunday, Friday -> Wednesday
    cutoffHour: 16, // 4pm Israel time
    deliveryFee: 5,
    freeDeliveryFrom: 100, // subtotal of 100 or more delivers free
    defaultCapacity: 18, // loaves per bake day
    datesShown: 2, // how many upcoming bake days the order page offers
    searchDays: 60, // how far ahead to look when many days are closed
    maxQtyPerItem: 99,
    maxName: 80,
    maxAddress: 200,
    maxNotes: 500,
    maxOrdersPerPhonePerDay: 3 // stops one person (or a script) from filling a day; more by WhatsApp
  };

  // No prototype, so names like "constructor" or "toString" are never menu items.
  var MENU_BY_ID = Object.create(null);
  MENU.forEach(function (item) { MENU_BY_ID[item.id] = item; });

  // ---- Dates (all calendar dates are 'YYYY-MM-DD' strings in Israel time) --


  /** Current Israel date and minutes since midnight for a given instant. */
  function israelNow(instant) {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: RULES.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant).forEach(function (p) { parts[p.type] = p.value; });
    return {
      date: parts.year + '-' + parts.month + '-' + parts.day,
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }

  function isIsoDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  function addDays(iso, n) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function weekday(iso) { return new Date(iso + 'T00:00:00Z').getUTCDay(); }

  function cutoffFor(deliveryDate) {
    return { date: addDays(deliveryDate, -RULES.cutoffDaysBefore), hour: RULES.cutoffHour };
  }

  function isDeliveryDay(iso) { return RULES.deliveryWeekdays.indexOf(weekday(iso)) !== -1; }

  /** True while orders for this delivery date are still accepted. */
  function isOrderable(deliveryDate, now) {
    var cutoff = cutoffFor(deliveryDate);
    if (now.date !== cutoff.date) return now.date < cutoff.date;
    return now.minutes < cutoff.hour * 60;
  }

  /** The next bake days customers can order for, skipping closed dates. */
  function upcomingDates(now, closedDates, count) {
    var closed = closedDates || [];
    var want = count || RULES.datesShown;
    var out = [];
    for (var i = 0; i <= RULES.searchDays && out.length < want; i++) {
      var d = addDays(now.date, i);
      if (isDeliveryDay(d) && closed.indexOf(d) === -1 && isOrderable(d, now)) out.push(d);
    }
    return out;
  }

  // ---- Money ---------------------------------------------------------------

  /** Price an order. items: { menuId: quantity }. Unknown ids and zero quantities are ignored. */
  function quote(items, method) {
    var lines = [];
    var loaves = 0;
    var subtotal = 0;
    MENU.forEach(function (item) {
      var qty = (items && items[item.id]) || 0;
      if (qty > 0) {
        lines.push({ id: item.id, qty: qty, price: item.price, lineTotal: qty * item.price });
        loaves += qty;
        subtotal += qty * item.price;
      }
    });
    var deliveryFee = method === 'delivery' && subtotal < RULES.freeDeliveryFrom ? RULES.deliveryFee : 0;
    return { lines: lines, loaves: loaves, subtotal: subtotal, deliveryFee: deliveryFee, total: subtotal + deliveryFee };
  }

  // ---- Contact details -------------------------------------------------------

  /** Israeli mobile number as 05XXXXXXXX, or null. Accepts spaces, dashes, +972 / 972 prefixes. */
  function normalizePhone(raw) {
    if (typeof raw !== 'string') return null;
    var digits = raw.replace(/[\s\-().]/g, '');
    if (/^\+?972/.test(digits)) digits = '0' + digits.replace(/^\+?972/, '');
    return /^05\d{8}$/.test(digits) ? digits : null;
  }

  /** wa.me link for an Israeli mobile number (05XXXXXXXX), with optional prefilled text. */
  function whatsappLink(phone, text) {
    var url = 'https://wa.me/972' + phone.slice(1);
    return text ? url + '?text=' + encodeURIComponent(text) : url;
  }

  // ---- Validation ------------------------------------------------------------

  function cleanText(v) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : ''; }

  /**
   * Check a submitted order. ctx = { now, closedDates }.
   * Returns { ok: true, order } or { ok: false, errors: { field: code } }.
   */
  function validateOrder(input, ctx) {
    var src = input && typeof input === 'object' ? input : {};
    var errors = {};

    var orderId = typeof src.orderId === 'string' ? src.orderId : '';
    if (!/^[A-Za-z0-9-]{8,64}$/.test(orderId)) errors.orderId = 'invalid';

    var name = cleanText(src.name);
    if (name.length < 2) errors.name = 'required';
    else if (name.length > RULES.maxName) errors.name = 'too_long';

    var phone = normalizePhone(src.phone);
    if (!phone) errors.phone = 'invalid';

    var items = {};
    var rawItems = src.items && typeof src.items === 'object' ? src.items : {};
    Object.keys(rawItems).forEach(function (id) {
      var qty = rawItems[id];
      if (!MENU_BY_ID[id] || typeof qty !== 'number' || qty % 1 !== 0 || qty < 0 || qty > RULES.maxQtyPerItem) {
        errors.items = 'invalid';
      } else if (qty > 0) {
        items[id] = qty;
      }
    });
    if (!errors.items && Object.keys(items).length === 0) errors.items = 'empty';

    var method = src.method;
    if (method !== 'pickup' && method !== 'delivery') errors.method = 'required';

    var address = cleanText(src.address);
    if (method === 'delivery') {
      if (address.length < 4) errors.address = 'required';
      else if (address.length > RULES.maxAddress) errors.address = 'too_long';
    } else {
      address = '';
    }

    var payment = src.payment;
    if (payment !== 'bit' && payment !== 'cash') errors.payment = 'required';

    var date = src.date;
    if (!isIsoDate(date) || upcomingDates(ctx.now, ctx.closedDates).indexOf(date) === -1) errors.date = 'closed';

    var notes = typeof src.notes === 'string' ? src.notes.trim() : '';
    if (notes.length > RULES.maxNotes) errors.notes = 'too_long';

    var lang = src.lang === 'he' ? 'he' : 'en';

    if (Object.keys(errors).length) return { ok: false, errors: errors };
    return {
      ok: true,
      order: {
        orderId: orderId, name: name, phone: phone, items: items, method: method,
        address: address, payment: payment, date: date, notes: notes, lang: lang
      }
    };
  }

  /** Whether `requested` more loaves fit on a day that already has `booked`. */
  function checkCapacity(booked, requested, capacity) {
    var remaining = Math.max(0, capacity - booked);
    return { ok: requested <= remaining, remaining: remaining };
  }

  var api = {
    MENU: MENU, RULES: RULES, israelNow: israelNow, isIsoDate: isIsoDate, addDays: addDays,
    weekday: weekday, cutoffFor: cutoffFor, isOrderable: isOrderable, upcomingDates: upcomingDates,
    quote: quote, normalizePhone: normalizePhone, whatsappLink: whatsappLink,
    validateOrder: validateOrder, checkCapacity: checkCapacity
  };
  return api;
})();

// Export for Node tests. Browsers and Apps Script use the global `BreadClub` instead.
/* node:coverage ignore next */
if (typeof module !== 'undefined') module.exports = BreadClub;
