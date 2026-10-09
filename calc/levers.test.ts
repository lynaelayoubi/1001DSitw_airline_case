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
import {
  actingLate,
  coverUntilRestored,
  firstTimeout,
  doTheWork,
  flyItDifferently,
  moveAComponent,
  onTheGround,
  payAtHandback,
  timeTheShopVisit,
  type Donor,
  type LeverContext,
} from './levers';
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
// ENG2's over-delivery, bought at its last shop visit: sunk, so carried on every option but in no total.
const SUNK_OD = 12_000 * 330;

describe('pay at handback', () => {
  it('is the exposure, with nothing spent', () => {
    const ctx = context(aircraft({}, [eng2]));
    const o = payAtHandback(ctx);
    expect(o).toMatchObject({ lever: 'pay', cost: 0, downtimeCost: 0, feasible: true, deadline: null, saving: 0 });
    // The compensation alone: ENG2's over-delivery was bought at a past shop visit, so it is sunk.
    expect(o.total).toBeCloseTo(2_340_000, 3);
    expect(ctx.baseline.asRecorded.overDelivery).toBeCloseTo(SUNK_OD, 3);
  });

  it('says so when a component runs out before handback', () => {
    expect(payAtHandback(context(aircraft({}, [eng2]))).trace).toContain('ENG2 runs out of cycles around 4 Mar 2027, before handback on 2 Feb 2028');
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
    expect(o.label).toBe('Do the work: send ENG2 to the shop in March 2027, minimum shop visit (build-for-cash)');
    expect(o.cost).toBeCloseTo(BFC_RESTORATION + ENGINE_RI, 3);
    expect(o.downtimeDays).toBe(14); // no spare in the pool: the aircraft waits
    expect(o.downtimeCost).toBe(14 * 45_000);
    // Compensation goes; the life the visit buys is in its price; the old run's over-delivery is sunk.
    expect(o.newExposure).toBeCloseTo(0, 3);
    expect(o.deadline).toBe(addMonths(AS_OF, 1)); // month 5 less 4 months' lead
    expect(o.trace).toContain('LLPs kept');
  });

  it('pays when the work costs more than the compensation it avoids', () => {
    // $5.2M of work and $630,000 of downtime to avoid $2.34M of compensation.
    const o = doTheWork(context(aircraft({}, [eng2])));
    expect(o.saving).toBeLessThan(0);
  });

  it('does the work when reserves pay for it and surplus life is not counted', () => {
    // Reserve lease: the clause's own rate, $600/FH × (25,500 FH since the visit + 1,375 to month 5)
    // = $16.1M, capped at the $5.19M restoration. Left: removal and installation.
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
    expect(o.curve!.find((x) => x.month === 6)!.reason).toContain('runs out of cycles around 4 Mar 2027, before this slot');
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
    expect(o.label).toBe('Time the shop visit: send ENG2 to the shop in March 2027, minimum shop visit (build-for-cash)');
  });

  it('on a reserve lease, reclaims a month more of reserves for each month later it goes in', () => {
    // A balance small enough not to hit the cap: the lease's reserve rate — the clause's $600/FH —
    // × (5,000 FH since the last recognised visit + 275 FH a month to induction). Month 5 holds
    // 275 FH × $600 = $165,000 more than month 4.
    const eng = component('engine', 'ENG2', { ...eng2, asLeaseAllows: { tso: 5_000, cso: 9_500, llpMinCyclesRemaining: 19_500 } });
    const o = timeTheShopVisit(context(aircraft({}, [eng]), { lessor: lessor({ architecture: 'reserve' }) }));
    const at = (m: number) => o.curve!.find((x) => x.month === m && x.workscope === 'build-for-cash')!;
    expect(at(5).reserves - at(4).reserves).toBeCloseTo(275 * 600, 3);
    expect(at(4).total - at(5).total).toBeCloseTo(275 * 600, 3);
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
    // flown, 1,412 short = $2,541,600. ENG2's over-delivery, 12,000 FC × $330, is sunk and in neither
    // figure: the saving is the compensation alone.
    const o = flyItDifferently(context(shortDense));
    expect(o.label).toBe('Route change: fly it mixed, not short-dense (flag to routing)');
    expect(o.newExposure).toBeCloseTo(2_541_600, 3);
    expect(o.saving).toBeCloseTo(3_808_800 - 2_541_600, 3);
    // No date to decide by: worth most started now, and each of the 16 months it waits gives up a sixteenth.
    expect(o).toMatchObject({ cost: 0, downtimeDays: 0, deadline: null });
    expect(o.startNow!.perMonth).toBeCloseTo((3_808_800 - 2_541_600) / 16, 3);
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
  // Fitted to ENG2 on the full fixture tail ($6,528,600 if nothing changes). The lease (clause
  // 12.2, strict) lets a unit replace ENG2 only with no less life on every clock: 2,000 FH and
  // 500 FC to its next visit, 19,500 FC of LLP. A spare's life above the thresholds leaves the
  // airline with it, priced at build-for-interval rates ($540/FC restoration, $330/FC LLP):
  // SNUG:  2,000 FC / 5,500 FH to its next visit, 19,500 FC of LLP — level with ENG2's LLP. At
  //        handback 200 FC and 17,400 LLP FC over → 200 × $540 + 17,400 × $330 = $5,850,000.
  // RICH:  the most life — 7,700 FC and 17,400 LLP FC over → $9,900,000.
  // TIGHT: SNUG with 12,000 FC of LLP — right-sized for the contract, but 7,500 LLP FC short of
  //        ENG2, so not a permitted replacement.
  const snug = spare('U1', 'ESN-SNUG', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 19_500 });
  const tight = spare('U5', 'ESN-TIGHT', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 12_000 });
  const rich = spare('U2', 'ESN-RICH', { tso: 1_375, cso: 500, llpMinCyclesRemaining: 19_500 });
  const baseline = 2_340_000 + 160_000 + 68_600; // compensation alone: ENG2's over-delivery is sunk

  it('picks the right-sized unit the lease permits, not the one with the most life', () => {
    const o = moveAComponent(context(full, { pool: [rich, snug] }));
    expect(o.label).toBe('Swap ENG2 for spare ESN-SNUG');
    // ENG2's compensation leaves with it and the spare's priced life comes in. ENG2 goes to the pool,
    // but its over-delivery was bought at a past shop visit: sunk, so keeping it earns no credit.
    expect(o.newExposure).toBeCloseTo(baseline - 2_340_000 + 5_850_000, 0);
    expect(o.cost).toBeCloseTo(ENGINE_RI, 3);
    expect(o.downtimeCost).toBe(45_000); // one overnight change
    expect(o.saving).toBeCloseTo(2_340_000 - 5_850_000 - ENGINE_RI - 45_000, 0);
    expect(o.trace).not.toContain('avoidable LLP life is not handed over');
    expect(o.move).toMatchObject({ position: 'ENG2', incoming: { id: 'U1', from: 'pool' } });
    expect(o.trace).toContain('200 FC above');
  });

  it('refuses a unit with less life than the one it replaces on any clock the lease names (12.2)', () => {
    const o = moveAComponent(context(full, { pool: [tight] }));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('not a permitted replacement under Clause 12.2(a): ESN-TIGHT has 7,500 fewer LLP cycles than ENG2');
  });

  it("decides 90 days before the outgoing unit runs out, when the notice can be given in full (12.3(b))", () => {
    const o = moveAComponent(context(full, { pool: [snug] }));
    const runsOut = addMonths(AS_OF, 5);
    expect(o.deadline).toBe(new Date(Date.parse(runsOut + 'T00:00:00Z') - 90 * 86_400_000).toISOString().slice(0, 10));
    expect(o.trace).toContain(`the swap has to happen by ${runsOut}`);
    expect(o.trace).toContain("less 90 days' notice of the removal (Clause 12.3(b))");
  });

  it('does not refuse a removal forced by the engine running out: notice goes now, short — a conversation, not a refusal', () => {
    // ENG2 runs out at month 5; a lessor wanting 180 days' notice cannot have it in full.
    const o = moveAComponent(context(full, { pool: [snug], lessor: lessor({ engineRemovalNoticeDays: 180 }) }));
    expect(o.feasible).toBe(true);
    expect(o.deadline).toBe(AS_OF);
    expect(o.trace).toContain('a removal required by ENG2 running out, not a planned one');
    expect(o.trace).toContain('a conversation with the lessor, not a refusal');
  });

  it('refuses a planned engine swap when its notice can no longer be given (12.3(b))', () => {
    // Handing back in 4.5 months, ENG2 does not run out first (month 5), but it is short at handback:
    // a planned swap, which had to be noticed 90 days before the shop-slot deadline — already past.
    const o = moveAComponent(context(aircraft({ leaseEnd: '2027-02-18' }, [eng2]), { pool: [snug] }));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain("not possible under Clause 12.3(b): a planned engine removal needs 90 days' notice");
  });

  it("never treats a spare's life as free", () => {
    // Never been to the shop, so on its own tail its surplus would not be over-delivery at all.
    // As a spare it leaves the airline: 6,700 FC × $540 + 17,400 LLP FC × $330 = $9,360,000.
    const fresh = spare('U3', 'ESN-NEW', { tso: 11_000, cso: 4_000, llpMinCyclesRemaining: 19_500, lastWorkscope: 'none', shopVisitCount: 0 });
    const o = moveAComponent(context(full, { pool: [fresh] }));
    expect(o.newExposure).toBeCloseTo(baseline - 2_340_000 + 6_700 * 540 + 17_400 * 330, 0);
    expect(o.saving).toBeLessThan(0);
    expect(o.trace).toContain('is a spare, so all its life');
  });

  it('rules out a unit that would run out before handback', () => {
    const tired = spare('U4', 'ESN-TIRED', { tso: 24_750, cso: 9_000, llpMinCyclesRemaining: 11_000 }); // 1,000 FC left
    const o = moveAComponent(context(full, { pool: [tired] }));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('would run out');
  });

  it('tests a swap between two tails on both tails: each unit must have no less life than the one it replaces', () => {
    // The lease holds each tail's incoming unit to the one it replaces, so between two tails both
    // tests pass only when the two units have the same life on every clock.
    const donorAt = (unit: Component, leaseEnd?: string) => {
      const donorAc = aircraft({ tail: 'T-DONOR', ...(leaseEnd ? { leaseEnd } : {}) }, [component('engine', 'ENG1', { ...unit, position: 'ENG1', installedOn: 'T-DONOR' })]);
      const donorRcs = conditions('T-DONOR');
      const donor: Donor = { ac: donorAc, lessor: lessor(), conditions: donorRcs, baseline: assessTail(donorAc, donorRcs, AS_OF, assumptions()) };
      return moveAComponent(context(aircraft({}, [eng2]), { donors: [donor] }));
    };
    // Here: the donor's unit has less LLP life than ENG2, so it cannot replace ENG2.
    const short = donorAt(tight, addMonths(AS_OF, 4));
    expect(short.feasible).toBe(false);
    expect(short.trace).toContain('ESN-TIGHT has 7,500 fewer LLP cycles than ENG2');
    // There: the donor's unit has more life on every clock, so ENG2 cannot replace it on the donor.
    const there = donorAt(rich, addMonths(AS_OF, 4));
    expect(there.feasible).toBe(false);
    expect(there.trace).toContain("than T-DONOR's ENG1");
  });

  it('will not hand another tail a unit that runs out before its handback', () => {
    // A unit with more life than ENG2 passes here; ENG2 would then run out on the donor at month 5.
    const roomy = spare('U6', 'ESN-ROOMY', { tso: 18_000, cso: 6_000, llpMinCyclesRemaining: 19_500 });
    const donorAc = aircraft({ tail: 'T-DONOR' }, [component('engine', 'ENG1', { ...roomy, position: 'ENG1', installedOn: 'T-DONOR' })]);
    const donorRcs = conditions('T-DONOR');
    const donor: Donor = { ac: donorAc, lessor: lessor(), conditions: donorRcs, baseline: assessTail(donorAc, donorRcs, AS_OF, assumptions()) };
    const o = moveAComponent(context(aircraft({}, [eng2]), { donors: [donor] }));
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('on T-DONOR');
  });

  it('has nothing to move when no engine, gear or APU carries exposure', () => {
    expect(moveAComponent(context(aircraft({}, [eng1]), { pool: [tight] })).feasible).toBe(false);
  });
});

describe('firstTimeout', () => {
  it('counts a component as running out before handback only by at least a day', () => {
    // ENG2 runs out at month 5. Handing back that day, it reaches handback; a month later, it does not.
    const on = assessTail(aircraft({ leaseEnd: addMonths(AS_OF, 5) }, [eng2]), conditions('T-TEST'), AS_OF, assumptions());
    const after = assessTail(aircraft({ leaseEnd: addMonths(AS_OF, 6) }, [eng2]), conditions('T-TEST'), AS_OF, assumptions());
    expect(firstTimeout(on)).toBeNull();
    expect(firstTimeout(after)?.position).toBe('ENG2');
  });
});

describe('a component that runs out before handback', () => {
  // ENG2 runs out at month 5, after the 4-month lead time: its first slot is month 5, and a 200-day
  // turnaround brings it back at month 11.6, before handback at month 16.
  const snug = spare('U1', 'ESN-SNUG', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 19_500 });
  const out = { ...context(full, { pool: [snug] }), focus: 1 };

  it('covers it with a pool spare while it goes to the shop, and puts it back (12.3(c))', () => {
    const o = coverUntilRestored(out);
    expect(o.feasible).toBe(true);
    expect(o.label).toBe('Cover ENG2 with spare ESN-SNUG while it goes to the shop');
    expect(o.covers!.from).toBeCloseTo(5, 6);
    expect(o.covers!.until).toBeCloseTo(5 + 200 / 30.4375, 6);
    // ENG2 stays the permanent engine, so the replacement test does not apply to the spare.
    expect(o.trace).toContain('Clause 12.3(c)');
    expect(o.trace).toContain("replacement test does not apply");
    // Two overnight changes, and the spare's time away priced as the life it burns.
    expect(o.downtimeDays).toBe(2);
    expect(o.cost).toBeGreaterThan(o.spend);
    expect(o.trace).toContain("The spare's time away from the pool");
  });

  it('is not on offer without a spare that lasts until the engine is back', () => {
    const o = coverUntilRestored({ ...context(full), focus: 1 });
    expect(o.feasible).toBe(false);
    expect(o.trace).toContain('the pool has no');
  });

  it('prices the aircraft on the ground until the first slot, then the shop visit at its §13 downtime', () => {
    // 300 FC left: out at month 3, a month before the first slot. 30 days waiting, then 14 with no spare.
    const early = { ...context(aircraft({}, [component('engine', 'ENG2', { ...eng2, cso: 9_700 })])), focus: 0 };
    const o = onTheGround(early);
    expect(o.feasible).toBe(true);
    expect(o.lever).toBe('ground');
    expect(o.grounded!.days).toBe(44);
    expect(o.grounded!.cost).toBe(44 * 45_000);
    expect(o.downtimeCost).toBe(o.grounded!.cost);
  });

  it('is not on offer when the part reaches a slot before it runs out: that is the shop visit itself', () => {
    // ENG2 runs out at month 5, which is a slot month: no time on the ground.
    expect(onTheGround(out).feasible).toBe(false);
  });

  it('prices acting late: nobody acts until it runs out, then the cheapest option still open that day', () => {
    // A free spare the lease permits: swapped in the day ENG2 runs out.
    expect(actingLate(out).label).toMatch(/^Acting late: ENG2 swapped for spare ESN-SNUG on /);
    // No spare: on the ground from month 5 until the slot booked that day (month 9), then the shop visit.
    const none = actingLate({ ...context(full), focus: 1 });
    expect(none.label).toMatch(/on the ground from .* for a slot, then the shop visit/);
    expect(none.grounded!.days).toBe(122);
    expect(none.downtimeDays).toBe(122 + 14);
    // Handing back at month 12: a slot booked at month 5 brings ENG2 back after handback, so on the ground to handback.
    const short = actingLate({ ...context(aircraft({ leaseEnd: addMonths(AS_OF, 12) })), focus: 1 });
    expect(short.label).toMatch(/to handback$/);
    expect(short.grounded!.days).toBe(213);
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
