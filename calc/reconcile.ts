// SPEC §2.9 / ASSUMPTIONS §11: reconcile the generated fleet's aggregate maintenance cost
// against the IATA MCX FY2024 panel. Pure: takes aircraft, returns a result with a trace.
//
// What is compared. The model accrues the cost of four components (engine PR + LLP, landing
// gear, airframe heavy checks, APU) on a cost basis: event cost ÷ interval × annual usage.
// The IATA figure is *total* MRO spend, so the benchmark is scaled by the share of spend the
// four components represent (MODEL_COVERAGE_OF_TOTAL_MRO), and mix-adjusted for the fleet's
// narrowbody / widebody split using the panel's own published split (20.3% of fleet, 42% of
// cost).
//
// Two views are produced:
//   panelEquivalent — the same fleet with every tail in a temperate environment and the
//                     fleet's utilisation scaled to the panel's 9.06 FH/day. This isolates
//                     the cost tables (ASSUMPTIONS §2–§5), which is what the check is for.
//   asGenerated     — the fleet as it is: a Gulf/Europe operator with most widebodies in a
//                     harsh-high environment and half its narrowbodies on a short-dense
//                     profile. Both are deliberate and both push cost up; the trace says by
//                     how much.
// The panel does not publish hours or cycles by body class, so the per-FH and per-FC views
// are the same test in different currencies; the raw unadjusted figures are reported too.

import {
  AIRFRAME,
  APU,
  APU_HOURS_PER_FLIGHT_CYCLE,
  IATA_MCX_FY2024,
  LANDING_GEAR,
  MODEL_COVERAGE_OF_TOTAL_MRO,
  RECONCILIATION_BAND,
  UTILISATION,
} from './constants';
import { engineEconomics, llpReservePerFC, phaseOf } from './rates';
import type { Aircraft, BodyClass, Component, ComponentKind, Environment } from './types';

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
const usdM = (n: number) => '$' + (n / 1e6).toFixed(2) + 'M';
const num = (n: number, dp = 0) => n.toLocaleString('en-US', { maximumFractionDigits: dp });
const pct = (x: number) => (x * 100).toFixed(1) + '%';

export interface AccrualOverride {
  /** Force an environment on every tail (the panel is a global average; cost tables are temperate). */
  environment?: Environment;
  /** Multiply every tail's hours and cycles by this factor. */
  utilisationScale?: number;
}

export interface ComponentAccrual {
  tail: string;
  position: string;
  kind: ComponentKind;
  annualCost: number;
  trace: string;
}

/** Annual cost accrual of one component on its current tail, cost basis. */
export function componentAnnualAccrual(ac: Aircraft, c: Component, override: AccrualOverride = {}): ComponentAccrual {
  const scale = override.utilisationScale ?? 1;
  const environment = override.environment ?? ac.environment;
  const cyclesPerYear = ac.cyclesPerMonth * 12 * scale;
  const fhFc = ac.hoursPerMonth / ac.cyclesPerMonth;
  const base = { tail: ac.tail, position: c.position, kind: c.kind };

  switch (c.kind) {
    case 'engine': {
      const econ = engineEconomics(ac.engineModel, phaseOf(c.shopVisitCount), environment, fhFc);
      const pr = econ.accrualPerFC * cyclesPerYear;
      const llpPerFC = llpReservePerFC(ac.engineModel);
      const llp = llpPerFC.rate * cyclesPerYear;
      return {
        ...base,
        annualCost: pr + llp,
        trace: `${c.position}: PR ${econ.trace} × ${num(cyclesPerYear)} FC/yr = ${usd(pr)}; LLP ${llpPerFC.trace} × ${num(cyclesPerYear)} = ${usd(llp)}; total ${usd(pr + llp)}`,
      };
    }
    case 'landing-gear': {
      const g = LANDING_GEAR[ac.type];
      const calendar = (g.overhaulCost / g.intervalMonths) * 12;
      const cycles = (g.overhaulCost / g.intervalFC) * cyclesPerYear;
      const binding = cycles > calendar ? 'cycles' : 'calendar';
      const annualCost = Math.max(calendar, cycles);
      return {
        ...base,
        annualCost,
        trace: `MLG: ${usd(g.overhaulCost)} ÷ ${g.intervalMonths} mo × 12 = ${usd(calendar)}/yr vs ÷ ${num(g.intervalFC)} FC × ${num(cyclesPerYear)} = ${usd(cycles)}/yr; ${binding} binds → ${usd(annualCost)}`,
      };
    }
    case 'airframe': {
      const checks = AIRFRAME[ac.type].checks;
      const annualCost = checks.reduce((s, k) => s + (k.cost / k.intervalMonths) * 12, 0);
      return {
        ...base,
        annualCost,
        trace: `AIRFRAME: ${checks.map((k) => `${k.name} ${usd(k.cost)} ÷ ${k.intervalMonths} mo × 12`).join(' + ')} = ${usd(annualCost)}/yr`,
      };
    }
    case 'apu': {
      const a = APU[ac.type];
      const apuHoursPerYear = cyclesPerYear * APU_HOURS_PER_FLIGHT_CYCLE;
      const annualCost = (a.overhaulCost / a.intervalApuHours) * apuHoursPerYear;
      return {
        ...base,
        annualCost,
        trace: `APU: ${usd(a.overhaulCost)} ÷ ${num(a.intervalApuHours)} APU-h × (${num(cyclesPerYear)} FC × ${APU_HOURS_PER_FLIGHT_CYCLE} APU-h/FC) = ${usd(annualCost)}/yr`,
      };
    }
  }
}

export interface ClassSummary {
  count: number;
  cost: number;
  flightHours: number;
  flightCycles: number;
  costPerAircraft: number;
}

export interface FleetFigures {
  count: number;
  annualCost: number;
  flightHours: number;
  flightCycles: number;
  costPerAircraft: number;
  costPerFlightHour: number;
  costPerFlightCycle: number;
  flightHoursPerDay: number;
  fhFc: number;
  engineShare: number;
  byClass: Record<BodyClass, ClassSummary>;
  byKind: Record<ComponentKind, number>;
}

export interface Ratios {
  /** Fleet ÷ mix-and-coverage-adjusted benchmark. The headline. */
  perAircraft: number;
  perFlightHour: number;
  perFlightCycle: number;
  /** Fleet ÷ raw panel figure × coverage, with no mix adjustment. */
  rawPerFlightHour: number;
  rawPerFlightCycle: number;
  /** (fleet WB cost per aircraft ÷ NB) ÷ (panel WB ÷ NB). */
  widebodyToNarrowbody: number;
  flightHoursPerDay: number;
}

export interface View {
  fleet: FleetFigures;
  ratios: Ratios;
  withinBand: boolean;
}

export interface ReconciliationResult {
  benchmark: {
    panelPerAircraftByClass: Record<BodyClass, number>;
    coverage: number;
    expectedPerAircraft: number;
    expectedWidebodyToNarrowbodyRatio: number;
    expectedEngineShare: number;
  };
  normalisation: { environment: Environment; utilisationScale: number };
  panelEquivalent: View;
  asGenerated: View;
  band: { min: number; max: number };
  trace: string;
}

function summarise(aircraft: Aircraft[], override: AccrualOverride): FleetFigures {
  const scale = override.utilisationScale ?? 1;
  const byClass: Record<BodyClass, ClassSummary> = {
    narrowbody: { count: 0, cost: 0, flightHours: 0, flightCycles: 0, costPerAircraft: 0 },
    widebody: { count: 0, cost: 0, flightHours: 0, flightCycles: 0, costPerAircraft: 0 },
  };
  const byKind: Record<ComponentKind, number> = { engine: 0, 'landing-gear': 0, airframe: 0, apu: 0 };

  for (const ac of aircraft) {
    const cls = byClass[ac.bodyClass];
    cls.count++;
    cls.flightHours += ac.hoursPerMonth * 12 * scale;
    cls.flightCycles += ac.cyclesPerMonth * 12 * scale;
    for (const c of ac.components) {
      const acc = componentAnnualAccrual(ac, c, override);
      cls.cost += acc.annualCost;
      byKind[c.kind] += acc.annualCost;
    }
  }
  for (const cls of Object.values(byClass)) cls.costPerAircraft = cls.count ? cls.cost / cls.count : 0;

  const count = byClass.narrowbody.count + byClass.widebody.count;
  const annualCost = byClass.narrowbody.cost + byClass.widebody.cost;
  const flightHours = byClass.narrowbody.flightHours + byClass.widebody.flightHours;
  const flightCycles = byClass.narrowbody.flightCycles + byClass.widebody.flightCycles;
  return {
    count,
    annualCost,
    flightHours,
    flightCycles,
    costPerAircraft: annualCost / count,
    costPerFlightHour: annualCost / flightHours,
    costPerFlightCycle: annualCost / flightCycles,
    flightHoursPerDay: flightHours / count / 365,
    fhFc: flightHours / flightCycles,
    engineShare: byKind.engine / annualCost,
    byClass,
    byKind,
  };
}

export function reconcileFleet(aircraft: Aircraft[]): ReconciliationResult {
  const bm = IATA_MCX_FY2024;
  const coverage = MODEL_COVERAGE_OF_TOTAL_MRO;
  const band = { ...RECONCILIATION_BAND };

  // Panel per-aircraft cost by body class, from the published fleet/cost split.
  const panelNB = (bm.costPerAircraftPerYear * (1 - bm.widebodyShareOfCost)) / (1 - bm.widebodyShareOfFleet);
  const panelWB = (bm.costPerAircraftPerYear * bm.widebodyShareOfCost) / bm.widebodyShareOfFleet;
  const nNB = aircraft.filter((a) => a.bodyClass === 'narrowbody').length;
  const nWB = aircraft.length - nNB;
  const expectedTotal = (nNB * panelNB + nWB * panelWB) * coverage;
  const benchmark = {
    panelPerAircraftByClass: { narrowbody: panelNB, widebody: panelWB },
    coverage,
    expectedPerAircraft: expectedTotal / aircraft.length,
    expectedWidebodyToNarrowbodyRatio: panelWB / panelNB,
    expectedEngineShare: bm.engineShareOfSpend / coverage,
  };

  const view = (fleet: FleetFigures): View => {
    const ratios: Ratios = {
      perAircraft: fleet.costPerAircraft / benchmark.expectedPerAircraft,
      perFlightHour: fleet.costPerFlightHour / (expectedTotal / fleet.flightHours),
      perFlightCycle: fleet.costPerFlightCycle / (expectedTotal / fleet.flightCycles),
      rawPerFlightHour: fleet.costPerFlightHour / (bm.costPerFlightHour * coverage),
      rawPerFlightCycle: fleet.costPerFlightCycle / (bm.costPerFlightCycle * coverage),
      widebodyToNarrowbody:
        nNB && nWB
          ? fleet.byClass.widebody.costPerAircraft / fleet.byClass.narrowbody.costPerAircraft / benchmark.expectedWidebodyToNarrowbodyRatio
          : 1,
      flightHoursPerDay: fleet.flightHoursPerDay / bm.flightHoursPerDay,
    };
    return { fleet, ratios, withinBand: ratios.perAircraft >= band.min && ratios.perAircraft <= band.max };
  };

  const asGeneratedFigures = summarise(aircraft, {});
  const utilisationScale = bm.flightHoursPerDay / asGeneratedFigures.flightHoursPerDay;
  const normalisation = { environment: 'temperate' as Environment, utilisationScale };
  const panelEquivalent = view(summarise(aircraft, normalisation));
  const asGenerated = view(asGeneratedFigures);

  const harshHigh = aircraft.filter((a) => a.environment === 'harsh-high');
  const harshNB = harshHigh.filter((a) => a.bodyClass === 'narrowbody').length;
  const harshWB = harshHigh.length - harshNB;
  const shortDenseNB = aircraft.filter((a) => a.routeProfile === 'short-dense').length;

  const kindShare = (f: FleetFigures, k: ComponentKind) => `${k} ${pct(f.byKind[k] / f.annualCost)}`;
  const describe = (label: string, v: View) =>
    `${label}: ${usdM(v.fleet.annualCost)}/yr = ${usdM(v.fleet.costPerAircraft)}/aircraft (${usdM(v.fleet.byClass.narrowbody.costPerAircraft)} NB, ` +
    `${usdM(v.fleet.byClass.widebody.costPerAircraft)} WB), ${usd(v.fleet.costPerFlightHour)}/FH, ${usd(v.fleet.costPerFlightCycle)}/FC, ` +
    `${v.fleet.flightHoursPerDay.toFixed(2)} FH/day, ${v.fleet.fhFc.toFixed(2)} FH:FC. ` +
    `Ratios to expected: per aircraft ${v.ratios.perAircraft.toFixed(3)}, per FH ${v.ratios.perFlightHour.toFixed(3)}, per FC ${v.ratios.perFlightCycle.toFixed(3)}; ` +
    `unadjusted per FH ${v.ratios.rawPerFlightHour.toFixed(3)}, per FC ${v.ratios.rawPerFlightCycle.toFixed(3)}; ` +
    `WB/NB ${v.ratios.widebodyToNarrowbody.toFixed(3)} of panel's; engine share ${pct(v.fleet.engineShare)} ` +
    `(${(['landing-gear', 'airframe', 'apu'] as ComponentKind[]).map((k) => kindShare(v.fleet, k)).join(', ')}). ` +
    `Band ${band.min}–${band.max}: ${v.withinBand ? 'INSIDE' : 'OUTSIDE'}.`;

  const trace = [
    `Benchmark: ${bm.source} — ${bm.airlines} airlines, ${num(bm.aircraft)} aircraft, average age ${bm.averageAgeYears} yrs, ` +
      `${usd(bm.costPerFlightHour)}/FH, ${usd(bm.costPerFlightCycle)}/FC, ${usdM(bm.costPerAircraftPerYear)}/aircraft/yr at ${bm.flightHoursPerDay} FH/day.`,
    `Fleet: ${aircraft.length} aircraft, ${nNB} narrowbody / ${nWB} widebody (${pct(nWB / aircraft.length)} widebody vs panel ${pct(bm.widebodyShareOfFleet)}).`,
    `Mix adjustment: ${usdM(bm.costPerAircraftPerYear)} × (1 − ${bm.widebodyShareOfCost}) ÷ (1 − ${bm.widebodyShareOfFleet}) = ${usdM(panelNB)} per narrowbody; ` +
      `× ${bm.widebodyShareOfCost} ÷ ${bm.widebodyShareOfFleet} = ${usdM(panelWB)} per widebody (a widebody costs ${benchmark.expectedWidebodyToNarrowbodyRatio.toFixed(2)} narrowbodies).`,
    `Coverage: the model prices four components ≈ ${pct(coverage)} of total MRO spend ` +
      `(engines 50% of spend ÷ 0.85 engine share of direct maintenance cost × 0.95 four-component share of DMC). Expected engine share of modelled cost ≈ ${pct(benchmark.expectedEngineShare)}.`,
    `Expected: (${nNB} × ${usdM(panelNB)} + ${nWB} × ${usdM(panelWB)}) × ${coverage.toFixed(3)} = ${usdM(expectedTotal)}/yr = ${usdM(benchmark.expectedPerAircraft)}/aircraft.`,
    `Normalisation to panel conditions: every tail in a temperate environment (Ackert's cost and time-on-wing tables are temperate; the panel is a global average), ` +
      `utilisation × ${utilisationScale.toFixed(3)} so the fleet flies the panel's ${bm.flightHoursPerDay} FH/day instead of ${asGeneratedFigures.flightHoursPerDay.toFixed(2)}.`,
    describe('Panel-equivalent', panelEquivalent),
    describe('As generated', asGenerated),
    `Why they differ: ${harshNB} narrowbodies and ${harshWB} widebodies are based in a harsh-high environment (engine $/FH +78%, ASSUMPTIONS §10), ` +
      `${shortDenseNB} narrowbodies fly a short-dense profile (${num(UTILISATION['short-dense'].cyclesPerMonth * 12)} FC/yr against the panel's ${num(bm.globalFleetCyclesPerMonth * 12)}, ASSUMPTIONS §9), ` +
      `and the fleet flies ${pct(asGenerated.ratios.flightHoursPerDay - 1)} more hours per day than the panel. ` +
      `As-generated ÷ panel-equivalent = ${(asGenerated.ratios.perAircraft / panelEquivalent.ratios.perAircraft).toFixed(3)}.`,
  ].join('\n');

  return { benchmark, normalisation, panelEquivalent, asGenerated, band, trace };
}
