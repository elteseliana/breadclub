# Current workflow map: The Bread Club (draft, Nov 5, 2026)

## Today, step by step
| # | Step | Tool | Who | Pain / risk |
|---|---|---|---|---|
| 1 | Post the weekly "order window is open" message to private chats and groups | WhatsApp, Instagram | Eliana / Shayna | Manual every week |
| 2 | Customer reads the menu and opens the form | Google Form (purple Google styling, not on-brand) | Customer | Form doesn't look like the brand. The Friday cutoff is shown differently in two places |
| 3 | Customer fills in name, phone, quantity grid, pickup/delivery, payment method, address, day, notes | Google Form | Customer | No running total, so the customer doesn't know what to pay. Max 3 per flavor |
| 4 | Response lands in the Google Sheet | Google Sheets | Automatic | Single source of truth (good) |
| 5 | Customer may or may not pay by Bit (name in note) or plans cash | Bit | Customer | Amount isn't shown to them, so they have to work it out |
| 6 | Eliana/Shayna match Bit payments to rows by hand | Bit app + Sheet | Eliana / Shayna | **Biggest chore:** texting unpaid customers one by one |
| 7 | Text pickup address to pickup customers | WhatsApp | Eliana / Shayna | Manual |
| 8 | Count loaves per flavor per day and bake (12–18 per day) | Sheet | Both | No automatic cap: they could take more orders than they can bake |
| 9 | Deliver Tue/Fri around Ra'anana, Herzliya and nearby, or hand over at pickup; collect cash | Car | Both | No status column for "delivered" |

Unknown: how long steps 6–8 take each week, and what happens on holidays.

## Opportunities, ranked
1. **Branded order page on the website that writes to the same Google Sheet.** It shows a live total including the delivery fee (free on ₪100+), shows the cutoff and the "sold out" state, then shows the exact Bit amount and a one-tap Bit/WhatsApp message on the confirmation screen. Fixes steps 2, 3 and 5, and step 8's overselling. Medium effort, low risk: the Sheet stays the single order list.
2. **Order tracker in the Sheet:** status column (requested → paid → delivered / canceled), unpaid rows highlighted, per-day bake totals. Fixes steps 6 and 8. Low effort.
3. **One-tap "payment reminder" WhatsApp links** in the tracker (opens WhatsApp with a pre-written message; Eliana presses send). Cuts step 6 from typing to tapping. Low effort. Nothing is sent automatically.
4. **Brand website** (home, menu, how it works, delivery and pickup, about, gallery, Instagram, contact, EN/עברית). Makes the business look professional. It's the frame for #1.
5. Later: automatic payment matching. Not realistic: Bit has no public API to read incoming payments.

## Recommended first version
#1 + #2 + #4 together as one small, complete loop:
customer opens site → orders → sees the exact amount and how to pay → row appears in the Sheet as "requested" → Eliana/Shayna mark "paid" by hand → bake totals update.
The current Google Form stays live until the new page has passed testing and Eliana chooses to switch.
