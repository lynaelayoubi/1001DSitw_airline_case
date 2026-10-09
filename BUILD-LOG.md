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

## Step 5 · the scale of the exposure — Sunday 4 October

Diagnosis in `DIAGNOSIS.md`: exposure on the ten returning tails was $130M, 1.45× the
maintenance they accrue before handback, and $93.6M of it was over-delivery.

**Over-delivery counts only the surplus that did not have to be bought: an engine's LLP bucket
from a build-for-interval visit beyond a build-for-cash one, where the smaller bucket would still
have cleared the clause; nothing on restoration, check or overhaul clocks.** · Rejected: every
unit of surplus at what it cost to buy (Step 3). · Because a shop visit is bought whole and every
past one was forced — the engine came off at its limit, the check fell due — so only the choice of
the larger workscope was avoidable. Over-delivery falls from $93.6M to $36.5M.

**Compensation capped at the cheapest work that would put the component right: a restoration at
the build-for-cash price, plus an LLP replacement only if the LLP clause is short.** · Rejected:
Step 3's cap at a build-for-interval visit. · Because an unrecognised restoration is put right by a
restoration, not by a new LLP stack; the old cap let the lease basis claim $27–35M an engine, and
four of the seven unevidenced engines sat on it. The QME delta falls from $105.6M to $42.5M.

**LLP life read as recorded on the lease basis.** · Rejected: the generator's withdrawal of the
last run's cycles from LLP life. · Because LLP life is tracked part by part and an unrecognised
visit does not take life off fitted parts. Worth $0.8M here; wrong in principle. The calc reads it
differently; the data is left as generated.

**A future visit's life is paid for in its price, and the old unit's sunk over-delivery is carried
through unchanged; Step 4's "green time scrapped" is dropped.** · Rejected: keeping the scrapped
term, and counting the new visit's surplus as over-delivery. · Because under the rule above,
unavoidable life handed back is not a loss, so unavoidable life thrown away early is not one
either, and counting the new life as well would charge the visit twice. Consequence: a visit costs
the same in any open month, so lever 4 mostly confirms lever 1's month, differing where reserves
or compensation make a month cheaper.

**A pool spare's whole surplus priced at build-for-interval rates; a unit swapped between two
returning tails stays on the over-delivery rule.** · Rejected: the rule for spares too, and full
pricing for both. · Because a spare's life leaves the airline only because of the swap, while a
unit between two returning tails goes to a lessor either way.

**Sunk over-delivery cancels out of the avoidable figure for every option except a swap that sends
the unit to the pool.** · Rejected: forcing it to cancel there too. · Because the unit is not
handed over, so the loss is not realised — which is the point of moving components. It matters:
$7.92M of ENG1 life kept on A6-GPZ and 9H-MMC, against a fleet avoidable figure of $4.79M. Open
for review.

**The headline says how much of the do-nothing figure is cash payable at handback and how much is
life already bought and handed over.** · Rejected: leaving the split in the tile's subtitle. ·
Because they are different kinds of loss and the demo has to say which is which.

**A scale test against two outside figures, with stated bands** (ASSUMPTIONS §11b): exposure ÷
maintenance accrual to handback in 0.2–1.0 (lands at 0.72), no tail above 2× its body class's
settlement benchmark (largest 1.70), average 0.3–1.5× (lands at 0.82). · Rejected: eyeballing the
totals. · Because the first version passed every unit test and was still twice the right size.

**Compensation capped at the lessor's provider's rates: our cost of the cheapest work × 1.25.** ·
Rejected: our own cost (1.0), and the executed lease's 1.54 lessor premium over pure accrual. ·
Because the lease's remedy is indemnity at commercial rates charged by the lessor's chosen
provider, not at the airline's negotiated cost; 1.54 also carries escalation and risk, so it is a
ceiling, and 1.25 matches the default negotiation multiplier. It changes no decision in this fleet:
the cap binds only on the two engines that run out before handback, so the $3.8M it adds to
avoidable is their do-nothing figure rising, not a better plan.

## Step 6 · scenario planning — Monday 5 October

**Number formatting in the traces uses one cached formatter per precision.** · Rejected: lazy
traces, built only when a figure is hovered. · Because `toLocaleString` builds a formatter on every
call and the traces make tens of thousands of calls: a full recompute went from 966 ms to 72 ms with
not one character of output changed, which is what makes "recompute live" possible without
restructuring every result object.

**The panel reports how many tails change their recommended action against the plan at rest —
the lever, the component and the workscope — not the month of a visit or which spare goes on.** ·
Rejected: comparing against the previous position of the slider, and counting any change of
label. · Because the plan at rest is the one a reset returns to, and a visit a month later or a
different pool engine for the same swap is detail, not a different decision; counted, utilisation
at −10% reported three changes where only 9H-MMC's actually changed.

**A changed row says what it was ("was: Pay at handback").** · Rejected: a count only. · Because
the count says something moved; the row says what to tell the person who owns that aircraft.

**Downtime is set per body class, as two inputs under one control.** · Rejected: one figure for
both. · Because the declared figures are $45,000 and $130,000 a day, nearly three times apart, and a
single input would move the widebodies by narrowbody steps.

**An extended returning tail stays inside the forecast window.** · Rejected: the 24-month rule
applied to the extended date. · Because extending A6-MVC by twelve months took it to 33 months and
hid its numbers as "not forecast", when an extended lease is still a planned handback.

**The extension's rent is not modelled.** · Rejected: adding lease rent to the dataset. · Because
it is a commercial term the leasing team prices, not a maintenance cost, and the brief's question is
what the extension does to the return position — "Does that change anything?"

## Step 7 · reading the avoidable figure — Monday 5 October

**The avoidable figure keeps its absolute number and is shown in its two parts, each against its
own pot: cash, as a share of the cash payable at handback, and life.** · Rejected: one share of
the do-nothing total (12%, mixing cash with sunk life), and one share of the cash in play alone
(27%). · Because the second assumed sunk over-delivery cancels everywhere, and it does not: of the
$8.58M, the cash part is $16.9M — 52% of the $32.3M payable at handback — and the life part is
−$8.3M, the spare engines handed over in the two forced swaps ($13.1M) net of the sunk life kept by
the two swaps that send an engine to the pool ($4.8M). A share of cash alone would have hidden what
the cash saving is paid for with.

**A recommendation is marked forced when a component runs out before handback and a lever keeps it
flying; the row says why, and its difference from doing nothing is shown as measured against a
do-nothing that cannot happen, not as a saving or a loss.** · Rejected: showing forced and chosen
actions alike. · Because 9H-ZUU's swap costs $829K more than a figure it could never have had, and
read as a recommendation it looks like the tool choosing the dearer option. A6-DLL and 9H-KVJ are
forced too — 9H-KVJ's $30K swap is not a marginal choice but the cheapest way to replace an ENG2
that runs out of LLP life at month 8.2. The headline counts them separately: 2 act, 3 forced.

## Step 8 · the scenario panel as questions — Monday 5 October

**Controls written as the questions a Head of Fleet asks, reading the current value: "Shop costs
rise 21%", "Aircraft fly 10% less", "Extend the lease on A6-MXM by 6 months", "A day on the ground
costs $45K NB · $130K WB".** · Rejected: multipliers ("Maintenance cost × 1.21"). · Because the
person moving the slider is asking a question about their fleet, not setting a model parameter.

**Four presets, each setting one control and leaving the others at rest, each naming its basis.** ·
Rejected: presets that stack on whatever is already set. · Because a preset answers one question;
stacked, "summer schedule" would mean something different after "MRO renewal" than before it, and
the change count would no longer say which question moved which tail. "Summer schedule, +10%" has
no published basis in the reference and says so.

**Each slider stops where the evidence stops: shop costs −9% to +50%, flying −13% to +20%.** ·
Rejected: the symmetric ranges set in Step 6 (shop costs −20% to +50%, flying ±20%). · Because the
ceiling on shop costs was already evidenced (a quarter of MROs report next-gen costs >50% over
expectation) but the −20% floor was not — the published escalation ranges bottom out about 9% under
the factors used. Flying's floor is the 2024 parked share, 13%; its ceiling, Cathay Pacific's 20%
rise in a year. The evidenced ends are printed under each slider. Lease extension keeps its twelve
months, with the basis stated; downtime stays wide because its default is itself declared.

## Step 9 · from sliders to robustness — Monday 5 October

**The scenario sliders are replaced by a computed robustness check: for each assumption, how far
it would have to move before any tail's recommended action changes, and where the real number
would come from in deployment.** · Rejected: the sliders and presets of Steps 6 and 8. · Because
they asked the customer for numbers his own teams already hold — MRO contract rates, the published
schedule, finance's cost of a day on the ground. The model's job is to say which of those numbers
matter; on this fleet only two do, utilisation and the cost of a widebody day on the ground.

**One control stays: extend the lease on a named returning tail.** · Rejected: removing every
control. · Because the extension is the customer's own decision and his own example, not a number
another team holds.

**Every other assumption is stated with its provenance and can be overridden, below the table.** ·
Rejected: hiding them. · Because the customer asked to set the cost of downtime himself (BRIEF), and
a stated number nobody can change is a constant, not an assumption.

**The sweep steps each input outward from its current value across its plausible range, one at a
time, and re-recommends the whole fleet at every step.** · Rejected: recommending each tail on its
own, and searching combinations of inputs. · Because a spare or a donor tail can go to only one
aircraft, so a tail's answer depends on the others; and combinations multiply the work without a
basis for which joint moves are plausible.

**One at a time is stated on the panel, on each tail and in the trace as a lower bound on
fragility.** · Rejected: leaving it in the trace alone. · Because assumptions move together — a busy
summer raises flying and shop demand at once — so correlated moves would flip answers sooner than
any single-input breakeven, and a reader who takes "7 firm" at face value overstates how settled the
answers are.

**Distance read as reach — the move ÷ the room the evidence allows on that side.** · Rejected: the
raw size of the move. · Because a 4% move in utilisation and a 40% move in the cost of a day on the
ground are not comparable until each is read against its own evidence.

**Three states — too close to call, close, firm — with "too close to call" set by the model's own
noise (`MODEL_NOISE`: ±10% utilisation, the data's per-tail noise; ±10% shop costs, the escalation
spread) and "close" by the evidenced range.** · Rejected: two states, with every flip inside the
evidence called "close". · Because below its own noise the model cannot tell the options apart, and
saying "close" there implies a precision it does not have; and the noise is the same rule a
materiality floor uses, so there is one rule, not two. On this fleet: three too close to call —
A6-MXM at +1% flying, A6-MVC at +8%, 9H-MMC at −9% (its nearest flip by reach is +11%, but the −9% one
is inside the noise) — none close, seven firm.

**The sweep runs with trace formatting switched off (`withoutTraces`), in a worker.** · Rejected:
lazy traces throughout the calc layer, and running it on the main thread. · Because formatting was
three-quarters of each step (30.9 ms → 4.4 ms with identical decisions and totals), and the ~190
steps still take most of a second — too long to hold the screen. The worker answers a moment after
the page draws, and again a quarter of a second after the lease extension or an override stops
moving.

## Step 10 · what you can do — Monday 5 October

**The lease extension is a stepper in whole months under "What you can do".** · Rejected: the
slider, and the heading "Your decision". · Because an extension is agreed in whole months, and the
panel holds the things the customer can act on, not a decision already taken.

**The panel says plainly when extending a lease changes nothing.** · Rejected: leaving the control
live with no comment. · Because on this fleet extending A6-DLL, 9H-KVJ, 9H-ZUU or 9H-PJS changes no
recommendation at any length up to twelve months; a control that does nothing should say so. The
extension sweep runs with the robustness sweep, in the worker.

**A budget for the next twelve months' return-related maintenance: forced removals first, then
the combination of optional actions that saves most within what is left.** · Rejected: ranking
actions by saving and funding down the list, and treating forced removals as optional. · Because a
greedy list can miss a better pair of smaller actions, and every combination of ten tails is cheap
to try; and a component that runs out before handback has to come off whatever the budget says.
Added at the build owner's request — it is not in the discovery call — and recorded as BRIEF item
10 with that provenance.

**Only maintenance cash counts against the budget, when the work happens; compensation and
downtime do not.** · Rejected: counting total cost. · Because compensation is paid at handback from
the provision carved at lease signing, and downtime is lost contribution, not maintenance spend. On
this fleet the year needs $11.0M, $10.9M of it A6-DLL's forced ENG1 visit; the optional actions are
swaps at $28,500 each, so the budget bites on the forced visit long before it bites on a choice.

**A left-out tail shows the saving it gives up and whether its decision deadline falls inside the
budget year.** · Rejected: a list of left-out tails alone. · Because inside the year leaving an
action out loses the option, while after it the next budget can still take it — 9H-MMC's decision
closes on 15 August 2027, A6-GPZ's not until January 2028.

## Step 11 · one rule for whether there is a recommendation — Monday 5 October

**A recommendation stands only if its advantage over the next best option is larger than the
uncertainty in the costs that produced it: ±10.1% of the estimated money on which the two options
differ.** · Rejected: the materiality floor (still beat paying at ±10% utilisation and ±10% shop
costs) and "too close to call" (an input flips the answer inside the same ±10%). · Because both were
calibrated on the ±10% utilisation noise in the generator — how the synthetic data was made, not
how uncertain real costs are. One rule, one threshold, one explanation, in money.

**The ±10.1% is derived from the quality of the cost estimates in ASSUMPTIONS §0, not chosen:**
each event type's escalation range compounded over the eight years, combined in quadrature with
the spread of the 2018 appraiser ranges, weighted by share of maintenance cost. · Rejected: a single
judgement figure. · Because LLPs (±11.7%, over half the cost) and engine restoration (±8.4%) carry
almost all of it, and the figure should move if a range does — `costEstimateQuality` computes it.
The derivation also exposed that §0's airframe factor, ×1.40, sits above its own published range
(×1.22–1.32); flagged, not yet changed.

**The uncertainty applies to the money on which the two options differ, not to their totals.** ·
Rejected: ±10.1% of the dearer option's total. · Because money common to both — the sunk
over-delivery, compensation on a component neither touches — moves both options alike and cancels
out of the advantage. On the totals, A6-MXM's $0.97M advantage would sit just inside ±$0.98M almost
entirely because of $8.8M of over-delivery present in both options; on what differs, it carries
±$0.09M.

**Below the threshold there is no recommendation: where paying is one of the two, the tail pays;
where both are actions, the cheaper stands in for the pair, labelled as such.** · Rejected: showing
the point estimate as a recommendation. · Because a recommendation the estimates cannot support is
not one. On this fleet that is A6-YTM, 9H-RYM and 9H-PJS, whose only alternative is a route change
that comes to the same money; every recommendation with a real alternative stands by a wide margin.

**Firm and close stay, as the separate question they are: given that the options can be told
apart, how far would an input have to move to change the answer.** · Rejected: folding them into
the money rule. · Because one asks whether the estimates can separate the options today, the other
how settled the answer is if the world moves. On this fleet: four firm, three close (A6-MXM +1%
flying, A6-MVC +8%, 9H-MMC +11%).

**The "binding soonest" block is replaced by one computed line: which inputs change any answer
anywhere inside their evidence, and which change none.** · Rejected: ranking up to three inputs by
the reach of their first flip. · Because it restated the close block — the same flips with the same
reaches, re-sorted by input — and with only two inputs ever flipping anything, its second entry sat
at a reach no reading of "soonest" supports. The question the block was reaching for is simpler:
which of the inputs the customer's teams hold matter at all. The one-at-a-time caveat stays.

**What the answers assume is a collapsed, read-only table directly above the robustness panel,
labelled with its finding — "7 inputs · 5 change no answer anywhere", counted from the sweep.** ·
Rejected: sliders or fields in that place. · Because the robustness sweep already moves every input
across its whole evidenced range, which is strictly more than a slider does; a control would
invite the customer to test one point the sweep has already covered. Each row reads its value,
range and source from ASSUMPTION_INPUTS and its yes/no from the sweep. The overridable panel below
the table stays for now, because the brief asks that the customer can set the cost of downtime.

**"Running out of time" lists every recommended action with a decision date, soonest first, under
the headline — computed in `calc/deadlines.ts`, not taken from the mockup.** · Rejected: the
mockup's three rows and figures. · Because nothing on screen is typed by hand, and the model
disagrees with it: A6-MVC's recommendation is to pay (no date), A6-DLL's is a forced engine visit
(not gear), and 9H-MMC's swap closes on 15 Aug 2027 and saves $1.31M. · No window: every open
decision is listed with its date. · Rejected: a cut-off such as six months. · Because any cut-off
would be a round number with no source, and on this fleet the list is five rows.

**Each row says its own consequence; there is no single footer line.** · Rejected: "After each date
the shop slot is gone and the tail pays at handback." · Because that is true only of a chosen
action. The three soonest dates are forced removals: missing one does not mean paying at handback,
it means an engine running out with nothing booked. A chosen action falls back to the cheapest
option still open after its date (computed — on this fleet, paying), and forced rows show no
saving, because their benchmark is a do-nothing that cannot happen.

**The calendar is the top line of the panel; how firm the answers are sits under it, smaller.** ·
Rejected: "Running out of time" as its own block under the headline, with the robustness states
leading the panel. · Because the panel's first line should be the customer's calendar, not the
model's self-assessment. The firm/close counts, the close list, the inputs line and the caveat stay,
subordinate. The fallback after a date is still found by filtering the recommendation's own
options, not by the runner-up alone — A6-GPZ's runner-up is a route change that closes today, so
the runner-up would name an option already gone.

**The overridable assumptions panel is merged into the collapsed disclosure above the panel: one
table, seven rows, each with value, evidenced range, source, whether it changes an answer, and an
override.** · Rejected: a read-only disclosure with the overrides kept in a second panel below the
table. · Because the same seven assumptions in two places make neither authoritative. An override
recomputes everything downstream, the sweep included (the worker is sent the live assumptions).

**An override is held inside its evidenced range.** · Rejected: any value. · Because the evidenced
range is the ground the sweep covers; a value past an edge has no evidenced room on that side. The
sweep also now steps only toward an edge that lies in its direction, so it can never walk the wrong
way from an override.

## Step 12 · what if, and what the screen is for — Monday 5 October

**A what-if of the customer's own decisions — swap a component, send one to the shop, change a
tail's route, move its return date — priced against today's plan, which stays on screen.** ·
Rejected: sliders on the seven assumptions. · Because those are the world's, not his, and the
robustness sweep already moves them across their whole range; he can ask "what if I do X", he
should not have to guess "what if the world is Y". Several changes hold at once — the correlated
moves the sweep says it cannot make.

**Each change is priced by the levers' own machinery and imposed before the model plans the rest
of the fleet.** · Rejected: planning the fleet first and pricing his change on what is left. ·
Because the point is to see what his choice displaces: giving 9H-ZUU's spare to A6-YTM moves 9H-ZUU
onto 9H-KVJ's spare and leaves 9H-KVJ an engine shop visit, +$9.7M of maintenance.

**A proposal the model knows cannot happen is refused with the reason, and left out.** · Rejected:
offering only the choices that work. · Because a slot inside the lead time, a component already run
out, a type with no spare and a route the type does not fly are exactly what he needs to be told
— so the choices include them, and the refusal carries the model's own reason.

**One action per tail, plus its return date.** · Rejected: stacking actions on one tail. · Because
each lever is priced against the tail as it stands; a second action would be priced on a state
the model does not carry. Refused, with that reason, rather than priced wrong.

**Moving a return date lives in the what-if; the single-lease stepper is gone.** · Rejected:
keeping the stepper beside it. · Because two places to move a return date make neither
authoritative — the same reason the assumptions became one table.

**No trace in a tooltip: the working opens deliberately, in place, below what it explains — a
tail's recommendation and each component's clauses — and a tooltip is one sentence saying what a
column or tile is.** · Rejected: the hover traces on every figure. · Because they were written for
traceability, not for reading; they covered the content they described, and inside capitalised
headings they rendered whole sentences in capitals.

**How firm the answers are is one collapsed line carrying the finding, beside the assumptions.** ·
Rejected: an open block in the panel. · Because it is the model assessing itself — useful, but not
what a head of fleet acts on. The inputs line inside it is gone: the assumptions line beside it
already says which inputs change no answer.

**Nothing restates what is beside it.** · Rejected, and removed: the footnote under the table (how
the model works), the paragraph under the headline (now one sentence), a forced row's second
explanation and its saving against a do-nothing that cannot happen (the badge's tip says why), and
the what-if's echo of his own change in the list of tails that change.

## Step 13 · the screen leads with its answer — Monday 5 October

**The recommended actions are the first thing on the screen — tail, action, date, and "forced" or
what it saves, soonest first — with the avoidable total beside them.** · Rejected: the assumptions
drawer, the what-if and the budget above them. · Because those justify the list, and justification
goes under what it justifies. Order now: actions, headline, the tails, what you can do, then —
collapsed — what the answers assume and how firm they are.

**The avoidable total beside the list is split: what the chosen actions save ($6.99M — the list's
savings add up to it) and the difference on forced tails ($1.59M, against a do-nothing that cannot
happen).** · Rejected: the single $8.58M beside a column that adds to $6.99M. · Because a head of
fleet adds up the column, and the gap would read as an error. Computed in `recommendFleet`
(`avoidableChosen`, `avoidableForced`), tested against the list.

**What happens after each date is the date's tip, one sentence; the row itself is the four things
asked for.** · Rejected: a fifth column with the consequence. · Because the list is the answer, and
the consequence is the question a reader asks of one date.

**QME is said in plain words wherever it appears: whether the lease recognises the clock reset, and
the money that turns on it.** · Rejected: "QME" and "as the lease allows" as labels. · Because it is
the most valuable finding in the brief and read as an unexplained column. The headline tile now
shows the money that turns on it (+$54.4M) rather than a second total; on each tail, "As the lease
allows" and "QME" are one column, "Clock reset"; the component card shows the figure if the reset
counts beside the figure under the lease, where it does not.

**Every assumption row speaks in one unit — the value, its evidenced range, the override field and
its reset all as a multiple, dollars a day, a share or months — and the field replaces the value.**
· Rejected: shop costs and utilisation overridden as a percentage change beside a value shown as
× 1.00. · Because that put two questions in one column, and a bare 0 in the field read as zero
shop costs rather than no change. The how-firm flips still read as a move ("utilisation +1%"):
that is the question they answer.

**A tail with no exposure, as recorded or under the lease, has nothing to decide: no lever is
weighed, and the row says so and stops.** · Rejected: ranking paying against a route change that
comes to the same $0 — which produced "no recommendation", a routing suggestion and a "nothing to
choose between them" note on 9H-RYM and 9H-PJS. · Because zero exposure is not a close call; it is
no call. Under the lease counts too: a tail whose shop visit the lease doesn't count still owes
money, so it still has something to decide. Such tails are left out of how firm the answers are.
A6-YTM keeps its note: its $3.96M is life already handed over, not zero.

**The clock-reset tile is "Shop visits the lease doesn't count", at the top beside the avoidable
total and at the same weight.** · Rejected: "Resets the lease does not recognise", in the headline
row below. · Because it is the larger number (+$54.4M against $8.58M) and the more important
finding. The tail column and the component cards now say "not counted" / "doesn't count" too, so
the finding is in one set of words wherever it appears.

**The headline says what kind of money each number is, in six words or fewer per tile: a stacked
bar splits "if nothing changes" into cash out and already spent; the clock-reset figure sits apart,
under the tiles, marked "at risk — not in the above".** · Rejected: tiles that name scenarios, with
the explanation in their supporting text, and the clock-reset figure as a peer tile. · Because a
reader needs to know which money is still to be paid and which is gone, and the clock-reset figure
is not a fourth scenario: it is what the lessors could charge on top if they enforce the records
clause, and it is in none of the totals above it. Everything longer — the avoidable total in cash
and life, the forced part, how the tails split, the sentence on sunk life — moved, unchanged, into
one disclosure under the tiles. The bar's proportion is computed in calc (`cashShare`).

**The clock-reset figure is one line of plain text above the table, summing its column — the number
emphasised, no box, no fill, no badge — and amber is kept for forced removals and deadlines passed.**
· Rejected: the amber, dashed "at risk — not in the above" band, and amber on the clock-reset column
and cards. · Because it is not an error and not a fourth total; a number that needs a caption
saying where it does not belong is in the wrong place, and sitting above the table it summarises
says so on its own. With amber reserved, the forced badges now carry it.

## Step 14 · the swap lever under the lease's replacement test — Tuesday 6 October

**A swap passes only if the incoming unit has no less life than the outgoing one on every clock
the lease names — to the next shop visit or overhaul, and LLP life — held as a lessor-level term
with its clause (LEASE-NOTES.md, 12.2; every lessor strict), and tested on both tails of a swap
between two.** · Rejected: lever 3 as built, picking the unit just above the threshold and
crediting the removed unit's life to the pool. · Because the source lease does not permit it:
12.2(a)(i)(2) holds a permanent replacement to "no less hours or Engine LLP life available until
the next scheduled ... shop visits", and 12.2(a)(ii) holds parts to the same test. The right-sized
unit is usually exactly the one with less life. Both units are read as the records stand today,
on the receiving tail's clauses; "value and utility" is not tested separately, having no
valuation beyond life. Between two tails both tests pass only for units of equal life — in
practice, never.

**An engine swap is decided 90 days before it has to happen, and refused when that date has
passed (12.3(b)).** · Rejected: deciding by the date the swap has to happen. · Because a planned
engine removal needs 90 days' notice. 9H-ZUU's ENG2 must come off by 7 Nov 2026, 35 days away: no
permitted action keeps it flying, so the plain ranking stands with its caution.

**Nothing tuned to protect the headline.** On this fleet: 9H-ZUU's forced swap dies (12.3(b)) and
the tail pays at handback with its engine running out; A6-GPZ's swap for ESN-6519 dies (10,982
fewer LLP cycles than ENG1) and a route change to mixed takes its place; 9H-MMC's swap for
ESN-6512 dies (fewer hours, cycles and LLP cycles than ENG1) and no option can be told apart from
paying; 9H-KVJ takes ESN-6513, now free, decided by 10 Mar 2027 instead of 8 Jun. Avoidable $8.58M
→ $7.11M; by choice $6.99M → $3.33M; forced $1.59M → $3.78M. The data was regenerated with the two
terms added to every lessor and nothing else changed.

**The source lease's clauses are in LEASE-NOTES.md, which did not exist before this step.** ·
Rejected: reconstructing the rest of the lease. · Because only 12.2, 12.3(b) and 12.6 were given;
the file quotes 12.2(a)(i)(2) and summarises the others, and says so.

**QME incidence: engine 3%, gear and APU 2%, airframe 1% per component with a recorded visit — two
of the ten returning tails carry a shop visit the lease doesn't count, against six.** · Rejected:
12% / 8% / 4%, a generator setting with no source. · Because the customer said it happens
"sometimes" (discovery call, 04:45), read as one or two tails in ten — a per-tail chance of 10–20%.
The rates sit at the low end of that band (≈10.5% for a tail with five recorded visits); the
band's middle (≈15%) still drew five of the ten on this seed. Each component keeps its draw, so the
flagged set shrank to a subset and nothing else in the data moved; the consequence logic is
untouched. At risk $54.4M on six tails → $33.1M on two (A6-MXM ENG1, A6-MVC ENG2); no
recommendation and no total changes. The rates moved from inline literals in the generator to
`QME_INCIDENCE` in `calc/constants.ts`.

## Step 15 · a forced removal is never "pay at handback" — Tuesday 6 October

**A component that runs out before handback never resolves to paying at handback; its options gain
two: a pool spare covering it while it goes to the shop (12.3(c)), and the aircraft on the ground,
priced in days at the downtime rate and leading the actions when it is the answer.** · Rejected:
the fallback that showed 9H-ZUU as "pay at handback, nothing to book" with its ENG2 out of cycles
on 7 Nov 2026. · Because an engine out of its clock cannot fly. The ground option is always open
for a forced tail, so the old "no lever can keep it flying" fallback is gone.

**12.3(b)'s notice blocks only planned removals; a removal forced by the engine running out goes
with short notice, said in the working.** · Rejected: refusing 9H-ZUU's swap for want of 90 days'
notice. · Because the clause asks notice of a planned removal; a forced one is a conversation with
the lessor, not a refusal.

**The spare's time away from the pool under 12.3(c) is priced as the life it burns, at
build-for-interval rates.** · Rejected: a lease rate per day. · Because no spare-engine lease rate
is in the evidence, and the model already prices a spare's life that way.

**A route change has no decide-by date: "start now", and what each month of waiting gives up.** ·
Rejected: the data date as its deadline. · Because the route change has no date after which it
cannot be taken; it only loses value.

On this fleet: 9H-ZUU becomes "Swap ENG2 for spare ESN-6513" (forced, decide now; exposure at
handback $6.15M, all-in $6.22M) — ESN-6513 passes the replacement test; covering with ESN-6508 is
the runner-up at $9.70M, the ground $21.34M. 9H-KVJ goes back to ESN-6508. Avoidable $7.11M →
$4.92M (by choice $3.33M, forced $3.78M → $1.59M). Asked of the what-if, giving both permitted
spares away covers 9H-ZUU's ENG2 with ESN-6512 — a spare the lease would not accept as permanent.

## Step 16 · the lease, and what must be true before handback — Tuesday 6 October

**The lease is a slide-over on the right, opened from the lessor's name or any clause reference and
scrolled to that clause; it quotes the data and computes nothing.** · Rejected: a lease page or a
new window. · Because the question is "is this recommendation really based on the lease?", asked
from the row in front of you; the answer has to open over it and close back to it. Each condition
links back to the requirement rows it drives. Clause references are linked only where the tail's
lease carries them, matched as written — nothing guessed.

**The readiness checklist lists what the model has already worked out — forced removals, notices,
slots, QME evidence, what is owed — and four standard items from a declared template; status is
read off the due date.** · Rejected: a hand-kept checklist with set statuses. · Because nothing on
this screen is typed by hand. The levers now carry their notices and slot bookings as fields, so
the checklist lists rather than recomputes; a shop visit's planned engine removal needs the same
90 days' notice as a swap's.

**A QME item names the documents the clause requires, not "the missing one".** · Rejected: naming a
missing document. · Because the record holds only that a visit is not evidenced, not which document
is absent; the item quotes the clause's list and says so.

**"Due soon" is 90 days, the longest notice the lease asks.** · Rejected: a round number. · Because
an item due inside the longest notice period has to be started now. The digest — "next 90 days: 4
items across 3 tails" on this fleet — counts the same window.

## Step 17 · the returning ten drawn ahead of handback — Tuesday 6 October

**The returning tails' engines that have been to the shop are placed by one rule: each comes due —
first falls short of a handback threshold — on a date drawn evenly from 6 months after the data's
date to 12 months after its return; 9H-ZUU is left as first drawn, late on purpose.** · Rejected:
the first draw, which left most of the ten past the point of acting — engines run out, windows shut
— and a target for the avoidable figure. · Because a demo must show the tool in use, not only in
autopsy; the criterion is open decision windows, and the number falls out of it. Six months is the
top of the evidenced slot lead time, so whatever comes due can still be slotted and noticed; a year
past return lets some engines clear handback. Only the last-visit date moves (cycles since new,
visit count, workscope, serial and QME status stay), on its own seeded stream after everything else,
so the rest of the fleet is byte-identical; gear, APU, airframe and first-run engines stay as drawn.
Scale and reconciliation pass unchanged.

On this draw: six of the ten with a live window, 9H-ZUU late, three with nothing to decide.
Avoidable $4.92M → $14.88M — by choice $3.33M → $1.18M, forced $1.59M → $13.71M; cash $21.03M,
life −$6.15M. Do nothing $68.82M → $66.83M; shop visits the lease doesn't count $33.1M → $22.6M.
Most of the avoidable figure is on forced tails, measured against a do-nothing that cannot happen:
an engine that comes due well before its return usually runs out before it, so the rule makes more
forced removals with their windows still open.

**A forced action that spends nothing stays labelled forced in the budget.** · Rejected: listing
every free action as optional. · Because 9H-KVJ's route change keeps its APU flying: it is forced,
whatever it costs.

**A QME evidence chase is due today, not with the records review.** · Rejected: dating it like a
template item, six months before return. · Because the document is already missing and the shop
visit already past: there is nothing to wait for, and the chase only gets harder with time. The
digest moves to "next 90 days: 5 items across 4 tails".

**Titles and labels in the customer's words.** · Rejected: the builder's — "binding clock", "what you
can do", "how firm", "what this assumes … inputs", "avoidable", "working", "terms the model applies",
"template", and a close button that read as ending the lease. · Because the screen is read by a head
of fleet, not by whoever built the model: "Runs out first", "Scenario planning", "How confident to
be in these answers" (solid / fragile), "Assumptions behind these numbers — only N move any answer",
"What acting now saves", "Show the calculation", "Lease terms applied", "Readiness checklist",
"standard for every return", "Close". Every button now says what clicking it does — "Add to the
scenario", "reset to × 1.00", "show ENG1's row", "show 9H-ZUU" — and the lessor and clause links say
they open the lease. Text only: no logic or layout changed.

## Step 18 · a forced tail measured against acting late — Tuesday 6 October

**On a tail whose part runs out before handback, "if nothing changes" is acting late: nobody acts
until it runs out, then the cheapest option still open that day — short notice (12.3(b)), a free
pool spare for good where 12.2 permits or under 12.3(c) while the part is at a slot booked that day,
else the aircraft on the ground for the lead time and then the shop visit.** · Rejected: the handback
cheque, which priced the part as if it could fly to the return date. · Because that cannot happen,
and most of the headline saving rested on it. One baseline everywhere a forced tail's do-nothing
appears: the tile and its bar, the table (ranked by it), the saving split. Non-forced tails keep the
cheque.

**A permanent swap with a free pool spare counts as an option still open on the run-out day.** ·
Rejected: only a 12.3(c) cover, else the ground. · Because where a slot booked that day cannot bring
the engine back before handback, 12.3(c) cannot apply (the engine must be reinstalled), and without
the swap acting late would ground A6-MVC and A6-YTM to handback — $58M and $16M — a baseline no
operator would choose, inflating the saving. With it, the swap the lease permits is taken.

**The "on the ground" option follows §13: on the ground until the slot, then the shop visit's own
downtime; not offered when there is no wait.** · Rejected: on the ground through the whole 200-day
turnaround. · Because §13 holds the turnaround behind a spare and puts a no-spare shop visit at 14
days; acting late uses the same rule, and the two must agree or waiting could look cheaper than
acting now. With no wait the option is the shop visit itself, and offering both made them
indistinguishable. No tail on this fleet is recommended it.

On this fleet, acting late vs acting now: A6-MVC $18.13M (ENG2 swapped for ESN-6527 on 16 Oct 2027)
vs $13.47M, saves $4.65M; A6-YTM $8.98M vs $4.11M, saves $4.87M; 9H-ZUU $6.22M vs $6.22M — the same
swap, priced as fitted today either way — saves nothing; 9H-KVJ $2.05M (APU swapped for APU-6557) vs
$0.27M, saves $1.78M. If nothing changes $66.83M → $64.43M; after recommendations $51.95M, unchanged;
saved by choice $1.18M, unchanged; saved on forced tails $13.71M → $11.30M.

**Rows that read as "nothing" now say what the model knows: a tail paying at handback says by how
much paying beats the next best option, a tail with nothing to decide reads "cleared", and one line
under the headline counts them — "3 tails cleared · 2 where paying beats fixing".** · Rejected: a
bare "Pay at handback" and a bare $0. · Because both are findings — paying is the cheaper choice by a
known margin; a cleared tail meets every return condition — and a blank reads as missing. The margin
is the runner-up's all-in less the recommendation's, worded from what the runner-up is (on A6-DLL an
APU overhaul, not a shop visit). Nothing is added to what acting now saves; no logic or total moved.

**"Check before acting" in place of grading the model: each recommendation an assumption could flip
within the first half of its evidenced range, as an instruction naming the assumption and where its
real number lives — also noted on that tail's row in the recommended actions.** · Rejected: "2 solid
· 5 fragile". · Because a customer reads a count of fragile answers as most answers being shaky,
when the useful thing is what to check first. The full sweep stays, collapsed, with "close to the
line" and "holds across its range". The 50% line is declared (`CHECK_BEFORE_ACTING_REACH`).

**A component runs out "before handback" only by at least a day.** · Rejected: any run-out before
the return date, however close. · Because at 1% more flying A6-MXM's ENG1 ran out hours before its
handback date, which made the tail forced and offered "on the ground from 2028-04-19 to handback" —
its handback date, zero days. A part that runs out on its handback day reaches handback, and the
lease's compensation prices it. A6-MXM now flips at 2% more flying, to an ENG1 shop visit; no figure
on the fleet as it stands moved.

**The full robustness check is off the screen — the panel's disclosure, its hold / close-to-the-line
count and the one-at-a-time caveat, and each tail's own version; the sweep stays.** · Rejected:
keeping it collapsed under "Check before acting". · Because a head of fleet acts on what to check,
not on how the model rates itself; the sweep still drives "Check before acting" and the assumptions'
"Changes an answer" column, and its full method stays in ASSUMPTIONS §14. With nothing close to the
line, "Check before acting" says every recommendation holds across the believable range of every
assumption. The assumptions line reads "4 of 7 move an answer": four of seven is not "only".

**On screen, "forced" reads "required" (badge tip: "A part runs out before the aircraft goes back, so
it has to be dealt with"), the saving splits "optional · required", a route change reads "Route
change: fly it …" with "no deadline · loses $X a month" inline, the bar's light segment is "life
given away", and after recommendations is a second line in the "if nothing changes" tile.** ·
Rejected: "forced", "by choice", "start now", "already spent", and after recommendations as a tile
of its own. · Because they are the builder's words or blur the one big number: "forced" reads as an
accusation, "start now" hides the cost of waiting behind a hover, and "already spent" said nothing
about where that life goes. Text and layout only; internal names (forced, avoidableForced, startNow)
stay, and calc strings that reach the screen — the calculation, labels, refusals — say the same.

**A calm visual pass: one type scale of three sizes (label, body, headline numbers), one accent for
links and the headline saving, amber only for "required" and overdue dates, greys for the rest, and
sections separated by space on one scale instead of framed in boxes.** · Rejected: the boxed tiles,
the green, red and violet scattered through the screen, and five-plus ad-hoc text sizes. · Because a
head of fleet should see the answer, not the chrome; a border is kept only where it groups (table
rows, a tail's cards, your changes, a lease's clauses). The table needed its gutters narrowed from the
first attempt, which overflowed at 1440px, and the lease view keeps its clause wording in a darker
grey than other quoted text, because there it is what you read. Text, numbers, logic, order and
what is open or collapsed are unchanged — checked by diffing every rendered word and tooltip.

**The compensation rate is the lease's own reserve rate: every lessor's negotiation multiplier is
held at 1.0 and gone from the trace.** · Rejected: a per-lessor multiplier of 1.0–1.5 (default 1.25)
on top. · Because the reserve rate already carries the lessor's margin over pure cost accrual (1.54
on the executed lease), so multiplying again counted it twice. The generator still makes the draw
that set it and discards it, so only the rates moved: all 1,890 fell by exactly their lessor's old
multiplier, and nothing else in the dataset changed.

**Over-delivery bought at past shop visits is in no money figure: "if nothing changes" is cash plus
the spare engines acting late would fit for good, and the over-delivery has its own line — "Already
over-delivered at past shop visits: $33.0M. Sunk on these ten; preventable on the next ten."** ·
Rejected: counting it in exposure, where it was $33.0M of $64.4M. · Because it was paid for when
the work was done; what is left to decide is cash and any spare's life handed over from here. It is
out of the ranking too, so rows, totals and recommendations count the same money — no recommended
action changed. Declared consequence: a swap that sends a unit to the pool no longer earns credit for
the life it keeps, while a spare going on for good still costs its life; on A6-MVC and A6-YTM acting
late would keep $11.8M of engines in the pool that the new count does not offset.

**What acting now saves is split plainly: "$X less cash to lessors · $Y of spare engines kept".** ·
Rejected: the split only in the disclosure. · Because the two halves are different kinds of money,
and the second is most of it. Tests hold saved = if nothing changes − after, per tail and in total,
with both splits adding up, under moved assumptions too.

**Display fixes, no logic or totals change (the full money report is byte-identical before and
after).**
- **Recommended actions by date, route changes last.** · Rejected: an aircraft on the ground first,
  then the route changes, then dates. · Because the list answers "what is due when"; a route change
  has no date to decide by, and an aircraft on the ground sorts by the day it goes down.
- **"Runs out first" is "Sets the bill"** — the clock that decides what the tail pays at handback. ·
  Rejected: "Runs out first", which read as a date, not as what drives the money.
- **A paying tail shows its cheque, and the tail total is labelled all-in.** · Rejected: "Pay at
  handback" with a figure beside it the reader had to take for the cheque.
- **What paying beats is the best option on the part that owes most.** · Rejected: the cheapest other
  option anywhere, which on A6-DLL was an APU overhaul ($0.85M more) on a part owing $13K, while
  $3.9M sits on ENG2, where the best is a shop visit, $15.9M more. Priced with the levers focused on
  that part, as for a part that runs out; the recommendation does not move.
- **An opened row never shows an uncapped compensation.** · Rejected: per-clause linear figures
  ($53.3M under the lease on A6-MVC's ENG2) beside a component capped at $13.9M. The capped figure
  sits on the clock that sets the bill, "capped at the cost of the work"; the uncapped one stays in
  Show the calculation.
- **The budget's need says it is net of reserves, with the gross beside it** — $143K net, $17.1M
  gross. · Rejected: $143K alone, which reads as though the shop visits were nearly free. A6-YTM's
  visit is inducted 3 Sep 2027 and A6-MVC's 3 Oct 2027, both inside the year to 3 Oct 2027.
- **The readiness checklist opens on what the plan and the lease require and what is due in 90
  days; each tail's standard items fold into one line.** · Rejected: all 55 items, 40 of them
  template, at once.
- **WHATS-FAKE leads with the redraw of the returning ten**, pointing at Step 17. · Rejected: the
  same paragraph halfway down.

**Life is counted the same way in every option: an engine that leaves the airline — back with the
aircraft, through the shop, or on for good as a spare — costs the life it carries above the
thresholds; one that comes off into the pool earns that same life back, at the same rates.
Over-delivery is sunk only on a unit that stays on the aircraft in every option.** · Rejected: the
count from the step before, which charged a spare's life when it went on but gave no credit for the
engine a swap kept in the pool. · Because that tilted every comparison toward acting now. Applied to
each unit some feasible option or acting late sends to the pool, in every option of that tail and in
its "if nothing changes"; the negotiation multiplier stays at 1.0 and every display fix stands.

The fall is $15.17M, not the $11.8M the step before named: that figure was the two engines'
over-delivery, but valued as a spare's life is, an engine keeps all its life above the thresholds —
A6-MVC's ENG2 12,785 LLP FC at $873/FC, $11.17M, where over-delivery counted only the 9,000 FC a
cheaper workscope would not have left ($7.86M); A6-YTM's ENG2 $4.00M against $3.96M. Not tuned.

Required tails, acting late → acting now: A6-MVC $16.61M → $15.27M, saves $1.35M (was $12.51M);
A6-YTM $8.98M → $4.15M, saves $4.83M (was $8.83M); 9H-ZUU $6.22M both, the same swap; 9H-KVJ
$1.59M → $0.21M, saves $1.38M. No recommendation changes. If nothing changes $40.02M ($11.78M
cash, $28.25M engine life), after $31.35M, saved $8.67M — $1.12M optional, $7.55M required; $2.26M
less cash, $6.41M of engine life kept. Already over-delivered, on units that stay on whatever is
done: $21.18M (was $33.00M; A6-MVC's and A6-YTM's ENG2 are now in the totals). Check before
acting adds A6-MVC: it turns if 90% or less of its reserves could be reclaimed. The labels say
"engine life" where they said "spare engines": the life split now carries the aircraft's own
engines too.

**No "What these totals are made of" disclosure under the headline.** · Rejected: keeping it
collapsed. · Because a Head of Fleet should not have to open a footnote to trust a headline, and
every line in it is now on screen — the saving's two splits under the figure, engine life on the
bar's tip, the tails in "3 tails cleared · 2 where paying beats fixing", over-delivery and the clock
reset on their own lines. The two definitions that were not — acting late, and a clock reset the
lease does not count — are now the tips on "If nothing changes" and on the clock-reset line. A
click on a disclosure no longer leaves a focus ring; the keyboard still shows one.

**The demo deploys as a static site from the committed build: `dist/` is in the repository and
Replit serves it as it is.** · Rejected: building on Replit. · Because Vite 8 needs Node 20.19 or
newer and the builder's version cannot be checked from here; with nothing built or run at deploy
time, nothing can fail live. The cost is one step: rebuild and commit `dist/` after any change.
The page gains a favicon and a description for link previews, which says it is a prototype on
synthetic data.

## Step 19 · v2, pages instead of one long screen — Friday 9 October

On branch `v2-mvp-preview`; `main` stays the version demoed.

**Four pages under a top navigation — Overview, Leases, Scenarios, Return checklist — with the page
in the address's #fragment.** · Rejected: a routing library, and one long screen. · Because the
customer said the page "made me want to read it rather than listen to you"; the Overview now holds the
headline money, the recommended actions and the fleet table, nothing else. A fragment keeps reload and
back working with no dependency.

**A "Viewing as" role switcher: each role sees only the pages it needs.** · Rejected: a login, and
showing every page to everyone. · Because it demonstrates the permissions the customer asked for
without pretending to authenticate anyone. Head of fleet and Analyst see all four; the Leasing team
Overview, Leases and the checklist; Maintenance planning Overview and the checklist. No calc change:
the headline figures are as on `main`.

## Step 20 · v2, every recommendation can be acted on — Friday 9 October

**"Assign and notify" on every recommended action: owner, due date and a plain-English message
prefilled from the recommendation, or the same thing as a structured maintenance request; then Open →
Sent → Accepted → Done, and an activity log on the Overview.** · Rejected: a bare "mark as done", and
a message written in the UI. · Because the customer said "there's no way I can actually act on
anything"; the draft is a pure function in `calc/assign.ts`, tested, so every figure in a message is
the recommendation's. Route changes go to Network planning by default — the customer's owner list has
no routing team. Nothing is sent: labelled on screen and in WHATS-FAKE. State lives in this browser's
local storage, so a reload keeps it and Reset demo clears it.

## Step 21 · v2, leases reviewed and corrected — Friday 9 October

**Corrected thresholds and notice periods flow into the calculation straight away; corrections to
the replacement rule, what makes a shop visit count, and reserves are recorded and marked "Applies on
next recalculation".** · Rejected: recording every correction only, and applying every correction.
· Because the levers already take a threshold and a notice period as numbers: a pure function applies
them to a copy of the data, and with no correction returns the data itself, so no default figure can
move (tested). A correction then visibly changes a recommendation — 9H-ZUU's notice from 90 to 30
days moves its swap from "decide today" to 8 Oct 2026. The other three change how a lever works,
which is riskier than a preview should take on. A notice correction gives that aircraft its own copy
of the lessor's terms, so a side letter on one lease does not move another.

**The leasing team alone approves or corrects; every approval and correction, with who, when, the
old and new value and the reason, goes into the lease's change history.** · Rejected: anyone editing.
· Because the leasing team owns the return conditions; other roles see the leases read-only.

**"Add a lease" walks through upload and reading, honestly: the file is not read, the terms are a
sample from an in-service aircraft's lease, and the screen says so.** · Rejected: hiding the step,
or pretending to read. · Because the flow is the point, and nothing may pretend to be real.

## Step 22 · v2, the Scenarios page — Friday 9 October

**One Scenarios page in two parts, "Your decisions" and "The world", with the assumptions open
rather than collapsed; "Check before acting" becomes "Confirm before you act", with a sentence on
what it means.** · Rejected: the assumptions behind a disclosure under the table. · Because the
customer wanted them inside scenario planning — "what if our costs go up, what if we renegotiate
maintenance contracts" — which is shop costs in "The world". The budget sits under "Your decisions":
it is a decision. Text and layout only.

## Step 23 · v2, the documents a return needs — Friday 9 October

**A Documents section on the Return checklist: per returning aircraft, a standard template of the
redelivery records laid over its own engines, APU and gear, each with an owner and a status, and
marked "Standard template, not read from a lease".** · Rejected: one undifferentiated list per
aircraft, and implying the list came from the leases. · Because the customer wanted "the mundane
checklist too", and a back-to-birth trace is per engine, by serial. One status comes from the data:
an engine whose last shop visit the lease does not count starts with its shop visit report missing —
the evidence the QME chase is after.

## Step 24 · v2, clean-up — Friday 9 October

README, WHATS-FAKE and the UI notes describe v2; `dist/` is rebuilt on this branch, so v2 can be
deployed on its own while `main` stays the version demoed. The calculation is untouched in every
number: the headline figures ($40.0M, $31.4M, $8.67M) are pinned in the tests and hold, and every
test from v1 still passes. New in calc, all pure and tested: `assign.ts` (drafting an action for its
owner), `corrections.ts` (the leasing team's corrections, none by default), `documents.ts` (the
redelivery records), and `leaseTerms` in `lease.ts`.

**"Add a lease" is a drop zone — "Drop the lease PDF here, or Choose a file" — that lights up when a
file is dragged over, turns away anything that is not a PDF, and shows the file being read with a
filling bar.** · Rejected: the browser's bare file input, which did not look like somewhere to add a
lease. · Because the flow is the point of the preview. Still labelled "Preview: nothing leaves the
app"; the file is still not read.
