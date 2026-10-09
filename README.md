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

## v2 — a preview of the MVP

This branch, `v2-mvp-preview`, answers the customer's feedback on v1; `main` is the version demoed.
It is a preview of the MVP, not the MVP: anything simulated says "Preview: nothing leaves the app"
on screen and is listed in `WHATS-FAKE.md`. The calculation and its headline figures are as on `main`.

- **Pages instead of one long screen**: Overview (the headline money, the recommended actions, the
  fleet table), Leases, Scenarios, Return checklist, under a top navigation.
- **Viewing as**: Head of fleet, Leasing team, Maintenance planning, Analyst — each sees only the
  pages it needs, and only some can change things. No login.
- **Every recommendation can be acted on**: Assign and notify, with the owner, due date and a
  plain-English message prefilled from the recommendation, or the structured maintenance request;
  then Open, Sent, Accepted, Done, and an activity log. Nothing is sent.
- **Leases, reviewed and corrected**: each term the tool read, with the clause it came from, for the
  leasing team to approve or correct with a reason; a corrected threshold or notice period changes
  the calculation at once. Adding a lease is shown end to end; the reading is a preview.
- **What if**: plain-English questions — costs, flying, reserves, a day on the ground, a shop visit, a
  swap, a return date, a route — answered in one sentence, with what you'd do differently, each ready
  to assign.
- **The documents a return needs**: a standard template per aircraft, each with an owner and a status.

What you do in the demo — assignments, reviews, statuses — is kept in this browser; **Reset demo**,
under the role switcher, clears it.

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

## The demo on Replit

`dist/` is committed: it is the built app, and `.replit` serves it as a static site, so nothing is
built or run on Replit and nothing can fail live. To deploy: on replit.com, import this repository
from GitHub, then Deploy → Static. The public directory is `dist` and there is no build command.
After any change to the app, run `npm run build` and commit `dist/` before deploying again.

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
| `BRIEF.md` | what the customer asked for, in their own words, with a status against each item |
| `SPEC.md` | the build: data model, calculation layer, screens in priority order |
| `ASSUMPTIONS.md` | every rate, cost and assumption the model uses, with its source and its sensitivity |
| `COST-REFERENCE.md` | the underlying research: every public cost figure with source URL, year and confidence |
| `WHATS-FAKE.md` | real vs synthetic vs faked on purpose, and the reasoning for each |
| `BUILD-LOG.md` | every decision that had a real alternative: what was chosen, what was rejected, why |
| `DIAGNOSIS.md` | why the first exposure figures were twice the right size, and the fix |
| `CLAUDE.md` | the domain in the customer's vocabulary, and the rules for this repo (also read by Claude Code) |

## Status

Built: the projection, exposure, the four levers and the recommendation (SPEC §2.1–§2.8), on
the fleet exposure table, its headline, and a robustness check in place of scenario sliders (SPEC
§3.1, §3.2, §3.4). Lease view and readiness checklist are specified in `SPEC.md` and not yet
built — see `ui/README.md`.
