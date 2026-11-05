/* The Bread Club: home and info pages. Renders the menu from logic.js (prices live in one place)
   and runs the scroll motion: sideways menu, hero drift, reveals. */
(function () {
  'use strict';
  var t = BreadClubI18n.t;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Each flavor's loaf, cut in half (transparent background, all the same size). */
  var FLAVOR_PHOTOS = {
    plain: 'assets/img/loaf-plain.webp',
    garlic: 'assets/img/loaf-garlic.webp',
    'rosemary-garlic': 'assets/img/loaf-rosemary-garlic.webp',
    'cinnamon-sugar': 'assets/img/loaf-cinnamon-sugar.webp',
    olive: 'assets/img/loaf-olive.webp',
    'chocolate-chip': 'assets/img/loaf-chocolate-chip.webp',
    pesto: 'assets/img/loaf-pesto.webp'
  };
  var DEFAULT_LOAF = 'assets/img/loaf-plain.webp';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ---- menu: one panel per loaf -------------------------------------------------

  function renderMenu() {
    var host = document.getElementById('menu-list');
    if (!host) return;
    var lang = BreadClubI18n.lang;
    host.textContent = '';
    BreadClub.MENU.forEach(function (m, i) {
      var panel = el('article', 'panel menu-item');
      panel.appendChild(el('p', 'label panel__section', t(m.section === 'original' ? 'menu.original' : 'menu.collection')));
      var wheel = el('div', 'panel__loaf');
      var img = el('img');
      img.src = FLAVOR_PHOTOS[m.id] || DEFAULT_LOAF;
      img.alt = t('loafAlt', { name: m.name[lang] });
      img.width = 800; img.height = 800;
      img.loading = i < 2 ? 'eager' : 'lazy';
      wheel.appendChild(img);
      panel.appendChild(wheel);
      var text = el('div', 'panel__text');
      text.appendChild(el('h3', 'menu-item__name', m.name[lang]));
      var row = el('p', 'panel__row');
      row.appendChild(el('span', 'menu-item__price', BreadClubI18n.money(m.price)));
      var link = el('a', 'text-link', t('menu.addLink'));
      link.href = 'order.html';
      row.appendChild(link);
      text.appendChild(row);
      panel.appendChild(text);
      host.appendChild(panel);
    });
  }

  function renderContacts() {
    document.querySelectorAll('.js-wa').forEach(function (a) {
      var i = Number(a.getAttribute('data-baker'));
      var baker = BreadClubConfig.bakers[i];
      a.href = BreadClub.whatsappLink(baker.phone, t('wa.hello'));
      if (a.classList.contains('btn')) a.textContent = t('contact.wa', { name: t('baker.' + i) });
      else a.textContent = t('baker.' + i) + ' · ' + baker.display;
    });
    document.querySelectorAll('.js-instagram').forEach(function (a) { a.href = BreadClubConfig.instagram; });
  }

  // ---- motion -----------------------------------------------------------------------

  function reveal() {
    var items = document.querySelectorAll('.reveal, .strip');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (n) { io.observe(n); });
  }

  var hs = null; // sideways menu state

  /* The menu section stays on screen while vertical scrolling slides the loaves sideways. */
  function setupSideways() {
    var sec = document.querySelector('.hscroll');
    if (!sec || reduceMotion) return;
    sec.classList.add('hscroll--on');
    hs = {
      sec: sec, track: sec.querySelector('.hscroll__track'), bar: sec.querySelector('.hscroll__bar span'),
      count: sec.querySelector('.hscroll__count'), dist: 0
    };
    measureSideways();
    window.addEventListener('resize', measureSideways);
  }

  function measureSideways() {
    if (!hs) return;
    hs.dist = Math.max(0, hs.track.scrollWidth - hs.track.clientWidth);
    hs.sec.style.height = (window.innerHeight + hs.dist) + 'px';
    updateSideways();
  }

  function updateSideways() {
    if (!hs) return;
    var top = hs.sec.getBoundingClientRect().top;
    var p = hs.dist ? Math.min(1, Math.max(0, -top / hs.dist)) : 0;
    var dir = document.documentElement.dir === 'rtl' ? 1 : -1;
    hs.track.style.transform = 'translate3d(' + (dir * p * hs.dist) + 'px,0,0)';
    hs.bar.style.transform = 'scaleX(' + p + ')';
    var panels = hs.track.children;
    var current = Math.round(p * (panels.length - 1));
    var tx = dir * p * hs.dist;
    var centre = window.innerWidth / 2;
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.toggle('is-current', i === current);
      // Each loaf turns by exactly how far it has travelled, so it rolls like a wheel.
      var wheel = panels[i].querySelector('.panel__loaf');
      if (wheel) {
        var offset = panels[i].offsetLeft + panels[i].offsetWidth / 2 + tx - centre;
        var radius = Math.max(1, wheel.offsetWidth / 2);
        wheel.style.setProperty('--spin', (offset / radius * 57.2958).toFixed(1) + 'deg');
      }
    }
    hs.count.textContent = pad(current + 1) + ' / ' + pad(panels.length);
  }

  function onScroll() {
    var y = window.scrollY;
    var nav = document.querySelector('.nav');
    if (nav) nav.classList.toggle('is-scrolled', y > 24);
    if (reduceMotion) return;

    // Hero: the photo zooms in a little and the words drift up as you scroll away.
    var hero = document.querySelector('.hero');
    if (hero) {
      var p = Math.min(1, Math.max(0, y / hero.offsetHeight));
      hero.style.setProperty('--hero-p', p.toFixed(3));
    }

    updateSideways();
  }

  function scrollMotion() {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(function () { ticking = false; onScroll(); }); }
    }, { passive: true });
    onScroll();
  }

  function render() { renderMenu(); renderContacts(); }

  document.addEventListener('DOMContentLoaded', function () { render(); reveal(); setupSideways(); scrollMotion(); });
  document.addEventListener('bc:lang', function () { render(); measureSideways(); });
})();
