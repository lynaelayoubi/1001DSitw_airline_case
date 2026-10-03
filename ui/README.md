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
- Two headline tiles — after recommendations, avoidable — are shown pending until the levers
  exist. A placeholder number would break the rule that every figure on screen has a formula.
- "Book shop slot by" is lease end minus the shop-slot lead time (SPEC §2.7's usual case).
  The levers will refine it; until then it is still the date that matters.
- Click a tail for its components: every clause, today's position, what will be flown, the
  position at return, the gap and its price. The binding clock is marked.

**Trace on hover** (`components/Trace.tsx`). Every figure carries the string the calc layer
attached to it — the inputs and the arithmetic. This is the answer to "where did that number
come from" and it is why the demo is defensible.

## Not yet built

Tail detail with the four levers and the shop-visit curve (§3.3), scenarios (§3.4), lease
view (§3.5), readiness checklist (§3.6).
