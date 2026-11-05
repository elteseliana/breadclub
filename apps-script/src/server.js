/*
 * The Bread Club: order handling, independent of where orders are stored.
 *
 * `store` is a small interface so the same code runs against Google Sheets
 * (Code.js) and against an in-memory/file store in tests and local preview:
 *   store.getSettings()      -> { capacity: number, closedDates: ['YYYY-MM-DD'] }
 *   store.listOrders()       -> [{ orderId, orderNumber, date, loaves, total, method, payment, status }]
 *   store.appendOrder(rec, reminderLinkFor) -> orderNumber (number)
 *                            reminderLinkFor(orderNumber) builds the WhatsApp reminder link
 * The caller must hold a lock around submit() so two orders cannot race for
 * the last loaves (Code.js uses LockService).
 */
var BreadClubServer = (function () {
  'use strict';

  var BIT_NUMBER = '054-911-2175';
  var DAY_NAMES = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  };

  function bookedLoaves(orders, date) {
    return orders.reduce(function (sum, o) {
      return o.date === date && o.status !== 'canceled' ? sum + o.loaves : sum;
    }, 0);
  }

  function shortDate(iso) {
    return Number(iso.slice(8, 10)) + '.' + Number(iso.slice(5, 7));
  }

  /** Pre-written payment reminder, opened in WhatsApp by Eliana or Shayna. They press send. */
  function reminderText(logic, order, total, orderNumber) {
    var day = DAY_NAMES[order.lang][logic.weekday(order.date)];
    if (order.lang === 'he') {
      return 'היי ' + order.name + ', כאן The Bread Club. תזכורת קטנה: ההזמנה שלך (#' + orderNumber +
        ') ליום ' + day + ' ' + shortDate(order.date) + ' יוצאת ₪' + total +
        '. אפשר לשלם בביט ל-' + BIT_NUMBER + ' (עם השם המלא בהערה). תודה';
    }
    return 'Hi ' + order.name + ', this is The Bread Club. A quick reminder that your order (#' + orderNumber +
      ') for ' + day + ' ' + shortDate(order.date) + ' comes to ₪' + total +
      '. You can pay by Bit to ' + BIT_NUMBER + ' (please write your full name in the note). Thank you';
  }

  function receipt(orderNumber, orderId, date, q, extra) {
    var r = {
      ok: true, orderNumber: orderNumber, orderId: orderId, date: date,
      loaves: q.loaves, subtotal: q.subtotal, deliveryFee: q.deliveryFee, total: q.total
    };
    Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }

  function createHandler(deps) {
    var logic = deps.logic;
    var store = deps.store;
    var clock = deps.now;

    function availability() {
      try {
        var settings = store.getSettings();
        var orders = store.listOrders();
        var now = logic.israelNow(clock());
        var dates = logic.upcomingDates(now, settings.closedDates).map(function (date) {
          var remaining = Math.max(0, settings.capacity - bookedLoaves(orders, date));
          return { date: date, cutoff: logic.cutoffFor(date), remaining: remaining, soldOut: remaining === 0 };
        });
        return { ok: true, dates: dates };
      } catch (e) {
        return { ok: false, error: 'server' };
      }
    }

    function submit(payload) {
      try {
        var input = payload && typeof payload === 'object' ? payload : {};

        // Bots fill the hidden "website" field. Pretend success, store nothing.
        if (input.website) return { ok: true, orderNumber: null };

        var orders = store.listOrders();

        // Same orderId again (double tap, retry after a timeout): return the original order.
        // (Rows typed into the sheet by hand have no orderId, so only look up real ids.)
        var id = typeof input.orderId === 'string' && input.orderId.length >= 8 ? input.orderId : null;
        var existing = id && orders.filter(function (o) { return o.orderId === id; })[0];
        if (existing) {
          return { ok: true, duplicate: true, orderNumber: existing.orderNumber, orderId: existing.orderId,
            date: existing.date, loaves: existing.loaves, total: existing.total,
            method: existing.method, payment: existing.payment };
        }

        var settings = store.getSettings();
        var now = logic.israelNow(clock());
        var checked = logic.validateOrder(input, { now: now, closedDates: settings.closedDates });
        if (!checked.ok) return { ok: false, error: 'invalid', fields: checked.errors };
        var order = checked.order;

        var q = logic.quote(order.items, order.method);
        var cap = logic.checkCapacity(bookedLoaves(orders, order.date), q.loaves, settings.capacity);
        if (!cap.ok) return { ok: false, error: 'full', date: order.date, remaining: cap.remaining };

        var record = {
          orderId: order.orderId, receivedAt: clock().toISOString(), date: order.date,
          weekday: logic.weekday(order.date), name: order.name, phone: order.phone,
          method: order.method, address: order.address, payment: order.payment,
          items: order.items, loaves: q.loaves, subtotal: q.subtotal, deliveryFee: q.deliveryFee,
          total: q.total, notes: order.notes, lang: order.lang, status: 'new', paid: false
        };
        var orderNumber = store.appendOrder(record, function (n) {
          return logic.whatsappLink(order.phone, reminderText(logic, order, q.total, n));
        });
        return receipt(orderNumber, order.orderId, order.date, q, { method: order.method, payment: order.payment });
      } catch (e) {
        return { ok: false, error: 'server' };
      }
    }

    return { availability: availability, submit: submit };
  }

  return { createHandler: createHandler, reminderText: reminderText, bookedLoaves: bookedLoaves };
})();

/* node:coverage ignore next */
if (typeof module !== 'undefined') module.exports = BreadClubServer;
