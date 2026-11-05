/*
 * The Bread Club: English and Hebrew text.
 * Hebrew was written by Claude and must be proofread by a native speaker before launch
 * (see docs/HEBREW-to-proofread.md).
 */
var BreadClubI18n = (function () {
  'use strict';

  var T = {
    en: {
      'meta.title': 'The Bread Club | Homemade sourdough in Ra\'anana',
      'meta.orderTitle': 'Order | The Bread Club',
      'nav.menu': 'menu', 'nav.how': 'how it works', 'nav.about': 'about', 'nav.order': 'Order',
      'nav.lang': 'עברית', 'nav.langLabel': 'קראו את האתר בעברית', 'nav.home': 'The Bread Club, home',
      'hero.line': 'homemade sourdough, Ra\'anana',
      'cta.order': 'Order now',
      'menu.title': 'The menu',
      'menu.original': 'The original', 'menu.collection': 'The collection', 'menu.extras': 'Extras',
      'menu.delivery': 'Delivery, Tue & Fri', 'menu.deliveryNote': 'free on orders of 100 ₪ or more',
      'menu.pay1': 'Payment via Bit confirms your order', 'menu.pay2': 'or cash at the door',
      'menu.tagline': 'members only. everyone\'s a member.',
      'how.label': 'How ordering works',
      'how.1.title': 'Choose', 'how.1.text': 'Pick a bake day, Tuesday or Friday, and your loaves.',
      'how.2.title': 'Pay', 'how.2.text': 'Bit with your full name in the note, or cash at the door. Your order is confirmed once it\'s paid.',
      'how.3.title': 'Enjoy', 'how.3.text': 'We deliver to your door, or you pick up. We\'ll send the pickup address on WhatsApp.',
      'info.label': 'Delivery & pickup',
      'info.days': 'Bake days', 'info.daysText': 'Tuesday and Friday',
      'info.cutoff': 'Order by', 'info.cutoffText': 'Sunday 4pm for Tuesday. Wednesday 4pm for Friday.',
      'info.delivery': 'Delivery', 'info.deliveryText': '+5 ₪, free on orders of 100 ₪ or more. Ra\'anana, Herzliya and close by. Further away for bigger orders, just ask.',
      'info.pickup': 'Pickup', 'info.pickupText': 'Free. We\'ll send you the address on WhatsApp after you order.',
      'info.payment': 'Payment', 'info.paymentText': 'Bit to 054-911-2175 with your full name in the note, or cash at the door.',
      'info.limit': 'Each bake', 'info.limitText': 'We bake a small batch each day. When it\'s full, message us and we\'ll see what we can do.',
      'about.label': 'About the club',
      'about.title': 'Two friends, one oven',
      'about.p1': 'The Bread Club is Eliana and Shayna, two friends baking sourdough in Ra\'anana.',
      'about.p2': 'Last year we baked plain loaves for neighbours and friends. This year we came back with new flavors and new packaging, and the same slow sourdough.',
      'about.p3': 'Every loaf is baked to order, twice a week.',
      'gallery.label': 'From the oven',
      'gallery.more': 'more on Instagram',
      'faq.label': 'Questions',
      'faq.q1': 'Can I order a different flour, like spelt?', 'faq.a1': 'Yes. Message us on WhatsApp, minimum 2 loaves.',
      'faq.q2': 'Do you deliver outside Ra\'anana?', 'faq.a2': 'We deliver around Ra\'anana, Herzliya and close by. For bigger orders we\'re happy to drive further, so message us first.',
      'faq.q3': 'I have an allergy.', 'faq.a3': 'Please write it in the notes when you order.',
      'faq.q4': 'How do you match my Bit payment?', 'faq.a4': 'By your full name in the Bit note, so please don\'t skip it.',
      'contact.label': 'Say hello', 'contact.title': 'Questions? Message us',
      'contact.instagram': 'Follow on Instagram', 'contact.wa': 'WhatsApp {name}',
      'baker.0': 'Eliana', 'baker.1': 'Shayna', 'nav.skip': 'Skip to content',
      'menu.noscript': 'Please turn on JavaScript to see the menu, or see it on Instagram.',
      'footer.est': 'Est. 2025', 'footer.small': 'Homemade sourdough, baked to order in Ra\'anana.',
      // order page
      'order.label': 'Order', 'order.title': 'Place an order', 'order.line': 'baked to order, Tuesdays and Fridays',
      'order.day': 'Bake day', 'order.loaves': 'Your loaves', 'order.method': 'Pickup or delivery',
      'order.details': 'Your details', 'order.payment': 'Payment', 'order.notes': 'Notes',
      'order.orderBy': 'order by {day}, 4pm',
      'order.soldOut': 'fully booked', 'order.askRoom': 'Message us to check for room',
      'order.loadingDays': 'Checking bake days…',
      'order.daysError': 'We couldn\'t load the bake days. Check your connection and try again.',
      'order.retry': 'Try again',
      'order.noDays': 'Ordering is closed right now. Message us on WhatsApp.',
      'order.less': 'One less {item}', 'order.more': 'One more {item}',
      'order.pickup': 'Pickup', 'order.pickupHint': 'Free. We\'ll send the address on WhatsApp.',
      'order.delivery': 'Delivery', 'order.deliveryHint': '+5 ₪, free from 100 ₪. Ra\'anana, Herzliya and close by.',
      'order.address': 'Delivery address', 'order.addressHint': 'Street, number, city. Further away? Message us first.',
      'order.name': 'Full name', 'order.phone': 'Mobile number', 'order.phoneHint': 'We\'ll message you on WhatsApp.',
      'order.bit': 'Bit', 'order.bitHint': 'Pay to 054-911-2175 with your full name in the note.',
      'order.cash': 'Cash at the door', 'order.cashHint': 'Pay when you get your bread.',
      'order.notesLabel': 'Notes or allergies (optional)',
      'order.subtotal': 'Loaves', 'order.deliveryFee': 'Delivery', 'order.free': 'free', 'order.total': 'Total',
      'order.submit': 'Place order', 'order.sending': 'Placing your order…',
      'order.confirmNote': 'Bit payment confirms your order. Cash is paid at the door.',
      'done.confirmBit': 'Your order is confirmed once your Bit payment arrives.', 'done.confirmCash': 'See you at the door.',
      'order.limit': 'You already have 3 orders for {day}. To add more, message us on WhatsApp.',
      'order.left': 'Only {n} loaves left for {day}. Choose fewer, or message us to check.',
      'order.leftOne': 'Only 1 loaf left for {day}. Choose fewer, or message us to check.',
      'order.fullNow': '{day} just filled up. Choose another day, or message us to check for room.',
      'order.dayClosed': 'Ordering for that day just closed. Please choose another day.',
      'order.unknown': 'We couldn\'t confirm your order went through. Please tap "Place order" again on this page. It\'s safe: from this page you won\'t get a duplicate order. Still stuck? Message us:',
      'order.fix': 'Please check the highlighted fields.',
      'order.offline': 'Online ordering opens soon. For now, please use our order form.',
      'order.useForm': 'Open the order form',
      'err.name': 'Please write your full name.', 'err.phone': 'Please enter an Israeli mobile number, like 054-123-4567.',
      'err.items': 'Choose at least one loaf.', 'err.method': 'Choose pickup or delivery.',
      'err.address': 'Please write the delivery address.', 'err.payment': 'Choose how you\'ll pay.',
      'err.date': 'Choose a bake day.', 'err.notes': 'Notes are too long (500 characters max).',
      'err.too_long': 'This is too long.',
      // confirmation
      'done.label': 'Order received', 'done.title': 'Thank you, {name}',
      'done.summary': 'Order #{n} · {day} · {loaves} loaves',
      'done.summaryOne': 'Order #{n} · {day} · 1 loaf',
      'done.payBit': 'To confirm, send {total} by Bit to', 'done.payBitNote': 'Write your full name in the Bit note so we can match it to your order.',
      'done.copy': 'Copy number', 'done.copied': 'Copied',
      'done.payCash': 'Please have {total} in cash ready when you get your bread.',
      'done.pickup': 'We\'ll send you the pickup address on WhatsApp.',
      'done.delivery': 'We\'ll deliver to the address you gave us.',
      'done.questions': 'Questions or changes? Message us on WhatsApp.',
      'done.another': 'Place another order',
      'wa.room': 'Hi, I\'d like to order for {day}: {items}. Is there room?',
      'wa.hello': 'Hi, I have a question about The Bread Club.',
      'wa.check': 'Hi, I just ordered on the website for {day} ({items}) and I\'m not sure it went through. My name is {name}. Can you check?',
      'wa.more': 'Hi, I\'d like to add another order for {day}: {items}.'
    },
    he: {
      'meta.title': 'The Bread Club | לחם מחמצת ביתי ברעננה',
      'meta.orderTitle': 'הזמנה | The Bread Club',
      'nav.menu': 'תפריט', 'nav.how': 'איך מזמינים', 'nav.about': 'עלינו', 'nav.order': 'להזמנה',
      'nav.lang': 'English', 'nav.langLabel': 'Read this site in English', 'nav.home': 'The Bread Club, דף הבית',
      'hero.line': 'לחם מחמצת ביתי, רעננה',
      'cta.order': 'להזמנה',
      'menu.title': 'התפריט',
      'menu.original': 'הקלאסי', 'menu.collection': 'הקולקציה', 'menu.extras': 'תוספות',
      'menu.delivery': 'משלוח, שלישי ושישי', 'menu.deliveryNote': 'חינם בהזמנה מ-100 ₪',
      'menu.pay1': 'תשלום בביט מאשר את ההזמנה', 'menu.pay2': 'או מזומן בדלת',
      'menu.tagline': 'members only. everyone\'s a member.',
      'how.label': 'איך מזמינים',
      'how.1.title': 'בוחרים', 'how.1.text': 'בוחרים יום אפייה, שלישי או שישי, ואת הלחמים.',
      'how.2.title': 'משלמים', 'how.2.text': 'בביט עם השם המלא בהערה, או במזומן בדלת. ההזמנה מאושרת אחרי התשלום.',
      'how.3.title': 'נהנים', 'how.3.text': 'אנחנו מביאות עד הבית, או שאתם אוספים. את כתובת האיסוף נשלח בוואטסאפ.',
      'info.label': 'משלוח ואיסוף',
      'info.days': 'ימי אפייה', 'info.daysText': 'שלישי ושישי',
      'info.cutoff': 'מזמינים עד', 'info.cutoffText': 'ראשון ב-16:00 לשלישי. רביעי ב-16:00 לשישי.',
      'info.delivery': 'משלוח', 'info.deliveryText': 'תוספת 5 ₪, חינם בהזמנה מ-100 ₪. רעננה, הרצליה והסביבה. להזמנות גדולות אפשר גם רחוק יותר, רק תשאלו.',
      'info.pickup': 'איסוף', 'info.pickupText': 'חינם. את הכתובת נשלח בוואטסאפ אחרי ההזמנה.',
      'info.payment': 'תשלום', 'info.paymentText': 'ביט ל-054-911-2175 עם השם המלא בהערה, או מזומן בדלת.',
      'info.limit': 'בכל אפייה', 'info.limitText': 'אנחנו אופות כמות קטנה בכל יום. כשהיום מלא, שלחו לנו הודעה ונראה מה אפשר לעשות.',
      'about.label': 'על המועדון',
      'about.title': 'שתי חברות, תנור אחד',
      'about.p1': 'The Bread Club זה אליאנה ושיינה, שתי חברות שאופות לחם מחמצת ברעננה.',
      'about.p2': 'בשנה שעברה אפינו לחמים פשוטים לשכנים ולחברים. השנה חזרנו עם טעמים חדשים, אריזה חדשה, ואותה מחמצת איטית.',
      'about.p3': 'כל לחם נאפה לפי הזמנה, פעמיים בשבוע.',
      'gallery.label': 'מהתנור',
      'gallery.more': 'עוד באינסטגרם',
      'faq.label': 'שאלות',
      'faq.q1': 'אפשר להזמין מקמח אחר, כמו כוסמין?', 'faq.a1': 'כן. שלחו לנו הודעה בוואטסאפ, מינימום 2 לחמים.',
      'faq.q2': 'יש משלוחים מחוץ לרעננה?', 'faq.a2': 'אנחנו מגיעות לרעננה, הרצליה והסביבה. להזמנות גדולות נשמח לנסוע רחוק יותר, אז כתבו לנו קודם.',
      'faq.q3': 'יש לי אלרגיה.', 'faq.a3': 'כתבו את זה בהערות בזמן ההזמנה.',
      'faq.q4': 'איך אתן יודעות שהתשלום בביט שלי?', 'faq.a4': 'לפי השם המלא בהערה של הביט, אז חשוב לא לדלג על זה.',
      'contact.label': 'דברו איתנו', 'contact.title': 'שאלות? כתבו לנו',
      'contact.instagram': 'עקבו באינסטגרם', 'contact.wa': 'וואטסאפ ל{name}',
      'baker.0': 'אליאנה', 'baker.1': 'שיינה', 'nav.skip': 'דילוג לתוכן',
      'footer.est': 'Est. 2025', 'footer.small': 'לחם מחמצת ביתי, נאפה לפי הזמנה ברעננה.',
      'order.label': 'הזמנה', 'order.title': 'הזמנה חדשה', 'order.line': 'נאפה לפי הזמנה, בימי שלישי ושישי',
      'order.day': 'יום אפייה', 'order.loaves': 'הלחמים שלכם', 'order.method': 'איסוף או משלוח',
      'order.details': 'הפרטים שלכם', 'order.payment': 'תשלום', 'order.notes': 'הערות',
      'order.orderBy': 'להזמין עד {day} ב-16:00',
      'order.soldOut': 'מלא', 'order.askRoom': 'כתבו לנו לבדוק אם יש מקום',
      'order.loadingDays': 'בודקות ימי אפייה…',
      'order.daysError': 'לא הצלחנו לטעון את ימי האפייה. בדקו את החיבור ונסו שוב.',
      'order.retry': 'לנסות שוב',
      'order.noDays': 'ההזמנות סגורות כרגע. כתבו לנו בוואטסאפ.',
      'order.less': 'פחות {item}', 'order.more': 'עוד {item}',
      'order.pickup': 'איסוף', 'order.pickupHint': 'חינם. את הכתובת נשלח בוואטסאפ.',
      'order.delivery': 'משלוח', 'order.deliveryHint': 'תוספת 5 ₪, חינם מ-100 ₪. רעננה, הרצליה והסביבה.',
      'order.address': 'כתובת למשלוח', 'order.addressHint': 'רחוב, מספר, עיר. רחוק יותר? כתבו לנו קודם.',
      'order.name': 'שם מלא', 'order.phone': 'מספר נייד', 'order.phoneHint': 'נכתוב לכם בוואטסאפ.',
      'order.bit': 'ביט', 'order.bitHint': 'ל-054-911-2175 עם השם המלא בהערה.',
      'order.cash': 'מזומן בדלת', 'order.cashHint': 'משלמים כשמקבלים את הלחם.',
      'order.notesLabel': 'הערות או אלרגיות (לא חובה)',
      'order.subtotal': 'לחמים', 'order.deliveryFee': 'משלוח', 'order.free': 'חינם', 'order.total': 'סה״כ',
      'order.submit': 'לשליחת ההזמנה', 'order.sending': 'שולחות את ההזמנה…',
      'order.confirmNote': 'תשלום בביט מאשר את ההזמנה. מזומן משלמים בדלת.',
      'done.confirmBit': 'ההזמנה מאושרת כשהתשלום בביט מגיע.', 'done.confirmCash': 'נתראה בדלת.',
      'order.limit': 'כבר יש לכם 3 הזמנות ל{day}. כדי להוסיף, כתבו לנו בוואטסאפ.',
      'order.left': 'נשארו רק {n} לחמים ל{day}. בחרו פחות, או כתבו לנו לבדוק.',
      'order.leftOne': 'נשאר רק לחם אחד ל{day}. בחרו פחות, או כתבו לנו לבדוק.',
      'order.fullNow': '{day} התמלא הרגע. בחרו יום אחר, או כתבו לנו לבדוק אם יש מקום.',
      'order.dayClosed': 'ההזמנות ליום הזה נסגרו הרגע. בחרו יום אחר.',
      'order.unknown': 'לא הצלחנו לוודא שההזמנה התקבלה. לחצו שוב על "לשליחת ההזמנה" בעמוד הזה. זה בטוח: מהעמוד הזה ההזמנה לא תירשם פעמיים. עדיין לא עובד? כתבו לנו:',
      'order.fix': 'בדקו את השדות המסומנים.',
      'order.offline': 'ההזמנה באתר תיפתח בקרוב. בינתיים, הזמינו דרך הטופס שלנו.',
      'order.useForm': 'לטופס ההזמנה',
      'err.name': 'כתבו שם מלא.', 'err.phone': 'הכניסו מספר נייד ישראלי, למשל 054-123-4567.',
      'err.items': 'בחרו לפחות לחם אחד.', 'err.method': 'בחרו איסוף או משלוח.',
      'err.address': 'כתבו כתובת למשלוח.', 'err.payment': 'בחרו איך תשלמו.',
      'err.date': 'בחרו יום אפייה.', 'err.notes': 'ההערות ארוכות מדי (עד 500 תווים).',
      'err.too_long': 'ארוך מדי.',
      'done.label': 'ההזמנה התקבלה', 'done.title': 'תודה, {name}',
      'done.summary': 'הזמנה #{n} · {day} · {loaves} לחמים',
      'done.summaryOne': 'הזמנה #{n} · {day} · לחם אחד',
      'done.payBit': 'כדי לאשר, שלחו {total} בביט ל-', 'done.payBitNote': 'כתבו את השם המלא בהערה של הביט כדי שנוכל לזהות את ההזמנה.',
      'done.copy': 'העתקת המספר', 'done.copied': 'הועתק',
      'done.payCash': 'הכינו בבקשה {total} במזומן לקבלת הלחם.',
      'done.pickup': 'את כתובת האיסוף נשלח לכם בוואטסאפ.',
      'done.delivery': 'נביא את ההזמנה לכתובת שנתתם.',
      'done.questions': 'שאלות או שינויים? כתבו לנו בוואטסאפ.',
      'done.another': 'הזמנה נוספת',
      'wa.room': 'היי, אשמח להזמין ל{day}: {items}. יש מקום?',
      'wa.hello': 'היי, יש לי שאלה על The Bread Club.',
      'wa.check': 'היי, הזמנתי עכשיו באתר ל{day} ({items}) ואני לא בטוח/ה שזה עבר. השם שלי {name}. תוכלו לבדוק?',
      'wa.more': 'היי, אשמח להוסיף עוד הזמנה ל{day}: {items}.'
    }
  };

  var STORAGE_KEY = 'bc-lang';

  function read(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, v) { try { window.localStorage.setItem(key, v); } catch (e) { /* private mode */ } }

  function detect() {
    var fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (fromUrl === 'he' || fromUrl === 'en') return fromUrl;
    var saved = read(STORAGE_KEY);
    return saved === 'he' ? 'he' : 'en';
  }

  var lang = detect();

  function t(key, vars) {
    var s = T[lang][key];
    if (s === undefined) s = T.en[key];
    return s.replace(/\{(\w+)\}/g, function (m, name) { return vars && name in vars ? vars[name] : m; });
  }

  function apply(root) {
    var scope = root || document;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    scope.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    scope.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var bits = pair.split(':');
        el.setAttribute(bits[0], t(bits[1]));
      });
    });
    document.querySelectorAll('[data-lang-toggle]').forEach(function (b) { b.lang = lang === 'he' ? 'en' : 'he'; });
    var titleKey = document.body.getAttribute('data-title');
    if (titleKey) document.title = t(titleKey);
  }

  function setLang(next) {
    lang = next;
    write(STORAGE_KEY, next);
    var url = new URL(window.location.href);
    url.searchParams.delete('lang');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    apply();
    document.dispatchEvent(new CustomEvent('bc:lang', { detail: next }));
  }

  function formatDay(iso, opts) {
    var d = new Date(iso + 'T00:00:00Z');
    return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB',
      Object.assign({ timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }, opts || {})).format(d);
  }

  function money(n) { return n + ' ₪'; }

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(lang === 'he' ? 'en' : 'he'); });
    });
  });

  return {
    t: t, apply: apply, formatDay: formatDay, money: money,
    get lang() { return lang; }
  };
})();
