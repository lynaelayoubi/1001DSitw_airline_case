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
  could fly to handback. The option's name sits underneath; the trace ranks all five.
- The headline's "after recommendations" and "avoidable" tiles add those rows up (SPEC §2.8).
  Avoidable is shown in its two parts — cash, as a share of the cash payable at handback, and
  life (spares handed over, net of units kept in the pool) — so the two are not read as one pot.
- A row marked **forced** has a component that runs out before handback: doing nothing is not an
  option, and its difference from the do-nothing figure is not a saving the tool chose.
- A line under the headline splits the do-nothing figure into cash payable to lessors at handback
  and life already bought and handed over — different kinds of loss, the second sunk.
- "Decide by" is the recommended action's deadline: book the slot by, swap by, or tell routing
  now. "Nothing to book" where the recommendation is to pay.
- Click a tail for its components: every clause, today's position, what will be flown, the
  position at return, the gap and its price. The binding clock is marked.

**Scenarios** (`components/ScenarioPanel.tsx`, SPEC §3.4), above the headline: four controls
written as questions — shop costs rise or fall, aircraft fly more or less, extend the lease on a
returning tail, what a day on the ground costs — four presets that each set one real question and
name its basis, and a reset. Each slider stops where the evidence stops (ASSUMPTIONS §14). The tiles and
the table recompute live. The output that matters is the line under the controls — how many tails
change their recommended action, and from what to what — and each changed row says what it was.

**Trace on hover** (`components/Trace.tsx`). Every figure carries the string the calc layer
attached to it — the inputs and the arithmetic. This is the answer to "where did that number
come from" and it is why the demo is defensible.

## Not yet built

Tail detail with the four levers and the shop-visit curve (§3.3) — the options and lever 4's
curve are already computed, in `calc/levers.ts` — lease view (§3.5), readiness checklist (§3.6).
