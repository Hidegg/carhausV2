# Design & Frontend Backlog — Senior Frontend Designer Perspective
> Carhaus V2 · March 2026

The app works. The design is functional. These are the gaps between "it works" and "it's a pleasure to use every day."

---

## P0 — Usability Breaks Today

### 1. No manual dark/light mode toggle
The app reads `prefers-color-scheme` from the OS and never offers a toggle. Managers working at a bright outdoor wash bay in direct sunlight have no way to force light mode. Managers in a dim office at night have no way to force dark. A single sun/moon icon button in the top bar, persisted to `localStorage`, is 20 minutes of work and removes a daily friction point.

### 2. The form page has too many steps for the most common action
The #1 flow every day: enter plate → pick service → pick worker → submit. Currently the form requires scrolling through payment type, optional contact info accordion, brand picker, GDPR checkboxes. For a return customer where everything auto-fills, the eye still has to scan the full form to confirm. Consider a "quick mode" that collapses everything except plate + service + worker + payment, with an expand option for new customers or edge cases.

### 3. Mobile layout on the form is usable but not fast
Workers are displayed as a button grid. On a phone with 6+ workers, the grid wraps to 3 rows. A horizontal scroll row (pill buttons) would let the worker grid stay one row regardless of count. The service checkboxes are also small tap targets on mobile — they need minimum 44px touch height.

### 4. No loading skeleton on dashboard
When the manager dashboard loads, the page is blank until the API responds. Every list and stat panel should show a skeleton (gray animated placeholder) during the load. This is especially noticeable on mobile where the connection may be slower.

### 5. Error states have no recovery path
When an API call fails (network error, server 500), the user sees a toast or inline message. There is no "Retry" button — the user has to manually reload the page. Every error state should have a retry action.

---

## P1 — Visual & Interaction Polish

### 6. Brand filter UX on client list is non-obvious
The multiselect brand filter requires clicking a "Confirm" button to apply. This is unusual — every other filter in the app applies immediately on change. Either: apply immediately with a debounce, or make the confirm button visually obvious as the required next step. Currently users click a brand and nothing happens until they notice the hidden confirm button.

### 7. Tables have no empty states with personality
When a table or list returns zero results, it shows nothing or a bare "no data" string. Empty states should: (a) explain why it's empty, (b) suggest a next action. Example: "No services today. Waiting for the first car." with a subtle car icon. Empty state design is the first impression on a fresh install and the message you send when searches return nothing.

### 8. The analytics page has no charts
The manager analytics page shows numbers — payment breakdown percentages, worker revenues — but no visual representation beyond horizontal bars. The `recharts` library is already installed for the admin historic page. A simple donut chart for payment types and a horizontal bar chart for worker comparison would make patterns immediately readable instead of requiring mental math on percentages.

### 9. Service history in client detail is dense
The client detail page (`/admin/clienti/:plate`) shows a flat chronological list of every service. For a client with 100+ visits, this is an unnavigable wall of rows. Add: year/month collapsible groups, total per period in the group header, and highlight the first visit and most recent visit visually.

### 10. The CURS pending urgency colors are easy to miss
Red (>30 days overdue) and yellow (>7 days) are applied as left border colors on the row. In a long table of rows all with identical structure, the color is a small signal. Consider: a dedicated "Overdue" badge column, or a sort default that bubbles red rows to the top, or a count badge on the nav item that turns red when there are overdue CURS records.

### 11. No keyboard navigation on modals
The edit modal on the dashboard (change payment, change worker, delete service) is not keyboard-accessible. Tab order is not managed, focus doesn't trap inside the modal, and Escape doesn't always close it. For managers using a desktop who prefer keyboard over mouse, this is a daily annoyance.

### 12. Print CSS is absent
There is no `@media print` stylesheet. A manager who wants to print the day's dashboard or the weekly report gets the raw browser rendering — full navigation, dark backgrounds, buttons. Add print styles that hide nav, show tables cleanly, and collapse interactive controls.

---

## P2 — Design System & Consistency

### 13. Button styles are inconsistent across pages
`btn-primary`, inline Tailwind classes, and raw `<button>` elements with custom classes are used interchangeably. The dashboard edit modal uses different button shapes than the settings page. Define: primary, secondary, danger, ghost button variants once in the design system and use only those.

### 14. Font size hierarchy is flat
Most text across the app uses similar font sizes. The visual hierarchy relies almost entirely on font weight (bold vs normal). Add a clear H1 → H2 → Body → Caption size scale. Page titles should feel like page titles, not just bold body text.

### 15. Success states are transient toasts — no persistent confirmation
When a service is submitted, a toast appears briefly then disappears. For an action as important as registering a service (which directly affects the worker's commission), a more durable confirmation — perhaps a green flash on the submitted items in the dashboard — would reduce "did that go through?" anxiety.

### 16. The settings page is very dense
Four tabs (Locations, Workers, Services & Pricing, Managers) each with tables, edit forms, and delete buttons packed into a single card. The pricing tab especially has a 3-vehicle-type × N-services grid that overflows horizontally on laptop screens. The pricing table should be redesigned with a row-per-service layout where type columns (AUTOTURISM, SUV, VAN) are fixed-width and scroll horizontally only on mobile.

### 17. No visual distinction between global and per-location prices
In the settings pricing tab, global prices and per-location prices are in separate sub-tabs but look identical. A consistent visual marker (e.g. a location pin icon next to per-location rows, or a distinct background tint on global rows) would prevent confusion about which prices a manager's clients will actually see.

---

## P3 — Progressive Enhancement

### 18. No push notifications for CURS aging
The browser supports Push API. Managers could opt into a daily notification: "You have 3 pending payments over 7 days." This requires a service worker and push subscription setup, but would bring aging debts to attention without requiring a manual check.

### 19. Milestone badges are invisible until the form submission
When a client hits 10, 25, 50 visits, a milestone notification appears on the form page — but only the manager submitting sees it, and only in that moment. Consider: a "Today's milestones" panel on the dashboard that persists for the session, so other staff can see and celebrate the milestone.

### 20. No chart for revenue trend over time on admin overview
The admin overview shows today's snapshot but no sense of direction — is revenue up or down this week vs last week? A small sparkline (7-day trend line) next to the main revenue KPI would give immediate context without requiring a click to the historic page.

### 21. Vehicle type picker uses text only
`AUTOTURISM`, `SUV`, `VAN` are displayed as text buttons. Simple silhouette icons (sedan, SUV, van shapes) would make selection faster for a manager who doesn't want to read — just tap the shape that matches the car in front of them.

### 22. The brand picker modal is large and alphabetical only
The brand picker shows a grid of all 20+ brands. There is no search input inside the modal. A search field that filters the grid in real time would be faster for uncommon brands. Alternatively, show the top 5 most-used brands for this location first, with the full grid below.

---

## Summary Priority Order

| # | Issue | Effort | Daily Impact |
|---|-------|--------|-------------|
| 1 | Dark/light toggle | Tiny | Medium — outdoor use |
| 2 | Form quick mode | Medium | High — used every service |
| 3 | Mobile form touch targets | Small | High — mobile use |
| 4 | Loading skeletons | Small | Medium — perceived speed |
| 5 | Error retry buttons | Small | Medium — failure recovery |
| 6 | Brand filter confirm UX | Tiny | Medium — confusing |
| 7 | Analytics charts | Small | Medium — pattern spotting |
| 8 | Empty states | Small | Low — new install only |
| 9 | Keyboard nav in modals | Small | Low — desktop power users |
| 10 | Print CSS | Small | Low — occasional |
