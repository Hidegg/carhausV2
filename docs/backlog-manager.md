# What's Missing — Carwash Manager Perspective
> Carhaus V2 · March 2026

Written as if a manager at one of the locations sat down and described what the app still can't do for them.

---

## Daily Operations — Things I Need Right Now

### 1. I can't see what's pending from previous days
CURS (credit) payments from last week are buried in the admin panel that I don't have access to. As a manager I need a view of my location's unpaid services — who owes what, and for how long. Right now I have to ask the admin to check. Give managers a read-only CURS summary for their own location.

### 2. I can't correct a service I registered this morning
If I register a SPALARE PREMIUM and the client comes back to say it was actually SPALARE STANDARD, I can change the payment type via the dashboard — but I cannot change the service type. The admin has to do it. Managers should be able to edit service type and price on services they submitted today.

### 3. If a client drives off without paying I have no way to flag it
CURS means "I'll pay next time." But sometimes a client leaves and says nothing — I register it as CASH assuming they paid, then find out they didn't. I need a "dispute" or "flagged" status so I can mark a service as needing follow-up without pretending it was collected.

### 4. I can't add a note to a client, only to a single service
Sometimes a client has special instructions every time — "always use the soft brush on this car" or "client prefers no air freshener." The notes field is per-service, so I have to re-enter it every visit. A per-client notes field that I can set once and see pre-filled when that plate comes in would save time every visit.

### 5. The form doesn't tell me if this plate was here recently
When a plate is entered I see their brand and type auto-fill, but I don't see "last visit was 3 days ago" or "first time." For regulars this builds relationship — I can greet them accordingly. For someone who came in yesterday and is back with a complaint, that context matters.

---

## Worker Management — What I Actually Need

### 6. I can't track who worked which shift
`prezentAzi` tells me who is present today, but not what time they arrived or left. If a worker shows up at 11am and leaves at 3pm, their commission stats are mixed with workers who did a full day. I need shift start/end times so commission is fairly attributed to hours worked.

### 7. I can't see historical presence — only today
The echipa page shows today's presence. If a worker was absent Monday and Tuesday and claims they were present, I have no record to check. Store presence per day so I can look back at attendance history.

### 8. I can't give a worker a day off without deleting them
If a worker is on holiday for a week, I have to remember to toggle them absent every morning. Let me set a worker as absent for a date range, or schedule planned absences in advance.

### 9. Worker stats don't show commissions unless I turn it on
The analytics page hides commission totals by default. Commission is sensitive information, fair enough — but I need to unlock it quickly without hunting for a toggle. Keep it hidden by default but make the toggle more visible.

---

## Reporting — What I Can't Answer Without the Admin

### 10. I can't see last week's totals
My access is today only. If the owner asks "how was last week at your location?" I have to ask the admin to pull the historic report. Managers should have read-only access to their own location's weekly and monthly totals — just the numbers, no editing.

### 11. I can't see which services are most popular at my location
The service breakdown shows today's mix. But which services drive the most revenue over the month? Which ones are declining? I can't answer that from my dashboard. A simple month-to-date service breakdown would let me staff and stock accordingly.

### 12. I can't export anything
At the end of the month I sometimes need to send the owner a summary. I have to take a screenshot or manually copy numbers. Even a simple "Export today's report as PDF" button on my analytics page would help.

---

## Client Experience — Gaps That Affect the Business

### 13. I have no way to look up a client's phone number
If a client leaves their car and walks away, and I have a question or the job is done, I can't find their phone from my view. Client contact info is visible only in the admin client list. Managers should be able to see the phone number and email of clients at their location.

### 14. I can't register a fleet client differently from a walk-in
A fleet account (say, a taxi company with 20 cars) sends different plates every day under the same company number. Each plate is treated as a completely separate client. There's no concept of a company umbrella that groups related plates. Fleet billing would need to see all services across all their plates on one invoice.

### 15. There's no way to apply a discount
Some clients have negotiated rates, corporate discounts, or loyalty discounts. Currently the price is set by service + vehicle type and I have no way to override it at point of service. I either register the wrong service type to get the right price, or the owner manually adjusts it later. A discount field (percentage or fixed amount) on the form would make this official.

### 16. I can't see when a client is due for their next visit
Regular clients tend to come in every 2–4 weeks. If I could see "this client usually comes every 14 days, last visit was 16 days ago," I could proactively reach out or look out for them. Even a simple "days since last visit" on the plate lookup would help.

---

## End of Day — What Takes Too Long

### 17. No end-of-day summary I can hand to my boss
At 8pm when the last car leaves, I want one screen that shows: total vehicles, total revenue, total CURS outstanding, worker breakdown, and a list of services in order. Something I can screenshot and send in the WhatsApp group without opening 3 different tabs. A "Ziua mea" (My Day) report page that combines everything on one printable screen.

### 18. The sequence number resets at 4am but I work until midnight
The daily window starts at 4am and ends at 3:59am the next day. This means if I work a late shift past midnight, my services from midnight to 4am still count toward "yesterday." This is correct for accounting purposes but confusing for staff who see date 19-March on a service they submitted at 1am on the 20th. The display date should show the calendar date, not the accounting period.

### 19. I can't close the day early
On slow days or holidays we close at 3pm. The dashboard still shows "today's data" as if the day is ongoing. I want a way to mark the day as closed, which would lock the day's records from edits and generate the final daily summary. This prevents accidental late submissions being attributed to the wrong day.

---

## What Would Actually Change My Day

In order of daily impact:

1. **Client's last visit date visible on plate lookup** — see it every service, every day
2. **Managers read-only access to their own weekly/monthly totals** — answer owner questions myself
3. **Client-level notes** — stop re-typing the same instructions for regulars
4. **Discount field on the form** — stop workarounds for negotiated prices
5. **Edit service type on today's services** — fix mistakes without calling admin
6. **CURS view for my location** — know what's outstanding without asking admin
7. **End-of-day summary page** — one screenshot to send to the boss
8. **Client phone number visible in my view** — reach clients when needed
