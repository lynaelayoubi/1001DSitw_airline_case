# The brief — what the customer actually asked for

Taken from the discovery call. **Quotes are the customer's own words.** Nothing gets built
that is not on this page, and nothing on this page gets quietly dropped.

Check this file before starting any piece of work, and update the status column when
something lands. If a proposed feature has no row here, it needs a row or it does not get
built.

---

## Must have — asked for explicitly

| # | What | Their words | Status |
|---|---|---|---|
| 1 | **Fleet overview** — the fleet, the components, where they're at and where they could be | *"That sounds spot on."* | **done** — table, whole-fleet toggle, component cards |
| 2 | **Exposure by tail, at a glance** | *"One of the key things our senior stakeholders just want to be able to see at a glance by tail."* | **done** — ranked by money |
| 3 | **The total if nothing is done** | *"If you just show the total, assuming we don't do any intervention essentially."* | **done** — headline tile |
| 4 | **Then the upside if optimised** | *"And then your system can show — if we optimise in this way, here's the potential, the value that we could work out for."* | **done** — "What acting now saves" beside the recommended actions at the top, split so their savings add up to it; after-recommendations in the headline |
| 5 | **A recommendation, not just a view** | *"It'd be nice if the system would just suggest to us — this is the recommendation."* | **done** — four levers, runner-up, deadline; the screen leads with the recommended actions, soonest first — tail, action, date, forced or what it saves — and the tip on each date says what passing it costs |
| 6 | **Scenario planning** — maintenance cost, utilisation, extend a lease by six months | *"Does that change anything?"* | **done** — answered by computation: for every assumption, how far it would have to move before any recommendation changes; the customer's own decisions — swap, shop visit, route, return date, several at once — go in a what-if priced against today's plan, which says what each change moves and refuses what cannot happen; every assumption is stated with its provenance and can be overridden, in one collapsed table above the panel that also says which of them change any answer inside their evidence |
| 7 | **Readiness checklist** for the leasing team and whoever runs the return | *"All of the other smaller pieces."* | **done** — under the table, collapsed under its digest ("next 90 days: N items across M tails"), opening on what the recommendations and the lease require and what is due in 90 days, with each tail's standard items folded into one line; and inside each tail's detail: forced removals, the lessor's notice of each engine removal (12.3(b)), shop slots to book, QME evidence to chase (the documents the clause requires), what is owed at handback, and four standard items from a declared template; owner, due date, status read off the date |
| 8 | **Lease management basics** — see the fleet, see the leases, and trace a recommendation to the actual lease | *"Be confident the recommendations are really based on the actual leases. That's going to be important to get their buy-in."* | **done** — a lease view slides over the right of the screen from the lessor's name or any clause reference (requirement rows, the working, refusals): the architecture, every return condition with threshold, rate and text — each linked back to the rows it drives — and the QME, replacement, notice and temporary-install clauses, quoted |
| 9 | **Visibly replace the spreadsheet** | *"Giving the analysts the view that they're not going to have to maintain some crazy Excel model anymore."* | **partial** — each tail's recommendation and each component's clauses open their working in place; nothing says so explicitly |
| 10 | **Fit the actions to this year's maintenance budget** — what a budget funds, what it leaves out, and what that costs | *Not from the discovery call: added at the build owner's request. The nearest thing the customer said is that the provision is carved out at lease signing.* | **done** — budget input under "Scenario planning"; forced removals first, then the combination of optional actions that saves most; left-out tails show the saving given up and whether their decision closes inside the year |

## v2 — the customer's feedback on v1

From the v1 demo. Quotes are the customer's words; the rest is the feedback as relayed. v2 is a
preview of the MVP, not the MVP: anything simulated says so on screen and in WHATS-FAKE.md.

| # | What | Their words | Status |
|---|---|---|---|
| 11 | **Pages, not one long screen** — Overview, Leases, Scenarios, Return checklist | *"It made me want to read it rather than listen to you."* | **done** — a top navigation; the Overview holds the headline money, the recommended actions and the fleet table, nothing else |
| 12 | **Permissions by role** | Asked for permissions: who sees and changes what | **done (preview)** — a "Viewing as" switcher (Head of fleet, Leasing team, Maintenance planning, Analyst); each role sees only its pages. No login |
| 13 | **Act on a recommendation** — assign it, notify the owner, follow it to done | *"There's no way I can actually act on anything."* | **done (preview)** — "Assign and notify" on every recommended action: owner, due date and a plain-English message prefilled from the recommendation, or the structured maintenance request; status Open → Sent → Accepted → Done; an activity log on the Overview. Nothing is sent |
| 14 | **Correct how a lease was read** | If the leasing team disagrees with how a clause was interpreted, can they correct it in the tool? | **done** — a Leases page: each lease's terms as read (thresholds, notice, replacement rule, what makes a shop visit count, reserves), with the clause each came from; the leasing team approves or corrects each with a reason, into a change history. A corrected threshold or notice period changes the calculation at once; a corrected rule applies on the next recalculation. "Add a lease" walks through upload and reading — the reading is a preview |
| 15 | **The assumptions inside scenario planning** | *"What if our costs go up, what if we renegotiate maintenance contracts."* | **done** — one Scenarios page in two parts: "Your decisions" (swap, shop visit, route, return date, and the budget) and "The world" (every assumption, open, with its evidence and an override that recomputes everything); then "Confirm before you act", with a sentence on what it means |
| 16 | **The documents a return needs** | The mundane checklist too: the records a redelivery actually asks for | **done** — a Documents section on the Return checklist, per returning aircraft, soonest return first: certificates of airworthiness and registration, AD status, modification status, maintenance programme compliance, and per engine, APU and gear their back-to-birth traces and shop visit reports; each with an owner and a status. Marked as a standard template, not read from a lease. An engine whose last shop visit the lease does not count starts with its report missing, from the record |

## Also asked for, inside the above

- **Downtime cost**, as an assumption they can set themselves — *"but also the downtime costs… that's something that we want to be able to put some assumptions in for those costs."* → **done**: stated with its provenance and overridable by body class, and checked by the robustness sweep.
- **The four components only: engines, landing gear, airframe, APU** — *"those are the most expensive bits, and the ones that have the most compensation attached to them."* → **done**.

## Guardrails — things they said NOT to do

| Don't | Their words | Honoured? |
|---|---|---|
| Full route optimisation | *"We're not going to be doing full route optimisation with all of the financials of passenger load and all of that. This is just suggestions for the routing team to help lower compensation events. They'll have to then factor that in with the rest of their route models."* | **yes** — lever 2 outputs a flag with a number, never a schedule |
| Make it deployable | *"It wouldn't be — I'll deploy this tomorrow."* | yes |
| Go overboard on polish | *"You don't need to go overboard. But at the same time it needs to look professional."* | yes |
| Build everything | *"Find that right balance between not too simplistic and too focused in one page — but also don't try and build every balance."* | watch this |
| Use real or borrowed data | They will give none; simulated data is the exercise | yes — all synthetic |

## Facts from the call that the data must match

~270 aircraft, most leased · ~10 returning inside two years · reconciliation today happens in
the last six months, by hand, one analyst, a large spreadsheet, days to a week per aircraft ·
shop slots need **3–6 months** lead time · components are swapped constantly but never for
lease reasons · aircraft are moved between routes for AOG only · **maintenance people are not
told return dates** until the last couple of months · data would come from their maintenance
system plus MRO extracts including PDF reports · automated feeds come later, not first.

## Two findings from the call that nobody else will have

1. **Qualified maintenance events.** *"We felt we did the right maintenance. But when we looked
   at the actual PDF reports and what was recorded… didn't quite meet the criteria. So the
   lifetime wasn't then reset appropriately from a legal point of view."* → **built**, and said
   in plain words wherever it appears: whether the lease recognises the clock reset, and the money
   that turns on it — a column on every tail ("not counted: ENG1 · $19.2M more at handback"), one
   plain line above the table summing it ($22.6M on two tails if lessors enforce the records
   clause), and the component cards. Incidence matches the customer's "sometimes": two of the ten
   returning tails (ASSUMPTIONS, QME incidence).
2. **Over-delivery**, which they worked out during the call itself. *"Sometimes we'll do some
   maintenance and actually the part has a lot more life on it when we hand it back…
   the cost of doing the maintenance is essentially fixed."* → **built**, priced separately
   from compensation: only the LLP life a past visit bought beyond the cheapest workscope that
   would have cleared the contract. On an engine that stays on the aircraft whatever is done it is
   sunk — paid for when the visit was done — so it sits in no total: its own line under the headline
   reads "Already over-delivered at past shop visits: $21.2M. Sunk on these ten; preventable on the next
   ten." Where an option would keep the engine in the pool instead, its life is counted in every option,
   the same way a spare's is.

## The one number they could not give

Asked how much of the exposure was avoidable, the answer was *"it's hard to tell."* The model
supplies it with the assumptions visible — and it is worth handing back to them for a
sense-check rather than presented as settled.
