# ui/ — why these screens

`data/` says where the numbers come from, `calc/` says what is computed. This folder says
why these screens, in SPEC §3's build order. Every figure on screen is read off a result
object from `calc/`; the UI formats, it never calculates.

## v2 · pages and roles

The one long screen is four pages under a top navigation (`screens/Shell.tsx`, `components/Header.tsx`);
the page lives in the address (#overview, #leases, #scenarios, #checklist), so a reload or the back
button keeps it, with no routing library.
- **Overview** (`screens/Overview.tsx`): the recommended actions, the activity log directly under them,
  what acting now saves, the headline money and the fleet table — nothing else. Opening an aircraft
  shows its detail as before, Show the calculation included.
- **Leases** (`screens/Leases.tsx`), **Scenario planning** (`screens/Scenarios.tsx`) and **Return checklist**
  (`screens/Checklist.tsx`) take what used to sit under the table.
- **Viewing as** (`roles.ts`): Head of fleet and Analyst see every page; the Leasing team sees
  Overview, Leases and the checklist; Maintenance planning sees Overview and the checklist. A role that
  cannot see a page is taken to the Overview. No login: it shows the permissions, it does not enforce
  them. The role is remembered in this browser (`store.ts`).
- The lease slide-over still opens from any lessor name or clause reference, on any page, and "show
  ENG2's row" or "show 9H-ZUU" opens that aircraft on the Overview.

### Acting on a recommendation (v2)

Every recommended action's aircraft code opens its detail in the fleet table. Until the action is assigned it
shows only what can be done with it; then its status, **Sent**, **Accepted**
and **Done**, with its owner, channel, due date and when it last moved. **Assign and notify**
(`components/AssignPanel.tsx`) slides in with the owner, due date and message prefilled from the
recommendation (`calc/assign.ts`) — or, for a maintenance request, the structured request as the
system would receive it. Sending is marked "Preview: nothing leaves the app". The **activity log**
(`components/ActivityLog.tsx`) sits directly under the recommended actions: who did what, when. It
stays hidden until something is logged.
**Try a scenario**, on each recommended action and on each aircraft row that can take a decision,
opens Scenario planning with that aircraft already picked. The Head of fleet and the
Analyst assign; the owner's role accepts and marks done. It lives in this browser (`demo.tsx`), and
**Reset demo**, under the role switcher, clears it.

### Leases (v2)

`screens/Leases.tsx` lists the leases of the aircraft handing back, each "Read, awaiting review" or
"Approved by leasing team". Opening one (`components/LeaseReview.tsx`) shows each term the tool uses
— the return condition thresholds, the notice period, the replacement rule, what makes a shop visit
count, reserves — with the clause it came from, quoted (`calc/lease.ts`, `leaseTerms`). The leasing
team approves each, or corrects it with a required reason; both go into the lease's change history,
and a correction into the activity log. A corrected threshold or notice period is used by the
calculation at once (`calc/corrections.ts`): correcting 9H-ZUU's notice from 90 to 30 days moves its
swap from "decide today" to 8 Oct 2026. A corrected rule says "Applies on next recalculation". **Add a
lease** (`components/AddLease.tsx`) takes a PDF and shows it being read; in this preview the terms are
a sample, and the screen says so. Other roles see the leases read-only.

### Scenario planning (v2)

`screens/Scenarios.tsx`, on the scenario calculation (`calc/scenario.ts`), in two columns on a wide
screen: **your scenario** on the left, and on the right, in view while you work, **what it does**. On a
narrow screen they stack. The calculation folds beneath both; **This year's budget** closes the page.

The left column (`components/Questions.tsx`):
- **The market** (`MarketPanel`): one row per figure — shop costs and flying hours as a per cent change,
  reserves we can claim back, a day on the ground for a narrowbody and a widebody — the field with its
  unit inside it and today's figure beside it. Zero means no change. A changed field is edged in the
  accent and can be reset; a value outside the evidence is refused with one sentence under its own
  field, and not taken.
- **Add a decision** (`DecisionBuilder`): four kinds — Shop visit, Swap, Return date, Route — then the
  aircraft and the kind's own fields, labelled, in a fixed order. Aircraft with nothing to decide are
  listed as "Cleared: nothing to decide" and cannot be picked. "Try a scenario" on the Overview arrives
  here with its aircraft picked.
- **Your decisions** (`DecisionList`): each decision once, read back as a sentence — "We send A6-MXM's
  ENG1 to the shop in February 2027, minimum shop visit (build-for-cash)" — with its verdict straight
  under it, judged on its own at today's figures against today's advice for its aircraft: "Better than
  today's plan: saves $X", with its date and Assign and notify (a return date is agreed with the lessor,
  not assigned); "Costs $X more than paying at handback: not recommended", with no button; or "Not
  possible", with the clause.

The right column (`components/Answer.tsx`) keeps the tool's advice apart from your decisions, because
mixing them misleads. The headline counts only the market changes, and says so — "With these figures,
today's plan costs $1.97M less. No recommendation changes." or "Today's plan holds: no recommendation
changes." — never "your plan", since a decision of yours may be listed as not recommended — with today's total and the
total with the changed figures; under it, one line for what each change does on its own: "The 9% cut
in shop costs saves $1.97M." "Your A6-MXM shop visit costs $1.17M more than paying at handback." Then
**the tool's advice changes**: the recommendations the changed figures alone change, each with its date,
its money labelled ("+$1.17M on this aircraft compared with today's advice") and Assign and notify — or one line saying the advice holds. A shop visit whose date to decide
by is today because of the slot lead time says "decide today to secure the February 2027 slot".
**Show the calculation** (`Calculation`) folds the three-column totals and the evidence behind each
figure. Assigning from here is logged "from Scenario planning".

### Return checklist (v2)

`screens/Checklist.tsx`: the readiness checklist, open, then **Documents for redelivery**
(`components/Documents.tsx`, `calc/documents.ts`) — one line per returning aircraft, soonest return
first, with how many documents are ready and missing; opened, each document with what it is for (the
aircraft, or an engine, the APU or the gear by serial), its owner and its status (To do, In progress,
Ready, Missing). Marked "Standard template, not read from a lease". The leasing team and maintenance
planning change statuses, each change logged; other roles read.

## How it looks

Calm, sparse, aligned. Defined once, in `index.css`:
- **One type scale, three sizes**: label (12px, for labels and secondary lines), body (14px) and
  headline numbers (28px) — `text-label`, `text-body`, `text-display`. The default sizes are switched
  off, so no other size can creep in. Section labels and column heads share one style, `caps`: small
  caps with a little letter-spacing.
- **One accent** (`accent`) for links — the `link` style — and the headline saving. Amber only for
  "required" and overdue dates. Everything else is grey.
- **Space, not frames.** Sections sit 48px apart on one spacing scale (4, 8, 12, 16, 24, 48px). A
  border stays only where it groups: the table's rows, a tail's cards, your changes in scenario
  planning, a lease's clauses, form controls.
- **The table**: rows aligned to the top so every figure shares a line, numbers right-aligned in
  tabular figures, and secondary lines — the ENG/MLG/AF/APU split, "acting late…" — at label size in
  grey.

## Built

**Recommended actions** (`components/RecommendedActions.tsx`), at the top, above everything: the
screen's answer. Every recommended action by date — tail, action, the date to decide by ("decide
today" when it is the data's date), and either "required" or what it saves; the tip on the date says
what passing it costs. An aircraft on the ground because nothing keeps it flying is listed by the day
it goes down, with its days and their cost at the downtime rate; the route changes ("Route change:
fly it mixed…"), which have no date, come last and read "no deadline · loses $X a month", inline. Beside it, what acting now saves, split plainly — "$X less cash to lessors · $Y of
engine life kept" — and split again so the savings in the list add up to its "optional" part and the rest is shown as what it is ("required": the difference where a part runs
out first, against acting late — nobody acting until it does). The "required" badge's tip: "A part
runs out before the aircraft goes back, so it has to be dealt with."
Everything below justifies the list, and sits under it.

**Fleet — exposure by tail** (`screens/FleetScreen.tsx`, SPEC §3.1) under the **headline**
(`components/Headline.tsx`, SPEC §3.2).

- One row per returning tail, ranked by exposure if nothing changes. The whole fleet sits
  behind a toggle so it looks like a fleet; tails beyond the 24-month window show no figure,
  because projecting years with no shop visit in them is not a forecast.
- Five columns: tail, return, if nothing changes, after recommendation, decide by. The four
  components sit under the exposure as a one-line breakdown. Type, lessor (opening the lease), months
  left, the clock that sets the bill and clock reset are in the aircraft's detail, one line at its top.
- **Clock reset** says, in plain words, whether the lease recognises each component's last shop
  visit as resetting its clock (SPEC §2.5's QME) and, where it does not, how much more handback
  costs — in the aircraft's detail ("clock reset: not counted on ENG1, $19.4M more at handback"), in one plain line above the
  table that sums the column, and on the component card, which shows the figure if the reset counts beside the figure under the
  lease.
- **Amber** means "required" or an overdue date, and nothing else: not the clock-reset finding,
  which is not an error.
- A tail with **no exposure**, as recorded or under the lease, has nothing to decide: the row reads
  "cleared: meets every return condition, as recorded and under the lease", and stops.
- A row whose recommendation is to **pay at handback** says by how much paying beats the next best
  option — "paying beats a shop visit by $0.97M" — the runner-up's all-in less the recommendation's.
- A line under the headline counts both: "3 tails cleared · 2 where paying beats fixing". Neither is
  added to what acting now saves.
- "After recommendation" is the tail's all-in figure under its recommended option (SPEC §2.7):
  the work, its downtime, and what is still owed at handback, with what it saves against doing
  nothing — or, in red, what it costs over a do-nothing figure that assumed a timed-out engine
  could fly to handback. In the table it is one line, the figure and a short action — "$4.15M · shop
  visit Sept 2027", "$677K · pay at handback". The full text — the action, what it saves, what paying
  beats, the next best, and any note (left out of the budget, confirm before you act) — is at the top
  of the aircraft's detail.
- The headline counts forward-looking money only, and says what kind each number is. "If nothing
  changes" carries a stacked bar — cash out against engine life handed over (a spare fitted for good
  when a part runs out and nobody acted, or the aircraft's own engine where another option would keep
  it in the pool — life counted the same way in every option; that is the segment's tip) — and, as
  a second line, "→ $X after the actions above" (SPEC §2.8: work, downtime and what's still owed).
  After recommendations is not a tile of its own.
  "Also worth knowing", below the fleet table, holds two lines of plain text, not totals, so no box, fill
  or badge: life already over-delivered at past shop visits — "Sunk on these ten; preventable on the next
  ten" — which is in none of the figures, and the clock-reset findings of the aircraft details, summed. The
  headline is only the money. No disclosure under
  the tiles: what each figure is made of is on screen, and the two definitions that are not — acting
  late, and a clock reset the lease does not count — are the tips on "If nothing changes" and on the
  clock-reset line.
- **Sets the bill**, in the aircraft's detail, names the clock that decides what the tail pays at handback.
  In the aircraft's detail, the figure after the recommendation is labelled **all-in**; a tail that pays says what the cheque
  is — "Pay at handback: $677K cheque" — and what paying beats is the best option on the part that
  owes most, not the cheapest anywhere: "paying beats a shop visit on ENG2 by $15.9M", not an APU
  overhaul on a part owing $13K.
- An opened tail never shows a compensation above the cap. Where the cost of the work caps it, the
  capped figure sits on the clock that sets the bill, "capped at the cost of the work", and the other
  rows read "—"; the uncapped figure is only in Show the calculation.
- The budget's need, in plain words: "Today's plan needs $17.1M of shop work in this window. After
  reserves are claimed back, $143K comes out of your budget."
- The readiness checklist, opened, shows what comes from the recommendations and the lease and
  anything due in the next 90 days; each tail's standard items not yet due fold into one line — "4
  items standard for every return, the first due 6 Jan 2028" — in the list and in the tail's detail.
- A row marked **required** has a component that runs out before handback, so doing nothing is not
  a cheque at handback: it is **acting late** — nobody acts until the part runs out, then the
  cheapest option still open that day. That is the row's "if nothing changes", and its saving reads
  "vs acting late".
- A row with **no recommendation** has a best option whose advantage over the next is inside the
  cost estimates' ±10.1% (ASSUMPTIONS §0): the row says the options cannot be told apart, and why.
- "Decide by" is the recommended action's deadline: book the slot by, swap by, or tell routing
  now. "Nothing to book" where the recommendation is to pay.
- Click a tail for its detail: the recommendation and the next best option, its readiness
  checklist, and the components — every clause, today's position, what will be
  flown, the position at return, the gap and its price, the clock that costs most or runs out first marked.

**Assumptions behind these numbers** (`components/WhatThisAssumes.tsx`), last and collapsed, its one
line carrying the finding — "4 of 7 move an answer". Open, it is the one place the seven
assumptions live: value used, evidenced range, the system the real number should come from, whether
it changes any answer, and an override that recomputes everything downstream, the sweep included,
held inside the evidenced range.

**Check before acting** (`components/HowFirm.tsx`, `robustness.worker.ts`) beside it — not a grade of
the model but what to check first: each recommendation an assumption could flip within the first half
of its evidenced range, as an instruction — "A6-MXM: holds unless it flies 2% or more above plan.
Check the published schedule and flying-hour plan, from network planning." The same note sits on that
tail's row in the recommended actions. If nothing is close to the line it says every recommendation
holds across the believable range of every assumption. The full sweep runs behind it and behind
"Changes an answer"; its method is in ASSUMPTIONS §14, not on the screen.

**Scenario planning** (`components/WhatYouCanDo.tsx`, `components/WhatIf.tsx`), under the table:
the head of fleet's own decisions. A what-if — swap a component, send one to the shop, change a tail's route,
move its return date, several at once — priced against today's plan, which stays on screen: the
output is the difference in what is still owed, in maintenance spend and all-in, and the tails
whose action changes as a result. A proposal the model knows cannot happen is listed as refused,
with the reason. Then a maintenance budget for the next twelve months — what it funds, what it
leaves out, and whether a left-out decision closes inside the year.

**The lease** (`components/LeaseView.tsx`, `calc/lease.ts`), sliding over the right of the
screen — not a page — from the lessor's name on a row or any clause reference anywhere: requirement
rows, the calculation, a refusal in the what-if. It opens scrolled to the clause clicked; Esc or a click
outside closes it. It quotes and never computes: the lessor and architecture, every return
condition with its threshold, rate and text — each linked back to the requirement rows it drives —
and the QME, replacement (12.2), notice (12.3(b)) and temporary-install (12.3(c)) clauses.

**Readiness checklist** (`components/Readiness.tsx`, `calc/readiness.ts`), under the table and
collapsed under its digest — "next 90 days: N items across M tails" — and inside each tail's
detail: every item that must be true before handback, soonest first, with owner, due date and a
status read off the date. Derived items point at their source (the lease clause, or the tail);
standard items say "standard for every return".

**Show the calculation, in place** (`components/Working.tsx`). The arithmetic the calc layer attaches to a
figure is for checking, not acting, so it never sits in a tooltip: it opens on request, in place,
below what it explains — a tail's recommendation (the options ranked) and each component's clauses.
A tooltip is one sentence answering one question — what a column or a tile is — and nothing on
screen restates what is beside it.

## Not yet built

Tail detail with the four levers and the shop-visit curve (§3.3) — the options and lever 4's
curve are already computed, in `calc/levers.ts` — lease view (§3.5), readiness checklist (§3.6).
