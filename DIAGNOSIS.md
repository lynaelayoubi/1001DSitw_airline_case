I haven't changed anything. Your sanity check holds, your hypothesis is right about over-delivery, and the QME delta has a different problem from the one you suspected. Over-delivery is the life handed back above what the lease requires; QME is the check on whether the lease recognises a shop visit's paperwork.

**1. The maintenance comparison**

Your $69M is $5.05M per aircraft-year × the 13.3 aircraft-years left. Two better bases make the case stronger:

| Basis, over the remaining lease | Maintenance |
|---|---|
| Panel figure, adjusted for 3 widebodies | $78.9M |
| The model's own accrual (engines, gear, airframe, APU, as generated) | $89.7M |

Exposure of $130M is still 1.45× the model's own accrual.

**2. Where the $130M comes from**

| Term | $M | Share |
|---|---|---|
| Compensation | 36.3 | 28% |
| Over-delivery on restoration, check and overhaul clocks | 19.0 | 15% |
| Over-delivery on LLP life | 74.7 | 57% |

LLP over-delivery on the three widebodies alone is $45.9M. At about 40 cycles a month, a 15,000-cycle LLP stack outlasts several leases. The model prices every leftover cycle at the new-part list price.

**3. Your hypothesis**

Today the model treats all life above the threshold as waste. But every past visit was forced (engines came off at their limits, checks and overhauls fall due on time), and you can't buy part of one:

- **Restoration, check and overhaul surplus ($19.0M) is unavoidable.** In the model both engine workscopes buy the same time on the wing, and gear, APU and airframe have only one tier.
- **Only part of the LLP surplus is avoidable: $36.5M of $74.7M.** That's the extra life a build-for-interval visit bought over the cheapest workscope that would still have cleared the contract.

Applying your rule, over-delivery falls from $93.6M to $36.5M and exposure from $130M to about $73M.

**4. The QME delta is bounded, but in the wrong place**

When a visit isn't recognised, the lease basis adds the whole previous engine run (1,600–9,900 cycles) back onto the clock. That alone puts the lease's claim at $23–64M per engine. The claim is then capped at a build-for-interval visit (restoration plus a full new LLP stack), and 4 of the 7 engines hit that cap.

- **Withdrawing LLP life, the term you suspected: real but small.** It adds only $0.8M. It's still wrong in principle, because LLP life is tracked per part and an unrecognised visit doesn't erase it.
- **The cap: this is the main problem.** An unrecognised restoration is put right by a restoration. Capping at the cheapest workscope that puts the component right brings the QME delta from $105.6M to about $35M.
- **The same overstated cap applies to ordinary compensation.** A6-DLL ENG1's $16.3M is more than the $10.8M restoration that would fix it.

**Proposed fix**

1. Over-delivery counts only LLP surplus beyond the cheapest workscope that clears the contract. Restoration, check and overhaul surplus counts as zero.
2. The cap on compensation, on both bases, becomes the cheapest workscope that puts the component right. LLP replacement is added only when the LLP clause is the one that's short.
3. The lease basis stops withdrawing LLP life.

Rough result: exposure about $65M, QME delta about $35M. The levers get re-run against this, so the avoidable figure will move.

One thing to decide: the $36.5M of avoidable LLP surplus comes from past visits. It's sunk now, and only a swap recovers it. I'd keep it in exposure as you proposed, shown separately from compensation as the headline already does.

**Proposed scale test**

- **Fleet:** exposure ÷ the model's own maintenance accrual over each tail's remaining lease must fall between 0.2 and 1.0.
  - *Upper bound:* a handback costing more than all the maintenance needed to get there means something is counted twice. Today it's 1.45; after the fix, about 0.73.
  - *Lower bound:* below 0.2, return conditions would have no teeth, with four of seven lessors on fat-threshold no-reserve leases.
- **Per tail:** each tail at most 2× its body-class benchmark. Narrowbody: $6.7M (the 737-800 settlement). Widebody: $24.7M, the narrowbody figure scaled ×3.7 by the published ratio of total maintenance-event value (777-300ER $60–76M against A320 $18–19M).
  - *Reason for 2×:* the benchmark is one settlement on a smaller, older engine. 2× leaves room for a fat-threshold lease with an engine past its limit.
  - *Today:* 9H-KVJ ($13.3M) and 9H-MMC ($18.1M) fail. After the fix, the highest narrowbody, 9H-KVJ, should be about $11M, or 1.7×.
- **Average:** across tails with any exposure, between 0.3× and 1.5× the benchmark.

Shall I go ahead with the fix and the test as proposed, or adjust the rule or the bands first?
