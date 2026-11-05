/*
 * The Bread Club: order page.
 * Prices and rules come from logic.js; the server re-checks everything and is the only
 * thing that decides whether an order is accepted.
 */
(function () {
  'use strict';

  var t = BreadClubI18n.t;
  var cfg = BreadClubConfig;
  var L = BreadClub;
  var TIMEOUT_MS = 25000;
  var KEYS = { draft: 'bc-draft', pending: 'bc-pending-id', receipt: 'bc-receipt' };
  var testMode = new URLSearchParams(window.location.search).get('test') === '1';

  var state = {
    dates: null, // [{ date, cutoff, remaining, soldOut }] once loaded
    daysFailed: false,
    items: {},
    errors: {}, // field -> i18n key
    message: null, // { key, vars, wa } shown above the submit button
    sending: false,
    receipt: null
  };

  // ---- helpers -------------------------------------------------------------

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'className') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function session(key, value) {
    try {
      if (value === undefined) return JSON.parse(window.sessionStorage.getItem(key));
      if (value === null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable: the page still works, it just won't remember */ }
    return null;
  }
  function newOrderId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var s = '';
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes.forEach(function (b) { s += (b + 256).toString(16).slice(1); });
    return s;
  }
  function radioValue(name) {
    var r = document.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : '';
  }
  function setRadio(name, value) {
    var r = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (r && !r.disabled) r.checked = true;
  }
  function dateInfo(date) {
    return (state.dates || []).filter(function (d) { return d.date === date; })[0];
  }
  function itemsText() {
    return L.MENU.filter(function (m) { return state.items[m.id] > 0; })
      .map(function (m) { return state.items[m.id] + ' × ' + m.name[BreadClubI18n.lang]; }).join(', ');
  }
  function roomLink(date) {
    var text = t('wa.room', { day: BreadClubI18n.formatDay(date), items: itemsText() || '…' });
    return L.whatsappLink(cfg.bakers[0].phone, text);
  }
  function apiUrl(query) {
    return cfg.apiUrl + (cfg.apiUrl.indexOf('?') === -1 ? '?' : '&') + query + (testMode ? '&test=1' : '');
  }
  function fetchJson(url, options) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    return fetch(url, Object.assign({ signal: ctrl.signal, redirect: 'follow' }, options))
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .finally(function () { clearTimeout(timer); });
  }

  // ---- draft (survives a reload) --------------------------------------------

  function readForm() {
    return {
      date: radioValue('date'), method: radioValue('method'), payment: radioValue('payment'),
      name: $('name').value, phone: $('phone').value, address: $('address').value,
      notes: $('notes').value, items: state.items
    };
  }
  function saveDraft() { session(KEYS.draft, readForm()); }
  function restoreDraft() {
    var d = session(KEYS.draft);
    if (!d) return;
    ['name', 'phone', 'address', 'notes'].forEach(function (f) { if (typeof d[f] === 'string') $(f).value = d[f]; });
    if (d.method) setRadio('method', d.method);
    if (d.payment) setRadio('payment', d.payment);
    if (d.items && typeof d.items === 'object') {
      L.MENU.forEach(function (m) {
        var q = d.items[m.id];
        if (typeof q === 'number' && q > 0 && q <= L.RULES.maxQtyPerItem) state.items[m.id] = Math.floor(q);
      });
    }
    state.draftDate = d.date;
  }

  // ---- bake days --------------------------------------------------------------

  function loadDays() {
    state.dates = null;
    state.daysFailed = false;
    renderDays();
    return fetchJson(apiUrl('action=availability'), { method: 'GET' })
      .then(function (res) {
        if (!res || !res.ok || !Array.isArray(res.dates)) throw new Error('bad availability');
        state.dates = res.dates;
      })
      .catch(function () { state.daysFailed = true; })
      .then(function () { renderDays(); update(); });
  }

  function renderDays() {
    var host = $('days');
    var selected = radioValue('date') || state.draftDate;
    host.textContent = '';
    if (state.daysFailed) {
      host.appendChild(el('div', { className: 'notice notice--strong' }, [
        el('p', { text: t('order.daysError') }),
        (function () {
          var b = el('button', { type: 'button', className: 'btn btn--outline', text: t('order.retry') });
          b.addEventListener('click', loadDays);
          return b;
        })()
      ]));
      return;
    }
    if (!state.dates) { host.appendChild(el('p', { className: 'status', text: t('order.loadingDays') })); return; }
    if (!state.dates.length) {
      host.appendChild(el('div', { className: 'notice' }, [el('p', {}, [
        document.createTextNode(t('order.noDays') + ' '),
        el('a', { href: L.whatsappLink(cfg.bakers[0].phone, t('wa.hello')), text: 'WhatsApp' })
      ])]));
      return;
    }
    state.dates.forEach(function (d) {
      var id = 'date-' + d.date;
      var input = el('input', { type: 'radio', name: 'date', value: d.date, id: id });
      if (d.soldOut) input.disabled = true;
      if (d.date === selected && !d.soldOut) input.checked = true;
      var hint = d.soldOut ? t('order.soldOut')
        : t('order.orderBy', { day: BreadClubI18n.formatDay(d.cutoff.date, { day: undefined, month: undefined }) });
      var wrap = el('div', { className: 'choice-wrap' }, [
        el('label', { className: 'choice', for: id }, [input, el('span', { className: 'choice__box' }, [
          el('span', { className: 'choice__title', text: BreadClubI18n.formatDay(d.date) }),
          el('span', { className: 'hint', text: hint })
        ])])
      ]);
      if (d.soldOut) {
        wrap.appendChild(el('p', { className: 'choice__extra' }, [
          el('a', { href: roomLink(d.date), text: t('order.askRoom'), 'data-room': d.date })
        ]));
      }
      host.appendChild(wrap);
    });
  }

  // ---- loaves -------------------------------------------------------------------

  function renderLoaves() {
    var host = $('loaves');
    var lang = BreadClubI18n.lang;
    host.textContent = '';
    L.MENU.forEach(function (m) {
      var qty = state.items[m.id] || 0;
      var name = m.name[lang];
      var minus = el('button', { type: 'button', 'aria-label': t('order.less', { item: name }), 'data-step': '-1', 'data-id': m.id, text: '−' });
      var plus = el('button', { type: 'button', 'aria-label': t('order.more', { item: name }), 'data-step': '1', 'data-id': m.id, text: '+' });
      if (qty === 0) minus.disabled = true;
      if (qty >= L.RULES.maxQtyPerItem) plus.disabled = true;
      host.appendChild(el('li', { className: 'loaf' + (qty ? ' has-qty' : ''), 'data-id': m.id }, [
        el('span', { className: 'loaf__name' }, [
          el('span', { className: 'loaf__title', text: name, id: 'loaf-' + m.id }),
          el('span', { className: 'hint', text: BreadClubI18n.money(m.price) })
        ]),
        el('span', { className: 'stepper' }, [
          minus,
          el('output', { 'aria-live': 'polite', 'aria-labelledby': 'loaf-' + m.id, text: String(qty) }),
          plus
        ])
      ]));
    });
  }

  function step(id, delta) {
    var next = Math.max(0, Math.min(L.RULES.maxQtyPerItem, (state.items[id] || 0) + delta));
    if (next) state.items[id] = next; else delete state.items[id];
    delete state.errors.items;
    renderLoaves();
    var again = document.querySelector('.loaf[data-id="' + id + '"] button[data-step="' + delta + '"]');
    if (again && !again.disabled) again.focus();
    else {
      var other = document.querySelector('.loaf[data-id="' + id + '"] button[data-step="' + -delta + '"]');
      if (other) other.focus();
    }
    update();
  }

  // ---- totals, capacity and messages -----------------------------------------------

  function overCapacity() {
    var info = dateInfo(radioValue('date'));
    var q = L.quote(state.items, radioValue('method'));
    return info && q.loaves > info.remaining ? info : null;
  }

  function update() {
    var method = radioValue('method');
    var q = L.quote(state.items, method);
    $('sum-loaves').textContent = q.loaves;
    $('sum-subtotal').textContent = BreadClubI18n.money(q.subtotal);
    $('sum-delivery-row').hidden = method !== 'delivery';
    $('sum-delivery').textContent = q.deliveryFee ? BreadClubI18n.money(q.deliveryFee) : t('order.free');
    $('sum-total').textContent = BreadClubI18n.money(q.total);
    $('address-field').hidden = method !== 'delivery';

    var note = $('capacity-note');
    note.textContent = '';
    var over = overCapacity();
    if (over) {
      var key = over.remaining === 1 ? 'order.leftOne' : 'order.left';
      note.appendChild(el('div', { className: 'notice notice--strong' }, [el('p', {}, [
        document.createTextNode(t(key, { n: over.remaining, day: BreadClubI18n.formatDay(over.date) }) + ' '),
        el('a', { href: roomLink(over.date), text: 'WhatsApp' })
      ])]));
    }
    renderErrors();
    renderMessage();
    saveDraft();
  }

  var FIELD_INPUT = { name: 'name', phone: 'phone', address: 'address', notes: 'notes' };

  function renderErrors() {
    ['date', 'items', 'method', 'address', 'name', 'phone', 'payment', 'notes'].forEach(function (f) {
      var key = state.errors[f];
      $(f + '-error').textContent = key ? t(key) : '';
      if (FIELD_INPUT[f]) {
        if (key) $(FIELD_INPUT[f]).setAttribute('aria-invalid', 'true');
        else $(FIELD_INPUT[f]).removeAttribute('aria-invalid');
      }
    });
  }

  function renderMessage() {
    var host = $('form-message');
    host.textContent = '';
    var m = state.message;
    if (!m) return;
    var p = el('p', {}, [document.createTextNode(t(m.key, m.vars) + ' ')]);
    if (m.wa) p.appendChild(el('a', { href: roomLink(m.wa), text: 'WhatsApp' }));
    host.appendChild(el('div', { className: 'notice notice--strong' }, [p]));
  }

  function errorKey(field, code) {
    if (field === 'date') return code === 'closed' ? 'order.dayClosed' : 'err.date';
    if (code === 'too_long' && field !== 'notes') return 'err.too_long';
    return 'err.' + field;
  }

  // ---- submit -------------------------------------------------------------------

  function collect() {
    var f = readForm();
    return {
      orderId: session(KEYS.pending) || '', name: f.name, phone: f.phone, items: state.items,
      method: f.method, address: f.address, payment: f.payment, date: f.date, notes: f.notes,
      lang: BreadClubI18n.lang, website: $('website').value, test: testMode
    };
  }

  function validateLocally(payload) {
    var check = L.validateOrder(Object.assign({}, payload, { orderId: 'local-check' }), {
      now: { date: '0000-01-01', minutes: 0 }, closedDates: []
    });
    var errors = check.ok ? {} : check.errors;
    delete errors.date; // the server decides which days are open
    var out = {};
    Object.keys(errors).forEach(function (f) { if (f !== 'orderId') out[f] = errorKey(f, errors[f]); });
    if (!payload.date) out.date = 'err.date';
    return out;
  }

  function focusFirstError() {
    var order = ['date', 'items', 'method', 'address', 'name', 'phone', 'payment', 'notes'];
    for (var i = 0; i < order.length; i++) {
      var f = order[i];
      if (!state.errors[f]) continue;
      var target = FIELD_INPUT[f] ? $(FIELD_INPUT[f])
        : f === 'items' ? document.querySelector('.loaf button[data-step="1"]')
          : document.querySelector('input[name="' + f + '"]:not(:disabled)');
      if (target) { target.focus(); return; }
    }
  }

  function setSending(on) {
    state.sending = on;
    var b = $('submit');
    b.disabled = on;
    b.textContent = t(on ? 'order.sending' : 'order.submit');
    b.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function onSubmit(e) {
    e.preventDefault();
    if (state.sending) return;
    state.message = null;
    if (!session(KEYS.pending)) session(KEYS.pending, newOrderId());
    var payload = collect();
    state.errors = validateLocally(payload);
    if (Object.keys(state.errors).length) {
      state.message = { key: 'order.fix' };
      update();
      focusFirstError();
      return;
    }
    var over = overCapacity();
    if (over) { update(); $('capacity-note').scrollIntoView({ block: 'center' }); return; }

    setSending(true);
    update();
    fetchJson(cfg.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(handleResult, function () { handleResult({ ok: false, error: 'network' }); });
  }

  function handleResult(res) {
    setSending(false);
    if (res && res.ok) {
      var receipt = {
        orderNumber: res.orderNumber, date: res.date, loaves: res.loaves, total: res.total,
        method: res.method, payment: res.payment, name: $('name').value.trim().split(/\s+/)[0]
      };
      session(KEYS.receipt, receipt);
      session(KEYS.pending, null);
      session(KEYS.draft, null);
      showDone(receipt);
      return;
    }
    var error = res && res.error;
    if (error === 'invalid' && res.fields) {
      state.errors = {};
      Object.keys(res.fields).forEach(function (f) {
        if (f !== 'orderId') state.errors[f] = errorKey(f, res.fields[f]);
      });
      if (res.fields.orderId) session(KEYS.pending, newOrderId());
      if (res.fields.date) { state.message = { key: 'order.dayClosed' }; loadDays(); }
      else state.message = { key: 'order.fix' };
      update();
      focusFirstError();
    } else if (error === 'full') {
      state.message = { key: 'order.fullNow', vars: { day: BreadClubI18n.formatDay(res.date) }, wa: res.date };
      loadDays();
      update();
    } else {
      // Network error, timeout, busy or server error: we don't know if it was saved.
      // Retrying is safe because the same order ID is sent again.
      state.message = { key: 'order.unknown' };
      update();
      $('submit').focus();
    }
  }

  // ---- confirmation ----------------------------------------------------------------

  function showDone(r) {
    state.receipt = r;
    $('order-view').hidden = true;
    var v = $('done-view');
    v.hidden = false;
    renderDone();
    window.scrollTo(0, 0);
    v.focus();
  }

  function renderDone() {
    var r = state.receipt;
    if (!r) return;
    var total = BreadClubI18n.money(r.total);
    $('done-title').textContent = t('done.title', { name: r.name || '' }).replace(/,\s*$/, '');
    $('done-summary').textContent = t(r.loaves === 1 ? 'done.summaryOne' : 'done.summary', {
      n: r.orderNumber || '—', day: r.date ? BreadClubI18n.formatDay(r.date) : '', loaves: r.loaves
    });
    $('done-total').textContent = total;
    var bit = r.payment !== 'cash';
    $('done-bit').hidden = !bit;
    $('done-cash').hidden = bit;
    $('done-bit-text').textContent = t('done.payBit', { total: total });
    $('done-bit-number').textContent = cfg.bitNumber;
    $('done-cash').textContent = t('done.payCash', { total: total });
    $('done-method').textContent = t(r.method === 'delivery' ? 'done.delivery' : 'done.pickup');
  }

  function copyBit() {
    var b = $('copy-bit');
    var done = function () { b.textContent = t('done.copied'); setTimeout(function () { b.textContent = t('done.copy'); }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cfg.bitNumber.replace(/-/g, '')).then(done, function () {});
    }
  }

  // ---- start ------------------------------------------------------------------------

  function start() {
    if (!cfg.apiUrl) {
      $('offline').hidden = false;
      $('google-form-link').href = cfg.googleFormUrl;
      return;
    }
    $('copy-bit').addEventListener('click', copyBit);
    var another = $('another');
    another.href = window.location.pathname + window.location.search; // keeps ?test=1 for test orders
    another.addEventListener('click', function () { session(KEYS.receipt, null); });

    var receipt = session(KEYS.receipt);
    if (receipt && typeof receipt === 'object') { showDone(receipt); return; }

    var form = $('order-form');
    form.hidden = false;
    restoreDraft();
    renderLoaves();
    update();
    loadDays();

    form.addEventListener('submit', onSubmit);
    $('loaves').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-step]');
      if (b) step(b.getAttribute('data-id'), Number(b.getAttribute('data-step')));
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'date' || e.target.name === 'method' || e.target.name === 'payment') delete state.errors[e.target.name];
      if (e.target.name === 'date') state.draftDate = e.target.value;
      update();
    });
    form.addEventListener('input', function (e) {
      if (state.errors[e.target.name]) { delete state.errors[e.target.name]; renderErrors(); }
      saveDraft();
    });
  }

  document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('bc:lang', function () {
    if (!$('order-form').hidden) { renderDays(); renderLoaves(); update(); }
    renderDone();
    var b = $('submit');
    if (b) b.textContent = t(state.sending ? 'order.sending' : 'order.submit');
  });
})();
