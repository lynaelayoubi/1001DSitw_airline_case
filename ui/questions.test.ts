// The What if questions: the sentence each reads as, the range each takes, the answer's wording, and
// the aircraft list, which offers no question about a cleared aircraft.

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { assessFleet } from '../calc/exposure';
import { recommendFleet } from '../calc/recommend';
import { EMPTY_SCENARIO, decisionChoices, runScenario } from '../calc/scenario';
import type { Dataset } from '../calc/types';
import { whatIfChoices } from '../calc/whatif';
import { answerSentence } from './components/Answer';
import { AircraftSelect } from './components/Questions';
import { PERCENT, decisionSentence, outsideRange, workscopeWords, worldSentence } from './questions';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data, DEFAULT_ASSUMPTIONS);
const today = recommendFleet(data, fleet, DEFAULT_ASSUMPTIONS);
const choices = whatIfChoices(data, fleet);

describe('the questions', () => {
  it('read back as the question asked', () => {
    expect(worldSentence({ input: 'maintenanceCost', value: PERCENT.shopUp.toValue(10) })).toBe('Shop costs go up by 10%');
    expect(worldSentence({ input: 'maintenanceCost', value: PERCENT.shopDown.toValue(9) })).toBe('We renegotiate the maintenance contract: shop costs down by 9%');
    expect(worldSentence({ input: 'utilisation', value: PERCENT.fly.toValue(5) })).toBe('Our aircraft fly 5% more than planned');
    expect(worldSentence({ input: 'utilisation', value: PERCENT.fly.toValue(-5) })).toBe('Our aircraft fly 5% less than planned');
    expect(worldSentence({ input: 'reservesReclaim', value: PERCENT.reserves.toValue(90) })).toBe('We can only claim back 90% of our reserves');
    expect(worldSentence({ input: 'downtimeWidebody', value: 150_000 })).toBe('A day on the ground costs $150K for a widebody');
    expect(decisionSentence({ kind: 'return', tail: 'A6-DLL', months: 3 }, choices)).toBe("We move A6-DLL's return date by 3 months");
    expect(decisionSentence({ kind: 'route', tail: 'A6-GPZ', profile: 'mixed' }, choices)).toBe("We change A6-GPZ's route profile to mixed");
    expect(decisionSentence({ kind: 'visit', tail: 'A6-DLL', position: 'ENG2', month: 6, workscope: 'build-for-cash' }, choices)).toBe(
      "We send A6-DLL's ENG2 to the shop in April 2027: minimum shop visit (build-for-cash)",
    );
    expect(workscopeWords('build-for-interval')).toBe('full shop visit (build-for-interval)');
  });

  it('refuse a value outside the evidence with one sentence saying the range', () => {
    expect(outsideRange('shopUp', '10')).toBeNull();
    expect(outsideRange('shopUp', '60')).toBe('Between 0% and 50%: the range the evidence supports.');
    expect(outsideRange('shopDown', '10')).toBe('Between 0% and 9%: that is as far down as the evidence goes.');
    expect(outsideRange('fly', '-5')).toBeNull();
    expect(outsideRange('fly', '25')).toBe('Between 13% less and 20% more than planned: the range the evidence supports.');
    expect(outsideRange('reserves', '120')).toBe('Between 0% and 100%: the range the evidence supports.');
    expect(outsideRange('downtime', '400000', 'widebody')).toBe('Between $0 and $300K a day for a widebody: the range the evidence supports.');
    for (const q of Object.values(PERCENT)) expect(q.start >= q.min && q.start <= q.max).toBe(true);
  });
});

describe('the answer', () => {
  it('says the plan holds when nothing changes, and otherwise what it costs and how many recommendations change', () => {
    expect(answerSentence(runScenario(data, today, EMPTY_SCENARIO))).toBe('Your plan holds: no recommendation changes.');
    const r = runScenario(data, today, { world: [{ input: 'utilisation', value: PERCENT.fly.toValue(5) }], decisions: [] });
    expect(answerSentence(r)).toMatch(/^Your plan costs \$[\d.]+[MK] (more|less)\. 1 recommendation changes\.$/);
  });
});

describe('AircraftSelect', () => {
  // React marks text boundaries with empty comments when it renders to a string; they are not content.
  const { open, cleared } = decisionChoices(choices, today);
  const html = renderToString(createElement(AircraftSelect, { choices: open, cleared, value: open[0]!.tail, onChange: () => {} })).replace(/<!-- -->/g, '');
  const options = [...html.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map((m) => ({ attrs: m[1]!, text: m[2]! }));

  it('offers no question about a cleared aircraft: it is listed as "Cleared: nothing to decide", and cannot be picked', () => {
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
