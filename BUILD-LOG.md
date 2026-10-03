# Build log

One line per decision that had a real alternative. Written *as it happens* — this cannot be
reconstructed on Wednesday night, which is exactly why it is worth keeping.

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
demo must run offline. Nothing in the room should be able to fail for a reason that is not
my fault, and a 30-minute slot has no room for a reconnect.

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
shortfalls. · Because the customer worked this out himself during the discovery call: the
cost of a shop visit is essentially fixed, so handing back unused life is money spent and
given away.

**QME status as a field on every component, with exposure shown both ways.** · Rejected:
assuming all recorded maintenance legally counts. · Because he described exactly this
failure — work performed, paperwork not meeting the lease definition, life not legally
reset. It is the gap no dashboard would show today.

**Component matching scored by tightness of fit, not by most life remaining.** · Rejected:
picking the healthiest available unit. · Because the goal is to just clear the threshold.
Fitting the best engine is how you create over-delivery on the next lease.

**Spare pool of unattached components generated alongside the fleet.** · Rejected: swapping
only between in-service aircraft. · Because without a pool, lever 3 has nothing to choose
from and the recommendation engine quietly collapses to three levers.

**The route lever outputs a flag with a number attached to it, addressed to the routing
team.** · Rejected: generating a revised schedule. · Because he was explicit that this is
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
readiness checklist.** · Rejected: modelling the full component tree. · Because he named
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

---

<!-- APPEND BELOW AS YOU BUILD -->
