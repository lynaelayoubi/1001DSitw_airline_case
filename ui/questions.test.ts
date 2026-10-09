// Scenario planning, in words: the market fields and the range each takes, the decisions as sentences,
// what each change does on its own, the verdict on a decision, the headline — and the page itself, which
// offers no action for a decision worse than today's plan, and no aircraft with nothing to decide.

import { createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { assessFleet } from '../calc/exposure';
import { recommendFleet } from '../calc/recommend';
import { EMPTY_SCENARIO, decisionChoices, runScenario, type Scenario } from '../calc/scenario';
import type { Dataset } from '../calc/types';
import { whatIfChoices } from '../calc/whatif';
import { Answer, answerSentence } from './components/Answer';
import { AircraftSelect, DecisionList } from './components/Questions';
import { DemoProvider } from './demo';
import { MARKET, MARKET_FIELDS, decisionEffectSentence, decisionSentence, marketChanges, marketProblem, verdictSentence, worldEffectSentence } from './questions';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data, DEFAULT_ASSUMPTIONS);
const today = recommendFleet(data, fleet, DEFAULT_ASSUMPTIONS);
const choices = whatIfChoices(data, fleet);
const mxm = choices.find((c) => c.tail === 'A6-MXM')!;
const visit = { kind: 'visit' as const, tail: 'A6-MXM', position: 'ENG1', month: mxm.firstSlot, workscope: 'build-for-cash' as const };
const contract = { input: 'maintenanceCost' as const, value: 0.91 };
// React marks text boundaries with empty comments, and escapes apostrophes, when it renders to a string.
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'");

describe('the market fields', () => {
  it('take the range the evidence supports, and start at no change', () => {
    for (const f of MARKET_FIELDS) {
      const q = MARKET[f];
      const r = ASSUMPTION_INPUTS.find((i) => i.id === q.input)!.range;
      expect(q.toValue(q.min), f).toBeCloseTo(r.min, 6);
      expect(q.toValue(q.max), f).toBeCloseTo(r.max, 6);
      expect(marketChanges({ [f]: q.none }), f).toEqual([]);
    }
    expect(MARKET.shop.none).toBe(0);
    expect(MARKET.fly.none).toBe(0);
    expect(MARKET.reserves.none).toBe(100);
    expect(marketChanges({ shop: -9, fly: 0, reserves: 100 })).toEqual([{ input: 'maintenanceCost', value: 0.91 }]);
  });

  it('refuse a value outside the evidence with one sentence saying the range', () => {
    expect(marketProblem('shop', '-9')).toBeNull();
    expect(marketProblem('shop', '')).toBeNull(); // empty is no change
    expect(marketProblem('shop', '-10')).toBe('Shop costs: between 9% lower and 50% higher, the range the evidence supports.');
    expect(marketProblem('fly', '25')).toBe('Flying hours: between 13% less and 20% more than planned, the range the evidence supports.');
    expect(marketProblem('reserves', '120')).toBe('Reserves we can claim back: between 0% and 100%.');
    expect(marketProblem('widebody', '400')).toBe('A day on the ground for a widebody: between $0 and $300K, the range the evidence supports.');
  });
});

describe('the words', () => {
  it('read each decision back as the question asked, with the month and the workscope in plain words', () => {
    expect(decisionSentence(visit, choices)).toBe("We send A6-MXM's ENG1 to the shop in February 2027, minimum shop visit (build-for-cash)");
    expect(decisionSentence({ kind: 'visit', tail: 'A6-DLL', position: 'MLG', month: 6, workscope: 'build-for-interval' }, choices)).toBe("We send A6-DLL's MLG to the shop in April 2027, gear overhaul");
    expect(decisionSentence({ kind: 'return', tail: 'A6-DLL', months: 3 }, choices)).toBe("We move A6-DLL's return date by 3 months");
    expect(decisionSentence({ kind: 'route', tail: 'A6-GPZ', profile: 'mixed' }, choices)).toBe("We change A6-GPZ's route profile to mixed");
  });

  it('say what each change does on its own, and judge a decision against today\'s advice for its aircraft', () => {
    const r = runScenario(data, today, { world: [contract], decisions: [visit] });
    expect(worldEffectSentence(r.worldEffects[0]!)).toBe('The 9% cut in shop costs saves $1.97M.');
    expect(decisionEffectSentence(r.verdicts[0]!)).toBe('Your A6-MXM shop visit costs $1.17M more than paying at handback.');
    expect(verdictSentence(r.verdicts[0]!)).toBe('Costs $1.17M more than paying at handback: not recommended.');
    const later = runScenario(data, today, { world: [], decisions: [{ kind: 'return', tail: 'A6-YTM', months: 3 }] }).verdicts[0]!;
    expect(verdictSentence(later)).toBe("Better than today's plan: saves $140K.");
    expect(decisionEffectSentence(later)).toBe("Your A6-YTM return-date move saves $140K against today's plan.");
  });

  it('count only the tool\'s advice in the headline', () => {
    expect(answerSentence(runScenario(data, today, EMPTY_SCENARIO), EMPTY_SCENARIO)).toBe("Today's plan holds: no recommendation changes.");
    const decisionsOnly: Scenario = { world: [], decisions: [visit] };
    expect(answerSentence(runScenario(data, today, decisionsOnly), decisionsOnly)).toBe("Today's plan holds: no recommendation changes.");
    const example: Scenario = { world: [contract], decisions: [visit] };
    expect(answerSentence(runScenario(data, today, example), example)).toBe("With these figures, today's plan costs $1.97M less. No recommendation changes.");
    const flying: Scenario = { world: [{ input: 'utilisation', value: 1.05 }], decisions: [] };
    expect(answerSentence(runScenario(data, today, flying), flying)).toBe("With these figures, today's plan costs $2.13M more. 1 recommendation changes.");
  });
});

describe('the page', () => {
  const render = (el: ReactElement) => text(renderToString(createElement(DemoProvider, null, el)));
  const answer = (s: Scenario) =>
    render(createElement(Answer, { scenario: s, result: runScenario(data, today, s), pending: false, adviceDrafts: {}, onAssign: () => {}, asOf: data.asOf }));
  const decisions = (s: Scenario) => {
    const r = runScenario(data, today, s);
    return render(createElement(DecisionList, { scenario: s, onScenario: () => {}, priced: s.decisions, verdicts: r.verdicts, drafts: {}, onAssign: () => {}, named: choices, asOf: data.asOf }));
  };

  it("offers no action for a decision worse than today's plan, and keeps it out of the answer", () => {
    const s: Scenario = { world: [contract], decisions: [visit] };
    const html = decisions(s);
    expect(html).toContain('Your decisions');
    expect(html).toContain("We send A6-MXM's ENG1 to the shop in February 2027, minimum shop visit (build-for-cash)");
    expect(html).toContain('Costs $1.17M more than paying at handback: not recommended.');
    expect(html).not.toContain('Assign and notify');
    const a = answer(s);
    expect(a).toContain("With these figures, today's plan costs $1.97M less. No recommendation changes.");
    expect(a).not.toContain('Your plan');
    expect(a).not.toContain('Assign and notify');
  });

  it('lists no decisions for a scenario of changed figures only, and shows the advice they change', () => {
    const s: Scenario = { world: [{ input: 'utilisation', value: 1.05 }], decisions: [] };
    expect(decisions(s)).toBe('');
    const a = answer(s);
    expect(a).toContain("The tool's advice changes");
    expect(a).toContain('A6-MXM');
    expect(a.replace(/<[^>]+>/g, '')).toContain("+$1.17M on this aircraft compared with today's advice");
  });
});

describe('AircraftSelect', () => {
  const { open, cleared } = decisionChoices(choices, today);
  const html = text(renderToString(createElement(AircraftSelect, { choices: open, cleared, value: open[0]!.tail, onChange: () => {} })));
  const options = [...html.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map((m) => ({ attrs: m[1]!, text: m[2]! }));

  it('offers no decision on a cleared aircraft: it is listed as "Cleared: nothing to decide", and cannot be picked', () => {
    expect([...cleared].sort()).toEqual(['9H-MMC', '9H-PJS', '9H-RYM']);
    for (const t of cleared) {
      const o = options.filter((x) => x.text.startsWith(t));
      expect(o, t).toHaveLength(1);
      expect(o[0]!.text).toBe(`${t} · Cleared: nothing to decide`);
      expect(o[0]!.attrs).toContain('disabled');
      expect(o[0]!.attrs).not.toContain(`value="${t}"`);
    }
    for (const c of open) expect(options.some((x) => x.attrs.includes(`value="${c.tail}"`) && !x.attrs.includes('disabled')), c.tail).toBe(true);
  });
});
