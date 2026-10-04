// SPEC §2.6 — the four levers. Fixture arithmetic (fixtures.test-helpers.ts): 275 FH and
// 100 FC a month for 16 months. ENG2 has one build-for-interval visit behind it: 2,000 FH and
// 500 FC to its next shop visit and 19,500 FC of LLP life today, so it runs out of cycles at
// month 5. Its baseline is 1,300 FC short × $1,800 = $2,340,000 compensation plus over-delivery:
// of its 17,400 FC of LLP surplus, the 12,000 FC a build-for-interval visit bought beyond a
// build-for-cash one, × $330 = $3,960,000. $6,300,000 in all.

import { describe, expect, it } from 'vitest';

import { LABOUR_RATE_PER_MH } from './constants';
import { assessTail } from './exposure';
import { AS_OF, aircraft, assumptions, component, condition, conditions, lessor, spare } from './fixtures.test-helpers';
import { doTheWork, flyItDifferently, moveAComponent, payAtHandback, timeTheShopVisit, type Donor, type LeverContext } from './levers';
import { addMonths } from './projection';
import type { Aircraft, Assumptions, Component, Lessor, ReturnCondition } from './types';

const full = aircraft();
const eng1 = full.components[0]!;
const eng2 = full.components[1]!;

function context(
  ac: Aircraft,
  over: { pool?: Component[]; donors?: Donor[]; a?: Assumptions; lessor?: Lessor; conditions?: ReturnCondition[] } = {},
): LeverContext {
  const rcs = over.conditions ?? conditions(ac.tail);
  const a = over.a ?? assumptions();
  return { ac, lessor: over.lessor ?? lessor(), conditions: rcs, a, baseline: assessTail(ac, rcs, AS_OF, a), pool: over.pool ?? [], donors: over.donors ?? [] };
}

// The engine numbers a reader can redo: a second visit prices at the mature-run PR cost.
const BFC_RESTORATION = 6_500_000 * (3.1 / 3.88); // $5,193,299
const ENGINE_RI = 300 * LABOUR_RATE_PER_MH; // $28,500
// ENG2's sunk over-delivery: carried by every option that leaves it on the aircraft.
const SUNK_OD = 12_000 * 330;

describe('pay at handback', () => {
  it('is the exposure, with nothing spent', () => {
    const ctx = context(aircraft({}, [eng2]));
    const o = payAtHandback(ctx);
    expect(o).toMatchObject({ lever: 'pay', cost: 0, downtimeCost: 0, feasible: true, deadline: null, saving: 0 });
    expect(o.total).toBeCloseTo(2_340_000 + SUNK_OD, 3);
  });

  it('says so when a component runs out before handback', () => {
    expect(payAtHandback(context(aircraft({}, [eng2]))).trace).toContain('ENG2 runs out of cycles at month 5.0');
  });

  it('is off the table when the levers are told to deal with that component', () => {
    const o = payAtHandback({ ...context(aircraft({}, [eng2])), focus: 0 });
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('cannot reach handback as it stands');
  });
});

describe('L1 · do the work', () => {
  it('has nothing to do when nothing is short', () => {
    const o = doTheWork(context(aircraft({}, [eng1])));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('Nothing is short');
  });

  it('uses the cheapest workscope that clears, in the last month it can, and keeps LLPs that do not need replacing', () => {
    // ENG2 runs out at month 5, so month 5 is the last slot. Build-for-cash clears every clause;
    // 19,000 FC of LLP life at induction is more than the 8,000 FC it would leave, so the parts stay.
    const ctx = context(aircraft({}, [eng2]));
    const o = doTheWork(ctx);
    expect(o.feasible).toBe(true);
    expect(o.label).toBe('Do the work: ENG2 build-for-cash visit');
    expect(o.cost).toBeCloseTo(BFC_RESTORATION + ENGINE_RI, 3);
    expect(o.downtimeDays).toBe(14); // no spare in the pool: the aircraft waits
    expect(o.downtimeCost).toBe(14 * 45_000);
    // Compensation goes; the life the visit buys is in its price; the old run's sunk over-delivery stays.
    expect(o.newExposure).toBeCloseTo(SUNK_OD, 3);
    expect(o.deadline).toBe(addMonths(AS_OF, 1)); // month 5 less 4 months' lead
    expect(o.trace).toContain('LLPs kept');
    expect(o.trace).toContain('lost either way');
  });

  it('pays when the work costs more than the compensation it avoids', () => {
    // $5.2M of work and $630,000 of downtime to avoid $2.34M of compensation.
    const o = doTheWork(context(aircraft({}, [eng2])));
    expect(o.saving).toBeLessThan(0);
  });

  it('does the work when reserves pay for it and surplus life is not counted', () => {
    // Reserve lease: PR rate $600 ÷ 1.25 = $480/FH × (25,500 FH since the visit + 1,375 to month 5)
    // = $12.9M, capped at the $5.19M restoration. Left: removal and installation.
    const a = assumptions({ countOverDeliveryAsLoss: false });
    const o = doTheWork(context(aircraft({}, [eng2]), { a, lessor: lessor({ architecture: 'reserve' }) }));
    expect(o.cost).toBeCloseTo(ENGINE_RI, 3);
    expect(o.newExposure).toBeCloseTo(0, 3);
    expect(o.saving).toBeCloseTo(2_340_000 - ENGINE_RI - 14 * 45_000, 3);
    expect(o.trace).toContain('capped at the work');
  });

  it('cannot help a component that runs out before the first slot', () => {
    const early = component('engine', 'ENG2', { ...eng2, cso: 9_700 }); // 300 FC left: out at month 3
    const o = doTheWork(context(aircraft({}, [early])));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('only a spare keeps it flying');
  });

  it('takes a spare for the turnaround when the pool has one', () => {
    const o = doTheWork(context(aircraft({}, [eng2]), { pool: [spare('S1', 'ESN-S1')] }));
    expect(o.downtimeDays).toBe(2); // spare on, own engine back
    expect(o.cost).toBeCloseTo(BFC_RESTORATION + 2 * ENGINE_RI, 3);
  });
});

describe('L4 · time the shop visit', () => {
  it('sweeps every month from the lead time to handback, both workscopes', () => {
    const o = timeTheShopVisit(context(aircraft({}, [eng2])));
    expect(o.curve).toHaveLength(13 * 2); // months 4–16
    const open = [...new Set(o.curve!.filter((x) => x.feasible).map((x) => x.month))];
    expect(open).toEqual([4, 5]); // ENG2 runs out at month 5
    expect(o.curve!.find((x) => x.month === 6)!.reason).toContain('runs out of cycles at month 5.0');
  });

  it('stops where the turnaround would bring the engine back after handback', () => {
    // ENG1 against a 3,000 FH clause: 1,975 FH at return, 1,025 short, and nothing runs out
    // before handback — so the last induction is month 16 − 6.57 = 9.
    const rcs = [condition('engine', 'hoursRemaining', 3_000, 'FH', 600, 1), ...conditions().slice(1)];
    const o = timeTheShopVisit(context(aircraft({}, [eng1]), { conditions: rcs }));
    const open = [...new Set(o.curve!.filter((x) => x.feasible).map((x) => x.month))];
    expect(open).toEqual([4, 5, 6, 7, 8, 9]);
    expect(o.curve!.find((x) => x.month === 10)!.reason).toContain('turnaround');
  });

  it('costs the same in every open month on a no-reserve lease, and then takes the latest', () => {
    const o = timeTheShopVisit(context(aircraft({}, [eng2])));
    const at = (m: number) => o.curve!.find((x) => x.month === m && x.workscope === 'build-for-cash')!;
    expect(at(4).total).toBeCloseTo(at(5).total, 3);
    expect(at(4).overDelivery).toBeCloseTo(SUNK_OD, 3); // carried, whatever the month
    expect(o.label).toBe('Time the shop visit: ENG2 build-for-cash visit, month 5');
  });

  it('on a reserve lease, reclaims a month more of reserves for each month later it goes in', () => {
    // A balance small enough not to hit the cap: $480/FH × (5,000 FH since the last recognised
    // visit + 275 FH a month to induction). Month 5 holds 275 FH × $480 = $132,000 more than month 4.
    const eng = component('engine', 'ENG2', { ...eng2, asLeaseAllows: { tso: 5_000, cso: 9_500, llpMinCyclesRemaining: 19_500 } });
    const o = timeTheShopVisit(context(aircraft({}, [eng]), { lessor: lessor({ architecture: 'reserve' }) }));
    const at = (m: number) => o.curve!.find((x) => x.month === m && x.workscope === 'build-for-cash')!;
    expect(at(5).reserves - at(4).reserves).toBeCloseTo(275 * 480, 3);
    expect(at(4).total - at(5).total).toBeCloseTo(275 * 480, 3);
  });

  it('is never worse than doing the work, because L1 is one point on its curve', () => {
    const ctx = context(aircraft({}, [eng2]));
    const l1 = doTheWork(ctx);
    const l4 = timeTheShopVisit(ctx);
    expect(l4.total).toBeLessThanOrEqual(l1.total + 1e-6);
    expect(l4.actionKey).toBe(l1.actionKey); // here they land on the same month and workscope
  });

  it('pays for LLPs only when the workscope replaces them', () => {
    // Build-for-interval would leave 20,000 FC, more than the 19,000 left, so the parts are
    // replaced and paid for; build-for-cash's 8,000 FC is less, so they stay.
    const o = timeTheShopVisit(context(aircraft({}, [eng2])));
    const at = (s: string) => o.curve!.find((x) => x.month === 5 && x.workscope === s)!;
    expect(at('build-for-interval').visitCost).toBeCloseTo(6_500_000 + 6_600_000, 3);
    expect(at('build-for-cash').visitCost).toBeCloseTo(BFC_RESTORATION, 3);
  });
});

describe('L2 · fly it differently', () => {
  // ENG2 alone on a short-dense A320neo: 291 FH, 151 FC a month.
  const shortDense = aircraft({ routeProfile: 'short-dense', hoursPerMonth: 291, cyclesPerMonth: 151 }, [eng2]);

  it('re-runs the projection on the other profile and reports the change', () => {
    // As is: 2,416 FC flown, 2,116 short × $1,800 = $3,808,800. Mixed (301 FH, 107 FC): 1,712 FC
    // flown, 1,412 short = $2,541,600. The sunk over-delivery is the same 12,000 FC × $330 on both
    // profiles, so it cancels: the saving is the compensation alone.
    const o = flyItDifferently(context(shortDense));
    expect(o.label).toBe('Fly it mixed, not short-dense (flag to routing)');
    expect(o.newExposure).toBeCloseTo(2_541_600 + SUNK_OD, 3);
    expect(o.saving).toBeCloseTo(3_808_800 - 2_541_600, 3);
    expect(o).toMatchObject({ cost: 0, downtimeDays: 0, deadline: AS_OF });
    expect(o.trace).toContain('not a schedule');
  });

  it('has nothing to offer a type that flies one profile', () => {
    const wb = aircraft({ type: 'A350-900', bodyClass: 'widebody', engineModel: 'Trent XWB-84', routeProfile: 'long-haul' }, [eng1]);
    const o = flyItDifferently(context(wb));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('only the long-haul profile');
  });

  it("does not count when it leaves the component that is running out still running out", () => {
    // On mixed ENG2's 500 FC last 4.7 months, still short of a 16-month handback.
    const o = flyItDifferently({ ...context(shortDense), focus: 0 });
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('still run out of cycles');
  });
});

describe('L3 · move a component', () => {
  // Fitted to ENG2 on the full fixture tail ($6,528,600 if nothing changes). A spare's life
  // above the thresholds leaves the airline with it, priced at build-for-interval rates
  // ($540/FC restoration, $330/FC LLP):
  // TIGHT: 2,000 FC / 5,500 FH to its next visit, 12,000 FC of LLP. At handback 200 FC and
  //        9,900 LLP FC over → 200 × $540 + 9,900 × $330 = $3,375,000.
  // RICH:  the most life — 7,700 FC and 17,400 LLP FC over → $9,900,000.
  const tight = spare('U1', 'ESN-TIGHT', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 12_000 });
  const rich = spare('U2', 'ESN-RICH', { tso: 1_375, cso: 500, llpMinCyclesRemaining: 19_500 });
  const baseline = 2_340_000 + SUNK_OD + 160_000 + 68_600; // gear surplus is not over-delivery

  it('picks the right-sized unit, not the one with the most life', () => {
    const o = moveAComponent(context(full, { pool: [rich, tight] }));
    expect(o.label).toBe('Swap ENG2 for spare ESN-TIGHT');
    // ENG2's compensation and its sunk over-delivery leave with it — it goes to the pool, so its
    // avoidable LLP life is not handed over — and the spare's priced life comes in.
    expect(o.newExposure).toBeCloseTo(baseline - (2_340_000 + SUNK_OD) + 3_375_000, 0);
    expect(o.cost).toBeCloseTo(ENGINE_RI, 3);
    expect(o.downtimeCost).toBe(45_000); // one overnight change
    expect(o.saving).toBeCloseTo(2_340_000 + SUNK_OD - 3_375_000 - ENGINE_RI - 45_000, 0);
    expect(o.trace).toContain(`its $3,960,000 of avoidable LLP life is not handed over`);
    expect(o.move).toMatchObject({ position: 'ENG2', incoming: { id: 'U1', from: 'pool' } });
    expect(o.trace).toContain('200 FC above');
  });

  it('decides by the date the outgoing unit runs out, when that comes before the slot deadline', () => {
    expect(moveAComponent(context(full, { pool: [tight] })).deadline).toBe(addMonths(AS_OF, 5));
  });

  it("never treats a spare's life as free", () => {
    // Never been to the shop, so on its own tail its surplus would not be over-delivery at all.
    // As a spare it leaves the airline: 6,700 FC × $540 + 13,900 LLP FC × $330 = $8,205,000.
    const fresh = spare('U3', 'ESN-NEW', { tso: 11_000, cso: 4_000, llpMinCyclesRemaining: 16_000, lastWorkscope: 'none', shopVisitCount: 0 });
    const o = moveAComponent(context(full, { pool: [fresh] }));
    expect(o.newExposure).toBeCloseTo(baseline - (2_340_000 + SUNK_OD) + 6_700 * 540 + 13_900 * 330, 0);
    expect(o.saving).toBeLessThan(0);
    expect(o.trace).toContain('is a spare, so all its life');
  });

  it('rules out a unit that would run out before handback', () => {
    const tired = spare('U4', 'ESN-TIRED', { tso: 24_750, cso: 9_000, llpMinCyclesRemaining: 11_000 }); // 1,000 FC left
    const o = moveAComponent(context(full, { pool: [tired] }));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('would run out');
  });

  it('charges a swap between two tails with the exposure it creates on the other one', () => {
    // A donor handing back in 4 months: ENG2 flies about 400 of its 500 FC there, so it gets to handback.
    const donorAc = aircraft({ tail: 'T-DONOR', leaseEnd: addMonths(AS_OF, 4) }, [component('engine', 'ENG1', { ...tight, position: 'ENG1', installedOn: 'T-DONOR' })]);
    const donorRcs = conditions('T-DONOR');
    const a = assumptions();
    const donor: Donor = { ac: donorAc, conditions: donorRcs, baseline: assessTail(donorAc, donorRcs, AS_OF, a) };
    const o = moveAComponent(context(aircraft({}, [eng2]), { donors: [donor] }));
    expect(o.label).toBe("Swap ENG2 with T-DONOR's ENG1");
    // The donor's exposure afterwards is what the exposure engine says ENG2 costs there.
    const withOurs = assessTail({ ...donorAc, components: [{ ...eng2, position: 'ENG1', installedOn: 'T-DONOR' }] }, donorRcs, AS_OF, a);
    const d = o.move!.donor!;
    expect(d.exposureBefore).toBeCloseTo(donor.baseline.asRecorded.exposure, 3);
    expect(d.exposureAfter).toBeCloseTo(withOurs.asRecorded.exposure, 3);
    expect(o.cost).toBeCloseTo(2 * ENGINE_RI + d.exposureAfter - d.exposureBefore, 3);
    expect(o.downtimeDays).toBe(2);
    // Between two returning tails a unit is handed to a lessor either way, so it stays on the
    // over-delivery rule: the donor's engine here has 9,900 LLP FC over, less than the 12,000 a
    // build-for-cash visit would have saved, so none of it was avoidable and it owes nothing.
    expect(o.move!.own.newExposure).toBeCloseTo(0, 3);
  });

  it('will not hand another tail a unit that runs out before its handback', () => {
    // Same donor, handing back at 16 months: ENG2 would run out there at month 5.
    const donorAc = aircraft({ tail: 'T-DONOR' }, [component('engine', 'ENG1', { ...tight, position: 'ENG1', installedOn: 'T-DONOR' })]);
    const donorRcs = conditions('T-DONOR');
    const donor: Donor = { ac: donorAc, conditions: donorRcs, baseline: assessTail(donorAc, donorRcs, AS_OF, assumptions()) };
    const o = moveAComponent(context(aircraft({}, [eng2]), { donors: [donor] }));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('on T-DONOR');
  });

  it('has nothing to move when no engine, gear or APU carries exposure', () => {
    expect(moveAComponent(context(aircraft({}, [eng1]), { pool: [tight] })).feasible).toBe(false);
  });
});

describe('every lever', () => {
  it('returns the same shape, and total = cost + downtime + what is still owed', () => {
    const ctx = context(full, { pool: [spare('U1', 'ESN-TIGHT', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 12_000 })] });
    for (const o of [payAtHandback(ctx), doTheWork(ctx), flyItDifferently(ctx), moveAComponent(ctx), timeTheShopVisit(ctx)]) {
      expect(Object.keys(o)).toEqual(expect.arrayContaining(['label', 'cost', 'downtimeDays', 'downtimeCost', 'newExposure', 'saving', 'feasible', 'deadline', 'trace']));
      expect(o.total).toBeCloseTo(o.cost + o.downtimeCost + o.newExposure, 3);
      expect(o.saving).toBeCloseTo(ctx.baseline.asRecorded.exposure - o.total, 3);
      expect(o.trace.length).toBeGreaterThan(30);
    }
  });
});
