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
