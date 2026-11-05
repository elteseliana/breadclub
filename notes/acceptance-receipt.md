# Acceptance receipt: revision 76656cb (branch website-v1), 2026-11-05

Environment: local preview server (same order handler as the Google Apps Script backend, file-backed store), Chromium via Playwright, Node 22. Synthetic customers only; no real messages, payments or Google accounts used.

| Gate | Result |
|---|---|
| Automated checks (`npm run check`) | PASS: lint clean; 39 unit tests, 100% line/branch/function coverage of logic.js and server.js; 14 Apps Script tests against a fake spreadsheet; 19 browser end-to-end tests; nothing skipped |
| Business acceptance (independent reviewer) | PASS (round 1 FAIL → fixed → PASS on 82b6d8b → PASS on 76656cb) |
| UI/UX acceptance (independent reviewer, 390 + 1280 px, EN + HE) | PASS (round 1 FAIL → fixed → PASS on 82b6d8b → PASS on 76656cb, 390 px retest of final diff) |
| Code-quality acceptance (independent reviewer) | PASS (round 1 FAIL → fixed → PASS on 82b6d8b → PASS on 76656cb) |

Representative test orders: ordinary delivery + Bit (2 × Garlic, 89 ₪); pickup + cash at exactly 100 ₪; invalid inputs; full day (18 cap and lowered caps); capacity race between two customers; order at 15:58 vs 16:00 cutoff (winter and summer time); double tap; reply lost after saving + retry after reload; server error + retry; cancel/edit in the sheet; hand-typed rows; 4th order from one phone; Hebrew order; test mode.

Fixed after review: formula injection into the sheet, zero-loaf orders via prototype names, capacity abuse (per-phone limit), honeypot false confirmation, blank capacity, totals not following sheet edits, cash orders flagged as unpaid, hand-typed dates in summary, confirmation opening mid-page, stale/missing messages, Hebrew wording and RTL punctuation, tap targets, sheet running out of rows, WhatsApp prefill texts.

## Not yet verified (needs the real Google account, done during setup with Eliana)
- Real Google Sheets behavior: plain-text columns, formulas (ENCODEURL, HYPERLINK, QUERY), checkboxes/dropdowns, adding rows, highlighting.
- Apps Script runtime: Intl time zone support, LockService under real concurrent orders, web-app redirect from the browser.
- A live synthetic order from a real phone into the real sheet (gate 4), then a hard reload.
- Hebrew web fonts and real devices (iOS Safari); native-speaker review of the Hebrew.

## Known minor, accepted
- Many different fake phone numbers could still fill a day; Eliana can cancel suspicious rows (frees loaves immediately).
- A Pays-by value typed by hand in lowercase ("bit") is warned about by the dropdown but would be missed by the unpaid-Bit summary.

## Still needs Eliana's approval
- About-us text; 3 orders per phone per bake day; Hebrew proofreading; going live (hosting, connecting the sheet, switching the Instagram link).
