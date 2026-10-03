# Build log

One line per decision that had a real alternative. Written *as it happens* — this cannot be
reconstructed after the fact, which is exactly why it is worth keeping.

Format: **what I chose** · what I rejected · why.

---

## Architecture

**Separated `data/` · `engine/` · `ui/` into three folders, engine kept pure (no React, no
JSON imports).** · Rejected: calculating inside the React components, which is faster to
write. · Because the three questions I expect to be asked — where did the data come from,
what is actually computed, why these screens — each map to one folder. It also means the
engine can be tested without a browser.

**No backend, no database, no network calls. Dataset generated once into a JSON file in the
repo.** · Rejected: a small API, which would look more like real software. · Because the
demo must run offline. Nothing in a live demo should be able to fail for a reason outside
the build, and a short demo slot has no room for a reconnect.

**Every result object carries a `trace` string describing its own arithmetic.** · Rejected:
returning bare numbers. · Because a number I cannot derive on the spot is worse than no
number. The trace means any figure on screen can be opened and explained.

**Every rate and cost lives in one constants file, documented in `ASSUMPTIONS.md`.** ·
Rejected: inlining plausible figures where they are used. · Because the scenario panel needs
them in one place anyway, and because "where did $X come from" has to have an answer.

## Modelling

**Two live requirements per component — one in hours, one in cycles — with the binding one
chosen by whichever produces the larger compensation.** · Rejected: a single limit per
component, which is simpler. · Because the whole insight in this domain is that different
components run out of different clocks, and whichever runs out first is the one that costs
you. A model with one clock cannot show that.

**Over-delivery modelled as a cost, not just a neutral surplus.** · Rejected: showing only
shortfalls. · Because the customer worked this out during the discovery call: the
cost of a shop visit is essentially fixed, so handing back unused life is money spent and
given away.

**QME status as a field on every component, with exposure shown both ways.** · Rejected:
assuming all recorded maintenance legally counts. · Because the customer described exactly this
failure — work performed, paperwork not meeting the lease definition, life not legally
reset. It is the gap no dashboard would show today.

**Component matching scored by tightness of fit, not by most life remaining.** · Rejected:
picking the healthiest available unit. · Because the goal is to just clear the threshold.
Fitting the best engine is how you create over-delivery on the next lease.

**Spare pool of unattached components generated alongside the fleet.** · Rejected: swapping
only between in-service aircraft. · Because without a pool, lever 3 has nothing to choose
from and the recommendation engine quietly collapses to three levers.

**The route lever outputs a flag with a number attached to it, addressed to the routing
team.** · Rejected: generating a revised schedule. · Because the customer was explicit that this is
not route optimisation — they will factor it into their own route models. An output they
cannot action is worthless, and an output that oversteps gets rejected by the team that
owns it.

**Shop-visit timing swept month by month rather than solved analytically.** · Rejected: a
closed-form optimum. · Because the shape of the curve is the explanation, and because shop
slots come in months, not in continuous time. Sweeping also makes the 3–6 month lead-time
constraint trivial to apply.

**Every recommendation carries a decision deadline.** · Rejected: showing the recommendation
alone. · Because reconciliation today happens in the last six months and shop slots need
three to six months of lead time — so a recommendation without a date is a recommendation
that arrives too late to use.

## Scope

**Four components only: engines, landing gear, airframe, APU. Everything else in the
readiness checklist.** · Rejected: modelling the full component tree. · Because the customer named
these four as the most expensive and the ones carrying the most compensation, and because
the long tail is a completeness problem rather than a money problem.

**Lease extraction is synthetic hand-written data, not a document pipeline.** · Rejected:
running an LLM over generated PDFs to look more impressive. · Because it would be the
longest part of the build and would demonstrate a capability I would then have to defend,
while adding nothing to the question the demo answers. It is also the part I would argue
needs a human in the loop in the real system.

## Data and costing — decided Saturday, from `COST-REFERENCE.md`

**Every 2018-sourced cost escalated to 2026 by an explicit, per-event-type factor, with the
base year recorded.** · Rejected: using the published figures as-is, which is what the
sources hand you. · Because engine material inflation ran 7.7% in 2024, LLP list prices
escalate 5–8%/yr, and next-gen narrowbody shop costs are running 21%+ over expectation. A
2018 engine figure used unescalated understates by 45–70% — a larger error than any
cross-engine or cross-workscope distinction in the dataset.

**Two workscope tiers, not four: build-for-interval and build-for-cash.** · Rejected: the
three-tier minimum / performance / full-overhaul structure, which is the industry's own
vocabulary. · Because those tiers describe *modules*, not engines — a real shop visit mixes
tiers across modules. An engine-level three-tier price list is false precision. The
economically meaningful distinction is binary: $7.75M buying 20,000 cycles versus $5.50M
buying 8,000. That contrast *is* the bucket model.

**Reserve rates and return-condition thresholds taken verbatim from an executed 2026
operating lease filed with the SEC.** · Rejected: appraiser handbook averages, which are
easier to find and smoother. · Because an unredacted real contract is the strongest possible
provenance, it is current rather than 2018, and it carries the engine reserve grid below —
which no handbook publishes in that form.

**The engine reserve grid used directly, indexed by hours-to-cycles ratio and derate.** ·
Rejected: a single $/FH rate per engine type. · Because the same V2500 carries $722/FH below
1.0 FH:FC and $185/FH above 4.0 — a 3.9× swing driven purely by flight length. A flat rate
would delete the central insight of the whole product.

**Compensation rate derived as reserve rate × a negotiation multiplier, exposed as an
assumption.** · Rejected: inventing a plausible $/hour tariff. · Because no public market
tariff exists — it is negotiated deal by deal, and the executed lease settles shortfall by
rectification or indemnity at commercial rates, not by formula. Deriving it from the rate
the parties actually negotiate against is defensible; a made-up tariff is not.

**Two lease architectures modelled: reserve leases with thin return thresholds, no-reserve
leases with fat thresholds and cash settlement.** · Rejected: one lease shape across the
fleet. · Because they produce completely different cash profiles, and it gives the
threshold variation between lessors a real-world reason rather than being noise.

**Environment, derate and engine phase modelled as multipliers on cost and time-on-wing.** ·
Rejected: uniform engine economics across the fleet. · Because the effects are large —
harsh-high environment takes $/FH from $120 to $213, and mature-run raises the reserve 67%
over first-run — and because a dataset where a Gulf operator and a northern-European
operator have identical engine costs is the kind of thing a practitioner spots immediately.

**Individual LLP part prices not modelled; only the stack total and the shortest life.** ·
Rejected: pricing the HPT disc specifically. · Because no credible public figure exists for
one, and because it changes nothing: LLPs are replaced in groups and the engine comes off
when the shortest-lifed part expires.

**Removal and install kept as a separate declared line, not folded into the shop visit.** ·
Rejected: absorbing it, or omitting it. · Because published restoration costs explicitly
exclude it, so a separate line is correct rather than double-counting — but it is rounding
error against a $5–18M visit, and the consequential cost of an engine change is the 180–200
day shop turnaround, not the labour.

**The generated fleet reconciled against the IATA MCX FY2024 panel as an automated test.** ·
Rejected: eyeballing whether the totals look sensible. · Because $1,522 per flight hour,
$3,758 per cycle and $5.05M per aircraft per year across 2,703 aircraft is a published
industry envelope, and landing inside it turns "plausible" into "validated".

**Downtime modelled as a separate cost line on every option, priced on *aircraft* days out
of service rather than component shop turnaround.** · Rejected: leaving downtime out, and
(worse) pricing it on the 180–200 day engine shop turnaround. · Because the customer asked for it by
name — *"but also the downtime costs… that's something that we want to be able to put some
assumptions in for"* — and because the two numbers are not the same: an engine swap with a
spare grounds the aircraft for a day while the engine sits in a shop for months. Two weeks
down on a narrowbody is $630K, enough to flip which lever wins.

**Downtime cost per day exposed as a scenario control rather than a constant.** · Rejected:
picking a defensible figure and hard-coding it. · Because it is a declared assumption with no
public source, and the customer said explicitly that they want to set it. Handing the
customer the dial on the one input they asked to control is worth more than getting the
number right.

---

<!-- APPEND BELOW AS YOU BUILD -->

## Step 1 · the dataset — Saturday 3 October

**Top-level `data/`, `engine/`, `ui/` folders, no `src/`.** · Rejected: SPEC's `src/engine/`.
· Because CLAUDE.md's three-folders-three-answers rule is the thing I want to point at in a code
walkthrough, and Vite does not care where the code lives.

**The generator imports engine functions; nothing in `engine/` imports data.** · Rejected: the
generator computing its own compensation rates. · Because the rate stamped on a return
condition and the rate the pricing uses must be one formula with one trace, or "where did
that number come from" has two answers.

**Four route profiles, adding `ultra-long` for the 777-300ER.** · Rejected: SPEC's three, with
the 777 folded into long-haul. · Because ASSUMPTIONS §9 has a separately sourced row for it
and the hours-to-cycles ratio is the master variable — I am not going to blur it to save an
enum value.

**Every tail leased from new; no owned aircraft in the dataset.** · Rejected: ~15% owned, to
mirror "most leased". · Because an owned tail carries no return condition and adds nothing
the model can say; the full-fleet toggle still shows 270.

**A Gulf/Europe group with two AOCs: A6- registrations out of DXB and AUH (harsh-high), 9H-
out of MLA (harsh-mild), VIE and LGW (temperate). 190 narrowbody, 80 widebody.** · Rejected:
a single-registry European operator in one environment. · Because the environment multiplier
only shows up if the fleet spans environments, and a widebody arm is what makes the
narrowbody/widebody mix adjustment in the reconciliation mean something.

**Engine reserve rate for every type derived as pure accrual at the appraiser's reference
FH:FC × a markup calibrated on the executed lease (1.54), then shaped by the lease's FH:FC
grid and derate column.** · Rejected: scaling the V2500 grid by the ratio of PR costs. ·
Because widebody time-on-wing in cycles is a quarter of narrowbody; a cost ratio alone gets
the per-cycle number wrong by about 4×.

**Shop-visit history walked forward from new, with the engine coming off at whichever is
shorter: time-on-wing or the LLP bucket the last workscope bought.** · Rejected: sampling
TSO/CSO at random. · Because a build-for-cash engine then comes off at LLP expiry rather than
at its restoration interval — the bucket model is visible in the data, not only in the engine.

**Build-for-cash bucket scaled to the engine's certified life: 8,000 × (certified life ÷
20,000).** · Rejected: a flat 8,000 cycles for widebody engines too. · Because the Ackert
figure is a narrowbody figure and a 15,000-cycle widebody stack would otherwise get more than
half its life from the cheap visit.

**QME modelled as one alternative position per component (`asLeaseAllows`), measured from the
previous verified event.** · Rejected: a full maintenance event history per component. ·
Because §2.5 needs exactly one other number and a history would be invented detail I could
not defend.

**Metric `monthsRemaining` added for landing gear and airframe calendar limits.** · Rejected:
expressing them as `timeSinceOverhaul`. · Because every requirement then reads as "remaining
at return" and `gap = threshold − remaining` holds for all of them without a sign flip.

**Seven return conditions per tail, thresholds drawn once per lessor from the range for its
lease architecture, then jittered 0.9–1.2 per tail.** · Rejected: identical thresholds per
lessor. · Because two leases from the same lessor differ by negotiation, but should cluster —
and the between-lessor difference is the product.

**QME clause text stored once per lessor, not on every return condition.** · Rejected: the
text on each of the 1,890 rows, which is what the SPEC schema implies. · Because it cut
`fleet.json` from 4.5MB to 3MB and the definition is a property of the lease, not of the
condition; the row keeps the clause reference.

**Ten returning tails placed by hand-spread across types and round-robin across lessors.** ·
Rejected: letting the random lease dates decide. · Because ten draws will not cover six types
and seven lessors, and the fleet screen needs the variety to make its point.

## Step 2 · the reconciliation test — Saturday 3 October

**Reconciled on a cost basis — event cost ÷ interval × usage — not on reserve rates.** ·
Rejected: summing the reserve rates. · Because reserves carry the lessor's markup (1.54 on
engines) and the IATA panel is airline cost.

**Four-component accrual compared against the panel × a derived coverage share (≈56%), not
against the full $5.05M.** · Rejected: comparing to the whole figure. · Because the model does
not carry line maintenance, rotables or overhead, and a test that rewards a 44%
understatement validates nothing. Derivation: engines are 50% of total spend (IATA) and ~85%
of direct maintenance cost (Ackert), so DMC ≈ 59% of total; the four components are ~95% of
DMC.

**Mix-adjusted through the panel's own 20.3%-of-fleet / 42%-of-cost split, giving $3.68M per
narrowbody and $10.45M per widebody.** · Rejected: three independent checks per aircraft, per
FH and per FC. · Because the panel does not publish hours or cycles by body class, so the
per-FH and per-FC ratios are the same test in different currencies. The test says so.

**Two views: panel-equivalent (every tail temperate, utilisation scaled to the panel's 9.06
FH/day) asserted inside 0.65–1.35, and as-generated reported with its deviation explained and
bounded 1.0–2.0.** · Rejected: asserting the raw fleet and widening the band until it passed —
it first landed at 1.55. · Because ASSUMPTIONS §11 says the check exists to catch errors in
the cost tables, and the two things that put the fleet above the panel are deliberate: 122
tails in a harsh-high environment (+78% on engine $/FH) and 100 narrowbodies on a short-dense
profile (41% more cycles a year than the panel average). Panel-equivalent lands at 1.09.

**Widebody-to-narrowbody cost ratio band set to 0.6–1.4 of the panel's 2.84; the fleet lands
at 0.65.** · Rejected: reshaping the fleet until it hit 2.84. · Because the gap has two named
causes that are fleet traits — the short-dense narrowbodies accrue engine cost per cycle, and
the widebody arm is young A350/787 metal on first-run engines where the panel's is older
A330/777 on mature ones — and I would rather show the gap than hide it.

**Renamed `engine/` to `calc/`.** · Rejected: keeping `engine/`, which SPEC and CLAUDE.md both used. · Because "engine" collides with jet engines in this domain, and a folder named `engine/` next to a `kind: engine` component is a question I do not want to answer in a code walkthrough. Earlier entries above keep the old name as written.

## Step 3 · the exposure calc and the fleet table — Saturday 3 October

**Hours, cycles and months on one component compete for one shop-visit interval; the LLP
clause is counted on top.** · Rejected: pricing every clause independently and adding them
up. · Because the lease itself says "the greater of the two amounts shall be payable", and a
component comes off once — summing three clauses on the same interval triples the money.

**The engine's hours interval is the cycle interval at the appraiser's reference flight leg,
not at the tail's current one.** · Rejected: hours = cycles × this tail's FH:FC, which is how
the generator wrote the history. · Because that makes hours and cycles the same clock in two
currencies and they can never diverge. At a reference leg, a short-dense tail burns its cycle
clock faster and a long-haul tail its hours clock — which is the point of the product.

**Over-delivery priced as restoration ÷ time on wing it bought for the interval clocks and
LLP cost ÷ bucket cycles for the LLP clause; nothing where no shop visit was paid for during
the lease.** · Rejected: SPEC's single visit-total ÷ bucket applied to every clause. · Because
the two halves of a visit buy two different kinds of life, and pricing both at the whole
visit counts it twice. The headline $388 vs $688 per cycle is still in every engine's trace.

**Compensation per component capped at the cost of the rectifying shop visit.** · Rejected:
leaving it linear. · Because the executed lease's remedy is rectification or indemnity at
commercial rates, so no clause can cost more than doing the work — and uncapped, one
widebody engine the lease does not recognise was showing $48M against a $27M visit.

**The lease basis moves compensation only; over-delivery stays at the recorded figure.** ·
Rejected: recomputing both on the lease position. · Because the visit was paid for whether or
not the paperwork satisfies the lease, so the QME delta should be purely what the lease would
claim on top — and recomputed, it went negative on tails with large surpluses.

**Engine cycle thresholds scaled by (2.75 ÷ the engine's reference FH:FC) in the generator.**
· Rejected: the data as it was. · Because the ranges anchor on an A320 lease, and carried onto
a 7 FH:FC engine a 2,050-cycle clause demanded more cycles than a mature widebody engine has
between visits. Same seed, same draw order: 71 return-condition rows change and nothing else.

**Months since overhaul inferred as cycles since overhaul ÷ the tail's cycles per month.** ·
Rejected: reading the shop-visit date. · Because the lease position has no date, only a count
back to the previous verified event, and one formula on both bases is the only way the two
numbers stay comparable.

**Exposure computed for all 270 tails but shown only inside the 24-month window.** · Rejected:
a number on every row. · Because a projection with no intervening shop visit across eight
years is not a forecast, and a figure I would not defend does not go on screen.

**Two headline tiles left visibly pending — after recommendations, avoidable — rather than
filled with a placeholder.** · Rejected: showing the do-nothing figure twice, or hiding the
tiles. · Because the levers are the next step and the screen should say so; a number without a
formula behind it is the exact thing the rules forbid.

**"Book shop slot by" shown as lease end minus the lead time until the levers exist.** ·
Rejected: an empty decision-deadline column. · Because it is SPEC §2.7's own usual case, it is
a date with a formula, and it already tells someone which Monday matters.

**Tailwind via the Vite plugin; Recharts not installed until a chart exists.** · Rejected:
pulling in the whole stack up front. · Because the fleet table has no chart, and an unused
dependency is a question in review with no good answer.

## Step 4 · the levers and the recommendation — Saturday 3 October

**One option per lever per tail, plus paying at handback, ranked by total cost; each lever
offers its best application on the tail.** · Rejected: plans that combine actions on several
components. · Because SPEC §2.7 is an argmin with a runner-up and a delta, and one action per
tail is what can be explained and booked. The cost is that a tail with two problems — 9H-KVJ's
ENG2 and APU — gets one of them dealt with.

**Lever 1 is the cheapest workscope that clears the contract, inducted in the last month it can
be; lever 4 sweeps every month and both workscopes.** · Rejected: two unrelated shop-visit
options. · Because "do the work" as practised today is a visit just before handback, which makes
lever 1 one point on lever 4's curve: the delta between them is what timing is worth, and when
they land on the same month and workscope the action is ranked once.

**No induction after the component runs out, and a restored engine back on wing before handback
at a 200-day turnaround, the top of the current 180–200.** · Rejected: an instant reset at any
month up to handback. · Because otherwise lever 4 books visits that cannot happen. With it, a
16-month handback's last engine induction is month 9, and A6-DLL's ENG1 has to go in by month 6.

**Green time scrapped by an early visit is a cost, at the unit cost of the life thrown away.** ·
Rejected: leaving it out. · Because without it the cheapest date is always the first slot —
fewer cycles left over at handback — which pulls engines with paid-for life still on them. With
it, earlier scraps life already bought and later hands back a fuller bucket: the bucket model on
a curve.

**LLPs replaced only when the workscope would leave them more life than they have; kept LLPs stay
priced at the visit that bought them (an optional `llpBoughtBy` on Component, set only by the
levers).** · Rejected: the generator's rule that every visit resets the stack to the workscope's
bucket. · Because on the fixture's ENG2, with 19,000 FC of LLP life left, a build-for-cash visit
would otherwise pay $4.1M to cut the parts to 8,000 FC.

**Reserve rate read off the lease — the clause's compensation rate ÷ the lessor's negotiation
multiplier — with the balance running from the last event the lease recognises, capped at the
lease period and at the cost of the work.** · Rejected: a separately sourced reserve rate, and
netting reserves against compensation in the do-nothing figure. · Because compensationRate is
reserve × multiplier by construction, so this is the lease's own supplemental rent; a visit not
evidenced as a QME was never reimbursed, which `asLeaseAllows` already measures; and netting would
assert what happens to the residual balance, which must be negotiated, not assumed.

**A never-overhauled spare's surplus life priced at a build-for-interval visit's rates in lever
3.** · Rejected: the exposure's rule that such life costs nothing. · Because that rule is right
for life that came with the aircraft and wrong for a spare, which is the airline's own life
handed to the lessor. Left at nothing, lever 3 picked the freshest unit every time — the opposite
of SPEC's tightness of fit. Priced, the right-sized unit wins on cost: tightness scored in dollars.

**Lever 3 rules out any swap in which either unit would run out before its tail's handback, and
looks for donors only among the other returning tails.** · Rejected: allowing them, and searching
the whole fleet. · Because the first run proposed handing 9H-MMC the short ENG2 from 9H-KVJ, which
would have timed out five months before 9H-MMC's handback; and the exposure a swap creates on a
tail eight years out is not a forecast.

**A tail with a component that runs out before handback is offered only the levers applied to
that component; paying is off the table unless none of them can keep it flying.** · Rejected:
ranking on cost alone. · Because on cost, 9H-ZUU — ENG2 out of cycles in 1.1 months — was told to
fly a different route, $3,405 cheaper than the spare that keeps it in the air. The exposure prices
a clock past its limit as a capped shortfall; it does not force the removal. Forced, A6-DLL's ENG1
visit costs $1.88M more than its do-nothing figure, and its row shows the difference in red.

**Fleet allocation settles those tails first, soonest first, then the rest by what each could
save; every spare and every donor tail is used once.** · Rejected: settling purely by saving. ·
Because by saving, the two pool engines that could reach 9H-ZUU's handback went to tails trimming
over-delivery, and 9H-ZUU was left with nothing that kept it flying.

**Decision deadline is the recommended action's own, and none when the recommendation is to
pay.** · Rejected: SPEC §2.7's minimum over every option. · Because a route change is worth most
started now, so its deadline is always today, and the minimum put today on every narrowbody —
including 9H-PJS, which owes nothing.

**A swap between two tails is split across both rows, each carrying its own removal, downtime and
exposure afterwards.** · Rejected: the whole swap on the tail that asked for it. · Because the
fleet total then adds up row by row, and the donor's row shows what it takes on.

**Everything on the as-recorded basis.** · Rejected: recommending on the lease basis. · Because it
is the basis of the do-nothing figure avoidable is measured from. A new, properly evidenced visit
does also clear a QME problem on the lease basis; that is real, and belongs in its own number.

**The airframe is left out of levers 1, 3 and 4.** · Rejected: timing heavy checks. · Because the
airframe is the aircraft and cannot be swapped, and ASSUMPTIONS §13 has no aircraft-downtime
figure for a heavy check — it would have to be invented.

**Lever 2 starts today at the other profile's published rates, with no maintenance cost; its trace
gives what each month of delay gives up.** · Rejected: a lead time before the switch. · Because
there is no source for one, and the cost of waiting is the more useful number for routing anyway.

**"Book shop slot by" became "Decide by", showing the recommended action's deadline.** · Rejected:
keeping the placeholder. · Because Step 3 put lease end minus lead time there only until the
levers existed.

**Recommendations computed in the browser at load, about a second for this fleet.** · Rejected:
precomputing them into `fleet.json`. · Because the scenario panel (SPEC §3.4) has to recompute
them live, and a stored answer would hide the arithmetic behind a file.
