# Handback

End-of-lease compensation exposure, eighteen months out.

Handback tells an airline, well before an aircraft goes back to its lessor, how much
end-of-lease compensation it is on track to pay against that lease's return conditions —
and which of four levers reduces it: do the work or pay, fly it differently, move
components, or time and scope the shop visit.

It is a prototype. It runs on a synthetic fleet of 270 aircraft, ten of them returning
inside 24 months, and every figure on screen is computed from that data — nothing is typed
in. What is real, what is generated and what is faked on purpose is set out in
`WHATS-FAKE.md`.

## Running it

Developed on Node 24.

```
npm install
npm run dev          # http://localhost:5173
npm test             # calc/ unit tests and the benchmark reconciliation
npm run typecheck
npm run generate     # rebuild data/fleet.json from its fixed seed
npm run build        # static bundle in dist/
```

No backend, no database, no network calls. The dataset is a committed JSON file, so the
prototype runs offline.

## Layout

Three folders, each answering one question.

| folder | answers | contents |
|---|---|---|
| `data/` | where did the numbers come from | `generate.ts` builds the synthetic fleet from a fixed seed; `fleet.json` is its output |
| `calc/` | what is actually computed | pure functions, no UI or data imports; every result carries a `trace` with its inputs and arithmetic |
| `ui/` | why these screens | Vite + React + Tailwind; formats `calc/` results and never calculates |

Each folder has its own README.

## The documents

| file | what it's for |
|---|---|
| `SPEC.md` | the build: data model, calculation layer, screens in priority order |
| `ASSUMPTIONS.md` | every rate, cost and assumption the model uses, with its source and its sensitivity |
| `COST-REFERENCE.md` | the underlying research: every public cost figure with source URL, year and confidence |
| `WHATS-FAKE.md` | real vs synthetic vs faked on purpose, and the reasoning for each |
| `BUILD-LOG.md` | every decision that had a real alternative: what was chosen, what was rejected, why |
| `CLAUDE.md` | the domain in the customer's vocabulary, and the rules for this repo (also read by Claude Code) |

## Status

Built: the fleet exposure table and its headline (SPEC §3.1–§3.2), on the projection and
exposure calculations (SPEC §2.1–§2.5). The four levers, tail detail, scenarios, lease view
and readiness checklist are specified in `SPEC.md` and not yet built — see `ui/README.md`.
