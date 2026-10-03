# Handback — spec

Build in the order below. Each step is shippable on its own. If you run out of time, stop
at the end of a step rather than halfway through two.

---

## 1 · Data model

### Aircraft (the tail)

| field | type | notes |
|---|---|---|
| `tail` | string | registration, e.g. `A6-EKC`. Plausible for a Gulf/Europe operator. |
| `msn` | string | manufacturer serial number |
| `type` | enum | `A320neo` `A321neo` `A350-900` `B777-300ER` `B787-9` `B737-8` |
| `lessor` | string | 6–8 invented lessors, reused across tails |
| `leaseStart` / `leaseEnd` | date | |
| `status` | enum | `in-service` · `returning` (leaseEnd within 24 months) |
| `routeProfile` | enum | `short-dense` · `mixed` · `long-haul` — **this is what sets the hours/cycles mix** |
| `hoursPerMonth` / `cyclesPerMonth` | number | derived from `routeProfile`, with per-tail noise |
| `base` | string | |
| `environment` | enum | `temperate` · `harsh-mild` · `harsh-high` — drives engine cost **and** time-on-wing |
| `components` | Component[] | 5 per tail: 2 engines, landing gear, airframe, APU |

### Component

| field | type | notes |
|---|---|---|
| `id` / `serial` | string | serial matters — components move between tails |
| `kind` | enum | `engine` · `landing-gear` · `airframe` · `apu` |
| `position` | string | `ENG1` `ENG2` `MLG` `AIRFRAME` `APU` |
| `tsn` / `csn` | number | time / cycles since new |
| `tso` / `cso` | number | since last overhaul |
| `llpMinCyclesRemaining` | number | **the worst part sets the component's life** |
| `lastShopVisit` | date \| null | |
| `lastWorkscope` | enum | `none` · `build-for-cash` · `build-for-interval` — **two tiers only**, see ASSUMPTIONS §2 |
| `shopVisitCount` | number | 0 = first-run, ≥1 = mature-run. Mature costs 3–25% more **and** comes off wing 20–30% sooner |
| `derate` | number | 0, 5 or 10 (%). 0→10% moves the engine reserve by −21% |
| `qmeStatus` | enum | `verified` · `not-evidenced` — see §2.5 |
| `onTailSince` | date | because they swap |
| `installedOn` | string | current tail, or `POOL` for spares |

Generate a **spare pool** of ~14 unattached components. Lever 3 is meaningless without one.

### ReturnCondition (per tail, per component kind — several each)

| field | type | notes |
|---|---|---|
| `tail` / `componentKind` | | |
| `metric` | enum | `hoursRemaining` · `cyclesRemaining` · `timeSinceOverhaul` · `llpCyclesRemaining` · `condition` |
| `threshold` | number | what the lease demands at handback |
| `compensationRate` | number | USD per unit of shortfall |
| `clauseRef` | string | e.g. `Schedule 3, para 4.2(b)` |
| `clauseText` | string | 1–3 sentences of plausible lease prose |
| `qmeClauseRef` | string | the clause defining a qualified maintenance event |

Vary thresholds **between lessors** — two tails of the same type on different leases
should land in different places. That difference is the product.

### Assumptions (one object, user-editable in the UI — this is the scenario panel)

`maintenanceCostMultiplier` · `utilisationMultiplier` · `leaseExtensionMonths` (per tail)
· `shopSlotLeadTimeMonths` (default 4, range 3–6) · `countOverDeliveryAsLoss` (default true)
· `reservesReclaimPct` · **`downtimeCostPerDay`** (per body class — he asked to set this himself)

---

## 2 · The calc layer — pure functions, in order

Everything here goes in `calc/`. No React, no JSON import. Each function takes data
and assumptions and returns a result object that **carries its own explanation**.

> Every result must include a `trace` field: the inputs used and the arithmetic, as a
> string. The UI shows it on hover or in a drawer. This is what makes the demo defensible.

### 2.1 Project forward

```
monthsToReturn        = leaseEnd (+ extensionMonths) − today
projectedHoursUsed    = hoursPerMonth  × utilisationMultiplier × monthsToReturn
projectedCyclesUsed   = cyclesPerMonth × utilisationMultiplier × monthsToReturn
hoursRemainingAtReturn  = currentLimit − (tso + projectedHoursUsed)
cyclesRemainingAtReturn = llpMinCyclesRemaining − projectedCyclesUsed
```

### 2.2 Gap per requirement

```
gap = threshold − remainingAtReturn
gap > 0  → shortfall    (you owe compensation)
gap < 0  → over-delivery (you are handing back life for free)
```

### 2.3 Price the shortfall

```
compensationRate = reserveRate(component, FH:FC, derate) × negotiationMultiplier
compensation     = shortfallUnits × compensationRate
```

> **No public market tariff exists for return-condition shortfalls** — it is negotiated deal
> by deal. So the rate is *derived* from the reserve rate, which is what the parties actually
> negotiate against, with the multiplier exposed as an assumption (default 1.25, per lessor).
> See ASSUMPTIONS §7. Say this before being asked; it is a strength, not a gap.

A component normally has **two live requirements, one in hours and one in cycles.**
Compute both. **The binding one is whichever produces the larger compensation** — that is
the hours-vs-cycles point made executable. Record `bindingMetric` on the result and show
it in the UI. It is the single clearest sign the model understands the domain.

### 2.4 Price the over-delivery

```
unitCostOfLife   = shopVisitCost(workscope) / lifeBoughtByThatWorkscope
overDeliveryCost = surplusUnits × unitCostOfLife
```

Narrowbody, 2026 USD: **build-for-interval $7.75M buys 20,000 FC = $388/FC**; **build-for-cash
$5.50M buys 8,000 FC = $688/FC**. The cheap visit costs nearly twice as much per cycle of
life it buys — that is the bucket model in four numbers, and it is why workscope and timing
have to be decided together.

This is the finding the customer worked out himself mid-conversation. It must be a column,
not a footnote.

### 2.5 The QME adjustment

If `qmeStatus === 'not-evidenced'`, the last shop visit **did not legally reset the clock.**
Recompute that component's position from the previous verified event.

The UI must show **two numbers side by side**: exposure as the maintenance system believes
it, and exposure as the lease would actually allow. The delta between them is money the
airline has already spent and legally does not own.

### 2.6 The four levers — one function each, same return shape

Each returns `{ label, cost, downtimeDays, downtimeCost, newExposure, saving, feasible, deadline, trace }`.

> **Downtime is a cost, and he asked for it by name.** *"Versus the maintenance cost, but also
> the downtime costs. So the aircraft will be out of service depending on the level of work.
> It could just be like a couple of hours, which is fine. But it could be a week or two. So
> that's something that we want to be able to put some assumptions in for those costs."*
>
> Model **aircraft** downtime, not component shop turnaround — they are not the same number.
> An engine swap with a spare available grounds the aircraft for a day; the engine itself is
> then in the shop for months without the aircraft waiting on it. Landing gear grounds the
> aircraft properly. See ASSUMPTIONS §13.

**L1 · Do the work**
```
cost = shopVisitCost(requiredWorkscope) − (reservesReclaimable × reservesReclaimPct)
```
Compare against the compensation it avoids.

**L2 · Fly it differently**
Re-run §2.1 with the hours/cycles mix of a different `routeProfile` for the remaining
months. Report the change in compensation. **Output is a flag with a number, addressed to
the routing team.** Never a schedule, never a revenue number.

**L3 · Move a component**
Search the spare pool and the rest of the fleet for the unit whose remaining life sits
**just above** this contract's threshold. Score candidates by *tightness of fit*, not by
most life. Cost = removal + install + the exposure this creates on the receiving tail
(compute it — a swap that moves the problem is not a saving).

**L4 · Time the shop visit**
Sweep the shop visit date month by month from `today + shopSlotLeadTime` to `leaseEnd`.
For each candidate date compute `compensation + overDelivery`. Return the minimum, and
return the whole curve so the UI can draw it.
> The curve is the best single visual in the demo: compensation falling, over-delivery
> rising, and a visible floor between them.

### 2.7 Recommendation

```
downtimeCost = aircraftDowntimeDays × downtimeCostPerDay(bodyClass)
totalCost    = compensationPaid + maintenanceSpend − reservesReclaimed
             + overDeliveryCost + downtimeCost
recommendation = argmin(totalCost) over feasible options
```

Show `downtimeCost` as its own line on every option, never buried in the total. It is the
term most likely to change which lever wins, and it is the one he will want to argue with.
Return the winner, **the runner-up and the delta between them**, and:
```
decisionDeadline = min(option.deadline)   // usually leaseEnd − shopSlotLeadTime
```
A recommendation with no deadline is a view, not a tool. The deadline is what makes someone
act on a Monday.

### 2.8 Avoidable vs unavoidable

```
unavoidable = exposure under the best feasible option
avoidable   = doNothingExposure − unavoidable
```
This is the number the customer could not give (*"hard to tell"*). Supply it with the
assumptions visible, then ask him whether the split looks right.

### 2.9 Reconcile the fleet against a published benchmark — write this as a test

Once the dataset exists, check its aggregate maintenance cost against the IATA Maintenance
Cost Data eXchange FY2024 panel (28 airlines, 2,703 aircraft): **$1,522 per flight hour,
$3,758 per flight cycle, $5.05M per aircraft per year.** Mix-adjust for the narrowbody /
widebody split, then assert the generated fleet lands inside a sensible band.

> This converts "I made the numbers plausible" into "I validated them against a published
> industry panel", which is a different sentence entirely in the second half.

---

## 3 · Screens, in build order

**Stop after any one of these and you still have a demo.**

### 3.1 Fleet — exposure by tail
One row per returning tail, ranked by money. Columns: tail · type · lessor · return date ·
months left · exposure if nothing changes · exposure after recommendation · binding clock ·
QME flag · decision deadline. The four components as a small inline breakdown.
Filter to `returning`; show the full 270 behind a toggle so the fleet looks like a fleet.

> *"That's one of the key things our senior stakeholders just want to be able to see at a
> glance by tail."* — build this one properly before anything else.

### 3.2 Headline
Top of the fleet screen. Three numbers and nothing else: **do nothing** · **after
recommendations** · **avoidable**. Plus the QME delta as a fourth, flagged.

### 3.3 Tail detail
Open a tail: the four components, each with its requirements, projected position, gap in
units and in cash, and the binding clock. Then the options — all four levers, costed,
ranked, with the chosen one marked and the runner-up visible. The shop-visit curve from
§2.6 L4. The decision deadline, prominent.

### 3.4 Scenarios
Four controls, **all four named by him**: maintenance cost · utilisation · extend this
lease by N months · **downtime cost per day**. The headline numbers move live. Add a reset.

Downtime cost is the one he explicitly said he wants to set the assumption for, so make it
an input rather than a constant — and when the demo reaches this screen, hand him the number
to disagree with.

### 3.5 Lease view
For one tail: the extracted return conditions as a table, each row showing the clause
reference and the clause text it came from. A toggle to see the raw clause.
> *"Be confident the recommendations are really based on the actual leases. That's going
> to be important to get their buy-in."*

### 3.6 Readiness checklist
The long tail per returning tail — manuals, cabin condition, records completeness, extra
checks, component serial reconciliation. Tickable, with an owner and a due date derived
from the return date. Cheap to build; it is the thing the leasing team personally wants.

---

## 4 · Deliberately out of scope

Named here so they are visible choices, not gaps:

- Full route optimisation — no passenger loads, no revenue, no schedule generation.
- Reading actual PDFs. The lease extraction is **hand-written synthetic data**, not an LLM
  pipeline. Say so before being asked.
- Authentication, multi-user, persistence, audit trail.
- Components beyond the four. They live in the checklist.
- Any real or anonymised customer data from any source.
