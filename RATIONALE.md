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
| What's actually computed vs hardcoded? | `WHATS-FAKE.md`, then open `calc/` |
| Where did the data come from? | "From what you told me, plus public cost figures" — `ASSUMPTIONS.md` |
| Where did *that* number come from? | the `trace` on screen, then `ASSUMPTIONS.md` |
| How does the recommendation get made? | `SPEC.md` §2.7 — four priced options, argmin of total cost, runner-up shown |
| Why these screens and not others? | his own list, in his order — exposure by tail first because it's what his senior stakeholders asked to see |
| Why did you build it this way? | `BUILD-LOG.md` |
| What did you cut, and why? | `SPEC.md` §4 and `WHATS-FAKE.md` |
| **"How would this actually work for us? Doesn't it need integration?"** | **the section below — say it before being asked** |
| What breaks at real scale? | the ranked comparison stops being enough once swaps interact across a pool — a solver earns its place there, not at ten aircraft |
| What's the hardest part of making this real? | the four above |
| **"Isn't this just our spreadsheet, faster?"** | **the hinge below — expect this one from Bilal** |
| What would you build next? | below |
| How long did this take? | say the real number. Do not inflate it and do not apologise for it. |
| What did you use to build it? | Claude Code, and say what you specified vs what you generated — the spec, the data model and the calculation rules were yours |

### On the tooling question specifically

He said tooling is your choice, that the real system was built in **Cursor**, and that
building it inside the Claude app would be fine for something this size. So the question is
not *did you use AI* — of course you did, they sell AI. The question is **what was yours.**

The whole answer, and it is one sentence:

> "I wrote the spec, the data model and the calculation rules. Claude Code built from those,
> and I logged every decision where there was a real alternative — because the risk with
> building this way is ending up with something you can't defend."

Then offer the build log. **Almost nobody will have one.** Twenty-odd decisions, each with
its rejected alternative and the reason, several of them arguing with the spec.

Three things not to do here:

- **Don't name the editor.** VS Code is where Claude Code ran. Nobody who works in code
  mentions their editor unless asked — it is like saying which pen you used, and it dilutes
  a strong answer with a weightless one. "Claude Code, in a repo" is the whole answer.
- **Don't say "Claude Design".** He appears to mean building inside the Claude app, but the
  recording is mangled at that point and the phrase may not be a real product name. Name what
  *you* used and let him map it.
- **Don't inflate or apologise for the hours.** Say the real number flatly. The build log is
  the evidence of effort; the clock is not.

If it goes further — *"so how much of this do you actually understand?"* — the honest answer
is the strong one: you can derive any number on screen, you chose the modelling rules, and
you can name the three things the output is most sensitive to. **That is a different and
better claim than having typed the code**, and it is the claim a deployment lead should be
making.

---

## How it lands in their world — volunteer this at the close of the demo

The most on-role thing you can say, because it *is* the job. About 75 seconds, and it goes
at the end of the demo rather than waiting for the second half.

### Three inputs, one of them hard

| input | where from | cadence | difficulty |
|---|---|---|---|
| Maintenance records — serials, positions, hours, cycles, shop history | their maintenance system (AMOS / TRAX / Ramco class), as an extract | nightly | **boring** — they already run a dozen of these |
| MRO shop reports | PDFs back from the shop, per event | a few a month | medium — needed for the QME check |
| **The leases** | contracts held by leasing and legal | changes almost never | **the hard one** |

> The line: *"the maintenance feed is the easy half. The lease side is the half that decides
> whether this works."* It is the only input that has never been structured, and the only one
> where being wrong is invisible for eighteen months.

### Three people, three cadences

- **The leasing analyst** — weekly. Confirms extracted lease terms, chases missing QME
  evidence, owns the numbers. **The one whose job changes most, and the one who has to trust
  it first.**
- **Head of Fleet and senior stakeholders** — monthly. First screen only. They never open a
  tail detail.
- **Maintenance planning** — the relationship that does not exist today, because they are not
  told return dates until the last couple of months. They get one line: *this tail needs a
  February slot, book it by November.*

Plus network planning, occasionally, receiving a flag with a number — never a schedule. And
finance, who carve the provision at lease signing and can now update it against reality.

**It is not a real-time dashboard.** Data refreshes nightly; decisions are monthly. Getting
that cadence right is most of what makes a tool get used rather than bookmarked.

### The deployment answer

> **You don't integrate to prove value. You prove value on ten aircraft, then integrate.**

The MVP he described — four to six weeks, to show stakeholders — needs no pipeline. It needs
**one CSV export and ten lease PDFs**, which a person can assemble in a week. Run the ten
returning tails, put the number in front of the senior stakeholders, and let that buy the
integration budget.

Then integration follows the proof, in this order: **lease extraction first** (everything
inherits from it), **maintenance feed second** (the boring one), **MRO reports third**.

### Careful with his words

He said the automated feeds come later, and sequenced the whole thing himself — synthetic
data now, MVP in four to six weeks, show stakeholders, then real data via their DS team. But
**the recording is rough at that point and he trails off mid-sentence, so paraphrase, never
quote.** "You mentioned the automated feeds would come later" is safe. Reading a mangled
transcript back to the person who said it is a bad way to find out the transcript is wrong.

### If he pushes

- **"How long would the integration take?"** → Months, and most of it is theirs rather than
  yours — access, security review, a vendor in the middle. Which is the argument for keeping
  it off the critical path to the first number.
- **"What breaks when the data is real?"** → Records are incomplete on second-hand aircraft,
  so every row needs a confidence level rather than a silent default. Serial-level history
  lags, because components move for AOG reasons and the paperwork follows later. And an
  output addressed to nobody gets ignored — which is why every recommendation carries an
  owner and a date.

---

## The objection to have ready: "isn't this just our spreadsheet?"

The answer is one sentence, and everything else hangs off it:

> **The spreadsheet is organised around what you owe. This is organised around what you can
> still change.**

Three things that follow, none of them about speed:

1. **No counterfactual.** The Excel model says what you owe. It cannot say what you'd owe
   with the engine sent in February rather than May — that is not a cell, it is a
   re-simulation of seventeen months under different assumptions. Ten tails × five
   components × two clocks × four levers × twelve candidate months is thousands of
   evaluations. **Nobody does that by hand, which is why the levers are not being pulled** —
   his own words: they swap components constantly, *never for lease reasons*; they move
   aircraft onto routes, *AOG only*.

2. **Over-delivery cannot appear in it, structurally.** The spreadsheet exists to compute a
   liability. Handing back more life than the contract requires generates no invoice, so it
   produces no row. A real loss with no line item — which is why he worked it out mid-call
   instead of reading it off a report.

3. **QME is invisible to it.** The model reads the maintenance system, which says the clock
   reset. The lease says it did not. That gap lives between two documents nobody
   cross-references.

And underneath all three: **timing changes what the output is for.** The same arithmetic in
month two is a decision; in month eighteen it is an invoice you cannot contest.

Say it like this:

> "It replaces it, yes — deliberately. Nobody acts on a recommendation built from numbers
> they can't check, so the first thing it has to do is reproduce what your analyst gets and
> show its working. **But that's the price of entry, not the product.** The spreadsheet tells
> you what you owe. This tells you what you can still change — and those are different
> questions, which is why one of them takes a week and arrives too late to matter."

This is the two-layer sketch he called *"really good"*, restated: **L1 what's promised,
what's true, what's coming · L2 what's possible, what it costs.** The Excel replacement *is*
L1, and the reason it comes first is the one you already gave him — *"only once people trust
the number."*

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
