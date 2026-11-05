# Hebrew to proofread

Claude wrote all the Hebrew text on the site. A native speaker should read it before launch.
It lives in `site/assets/js/i18n.js` under `he:`. Easiest way to check: open the site and tap **עברית**.

Things to look at especially:
- **Loaf names:** מחמצת קלאסית (plain sourdough), שום, שום ורוזמרין, קינמון וסוכר, זיתים, שוקולד צ׳יפס, פסטו.
- **Names:** אליאנה, שיינה. Are these the spellings you use?
- **Gender:** the bakers are written in feminine plural (אנחנו אופות, מגיעות, שולחות). Customers are addressed in plural (בחרו, כתבו).
- **Tone:** short and warm, like the English. The tagline "members only. everyone's a member." stays in English on purpose.
- The automatic WhatsApp payment reminder in Hebrew (in `apps-script/src/server.js`, function `reminderText`).
