# The second half — build and rationale

> *"This will be some time for you to demo to us as 'the customer', then we'll drop the
> role-play and ask some questions about the build and rationale behind it."*

This half is almost certainly why Bilal is in the room. The first half tests whether you
listened. **This half tests whether you think.**

---

## Timing — read this before anything else

**30 minutes. Two people. Two halves.** So:

- **Demo: 12 minutes.** Not 25. If you fill the slot you have answered nothing.
- He will interrupt during it. Budget for that — 12 minutes of material, not 12 minutes of talking.
- **Leave 15 minutes for questions.** The questions are the part Bilal came for.
- Last 3 minutes: your questions for them.

Open with the shape, so nobody is wondering how long this goes on:
> "I'll take about ten minutes on the tool, then I'd rather spend the time on your
> questions — including anything about how it's built."

**That sentence buys you the whole second half on purpose rather than by accident.**

---

## Open the second half yourself

Do not wait to be interrogated. Volunteer, in about forty seconds:

1. What's synthetic and what's computed — the one-liner from `WHATS-FAKE.md`.
2. The two things you faked on purpose, and why.
3. The hardest part of making it real.

**Naming the hard parts unprompted is the strongest move available**, and it worked in the
discovery call. It also sets the agenda: they spend their questions on what you raised.

### The hard parts — name these

- **Contract extraction needs a human in the loop.** A misread threshold is silently wrong
  for eighteen months and nobody finds out until handback. So extraction proposes,
  leasing or legal confirms. That is a product decision, not a modelling limitation.
- **Records are incomplete on second-hand aircraft.** The model assumes you know each
  component's history. For a tail bought mid-life you may not. The honest answer is a
  confidence level on every row, not a silent default.
- **Serial-level tracking is messy** — components move for AOG reasons, records lag, and
  the thing the lease cares about is which serial sat on which tail for how long.
- **An optimisation nobody can action is worthless.** Maintenance planning does not know
  return dates. Routing owns routes and will not take a schedule from a leasing tool. So
  the output has to be a flag with a number, addressed to the team that can act, early
  enough to matter. **That is why every recommendation carries a decision deadline.**

---

## Questions to expect, and where your answer lives

| they ask | you answer from |
|---|---|
| What's actually computed vs hardcoded? | `WHATS-FAKE.md`, then open `src/engine/` |
| Where did the data come from? | "From what you told me, plus public cost figures" — `ASSUMPTIONS.md` |
| Where did *that* number come from? | the `trace` on screen, then `ASSUMPTIONS.md` |
| How does the recommendation get made? | `SPEC.md` §2.7 — four priced options, argmin of total cost, runner-up shown |
| Why these screens and not others? | his own list, in his order — exposure by tail first because it's what his senior stakeholders asked to see |
| Why did you build it this way? | `BUILD-LOG.md` |
| What did you cut, and why? | `SPEC.md` §4 and `WHATS-FAKE.md` |
| What breaks at real scale? | the ranked comparison stops being enough once swaps interact across a pool — a solver earns its place there, not at ten aircraft |
| What's the hardest part of making this real? | the four above |
| What would you build next? | below |
| How long did this take? | say the real number. Do not inflate it and do not apologise for it. |
| What did you use to build it? | Claude Code, and say what you specified vs what you generated — the spec, the data model and the calculation rules were yours |

### On the tooling question specifically

He said tooling is your choice and that the real system was built in Cursor. So the question
is not *did you use AI* — of course you did, they sell AI. The question is **what was yours.**

> "I wrote the spec, the data model and the calculation rules. I used Claude Code to build
> from it, and I kept a log of every decision where there was a real alternative — because
> the risk with building this way is ending up with something you can't defend."

Then offer the build log. **Almost nobody will have one.**

---

## What you'd build next — three, ranked

1. **Lease extraction with a human in the loop.** Highest value, because every other number
   depends on the thresholds being right, and it is the only part that touches the source
   of truth. Build it as propose-and-confirm, with the clause visible beside each extracted
   condition.

2. **Confidence on every row.** QME status, records completeness, data age. Today the model
   gives one number per tail with equal confidence. The analyst's real question is *which
   of these can I trust*, and a tool that cannot answer it gets checked by hand — which is
   the Excel model coming back.

3. **Condition data alongside the counters.** EGT margin, oil consumption, vibration. Not
   to predict failures, but because a condition-driven removal is the cheapest return-condition
   work available — the engine is in the shop anyway, so you only pay the delta. The model
   currently cannot see those windows at all.

If pushed for a fourth: closing the loop with maintenance planning, so return dates reach
the people building shop schedules more than two months out.

---

## Your open questions for them

Not "do you have any questions for us" filler. These show you know what you don't know, and
they are the ones you could not answer from the discovery call.

1. **The avoidable split.** "I had to assume what share of the exposure is avoidable. I've
   shown it as X. When you look at a lease that's just closed out, does that feel right —
   or is it much less?" *(This is the question you let go in the discovery call. Bringing it
   back answered is better than having asked it then.)*

2. **Where the decision actually gets made.** "If this tool said in March that a tail
   needs a shop slot in May — who signs that off, and what would stop them?"

3. **QME, how common.** "Of the resets in your records, roughly what share would survive
   the lease's definition? You mentioned it happening — is it rare, or is it a pattern?"

4. **What they'd want first.** "If you had this in four weeks but only one screen, which one?"

Ask two. Pick by what the conversation gives you.

---

## Demo-day mechanics

- **Screenshot every screen the night before** and keep them in one folder, open. If
  anything breaks, you switch to images and keep talking. You do not debug in the room.
- **Never live-code and never open the terminal.** The build is finished Wednesday night
  whatever state it is in.
- Run it **locally, offline**. No deploy, no network, nothing to fail.
- One browser window, one tab, demo-sized font, notifications off.
- Have the fleet screen already loaded when you share. Do not start on a loading state.
- **Know your three best twelve seconds**: the exposure-by-tail table, the shop-visit curve,
  and the QME delta. If you get cut short, those three are the demo.

---

## The one thing to remember

> *"It's mostly to show that you've understood the brief, and sketch what a solution could
> look like... a good step there to show them, to make them confident in going for a
> bigger build."*

You are not being assessed on the software. **You are being assessed on whether you are the
person they would put in front of a customer** — which is why the second half exists, and
why "I don't know, here's how I'd find out" beats a confident guess every single time.
