'use strict';
/*
 * Stand-ins for the Google Sheet, used by tests and the local preview server.
 * They implement the same store interface as sheetStore() in apps-script/src/Code.js.
 */
const fs = require('node:fs');

const FIRST_ORDER_NUMBER = 1001;

function memoryStore(settings, initialOrders) {
  const store = {
    settings: Object.assign({ capacity: 18, closedDates: [] }, settings),
    orders: initialOrders || [],
    getSettings() { return store.settings; },
    listOrders() {
      return store.orders.map((o) => ({
        orderId: o.orderId, orderNumber: o.orderNumber, date: o.date, phone: o.phone, loaves: o.loaves, total: o.total,
        method: o.method, payment: o.payment, status: o.status
      }));
    },
    appendOrder(rec, reminderFor) {
      const orderNumber = Math.max(FIRST_ORDER_NUMBER - 1, ...store.orders.map((o) => Number(o.orderNumber) || 0)) + 1;
      const r = reminderFor(orderNumber);
      const reminderLink = r ? 'https://wa.me/972' + r.phone.slice(1) + '?text=' + encodeURIComponent(r.before + rec.total + r.after) : '';
      store.orders.push(Object.assign({ orderNumber, reminderLink }, rec));
      return orderNumber;
    }
  };
  return store;
}

/** Like memoryStore, but every change is written to a JSON file so orders survive a restart. */
function fileStore(path, settings) {
  const saved = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : {};
  const store = memoryStore(Object.assign({}, saved.settings, settings), saved.orders || []);
  const save = () => fs.writeFileSync(path, JSON.stringify({ settings: store.settings, orders: store.orders }, null, 2));
  const append = store.appendOrder;
  store.appendOrder = (rec, reminderFor) => { const n = append(rec, reminderFor); save(); return n; };
  store.save = save;
  return store;
}

module.exports = { memoryStore, fileStore };
