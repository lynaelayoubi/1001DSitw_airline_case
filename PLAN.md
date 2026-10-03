# Six days

Thursday 8 October, 12:00. Six working days, Friday evening through Wednesday.

**The governing rule: feature freeze is Tuesday at midday.** Everything after that is
rehearsal, sharpening and screenshots. The extra days do not buy more screens — they buy
two days of being able to drive this thing without looking.

---

## Friday evening · ~2 hours · no building

- Read `SPEC.md` §2 end to end. **Check you can follow every formula without help.**
  Anything you cannot derive yourself, resolve tonight — you cannot defend on Thursday what
  you did not understand on Friday.
- Read `BUILD-LOG.md`. Those are decisions made on your behalf. Disagree with any of them
  and change them — a log you disagree with is worse than no log.
- Decide the product name. `Handback` is a placeholder.

## Saturday · the numbers, then the first screen

**Morning — research the costs.** Fill the table in `ASSUMPTIONS.md` properly: engine shop
visit by workscope tier, LLP replacement, landing gear overhaul, APU overhaul, airframe
heavy check, compensation rates per hour and per cycle, removal and install. Public sources
— lessor investor presentations, IATA material, MRO market reports, aircraft valuation
publications. Record the source on every line.

> This is not preparation for the build, it *is* the build. Wrong orders of magnitude are
> the one thing he will spot in thirty seconds, and the one thing that cannot be fixed later.

**Afternoon — the dataset.** `data/generate.ts`. 270 aircraft, ~10 returning inside 24
months, five components each, the spare pool, the return conditions with clause text.
Thresholds varying by lessor.

**Evening — screen 1 and the headline.** Exposure by tail, ranked by money. Do-nothing total
on top. **End of Saturday you have a credible demo even if everything after this fails.**

## Sunday · the calc layer — the heaviest day

Levers 1 to 4, each as a pure function returning the same shape. Then the recommendation:
argmin of total cost, with the runner-up and the delta. Then the decision deadline.

Then screen 3, tail detail, including the shop-visit timing curve. **That curve is your best
twelve seconds — give it real care.**

Finish the day by opening three different tails and checking the recommendation makes sense
to you as a person, not just as a function. If one of them looks wrong, it is wrong.

## Monday · QME, scenarios, lease view

**Morning — the QME dual view.** Exposure as the maintenance system believes it, beside
exposure as the lease would actually allow, with the delta called out. This is your
differentiator. Nobody else interviewing will have it. Build it properly.

**Afternoon — scenarios.** Maintenance cost, utilisation, lease extension. His three.

**Evening — the lease view.** Return conditions traced to clause reference and clause text.

**End of Monday: all six screens exist.** Then decide on the stretch item below — honestly.

## Tuesday · freeze at midday

**Morning — readiness checklist** (screen 6), and engine unit tests. Tests are not
house-keeping here: they are the answer to *"how do you know the arithmetic is right?"*
Write them for the binding-clock logic, the over-delivery calculation, the QME recompute,
and the shop-visit sweep.

**12:00 — FEATURE FREEZE.** No new screens, no new features, no refactors. From here you
only fix what breaks in rehearsal.

**Afternoon — first full rehearsal.** Out loud, screen shared, timed. **Twelve minutes of
demo, not twenty-five.** Record it and watch it back. Expect it to be bad; that is what the
first one is for.

**Evening — full mock with Claude.** Thirty minutes: Yacoob as the Head of Fleet for the
first half, then Bilal on build and rationale for the second. Same as before the discovery
call, and that worked.

## Wednesday · sharpen, then stop

- Fix only what actually broke in the mock. Nothing else.
- **Screenshot every screen** into one folder and keep it open on the day. If anything
  breaks you switch to images and keep talking. You do not debug in the room.
- Fill the **sensitivity column** in `ASSUMPTIONS.md` — for each rate, how much the
  recommendation moves if it is wrong by half or double. Then name the three figures the
  output is most sensitive to.
- Finish `BUILD-LOG.md` and `WHATS-FAKE.md` against what you actually built.
- Second mock, timed. Then a third if it is still rough.
- **Stop at 18:00 whatever state it is in.** Then eat properly and sleep — Thursday at noon
  needs a rested head far more than it needs a seventh screen.

## Thursday morning · nothing

Test the screenshare. Open one browser window, one tab, demo font, notifications off. Fleet
screen already loaded. Eat. Same as the morning of the discovery call, and that went well.

---

## The one stretch item

**A real lease extraction, on one synthetic lease PDF, with a confirm-before-accept step.**

Why it is worth considering: it serves the traceability he asked for, and it *demonstrates*
the human-in-the-loop argument rather than describing it.

**Conditions — all three, or it does not happen:**
1. All six screens working by Monday night.
2. Tuesday morning's tests and checklist done by the midday freeze.
3. You would still be comfortable binning it on Wednesday morning if it is not solid.

If it does not happen, nothing is lost. The extraction stays synthetic and you explain the
human-in-the-loop reasoning in the second half, which was always the stronger version of
that answer.

## What not to add, whatever time is left

More screens · more components beyond the four · authentication, users, persistence · any
route optimisation with revenue or load factors · animation and visual polish beyond
professional · a real optimiser or solver. **For ten aircraft a ranked comparison of four
priced options is the right answer, and saying so is a better answer than a solver.**
