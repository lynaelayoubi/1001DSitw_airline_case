# Handback

Demo for 1001, round 3. Thursday 8 October, 12:00, 30 minutes, Yacoob + Bilal.

## The files

| file | what it's for |
|---|---|
| `CLAUDE.md` | domain context + repo rules. Claude Code reads it automatically every session. |
| `SPEC.md` | the build: data model, calculation engine, screens in priority order. |
| `BUILD-LOG.md` | every decision that had a real alternative. **Append as you go.** |
| `ASSUMPTIONS.md` | every rate and cost, with its source and its sensitivity. |
| `WHATS-FAKE.md` | real vs synthetic vs faked-on-purpose. The second half opens with this. |
| `RATIONALE.md` | the out-of-character half: timing, expected questions, what's next, your questions. |

## Starting a session

```
cd ~/Documents/Claude/Projects/Samwise\ Ventures/handback
claude
```

Then, first message:

```
Read CLAUDE.md and SPEC.md. Build step 1 only: the synthetic dataset
(data/generate.ts) and the fleet exposure table (SPEC §3.1). Nothing else.
Append your decisions to BUILD-LOG.md as you go.
```

**One step per session.** Do not ask for the whole spec at once — you will get something
that works and that you cannot explain, which is the exact failure mode this interview is
designed to find.

After each step: run it, look at it, and ask yourself whether you could derive every number
on screen. If not, that's the next thing to fix — before the next screen.

## The plan

`PLAN.md` — six days, day by day. **Feature freeze is Tuesday midday.**

| `COST-REFERENCE.md` | the full research: every public cost figure with source URL, year and confidence. |
