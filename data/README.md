# data/ — where did the numbers come from

Everything in this folder is synthetic. `generate.ts` builds the whole fleet from a fixed
seed; `fleet.json` is its output and is committed so the demo runs offline. Nothing is typed
into a component by hand.

```
npm run generate     # rewrites fleet.json, prints a summary
```

Every rate and cost the generator stamps onto a return condition comes from
`engine/constants.ts`, which is documented line by line in `../ASSUMPTIONS.md`. The generator
decides *who gets what* — which tail flies which profile, which engine has had a shop visit,
which lease is a reserve lease — and the engine decides *what it costs*.

The dataset is validated by `engine/reconcile.test.ts` against the IATA MCX FY2024 panel
(`npm test`).
