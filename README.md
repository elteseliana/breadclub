# The Bread Club

Website and order page for The Bread Club, homemade sourdough in Ra'anana.

- `site/`: the website (plain HTML, CSS and JavaScript, no build step). `index.html` is the home page; `order.html` is the order page.
- `site/assets/js/logic.js`: **the menu, prices and order rules** (cutoffs, delivery fee, 18-loaf limit). The only place prices live.
- `apps-script/`: the Google Sheets side. `src/` is the source; `dist/Code.gs` is the file to paste into Apps Script (generated).
- The owners' notes and guides are kept privately, not in this repository.

## Try it locally
```sh
npm install
npm run dev     # then open http://localhost:8080/ and http://localhost:8080/order.html?api=/api
```
Local orders are saved to `.data/orders.json`, which is not committed.

## Checks
```sh
npm run check   # lint, unit tests with 100% coverage of the order rules, Apps Script tests, browser tests
```
