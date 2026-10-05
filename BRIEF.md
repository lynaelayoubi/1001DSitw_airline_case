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
| 4 | **Then the upside if optimised** | *"And then your system can show — if we optimise in this way, here's the potential, the value that we could work out for."* | **done** — the avoidable total beside the recommended actions at the top, split so their savings add up to it; after-recommendations in the headline |
| 5 | **A recommendation, not just a view** | *"It'd be nice if the system would just suggest to us — this is the recommendation."* | **done** — four levers, runner-up, deadline; the screen leads with the recommended actions, soonest first — tail, action, date, forced or what it saves — and the tip on each date says what passing it costs |
| 6 | **Scenario planning** — maintenance cost, utilisation, extend a lease by six months | *"Does that change anything?"* | **done** — answered by computation: for every assumption, how far it would have to move before any recommendation changes; the customer's own decisions — swap, shop visit, route, return date, several at once — go in a what-if priced against today's plan, which says what each change moves and refuses what cannot happen; every assumption is stated with its provenance and can be overridden, in one collapsed table above the panel that also says which of them change any answer inside their evidence |
| 7 | **Readiness checklist** for the leasing team and whoever runs the return | *"All of the other smaller pieces."* | **NOT BUILT** |
| 8 | **Lease management basics** — see the fleet, see the leases, and trace a recommendation to the actual lease | *"Be confident the recommendations are really based on the actual leases. That's going to be important to get their buy-in."* | **partial** — clause references on every requirement row; no lease view yet |
| 9 | **Visibly replace the spreadsheet** | *"Giving the analysts the view that they're not going to have to maintain some crazy Excel model anymore."* | **partial** — each tail's recommendation and each component's clauses open their working in place; nothing says so explicitly |
| 10 | **Fit the actions to this year's maintenance budget** — what a budget funds, what it leaves out, and what that costs | *Not from the discovery call: added at the build owner's request. The nearest thing the customer said is that the provision is carved out at lease signing.* | **done** — budget input under "What you can do"; forced removals first, then the combination of optional actions that saves most; left-out tails show the saving given up and whether their decision closes inside the year |

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
   that turns on it — a headline tile ("resets the lease does not recognise", +$54.4M on six
   tails), a column on every tail, and the component cards.
2. **Over-delivery**, which they worked out during the call itself. *"Sometimes we'll do some
   maintenance and actually the part has a lot more life on it when we hand it back…
   the cost of doing the maintenance is essentially fixed."* → **built**, priced separately
   from compensation: only the LLP life a past visit bought beyond the cheapest workscope that
   would have cleared the contract, and the headline splits it from cash payable at handback.

## The one number they could not give

Asked how much of the exposure was avoidable, the answer was *"it's hard to tell."* The model
supplies it with the assumptions visible — and it is worth handing back to them for a
sense-check rather than presented as settled.
