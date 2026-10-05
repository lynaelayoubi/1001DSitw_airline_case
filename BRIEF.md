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
| 4 | **Then the upside if optimised** | *"And then your system can show — if we optimise in this way, here's the potential, the value that we could work out for."* | **done** — after-recommendations and avoidable tiles |
| 5 | **A recommendation, not just a view** | *"It'd be nice if the system would just suggest to us — this is the recommendation."* | **done** — four levers, runner-up, deadline |
| 6 | **Scenario planning** — maintenance cost, utilisation, extend a lease by six months | *"Does that change anything?"* | **done** — answered by computation: for every assumption, how far it would have to move before any recommendation changes, with the close calls named; extending a named lease stays a control; every assumption is stated with its provenance and can be overridden |
| 7 | **Readiness checklist** for the leasing team and whoever runs the return | *"All of the other smaller pieces."* | **NOT BUILT** |
| 8 | **Lease management basics** — see the fleet, see the leases, and trace a recommendation to the actual lease | *"Be confident the recommendations are really based on the actual leases. That's going to be important to get their buy-in."* | **partial** — clause references on every requirement row; no lease view yet |
| 9 | **Visibly replace the spreadsheet** | *"Giving the analysts the view that they're not going to have to maintain some crazy Excel model anymore."* | **partial** — the component cards show the working; nothing says so explicitly |

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
   lifetime wasn't then reset appropriately from a legal point of view."* → **built**, shown
   as two numbers side by side.
2. **Over-delivery**, which they worked out during the call itself. *"Sometimes we'll do some
   maintenance and actually the part has a lot more life on it when we hand it back…
   the cost of doing the maintenance is essentially fixed."* → **built**, priced separately
   from compensation: only the LLP life a past visit bought beyond the cheapest workscope that
   would have cleared the contract, and the headline splits it from cash payable at handback.

## The one number they could not give

Asked how much of the exposure was avoidable, the answer was *"it's hard to tell."* The model
supplies it with the assumptions visible — and it is worth handing back to them for a
sense-check rather than presented as settled.
