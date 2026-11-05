/* The Bread Club: home page. Renders the menu from logic.js so prices live in one place. */
(function () {
  'use strict';
  var t = BreadClubI18n.t;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderMenu() {
    var host = document.getElementById('menu-list');
    if (!host) return;
    var lang = BreadClubI18n.lang;
    host.textContent = '';
    [['original', 'menu.original'], ['collection', 'menu.collection']].forEach(function (section) {
      host.appendChild(el('h3', 'label label--dashed', t(section[1])));
      var ul = el('ul', 'menu-list');
      BreadClub.MENU.filter(function (m) { return m.section === section[0]; }).forEach(function (m) {
        var li = el('li');
        var row = el('div', 'menu-item');
        row.appendChild(el('span', 'menu-item__name', m.name[lang]));
        var dots = el('span', 'menu-item__dots');
        dots.setAttribute('aria-hidden', 'true');
        row.appendChild(dots);
        row.appendChild(el('span', 'menu-item__price', BreadClubI18n.money(m.price)));
        li.appendChild(row);
        ul.appendChild(li);
      });
      host.appendChild(ul);
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

  function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (n) { io.observe(n); });
  }

  function render() { renderMenu(); renderContacts(); }

  document.addEventListener('DOMContentLoaded', function () { render(); reveal(); });
  document.addEventListener('bc:lang', render);
})();
