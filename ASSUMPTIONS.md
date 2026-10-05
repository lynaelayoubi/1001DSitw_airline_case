# Assumptions and number provenance

**Every number visible in the demo must appear here, or be derivable from something that
does.** If someone points at a figure on screen, this file is the answer.

Full research with sources and URLs: `COST-REFERENCE.md`. This file is what the model
actually uses.

---

## The rule

Three kinds of number appear on screen, and it must be possible to say which is which
in one sentence:

1. **Generated** — part of the synthetic dataset. Plausible, right order of magnitude.
2. **Assumed** — a rate or cost from a public source. Everything below.
3. **Computed** — produced by the engine from 1 and 2. Has a `trace`. Never typed by hand.

> The default answer to "where did that number come from": **it's computed — from the
> generated fleet data and a rate in this file, and the arithmetic is in its trace.**

---

## 0 · Base year and escalation — read this first

Most of the best public maintenance cost data is **2018 USD** (Ackert, *Aircraft Maintenance
Handbook for Financiers*). Costs have inflated hard since: Oliver Wyman put MRO material
inflation at **7.7% actual in 2024**, engine labour at **6.9%**, LLP list prices escalating
**5–8%/yr**, and two-thirds of MROs report next-gen narrowbody shop costs running **21%+
over expectation**.

So every 2018 figure is escalated to **2026 USD** by an explicit factor:

| event type | factor | reasoning |
|---|---|---|
| Engine performance restoration | **×1.55** | 4.5–6.5%/yr compounding, plus next-gen overrun |
| Engine LLP | **×1.60** | 5–8%/yr, 100% material, OEM list |
| Landing gear | **×1.45** | 3.5–5.5%/yr |
| APU | **×1.45** | 4.5–6.5%/yr |
| Airframe heavy check | **×1.40** | 2.5–3.5%/yr, labour-driven |

**This holds for any cost figure:** the source is 2018, escalated to 2026 at the published
escalation rate for that event type, and the factor is in the table above. Using a
2018 engine figure as a 2026 figure understates by 45–70% — a bigger error than any
cross-engine distinction in the dataset.

---

## 1 · Figures taken from the customer — use exactly

| value | figure |
|---|---|
| Fleet size | ~270 aircraft, most leased |
| Returning in 24 months | ~10 |
| Shop slot lead time | 3–6 months |
| Reconciliation window today | last 6 months |
| Analyst time per aircraft | days to a week, by hand |
| Components carrying the compensation | engines, landing gear, airframe, APU |

Matching these shows the model is built on what the customer said. Round numbers invented
from nothing read as a template.

---

## 2 · Engine shop visit — TWO tiers, not four

The three-tier workscope structure describes **modules**, not engines; a real shop visit
mixes tiers across modules. The economically meaningful distinction is binary:

| tier | restoration | LLP | total | buys | unit cost of life |
|---|---|---|---|---|---|
| **Build-for-interval** (NB) | $3.88M | $3.88M | **$7.75M** | 20,000 FC | **$388/FC** |
| **Build-for-cash** (NB) | $3.10M | $2.40M | **$5.50M** | 8,000 FC | **$688/FC** |

Source: Ackert Handbook Fig. 48 (2018: $2.5M + $2.5M = $5.0M @ 20,000 FC vs $2.0M + $1.5M
= $3.5M @ 8,000 FC), escalated. **This table is the whole bucket model in four numbers** —
the cheap visit costs nearly twice as much per cycle of life it buys.

### Per engine type, 2026 USD, performance restoration

| engine | aircraft | PR first-run | PR mature-run | LLP stack | TOW first / mature (FC) |
|---|---|---|---|---|---|
| V2527-A5 | A320ceo | $5.1M | $5.4M | $6.6M | 12,500 / 9,500 |
| CFM56-7B26E | B737-800 | $5.1M | $5.4M | $6.4M | 15,000 / 10,000 |
| LEAP-1A26 | A320neo | $5.4M | $6.5M | $6.6M | 12,500 / 10,000 |
| LEAP-1A33 | A321neo | $5.4M | $6.5M | $6.6M | 10,000 / 8,000 |
| Trent XWB-84 | A350-900 | $10.2M | $12.3M | $13.1M | 3,500 / 3,000 |
| GEnx-1B76 | B787-9 | $9.8M | $12.0M | $14.0M | 3,400 / 2,900 |
| GE90-115B | B777-300ER | $15.5M | $17.8M | $14.7M | 3,200 / 2,550 |

All from Ackert Handbook App. A-VI / A-VII (2018) and *Aircraft Commerce* 127 (Trent XWB),
escalated per §0. TOW assumes 10% derate, temperate environment — see §7.

### LLP certified life

15,000–30,000 FC typical. **The binding part sets the component's life** — model the
engine's LLP position as the minimum across the stack, not an average. HPT discs are
usually the limiter (CFM56: 14,300–20,000 FC; V2500-A5: 20,000 FC).

**Do not price individual discs.** No credible public figure exists for a single HPT disc
list price, and it does not matter: LLPs are replaced in groups, and only the stack total
and the shortest life affect cash.

---

## 3 · Landing gear

| aircraft | overhaul cost (2026) | interval |
|---|---|---|
| A320ceo / A320neo | $680K | 144 mo / 20,000 FC |
| A321neo | $690K | 144 mo / 20,000 FC |
| B737-800 | $610K | 120 mo / 20,000 FC |
| A350-900 | $1.60M | 144 mo / 16,700 FC |
| B787-9 | $1.30M | 144 mo / 21,000 FC |
| B777-300ER | $1.60M | 120 mo / 17,000 FC |

Exchange fee on top: **NB $87K, WB $290K**. Downtime 35–45 days NB, 55–65 days WB.

**Worth encoding — the limiter switch.** Gear is limited by calendar *or* cycles, whichever
binds first. Below ~2,000 FC/yr it is calendar-limited; above that it goes cycle-limited and
the monthly accrual rises steeply ($3,500 → $5,250/month from 1,500 to 3,000 FC/yr). Cheap
realism, and it is the same hours-vs-cycles point in a second place.

---

## 4 · APU

| aircraft | overhaul cost (2026) | interval |
|---|---|---|
| A320 family / B737-800 | $493K | 8,000 APU FH |
| A350-900 / B787-9 | $725K | 6,000 APU FH |
| B777-300ER | $870K | 6,000 APU FH |

**APU hours are their own clock** — not aircraft hours. Model as **0.8 APU hours per flight
cycle** (declared assumption, not sourced — APU usage varies enormously by operator and
climate). Published APU costs **exclude APU LLPs**; the model excludes them too, so there is
no double-count.

---

## 5 · Airframe heavy structural check

| aircraft | check | cost (2026) | interval |
|---|---|---|---|
| A320ceo / A320neo | 6Y SC | $1.19M | 72 mo |
| A320ceo / A320neo | 12Y SC | $1.26M | 144 mo |
| A321neo | 6Y / 12Y | $1.22M / $1.29M | 72 / 144 mo |
| B737-800 | 8Y / 12Y | $0.98M / $1.29M | 96 / 144 mo |
| A350-900 | 12Y SI | $4.00M | 144 mo |
| B787-9 | 12Y SI | $3.57M | 144 mo |
| B777-300ER | 8Y SI | $5.04M | 96 mo |

Airframe is only **4–6% of direct maintenance cost** and falling (airframe's share of global
MRO spend dropped 26% → 17% between 2019 and 2024, while engines rose 41% → 50%). It is in
the model for completeness, not because it moves the answer.

---

## 6 · Maintenance reserves — from a real, executed 2026 lease

These are not estimates. They are the supplemental rent rates in an **unredacted operating
lease for an A320-233 / V2527E-A5, dated 6 March 2026**, filed with the SEC (Global Crossing
Airlines / UMB Bank, Castlelake-serviced). Context: basic rent $210,000/month, agreed value
$31M.

| reserve | rate | escalation |
|---|---|---|
| **Engine performance restoration** | **$228 per engine flight hour** @ 2.5:1 FH:FC, 10% derate | +4.0%/yr |
| **Engine LLP** | **OEM list price ÷ certified cycle life**, per cycle | reset annually to OEM list |
| **APU** | **$55 per APU hour** | +3.0%/yr |
| **Airframe 6-year check** | **$14,500 per month** | +3.0%/yr |
| **Airframe 12-year check** | **$6,500 per month** | +3.0%/yr |
| **Landing gear** | **$4,750 per month** | +3.0%/yr |

### The engine reserve grid — the single most valuable artefact here

Same engine. Only flight length changes. 10% derate column:

| FH:FC ratio | $/EFH |
|---|---|
| < 1.0 | **$722.52** |
| 1.0 – 1.5 | $435.38 |
| 1.5 – 2.0 | $319.44 |
| 2.0 – 2.5 | $260.85 |
| 2.5 – 3.0 | **$228.00** ← contract base |
| 3.0 – 3.5 | $208.33 |
| 3.5 – 4.0 | $195.38 |
| > 4.0 | **$184.64** |

**A 3.9× swing on the same engine, driven purely by how long the flights are.** Use this
grid directly in the model. If one thing in the demo proves the model understands the
domain, it is this.

**Reserves reclaim:** model as a percentage of qualifying maintenance spend, default 100%
for work that qualifies and **0% where the QME test fails** — that is the mechanism, not a
haircut. Whether a residual balance is refunded at lease expiry is **negotiated, not
standard.** Do not assert it either way.

---

## 7 · Return conditions and compensation — the honest gap

### Return conditions, from the same executed lease

| component | threshold at return |
|---|---|
| Engines | ≥100 FH **and** ≥50 FC remaining to next performance restoration |
| LLPs | ≥50 FC remaining to life limit at titled thrust |
| Landing gear | ≥2 months remaining to next overhaul |

For contrast, the **delivery** condition the lessee demanded in the same contract: engine
≤15,000 FH since last PR with ≥5,000 FH expected remaining; LLPs ≥2,500 FC; gear ≥24 months.

> **Model two lease architectures, because they behave completely differently** — and this
> is where thresholds vary by lessor:
> - **Reserve leases** — monthly reserves accrue, return-condition thresholds are *thin*
>   (the numbers above), shortfall settles out of the accumulated reserve.
> - **No-reserve leases** — no monthly accrual, thresholds are *fat*, and the shortfall is a
>   cash settlement computed at redelivery. This is where a $/FH or $/FC compensation rate
>   gets negotiated.

### The compensation rate — declare this, do not invent it

**There is no published market tariff of "$X per flight hour" for return-condition
shortfalls.** No lessor publishes one; it is negotiated deal by deal. What the executed lease
actually says is that on shortfall the lessor may either require rectification (term extends
at **150% of monthly rent**, pro-rated daily) or take redelivery and be indemnified **at
commercial rates then charged** by its own chosen provider.

So the model derives it, and says so:

```
compensationRate = reserveRate(component, FH:FC, derate) × negotiationMultiplier
negotiationMultiplier default 1.25, range 1.0–1.5, per lessor
```

**The derivation is declared, not hidden.** There is no public rate, so the rate is anchored
on the reserve rate — which is what the parties actually negotiate against — and the
multiplier is exposed as an assumption.

### Scale checks

| check | figure |
|---|---|
| One 737-800 returned off lease, full settlement | **≈$6.7M** (Sun Country 10-Q, Q2 2025, audited) |
| Half-life adjustment formula | **(% life remaining − 50%) × event cost** |
| Total maintenance event value, A320-200 | $17.7–19.2M |
| Total maintenance event value, 777-300ER | $60.4–75.8M |
| Air Lease end-of-lease revenue, fleet-wide | **$60M in Q4 2023 vs $6M in Q4 2024** |

**That last line is the most useful fact in the whole research.** End-of-lease income is
lumpy and regime-dependent, not a smooth accrual. If the demo's ten returning aircraft
produce a total in the tens of millions, that is the right order of magnitude.

---

## 8 · Component removal and installation — a declared assumption

**No credible public figure exists** for the standalone labour cost of an engine, gear or
APU change. It is folded into line maintenance budgets in every public source. So:

```
removalAndInstall = manHours × labourRate + QEC/consumables
```
Declared assumptions: **engine 300 MH, gear 180 MH, APU 60 MH, at $95/MH** (2006 base rates
of $50 base / $70 line, escalated at published labour inflation). Published PR costs
explicitly **exclude** removal and install, so a separate line is correct, not double-counting.

**It barely matters.** It is rounding error against a $5–18M shop visit. The genuinely
consequential cost of an engine change is not the labour — it is the **180–200 day shop
turnaround time** currently running on narrowbody engines, and the spare-engine cover that
forces. That is worth a sentence in the demo.

---

## 9 · Utilisation — the master variable

| profile | FH/month | FC/month | FH:FC | source |
|---|---|---|---|---|
| **short-dense** | 291 | 151 | **1.93** | Ryanair 20-F, FY to 31 Mar 2025 |
| **mixed** | 301 | 107 | **2.81** | FAA/BTS, US NB ≥165k lb MTOW, YE Jun 2023 |
| **long-haul** (A350, 787) | 350 | 44 | **7.90** | FAA/BTS, US WB <580k lb |
| **ultra-long** (777-300ER) | 322 | 40 | **7.99** | FAA/BTS, US WB ≥580k lb |

Cross-check: global all-fleet average 238 FH and 107 FC per month, 2.22 FH:FC (IATA MCX
FY2024, Cirium data).

> **Watch the units.** FAA/BTS figures are *block hours* (ramp to ramp); Ryanair reports
> *flight hours*; the engine tables are *engine flight hours*. Block exceeds flight hours by
> 5–8% on short-haul. Mixing them silently biases every $/FH number.

Apply ±10% per-tail noise so no two aircraft are identical.

---

## 10 · Environment, derate, and engine phase

Three multipliers that cost almost nothing to implement and that a practitioner notices
immediately if they are missing:

| factor | effect | source |
|---|---|---|
| **Derate** 0% → 10% | engine reserve **−21%** | executed lease grid |
| **Environment** temperate → harsh-high | cost +13% **and** time-on-wing **−36%** → $/FH from $120 to $213, **+78%** | Ackert Fig. 71 |
| **Phase** first-run → mature-run | cost +3–25% **and** TOW −20–30% → A320 PR reserve $92/FH → $154/FH, **+67%** | Ackert |

A Gulf operator and a northern-European operator with identical engine costs is the kind of
thing that gets spotted. Assign each tail an environment; assign each component a shop visit
count that drives its phase.

---

## 13 · Downtime — the customer's explicit ask, and a declared assumption

> *"Versus the maintenance cost, **but also the downtime costs.** So the aircraft will be out
> of service depending on the level of work. It could just be like a couple of hours, which
> is fine. But it could be a week or two. **So that's something that we want to be able to
> put some assumptions in for those costs.**"*

**Model aircraft downtime, not component shop turnaround.** They are wildly different numbers
and conflating them is the easy mistake: a narrowbody engine currently sits in the shop for
**180–200 days** (Oliver Wyman, 2025), but the *aircraft* only waits if there is no spare
engine to hang on it. The customer's own range — hours to a week or two — is aircraft downtime.

| action | aircraft days down | why |
|---|---|---|
| Engine swap, spare available | **1** | overnight change, aircraft flies next day |
| Engine shop visit, no spare cover | **14** | aircraft waits; the 180-day shop TAT sits behind a spare |
| Landing gear change | **10** | gear exchange, unless folded into a scheduled heavy check |
| Landing gear, inside a planned check | **0** | marginal — the aircraft was already down |
| APU change | **1** | |
| Route reassignment | **0** | |
| Do nothing | **0** | |

**Cost per day — declared, not sourced, and exposed as a control.**

| body class | lost contribution per day |
|---|---|
| Narrowbody | **$45,000** |
| Widebody | **$130,000** |

This is lost *contribution*, not revenue, and it is a modelling assumption rather than a
published figure. **That is the right way to present it** — the customer said they want to put their own
assumptions in, so it is a slider on the scenario panel, not a constant in the code.

> The default is a starting point, not a claim: change it and see whether it moves the
> recommendation. Handing the customer the dial on the one input they asked to control is
> worth more than getting the number right.

**Why it matters:** on a narrowbody, two weeks down is **$630,000** — enough to flip a tail
from "do the work" to "retime the shop visit", which is exactly the kind of decision the
tool exists to get right. It is also the reason folding gear work into a scheduled check is
often the whole saving.

---

## 11 · The reconciliation check — build this as a test

Once the synthetic fleet exists, reconcile its aggregate maintenance cost against the
**IATA Maintenance Cost Data eXchange FY2024** panel — 28 airlines, 2,703 aircraft, average
age 10.6 years, 9.06 flight hours/day:

| metric | benchmark |
|---|---|
| Maintenance cost per flight hour | **$1,522** |
| Maintenance cost per flight cycle | **$3,758** |
| Maintenance cost per aircraft per year | **$5.05M** |

If the generated fleet lands far outside that envelope once mix-adjusted, something in
§§2–6 is wrong. **Make this an automated test** — it is
the difference between "I made the numbers plausible" and "I validated them against a
published industry panel."

Useful shares for sanity: engines are **>80% of total direct maintenance cost on an A320**
and **>90% on a 777-300ER**; within that, performance restoration is 35–40% and LLPs
**50–55%**. Widebodies are 20.3% of the world fleet and **42% of MRO spend**.

### 11b · The scale check — also a test

Two comparisons against figures the model did not produce, each with a band and a reason
(`calc/scale.ts`, `calc/scale.test.ts`).

| check | band | reason |
|---|---|---|
| Exposure on the returning tails ÷ their four-component maintenance accrual between today and handback (the cost basis above) | **0.2–1.0** | a handback that costs more than all the maintenance it takes to get there counts something twice — before the over-delivery and cap fix this stood at 1.45; below 0.2, return conditions on a fleet where four of seven lessors write fat-threshold no-reserve leases would have no teeth |
| Any one tail ÷ its body class's settlement benchmark | **≤ 2** | the benchmark is one settlement on a smaller, older engine; twice it leaves room for a fat-threshold lease with an engine past its limit |
| Average over the tails with any exposure ÷ benchmark | **0.3–1.5** | centred on a real settlement; tails owing nothing are left out, since clearing every clause says nothing about the size of a claim |

| benchmark | figure | source |
|---|---|---|
| Narrowbody | **$6.7M** | one 737-800 off lease, full settlement (Sun Country 10-Q, Q2 2025, audited; §7) |
| Widebody | **$24.7M** = $6.7M × 3.69 | total maintenance event value, 777-300ER $60.4–75.8M ÷ A320-200 $17.7–19.2M at the midpoints (Ackert / ISTAT 2020; §7) |

---

## 12 · Sensitivity — the column that matters most

Ranked by how much the output moves. **The top three dominate everything below them.**

| # | factor | effect if wrong | matters? |
|---|---|---|---|
| 1 | **Engine time-on-wing** | 9,000–17,500 FC across the same engine class — a 2× range against a cost range of only 1.4×. **Interval variance dominates cost variance.** | **dominant** |
| 2 | **FH:FC ratio** | 3.9× swing in engine reserve on the same engine. Get it wrong and LLP accrual is wrong by a multiple, not a margin. | **dominant** |
| 3 | **Cost vintage** | A 2018 figure used unescalated understates engine events by 45–70% | **dominant** |
| 4 | Engine LLP stack cost | 50–55% of direct maintenance cost — larger than performance restoration | high |
| 5 | Narrowbody vs widebody assignment | $17.7–19.2M vs $60.4–75.8M lifetime event value | high |
| 6 | Derate and environment | up to +78% on $/FH for the same engine | high |
| 7 | First-run vs mature-run | +67% on reserve rate | high |
| 8 | Airframe check cost | 4–6% of DMC, narrow range | second order |
| 9 | Landing gear cost | 2–3% of DMC, hard-time, easy to model right | second order |
| 10 | APU cost | 1–2% of DMC | second order |
| 11 | Individual LLP part prices | **nil** — only the stack total and the shortest life affect cash | barely |
| 12 | Removal and install labour | **nil** — rounding error against a $5–18M visit | barely |
| 13 | Workscope tiers beyond two | **nil** — false precision | barely |

> In one line: **if the shop visit cost is out by half, the ranking of the ten tails barely
> moves — only the total does. The two things that would actually change the recommendation
> are time-on-wing and the hours-to-cycles ratio, and both come from a published appraiser
> handbook and an airline's own 20-F.**

---

## 13 · Declared in the build — Saturday 3 October

Numbers that appear in `calc/constants.ts` or `data/generate.ts` and are not in §§0–12
above. Each is a declared assumption or a derivation from one, not a sourced figure.

### Engines

| item | value | basis |
|---|---|---|
| LLP certified life, limiting part | **20,000 FC** narrowbody (LEAP-1A, CFM56-7B) · **15,000 FC** widebody (Trent XWB, GEnx, GE90) | inside the 15,000–30,000 FC range in §2; CFM56 HPT 14,300–20,000 |
| Build-for-cash bucket | 8,000 FC × (certified life ÷ 20,000) | §2 is a narrowbody figure; scaled so a widebody stack does not get half its life from the cheap visit |
| Lessor markup over pure accrual | **1.54** = $228 ÷ ($5.1M ÷ (12,500 FC × 2.75)) | calibrated so the model reproduces the executed lease's $228/EFH for a V2527 at 10% derate, temperate, first-run |
| Reference FH:FC for TOW tables | 2.75 narrowbody · 7.0 widebody | Ackert App. A conventions (2.0 NB in 2018; grid base band is 2.5–3.0) |
| Reserve rate, any engine | accrual at reference FH:FC × 1.54 × grid shape (grid rate at actual FH:FC ÷ grid rate at reference) × derate column | §6 grid used as a *shape*, the base level set by each engine's own cost and time-on-wing |
| Derate 5% | ×1.133 (midpoint of 0% ×1.266 and 10% ×1.0) | §10 gives the end points only |
| Environment harsh-mild | cost +6.5%, time-on-wing −18% (midpoint) | §10 gives temperate and harsh-high only |
| Engine removal point | 85–100% of min(time-on-wing, LLP bucket) | engines rarely run to the exact limit |
| Share of engines swapped from another tail | 20% | customer: "components get swapped constantly" |
| Derate mix | narrowbody 10%/5%/0% at 70/20/10 · widebody 0%/5%/10% at 50/30/20 | long-haul widebodies at MTOW rarely derate |

### Other components

| item | value |
|---|---|
| Gear or APU not original to the tail | 10% |
| Workscope on gear, APU, airframe | one tier (`build-for-interval`); the two-tier distinction is an engine matter |
| Derate field on non-engines | 0, meaning not applicable |

### QME incidence (components with at least one recorded event)

| component | not-evidenced |
|---|---|
| engine | 12% |
| landing gear, APU | 8% |
| airframe | 4% |

Declared. The customer described the failure but did not give a rate. The alternative
position (`asLeaseAllows`) withdraws the credit of the unevidenced event: cycles since the
previous verified event, LLP life net of the last run.

### Return conditions

| architecture | engine FH | engine FC | LLP FC | gear months | gear FC | airframe months | APU hours |
|---|---|---|---|---|---|---|---|
| reserve (thin) | 100–500 | 50–250 | 50–500 | 2–6 | 200–1,000 | 2–6 | 100–300 |
| no-reserve (fat) | 2,500–5,000 | 1,000–2,500 | 2,500–5,000 | 12–36 | 2,000–6,000 | 12–36 | 1,000–2,000 |

Thin anchors on the executed lease's return condition (§7); fat anchors on the same contract's
*delivery* condition. Drawn once per lessor, rounded to 50 units (1 month), then jittered
0.9–1.2 per tail. Negotiation multiplier drawn per lessor in 1.0–1.5 in steps of 0.05.
Lessors alternate architecture: four reserve, three no-reserve.

### Fleet

| item | value |
|---|---|
| Composition | A320neo 90 · A321neo 60 · B737-8 40 · A350-900 32 · B787-9 28 · B777-300ER 20 = 270; 29.6% widebody |
| Returning inside 24 months | 10, spread 4–23 months out, across all six types and all seven lessors |
| Bases and environment | DXB, AUH harsh-high · MLA harsh-mild · VIE, LGW temperate |
| Lease term | 8–12 years, all leased from new |
| Maximum age by type | neo 10 / 9 yrs · MAX 9 · A350 11 · 787 12 · 777 15 — entry into service |
| Utilisation noise | ±10% on hours and on cycles independently, so FH:FC also varies |
| Spare pool | 7 engines, 4 gear, 3 APU — 14 units |

### Exposure calculation (SPEC §2.1–§2.5, as built)

| item | value | basis |
|---|---|---|
| Month length | 30.4375 days | 365.25 ÷ 12; every months↔days conversion uses it |
| Engine interval clock | time on wing for the engine's phase and environment (§2, §10), in FC; in hours, the same interval × the appraiser's reference FH:FC (2.75 narrowbody, 7.0 widebody), not the tail's own | the interval is quoted at a reference flight leg; a tail on shorter legs burns the cycle clock faster, on longer legs the hours clock — the two clocks can only diverge if the hours limit is not re-derived from the current route |
| Months since overhaul (gear, airframe) | cycles since overhaul ÷ the tail's cycles per month | one formula on both QME bases; exact for components original to the tail, ±20% on the 10% that are not |
| Engine cycle thresholds on widebodies | × (2.75 ÷ engine reference FH:FC) = × 0.39 | the executed lease is an A320; a cycle clause carried unscaled onto a 7 FH:FC engine demands more cycles than a mature engine has between visits |
| Binding clock | of the hours / cycles / months clauses on one component, the one producing the larger compensation; if none is short, the one that runs out first | SPEC §2.3; the lease's own "the greater of the two amounts shall be payable" |
| LLP clause | counted on top of the binding clock | a part-life limit, not the shop-visit interval |
| **Over-delivery** | only the surplus that did not have to be bought: on an engine's LLP clause, the bucket a build-for-interval visit bought beyond a build-for-cash one (12,000 FC narrowbody, 9,000 FC widebody), if the smaller bucket would still have cleared the clause at handback; **nothing** on restoration, check or overhaul clocks | a shop visit is bought whole and every past one was forced (the engine came off at its limit, the check or overhaul fell due); both engine workscopes buy the same time on wing and the others have one tier. Was: every unit of surplus at what it cost to buy, which made over-delivery $93.6M of a $130M fleet figure (DIAGNOSIS.md) |
| Over-delivery unit cost | LLP cost ÷ bucket cycles of the visit that bought it | the LLP half of the visit buys LLP life |
| Over-delivery with no shop visit in the lease | **$0** | the life came with the aircraft; nothing was paid for it |
| Over-delivery is sunk | realised when the unit is handed over; every option that leaves the unit on the aircraft carries it unchanged, so it cancels out of the avoidable figure. Only a swap that sends the unit to the pool keeps it | a real loss at handback, and not one the levers can undo — except by not handing the unit over |
| **Compensation cap** | per component, min(linear compensation, the cheapest work that would put it right, at the lessor's provider's rates — our cost × the markup below): an engine restoration at the build-for-cash price if a restoration clock is short, plus a build-for-cash LLP replacement only if the LLP clause is short; gear overhaul + exchange fee; next structural check; APU overhaul | §7: the executed lease's remedy is rectification or indemnity at commercial rates, so no clause can cost more than the work that puts it right. Was: a build-for-interval visit (restoration and a full new LLP stack) |
| **Lessor rectification markup** | **1.25**, range 1.0–1.54 | declared, no public figure. The executed lease's remedy is indemnity "at commercial rates then charged" by the lessor's chosen provider: a one-off visit bought at market rates, against a 270-aircraft operator's negotiated terms. 1.0 is our own cost; 1.54 is the executed lease's own lessor premium over pure cost accrual (§13), which also carries escalation and risk, so a ceiling. 1.25 matches the default negotiation multiplier, so one lessor premium is no more aggressive than the other. It binds only where the lease would claim more than the work costs: in this fleet, the two engines that run out before handback |
| QME basis and over-delivery | the lease basis moves compensation only; over-delivery stays at the recorded figure | the visit was paid for whether or not the lease credits it, so the QME delta is purely what the lease would claim on top |
| QME basis and LLP life | read as recorded on both bases | LLP life is tracked part by part, with each part's own records; an unrecognised visit does not reset the restoration clock, but it does not take life off parts that were fitted |
| Horizon | 24 months | beyond the returning window a projection with no intervening shop visit is not a forecast; computed, not shown as one |
| Shop slot lead time | **4 months** default, 3–6 | §1, customer |
| Reserves reclaimable | 1.0 of a qualifying balance | credited by levers 1 and 4 (below); must be negotiated, not assumed |
| Decision deadline | the recommended action's own (below) | replaced "lease end − shop slot lead time" once the levers existed |

### Levers and recommendation (SPEC §2.6–§2.8, as built)

Every number here is a rule applied to figures already in §§0–13, or a declared choice. None is a new sourced rate.

| item | value | basis |
|---|---|---|
| Basis | as recorded | the basis of the "if nothing changes" figure that avoidable is measured from |
| Options per tail | pay at handback + one option per lever (its best application on the tail) | SPEC §2.7: argmin, runner-up, delta |
| Total cost | maintenance − reserves reclaimed + removal and installation + downtime + exposure still owed at handback | SPEC §2.7 |
| Earliest shop induction | today + shop slot lead time (4 months default) | §1, customer |
| Latest shop induction | when the component's first clock runs out; for engines also handback − turnaround | it cannot fly past a limit; the restored engine must be back on wing before handback |
| Engine shop turnaround | **200 days** | top of the 180–200 range in §8 — the conservative end for a feasibility claim |
| Workscopes swept | engines: build-for-cash and build-for-interval; gear: overhaul + exchange fee; APU: overhaul | §2–§4 |
| LLPs in a visit | replaced, and paid for, only if the workscope would leave more life than is left | a build-for-cash visit should not cut 19,000 FC of LLP life to 8,000 |
| A future visit's life | paid for in the visit's price; none of it counts again as over-delivery. The old unit's sunk over-delivery is carried unchanged | counting it as well would charge the visit twice |
| Lever 1 | the cheapest workscope that clears every clause, inducted in the last month it can be | "do the work" as done today: just before handback |
| Lever 4 | every month from the earliest to the latest induction, both workscopes; the minimum, equal months going to the latest | lever 1 is one point on this curve. A visit costs the same in any open month, so months differ only by reserves reclaimed and compensation left |
| Reserve rate | the clause's compensation rate ÷ the lessor's negotiation multiplier | §7: compensationRate = reserve rate × multiplier, so this is the lease's own supplemental rent |
| Reserve balance | from the last event the lease recognises (a visit not evidenced as a QME was never reimbursed), history capped at the lease period's usage, plus usage to induction; reclaim ≤ the work's cost; × reserves reclaimable | reserve leases only; no-reserve leases have no balance |
| Shop visit downtime | engine: 2 × engine swap (a pool spare on, own engine back) if the pool has one of the model, else 14 days; gear 10; APU 1 | §13 |
| Removal and installation | per change: engine 300, gear 180, APU 60 MH × $95 | §8 |
| Lever 2 | the type's other profile in §9, at its published rates × utilisation, from today; no maintenance, no downtime; revenue not modelled | §9, §13; a flag to routing, never a schedule |
| Lever 3 search | spare-pool units and same-model components on the other returning tails | in-service tails are beyond the 24-month window, where the exposure a swap creates is not a forecast |
| Lever 3 feasibility | ruled out if either unit would run out before its tail's handback | a swap that moves the problem forward is not a saving |
| Lever 3 cost | removal and installation on each tail touched + swap downtime (engine 1 day, gear 10, APU 1, per tail) + the exposure created on the other tail | SPEC §2.6 |
| A spare's surplus life | all of a pool spare's surplus above the thresholds (binding clock and LLP), priced at a build-for-interval visit's rates (engine: restoration ÷ time on wing, LLP ÷ bucket; gear and APU: overhaul ÷ interval) | it would otherwise stay with the airline, so all of it leaves because of the swap; this is what makes tightness of fit cost money. A unit swapped between two returning tails is handed to a lessor either way and stays on the over-delivery rule |
| Airframe | not timed, not swapped | it is the aircraft; no heavy-check aircraft downtime in §13 |
| A component that runs out before handback | only levers applied to it are offered; paying is off the table unless no lever can keep it flying | the exposure prices a clock past its limit as a capped shortfall; it does not force the removal |
| Fleet allocation | tails with such a component first, soonest first; then by what each could save; each spare and each donor tail used once | they have to act; the rest are choosing |
| Decision deadline | levers 1 and 4: induction − lead time; lever 3: the earlier of the outgoing unit running out and the shop-slot deadline; lever 2: today; pay: none | the date the recommended action has to be committed |

### Reconciliation (§11, as built)

| item | value | basis |
|---|---|---|
| Coverage of total MRO by the four components | **55.9%** = 0.50 ÷ 0.85 × 0.95 | engines 50% of spend (IATA) and ~85% of DMC (Ackert, §11); four components ~95% of DMC |
| Per-class panel cost | $3.68M narrowbody · $10.45M widebody per aircraft-year | $5.05M split by 20.3% of fleet / 42% of cost |
| Normalisation to panel conditions | every tail temperate; hours and cycles × (9.06 ÷ fleet FH/day) | Ackert tables are temperate; panel is a global average at 9.06 FH/day |
| Pass band, panel-equivalent | 0.65–1.35 of expected | the fleet lands at **1.09** |
| As-generated bound | 1.0–2.0 of expected | lands at 1.55: harsh-high environment and short-dense cycles, both deliberate |
| Widebody ÷ narrowbody cost ratio | 0.6–1.4 of the panel's 2.84 | lands at 0.65 — young A350/787 arm on first-run engines; short-dense narrowbodies |
| Engine share of modelled cost | 0.75–0.95 | expected ≈ 0.50 ÷ 0.559 = 89%; lands at 87% |
| Utilisation | 0.75–1.25 of 9.06 FH/day | lands at 1.13 |

---

## 14 · Assumptions, their provenance, and how firm the answers are (SPEC §3.4, as built)

The screen no longer asks for these numbers: the customer's own teams hold them. Each is stated
with its provenance below and can be overridden, and the robustness check says how far each would
have to move before any recommendation changes. **One control stays on screen:** extend the lease
on a named returning tail, 0–12 months — the customer's own decision and example.

| assumption | value used | plausible range | basis of the ends | in deployment, from |
|---|---|---|---|---|
| Shop costs | as stated (× 1.00) | **−9% to +50%** | *Floor:* §0's 2026 factors sit inside published escalation ranges whose low ends compound to about 9% under the factors used (engine restoration 4.5%/yr → 1.42 against 1.55; LLP 5%/yr → 1.48 against 1.60; gear 3.5%/yr → 1.32 against 1.45). *Ceiling:* a quarter of MRO respondents report next-generation narrowbody engine shop costs more than 50% over expectation (Oliver Wyman, Apr 2026). | MRO contract rates and shop-visit quotes, from engineering and procurement |
| Utilisation | as planned (× 1.00) | **−13% to +20%** | *Floor:* 12% of narrowbodies and 13% of widebodies were parked in 2024 (IATA MCX FY2024). *Ceiling:* Cathay Pacific's fleet went from 9.4 to 11.3 hours a day between 2024 and 2025. | the published schedule and flying-hour plan, from network planning |
| A day on the ground | $45,000 NB · $130,000 WB (§13) | **NB $0–100,000 · WB $0–300,000** | Declared, not sourced: zero (a spare aircraft) to a little over twice the default. The customer asked to set this one themselves. | finance's lost contribution per aircraft day |
| Lessor's provider over our cost | × 1.25 (§7) | **× 1.00–1.54** | 1.00: our own cost. 1.54: the executed lease's own lessor premium over pure cost accrual, a ceiling. | the leasing team's settlement history with each lessor |
| Share of reserves reclaimable | 100% | **0–100%** | Negotiated, not assumed (CLAUDE.md): none of the balance to all of it. | the reserve terms in each lease, from the leasing team and legal |
| Shop-slot lead time | 4 months (§1) | **3–6 months** | As the customer gave it. | MRO slot availability, from engineering planning |
| Lease extension (the one control) | none | **0–12 months** | Twice the customer's own six-month example; beyond it a projection runs past three years with no shop visit modelled. Rent for the extra months is not modelled. | the customer's own decision |

### How firm the answers are (`calc/robustness.ts`)

Each assumption is stepped outward from its current value, one at a time, across its plausible
range, at the steps below, and the returning tails are re-recommended at every step — the same
sweep as lever 4, run on the input instead of on months. A tail's **breakeven** on an input is the
first step at which its recommended action changes (a different lever, component or workscope; not
a different month or spare).

| assumption | sweep step |
|---|---|
| Shop costs, utilisation | 1% |
| A day on the ground | $5,000 NB · $10,000 WB |
| Lessor's provider over our cost | 0.02 |
| Share of reserves reclaimable | 5 points |
| Shop-slot lead time | 1 month |

**Reach** = how far the input moved before the breakeven ÷ how far the evidence lets it move on
that side. It puts different inputs on one scale, each read against its own evidence.

Three states, from the breakevens:

| state | when | reason |
|---|---|---|
| **Too close to call** | an input flips the answer inside the model's own noise: **±10% utilisation** (the per-tail noise the generator puts into the data, §9) or **±10% shop costs** (the spread of the published escalation around the 2026 factors, §0) | inside the noise the data cannot tell the options apart. The same rule a materiality floor would use — one rule, not two |
| **Close** | the nearest flip is outside the noise but inside the evidenced range | the evidence allows a value at which the answer is different |
| **Firm** | no input flips it anywhere inside its evidenced range | |

The other inputs (downtime, the lessor markup, reserves, lead time) are declared or negotiated
values with no noise of their own; their uncertainty is their plausible range. The inputs shown as
**binding soonest** are the three whose first flip of any tail has the smallest reach.

**One at a time, so a lower bound.** Each input moves on its own. Real assumptions move together —
a busy summer raises flying and shop demand at once — so the sweep is a lower bound on fragility:
correlated moves would flip answers sooner than any single breakeven it reports.
