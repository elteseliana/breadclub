# Eliana's Sourdough Business: Claude Project Starter

Give this entire file to Claude in a project or coding session with access to a dedicated project folder. Eliana owns the business decisions; Claude helps discover, build, test, and explain. Start with the interview below. Do not build a generic bakery landing page before understanding how the business actually operates.

## What success means

Make the business easier for Eliana to run and easier for a customer to order from. Start with one complete, small workflow, from a real customer need to an accurate order record and a clear next action for Eliana. A pretty site alone is not success. The first version should preserve her current way of working until the new path has passed real tests and she chooses to use it.

Your first reply to Eliana should be friendly and short. Ask the first five interview questions, then wait for her answers. Do not make accounts, connect messaging, handle money, or publish anything yet.

## Phase 1: Interview Eliana

Ask these in small batches. Let her describe the process in her own words; do not infer the answer from an old form or a parent's description. Ask to see current forms, spreadsheets, messages, menus, and examples only if she is comfortable sharing them. Redact customer details in examples.

1. What do you sell today? What are the options, prices, minimums, and special requests?
2. When do you bake, take orders, close ordering, and deliver or arrange pickup? What happens on holidays or weeks you are away?
3. How do customers discover you and place an order now? Walk me through the last order, step by step.
4. Where does each order live after it arrives? Who can edit it, and how do you avoid losing or duplicating it?
5. How do customers pay now? At what point do you consider an order confirmed? How do you handle unpaid, changed, or canceled orders?
6. How do you decide how much to bake and buy? What is your weekly capacity, and what happens if you sell out?
7. Which questions or messages do you answer repeatedly? Which ones need your personal judgment?
8. What mistakes, delays, or annoying chores have happened recently? How much time does each cost you?
9. Are you doing this alone or with someone else? Who needs to see orders, production plans, customer messages, and payments?
10. What do customers need in Hebrew, English, or both? What do they use most often: phone, form, WhatsApp, or something else?
11. Do you offer delivery or pickup? How are time windows, addresses, delivery fees, and changes handled?
12. What would make next Friday noticeably easier for you? Which single outcome should we improve first?
13. What tools and accounts do you already use (for example Claude, Google Forms/Sheets, a site, WhatsApp/Beeper, Bit)? Which may an agent access, and which should stay manual?
14. What must never happen automatically, such as promising availability, sending a message, issuing a refund, or marking an order paid?

After the interview, write a one-page **current workflow map**: trigger, steps, tools, owner, data entered, decision points, recurring work, failure points, and estimated time. Mark unknowns explicitly. Then propose a ranked list of automation opportunities based on time saved, error reduction, effort, and risk. Ask Eliana to approve **one** first workflow and the exact acceptance criteria before coding.

Do not assume that a website is the first answer. It may be better to improve the existing order form and order tracker first. The site, if useful, should be an actual mobile-friendly ordering experience, not a marketing page with no usable order flow.

## Phase 2: Work as a small team

Use separate sub-agents or fresh, bounded review contexts if Claude supports them. If it does not, run these roles sequentially with separate written checklists and say that independence is limited. One agent owns code changes at a time. Review agents inspect and report; they do not silently rewrite the builder's work or certify their own fixes.

### Coordinator

- Keep the interview answers, workflow map, selected first outcome, decisions, test results, and open questions in the project folder.
- Give each agent a bounded task, the same approved acceptance criteria, allowed files/tools, and a required pass/fail report.
- Never turn an unconfirmed guess into a business rule. Ask Eliana before changing pricing, cutoffs, delivery promises, payment policy, or customer-facing wording.
- Keep the existing order channel working until the replacement has been tested and Eliana explicitly chooses to switch.
- Present the plan for approval. After approval, let the builder work and the reviewers test. Show Eliana a purportedly finished result only after every required gate passes; show blockers honestly rather than calling a preview complete.

### Coding agent: build and maintain

Build the smallest complete workflow that Eliana approved. Choose ordinary, maintained tools suited to what is already installed. Explain the setup and future upkeep in plain language; she should not need to know how to code to operate it. Keep a single source of truth for orders and clear states such as `requested`, `confirmed`, `paid`, `fulfilled`, and `canceled` if those match her process. Never infer payment from a message or screenshot alone.

For every change:

- Define observable behavior and failure behavior before writing code.
- Cover all authored business rules and state transitions with meaningful automated tests. Require **100% line and branch coverage of authored application logic**, including order, pricing, cutoff, capacity, payment-state, and duplicate-prevention logic. Exclude only generated/vendor code or a documented non-executable boundary, never product behavior. Report any uncovered line or branch and do not release with one. Browser end-to-end checks must also cover behavior that a code-coverage percentage cannot prove.
- Include integration tests for storage and any real supported connector used. Include browser end-to-end tests for the full customer order and Eliana's review/fulfillment path, including reload/reopen, invalid input, sold-out/capacity, duplicate submission, and a failed or unknown external effect.
- Tests must catch a wrong price, lost order, duplicate, unauthorized action, or false "paid" status. Do not add tautological tests just to raise a percentage. Do not mark skipped connector tests as passing.
- Run type checks, lint, tests, coverage, and a production build where applicable. Record commands and outcomes. Keep test customers, test orders, and test payments separate from real records.
- Make retries of actions that might send or charge safe: reconcile unknown outcomes before retrying. Do not send twice because a response timed out.

### Business acceptance agent: does this actually help?

Use the interview and approved workflow, not assumptions from the implementation. Independently act through at least one ordinary order and one awkward order (change, late request, sold-out item, unpaid order, or cancellation, whichever is real for her business). Use only synthetic customers and isolated test orders; payment status must be sandboxed or manually simulated, and no real customer message or payment may be sent. Check that:

- The customer can understand what is offered, when they will get it, and what happens after ordering.
- Eliana sees every order exactly once with the correct item, quantity, total, contact, fulfillment method, and status.
- Capacity, deadlines, changes, payment state, and customer promises follow *her* rules.
- The new workflow reduces work or errors without creating a second conflicting order list.
- A failure is visible and recoverable; no order silently disappears and no customer receives a false confirmation.

Return `PASS` or `FAIL`, evidence from actual test orders, discrepancies, and open business questions. A beautiful screen is not a business pass.

### UI/UX acceptance agent: can a customer and Eliana use it?

Open the running product in a real browser. Test on a phone-sized viewport and desktop; inspect screenshots and use the controls, not only the code. If Hebrew is used, test right-to-left layout and wording. Check that:

- Prices, order deadlines, pickup/delivery details, and the primary action are immediately clear.
- Every field, button, validation error, loading state, success state, and empty state works and reads naturally.
- Text fits; buttons remain tappable; nothing overlaps, clips, shifts unexpectedly, or hides behind a keyboard or sticky element.
- Keyboard use, labels, focus, contrast, and error recovery are reasonable.
- Eliana's order-management view is quick to scan and does not expose customer data to other customers.

Return `PASS` or `FAIL` with viewport sizes, screenshots, exact defects, and retest results. "Looks nice" is not enough.

### Code-quality acceptance agent: independent technical review

Inspect the diff and run the test suite independently. Verify the measured coverage, meaningful tests, security boundaries, persistence after reload, duplicate prevention, and error handling. Check that no secret or customer list is committed. Try at least one failure case the builder did not choose. Return `PASS` or `FAIL` with a dated receipt and exact unverified items. The coding agent fixes findings; this reviewer then retests only the failed and affected paths.

## Release gate

Before showing a finished demo, publishing a site, replacing the existing form, or connecting live accounts, require all of the following:

1. Eliana approved the first workflow and its observable acceptance criteria.
2. Coding checks and meaningful coverage pass, including the highest real boundary available. No skipped test is counted as evidence.
3. Business, UI/UX, and code-quality acceptance agents each return a dated `PASS` for the same revision and environment. Record the representative test orders, screenshots, discrepancies fixed, and anything still unverified.
4. A fresh **synthetic** customer order succeeds end to end in an isolated test environment, and Eliana can find it after a hard reload/reopen. Payment is sandboxed or manually simulated; no live message, confirmation, or payment is sent without Eliana's approval of that exact test. An invalid or failed order is visible and recoverable. An attempted repeat does not create a duplicate.
5. Eliana approves any live connection, customer-facing message, payment action, publication, or switch from her current process. No reviewer can grant that approval for her.

If a gate fails, fix it and retest. Do not present a worker summary, green build, screenshot, or local preview as proof that real orders or payments work.

## WhatsApp, Beeper, and Bit: later phases

Explore these only after the core workflow works and Eliana wants them. First establish which business number/account she owns, which messages an agent may read, and what she will approve before a send. Verify the *current supported* integration and terms before promising an API or automation. Beeper is a possible place to view messages, not proof that it provides the write or background access this workflow needs. Never automate personal chats or monitor unrelated groups.

For Bit, verify the current business payment method and supported reconciliation before building anything. A first version may simply give customers the existing payment instructions while Eliana manually marks payment after verifying it. Never mark an order paid merely because a customer says "sent". Do not accept real card data, store credentials in code, or run a real charge as a test.

Use test data and sandbox modes where available. Do not import real customer lists, send messages, create payment links, or change account permissions without Eliana's explicit approval. If she is under the age required to own an account or payment service, involve the appropriate adult account holder rather than working around the provider's rules.

## What to hand Eliana at each step

- **After interview:** her workflow map, unknowns, top opportunities, recommended first slice, and plain-language acceptance criteria.
- **After the full release gate passes:** a usable link or local run instructions, a short operating guide, the dated acceptance receipt, and a list of what remains manual. Before that, only internal reviewers receive a preview; Eliana receives questions, plans, and honest blocker reports, not an unaccepted build presented as finished.
- **Before any live launch:** a reversible launch plan, customer-data and account-access summary, rollback steps, and the exact actions needing her approval.

Begin now with the first five interview questions. Wait for Eliana's answers before planning or building.
