# ui/ — why these screens

`data/` says where the numbers come from, `calc/` says what is computed. This folder says
why these screens, in SPEC §3's build order. Every figure on screen is read off a result
object from `calc/`; the UI formats, it never calculates.

## Built

**Recommended actions** (`components/RecommendedActions.tsx`), at the top, above everything: the
screen's answer. Every recommended action, soonest first — tail, action, the date to decide by,
and either "forced" or what it saves; the tip on the date says what passing it costs. An aircraft
on the ground because nothing keeps it flying comes first, with its days and their cost at the
downtime rate; a route change has no date and says "start now", its tip what each month of waiting
gives up. Beside it,
the avoidable total, split so the savings in the list add up to its chosen part ("by choice") and
the rest is shown as what it is ("forced": the difference on forced tails, against a do-nothing
that cannot happen).
Everything below justifies the list, and sits under it.

**Fleet — exposure by tail** (`screens/FleetScreen.tsx`, SPEC §3.1) under the **headline**
(`components/Headline.tsx`, SPEC §3.2).

- One row per returning tail, ranked by exposure if nothing changes. The whole fleet sits
  behind a toggle so it looks like a fleet; tails beyond the 24-month window show no figure,
  because projecting years with no shop visit in them is not a forecast.
- Columns are the ones the customer named: tail, type, lessor, return date, months left,
  exposure, the clock that runs out first, QME flag, decision deadline. The four components sit under the
  exposure as a one-line breakdown.
- **Clock reset** says, in plain words, whether the lease recognises each component's last shop
  visit as resetting its clock (SPEC §2.5's QME) and, where it does not, how much more handback
  costs — on the row ("not counted: ENG1 · $19.2M more at handback"), in one plain line above the
  table that sums the column, and on the component card, which shows the figure if the reset counts beside the figure under the
  lease.
- **Amber** means a forced removal (or a deadline passed), and nothing else: not the clock-reset
  finding, which is not an error.
- A tail with **no exposure**, as recorded or under the lease, has nothing to decide: the row says
  so and stops — no recommendation, no routing suggestion, no note.
- "After recommendation" is the tail's all-in figure under its recommended option (SPEC §2.7):
  the work, its downtime, and what is still owed at handback, with what it saves against doing
  nothing — or, in red, what it costs over a do-nothing figure that assumed a timed-out engine
  could fly to handback. The option's name sits underneath; the tail's detail ranks all five.
- The headline says what kind of money each number is, in six words or fewer. "If nothing changes"
  carries a stacked bar — cash out at handback against life already spent at past shop visits.
  "After recommendations" adds the rows up (SPEC §2.8): work, downtime and what's still owed.
  Under them, a single line of plain text sums the clock-reset column of the table below it — not a
  fourth total, so no box, fill or badge. Anything longer — the avoidable total in cash and life, how the tails split, what
  "already spent" means — is in one disclosure under the tiles.
- A row marked **forced** has a component that runs out before handback: doing nothing is not an
  option, so the row shows no saving — the do-nothing it would be measured against cannot happen.
  Why it is forced is the badge's tip.
- A row with **no recommendation** has a best option whose advantage over the next is inside the
  cost estimates' ±10.1% (ASSUMPTIONS §0): the row says the options cannot be told apart, and why.
- "Decide by" is the recommended action's deadline: book the slot by, swap by, or tell routing
  now. "Nothing to book" where the recommendation is to pay.
- Click a tail for its detail: the recommendation and the next best option, how confident to be in the answer
  is (one line, collapsed), and the components — every clause, today's position, what will be
  flown, the position at return, the gap and its price, the clock that costs most or runs out first marked.

**Assumptions behind these numbers** and **How confident to be in these answers** (`components/WhatThisAssumes.tsx`,
`components/HowFirm.tsx`, `robustness.worker.ts`), last and collapsed: each one line carrying
its finding — "only 4 move any answer", "2 solid · 5 fragile". Open, the first is the one place the seven assumptions live — value used,
evidenced range, the system the real number should come from, whether it changes any answer, and
an override that recomputes everything downstream, the sweep included, held inside the evidenced
range. The second is the model assessing itself: the close calls by name, the tails with no
recommendation, and the sweep's one limit. Neither is what a head of fleet acts on, so neither is
open on the main screen.

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
