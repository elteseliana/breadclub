# Decisions (Nov 5, 2026)

Approved by Eliana in chat:
- First workflow: branded website + order page that writes to the Google Sheet, with live totals, cutoffs, capacity, Bit instructions, and a paid/unpaid tracker. The Google Form stays live until she chooses to switch.
- Friday orders close **Wednesday** 4pm (the form's "order by Tuesday" was a typo). Tuesday orders close Sunday 4pm.
- **18 loaves per bake day** is a firm cap. When full, customers get a WhatsApp option to ask for room.
- **Flavor of the season removed** from the site.
- Shayna's number is **058-678-6900**.
- Loaf names as on the printed menu (Pesto, Cinnamon sugar). **No limit** per flavor (technical max 99, the daily cap applies).
- Bit number may be shown on the confirmation screen.
- **No pattern backgrounds** on the site.
- Site in English and Hebrew.

## Acceptance criteria (version 1)
1. A test order on a phone appears in the Sheet exactly once with the correct loaves, total, day and contact.
2. Delivery costs 5 ₪ under 100 ₪ and is free from 100 ₪.
3. After 4pm on the cutoff day, that bake day can't be ordered.
4. A full day (18 loaves) can't be ordered; WhatsApp option shown.
5. Pressing "order" twice doesn't create two orders.
6. Nothing ever marks an order paid automatically.
7. Looks right on phone and computer, in English and Hebrew.

## Choices Claude made (open to change)
- The order page offers the next **two** open bake days.
- Phone must be an Israeli mobile (05X), since replies go by WhatsApp.
- The nav bar is cream instead of powder blue, because brown text on powder blue is slightly below accessible contrast for small text (4.35:1 vs 4.5:1).
- Menu-card section labels are brown with blue-gray dashes (blue-gray text alone fails contrast).
- About-us text, FAQ and the payment-reminder wording were written by Claude from Eliana's materials. She needs to approve them.

## Second round (Nov 5, 2026, after review)
- After launch the website is the **only** order channel; the Google Form is retired (Eliana will also fix its Friday "order by Tuesday" typo while it's still up).
- 054-911-2175 is Eliana's WhatsApp.
- Cash orders are **not flagged** as unpaid; the sheet just says "Cash at door". Payment reminders are Bit-only.
- Any delivery address is accepted.
- ~~Max 3 orders per phone per bake day~~: Eliana chose **unlimited orders per number**.
- Eliana approved the About-us text.
- Eliana asked for a calmer, smoother redesign (one cream page, thin one-line name, transitions, new photos): done.
