// The decision picker, drawn: it offers no decision on an aircraft with nothing to decide, and says why.

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import dataset from '../../data/fleet.json';
import { DEFAULT_ASSUMPTIONS } from '../../calc/constants';
import { assessFleet } from '../../calc/exposure';
import { recommendFleet } from '../../calc/recommend';
import { decisionChoices } from '../../calc/scenario';
import type { Dataset } from '../../calc/types';
import { whatIfChoices } from '../../calc/whatif';
import { DecisionPicker } from './WhatIf';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data, DEFAULT_ASSUMPTIONS);
const today = recommendFleet(data, fleet, DEFAULT_ASSUMPTIONS);
const { open, cleared } = decisionChoices(whatIfChoices(data, fleet), today);
// React marks text boundaries with empty comments when it renders to a string; they are not content.
const html = renderToString(createElement(DecisionPicker, { choices: open, cleared, extension: null, onAdd: () => {} })).replace(/<!-- -->/g, '');
const options = [...html.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map((m) => ({ attrs: m[1]!, text: m[2]! }));

describe('DecisionPicker', () => {
  it('offers no decision on a cleared aircraft: it is listed as "Cleared: nothing to decide", and cannot be picked', () => {
    expect(cleared.sort()).toEqual(['9H-MMC', '9H-PJS', '9H-RYM']);
    for (const t of cleared) {
      const o = options.filter((x) => x.text.startsWith(t));
      expect(o, t).toHaveLength(1);
      expect(o[0]!.text).toBe(`${t} · Cleared: nothing to decide`);
      expect(o[0]!.attrs).toContain('disabled');
      expect(o[0]!.attrs).not.toContain(`value="${t}"`);
    }
    expect(html).toContain('Not offered, cleared with nothing to decide: 9H-MMC, 9H-PJS, 9H-RYM');
  });

  it('offers every other returning aircraft', () => {
    for (const c of open) expect(options.some((x) => x.attrs.includes(`value="${c.tail}"`) && !x.attrs.includes('disabled')), c.tail).toBe(true);
  });
});
