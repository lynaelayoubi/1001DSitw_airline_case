# ui/ — why these screens

`data/` says where the numbers come from, `calc/` says what is computed. This folder says
why these screens, in SPEC §3's build order. Every figure on screen is read off a result
object from `calc/`; the UI formats, it never calculates.

## Built

**Fleet — exposure by tail** (`screens/FleetScreen.tsx`, SPEC §3.1) with the **headline**
(`components/Headline.tsx`, SPEC §3.2) on top.

- One row per returning tail, ranked by exposure if nothing changes. The whole fleet sits
  behind a toggle so it looks like a fleet; tails beyond the 24-month window show no figure,
  because projecting years with no shop visit in them is not a forecast.
- Columns are the ones the customer named: tail, type, lessor, return date, months left,
  exposure, binding clock, QME flag, decision deadline. The four components sit under the
  exposure as a one-line breakdown.
- "As the lease allows" is the QME number from SPEC §2.5, side by side with the maintenance
  system's view, with the delta on the row and in the headline.
- "After recommendation" is the tail's all-in figure under its recommended option (SPEC §2.7):
  the work, its downtime, and what is still owed at handback, with what it saves against doing
  nothing — or, in red, what it costs over a do-nothing figure that assumed a timed-out engine
  could fly to handback. The option's name sits underneath; the tail's detail ranks all five.
- The headline's "after recommendations" and "avoidable" tiles add those rows up (SPEC §2.8).
  Avoidable is shown in its two parts — cash, as a share of the cash payable at handback, and
  life (spares handed over, net of units kept in the pool) — so the two are not read as one pot.
- A row marked **forced** has a component that runs out before handback: doing nothing is not an
  option, so the row shows no saving — the do-nothing it would be measured against cannot happen.
  Why it is forced is the badge's tip.
- A row with **no recommendation** has a best option whose advantage over the next is inside the
  cost estimates' ±10.1% (ASSUMPTIONS §0): the row says the options cannot be told apart, and why.
- One sentence under the headline says what the first tile's split means: life already handed
  over was paid for at past shop visits, and is sunk unless a swap keeps the unit in the pool.
- "Decide by" is the recommended action's deadline: book the slot by, swap by, or tell routing
  now. "Nothing to book" where the recommendation is to pay.
- Click a tail for its detail: the recommendation and the next best option, how firm the answer
  is (one line, collapsed), and the components — every clause, today's position, what will be
  flown, the position at return, the gap and its price, the binding clock marked.

**What this assumes** and **how firm these answers are** (`components/WhatThisAssumes.tsx`,
`components/HowFirm.tsx`, `robustness.worker.ts`), at the top and collapsed: each one line carrying
its finding — "7 inputs · 5 change no answer anywhere", "4 firm · 3 close · 3 with no
recommendation". Open, the first is the one place the seven assumptions live — value used,
evidenced range, the system the real number should come from, whether it changes any answer, and
an override that recomputes everything downstream, the sweep included, held inside the evidenced
range. The second is the model assessing itself: the close calls by name, the tails with no
recommendation, and the sweep's one limit. Neither is what a head of fleet acts on, so neither is
open on the main screen.

**What you can do** (`components/RobustnessPanel.tsx`, `components/WhatIf.tsx`): the head of
fleet's own decisions. A what-if — swap a component, send one to the shop, change a tail's route,
move its return date, several at once — priced against today's plan, which stays on screen: the
output is the difference in what is still owed, in maintenance spend and all-in, and the tails
whose action changes as a result. A proposal the model knows cannot happen is listed as refused,
with the reason. Then a maintenance budget for the next twelve months — what it funds, what it
leaves out, and whether a left-out decision closes inside the year.

**Running out of time** (`components/RunningOutOfTime.tsx`), beside it: every recommended action
with a decision date, soonest first (`calc/deadlines.ts`), each saying what the date passing costs
— a chosen action falls back to the best option still open, usually paying at handback; a forced
removal with nothing left runs out with nothing booked. Forced rows show no saving.

**The working, in place** (`components/Working.tsx`). The arithmetic the calc layer attaches to a
figure is for checking, not acting, so it never sits in a tooltip: it opens on request, in place,
below what it explains — a tail's recommendation (the options ranked) and each component's clauses.
A tooltip is one sentence answering one question — what a column or a tile is — and nothing on
screen restates what is beside it.

## Not yet built

Tail detail with the four levers and the shop-visit curve (§3.3) — the options and lever 4's
curve are already computed, in `calc/levers.ts` — lease view (§3.5), readiness checklist (§3.6).
