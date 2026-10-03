<!-- Compiled 3 October 2026 for the Handback demo. Every figure traceable to a public
source. Research only — the values actually USED by the model are in ASSUMPTIONS.md. -->

---

# Commercial Aircraft Maintenance & Leasing Cost Reference
### Public figures for synthetic dataset construction — narrowbody and widebody

**Compiled 3 October 2026.** Every figure below is traceable to a public document. Where no public figure exists, that is stated explicitly rather than estimated.

**Note on vintage before you use these:** the single richest public source (Ackert / Aircraft Monitor) is in **2018 USD**. Engine MRO costs have inflated hard since: Oliver Wyman's surveys put actual MRO **material** inflation at **7.7% in 2024** and projected **6.3% for 2025**, and **engine labour** inflation at **6.9% actual 2024 / 6.7% projected 2025**; separately, two-thirds of MRO respondents report next-gen narrowbody **shop costs exceeding expectations by 21%+**, a quarter by **50%+**. Scaling 2018 base figures to 2026 by roughly **1.45–1.70×** for engine events, and ~1.35–1.45× for airframe/labour-driven events, is defensible. I flag this again in the sensitivity section.

---

## 1. Engine shop visit cost by workscope tier

The WPG tier structure is universal: **Minimum Level** (external inspection, minor repair, no module teardown), **Performance Level** (module torn down to rotor assembly; airfoils/vanes/seals/shrouds repaired or replaced), **Full Overhaul** (module to piece-parts, 100% serviceability inspection). A "qualified performance restoration" shop visit requires at minimum a performance-level workscope on the **core** modules.

No public source prices the three tiers separately per engine model. What *is* public: (a) PR-level cost per engine model, and (b) worked examples contrasting a full-overhaul build against a minimum/core-only build on the same engine.

| Figure | Value | Year | Source | URL | Confidence |
|---|---|---|---|---|---|
| Overall PR shop visit cost range, all types | $3M to >$12M | 2018 | Ackert, *Aircraft Maintenance Handbook for Financiers*, 1st Ed. | [aircraftmonitor.com](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| **CFM56-5B4/3** (27,000 lb) PR, first-run | $3.25–3.45M | 2018 | Ackert Handbook, App. A-VI | [link](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| **CFM56-5B4/3** PR, mature-run | $3.30–3.60M | 2018 | Ackert Handbook, App. A-VI | same | High |
| **CFM56-5B3/3** (33,000 lb) PR, first / mature | $3.25–3.45M / $3.30–3.60M | 2018 | Ackert Handbook | same | High |
| **CFM56-7B26E** PR, first / mature | $3.20–3.40M / $3.40–3.60M | 2018 | Ackert Handbook | same | High |
| **V2527-A5** PR, first / mature | $3.20–3.40M / $3.40–3.70M | 2018 | Ackert Handbook | same | High |
| **V2533-A5** PR, first / mature | $3.20–3.40M / $3.40–3.70M | 2018 | Ackert Handbook | same | High |
| **LEAP-1A26** PR, first / mature | $3.30–3.60M / $4.00–4.40M | 2018 | Ackert Handbook | same | Medium (forecast at the time; LEAP had no mature SV history in 2018) |
| **LEAP-1A33** PR, first / mature | $3.30–3.60M / $4.00–4.40M | 2018 | Ackert Handbook | same | Medium |
| **GEnx-1B70** PR, first / mature | $6.10–6.50M / $7.50–8.00M | 2018 | Ackert Handbook, App. A-VII | same | Medium |
| **GEnx-1B76** PR, first / mature | $6.10–6.50M / $7.50–8.00M | 2018 | Ackert Handbook | same | Medium |
| **Trent XWB-84** PR, first-run | $6.40–6.80M | 2018 | Ackert Handbook | same | Medium |
| **Trent XWB-84** PR, mature-run | $7.70–8.20M | 2018 | Ackert Handbook | same | Medium |
| **Trent XWB-84** first-run SV, expected cost | ~$7.5M | 2019 | *Aircraft Commerce* Issue 127, "In-service performance of the Trent XWB" | [PDF](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/General%20Articles/2019/127_MTCE_B.pdf) | High (OEM/operator-sourced) |
| **Trent XWB-97** SV, expected cost | $7.5–8.5M, workscope/environment dependent | 2019 | *Aircraft Commerce* Issue 127 | same | High |
| **GE90-110B / -115B** PR, first-run | $9.50–10.50M | 2018 | Ackert Handbook, App. A-VII | [link](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| **GE90-110B / -115B** PR, mature-run | $11.0–12.0M | 2018 | Ackert Handbook | same | High |
| Generic narrowbody engine PR (aggregate) | $3.2–4.2M | 2020 | Ackert, ISTAT Learning Lab (cost data: JSA 2020 USD) | [istat.org](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| Generic widebody engine PR (aggregate) | $7–14M | 2020 | Ackert / ISTAT | same | High |
| A320-200 engine PR, per engine | $3.5–4.0M | 2020 | Ackert / ISTAT (JSA) | same | High |
| 777-300ER engine PR, per engine | $10.5–14.0M | 2020 | Ackert / ISTAT (JSA) | same | High |

**Tier-contrast worked examples (CFM56/V2500-class, same engine, same induction):**

| Figure | Full Overhaul build | Core (minimum) Restoration build | Year | Source | Confidence |
|---|---|---|---|---|---|
| Restoration cost | $2.50M | $2.00M | 2018 | Ackert Handbook, Fig. 48 | High |
| LLP cost in that visit | $2.50M | $1.50M | 2018 | same | High |
| **Total shop visit cost** | **$5.00M** | **$3.50M** | 2018 | same | High |
| Build goal achieved | 20,000 FC | 8,000 FC | 2018 | same | High |
| Resulting restoration $/EFH @1.5 FH/FC | $83.33/FH | $102.50/FH | 2018 | same | High |
| (Covid-era variant: core+LPT vs core-only) | $3.0M rest. + $3.0M LLP = $6.0M, 12,000 FC goal | $2.0M rest. + $2.0M LLP = $4.0M, 7,000 FC goal | 2020 | Ackert / ISTAT | High |

**Cost composition (useful for building a cost model rather than a lookup):** engine PR is **65–75% material**; engine LLP is **~100% material**; airframe heavy check is **65–75% labour**; landing gear ~50/50; APU heavy repair 65–75% material. Annual escalation by event: airframe HSI 2.5–3.5%, landing gear 3.5–5.5%, APU 4.5–6.5%, engine PR 4.5–6.5%, **engine LLP 5.0–8.0%**. Source: [Ackert / ISTAT 2020](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf). Confidence: High.

**Environment multiplier (same engine, NB class):** temperate $3.0M / 25,000 FH TOW / $120/FH; harsh-mild $3.2M / 22,000 FH / $145/FH; harsh-high $3.4M / 16,000 FH / **$213/FH**. Source: Ackert Handbook Fig. 71, 2018. Confidence: High.

---

## 2. Engine LLP costs

| Figure | Value | Year | Source | URL | Confidence |
|---|---|---|---|---|---|
| **Typical LLP certified life, all types** | 15,000–30,000 FC | 2018 | Ackert Handbook §2-IV, §5-V | [link](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| Full LLP set as share of engine cost | >20% of new engine cost | 2018 | Ackert Handbook | same | High |
| **V2527-A5 full LLP stack, per engine** | **$3,842,519** @ 20,000 FC life (= $192/FC) | 2018 (status date Nov-2017) | Ackert Handbook Fig. 20, worked A320-200 example | same | High |
| **CFM56-5B / V2500 class full LLP stack, per engine** | $4.10–4.20M @ 20,000–30,000 FC | 2020 | Ackert / ISTAT (JSA 2020 USD), A320-200 example | [istat.org](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| Same, in the half-life worked example | $4,150,000 per engine @ 20,000 FC | 2020 | Ackert / ISTAT | same | High |
| Generic **narrowbody** LLP stack, per engine | $3.0–5.0M, interval 10,000–30,000 FC | 2020 | Ackert / ISTAT | same | High |
| Generic **widebody** LLP stack, per engine | $8–16M, interval 10,000–30,000 FC | 2020 | Ackert / ISTAT | same | High |
| 777-300ER (GE90) LLP, per engine | $17–21M for 2 engines → **$8.5–10.5M per engine** @ 8,000–15,000 FC | 2020 | Ackert / ISTAT (JSA) | same | High |
| **Trent XWB-84 full LLP stack, list price** | ~$9.0M | 2019 | *Aircraft Commerce* Issue 127 | [PDF](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/General%20Articles/2019/127_MTCE_B.pdf) | High |
| **Trent XWB-97 full LLP stack, list price** | ~$10.0M (80% of LLPs redesigned vs -84; only 20% commonality) | 2019 | *Aircraft Commerce* Issue 127 | same | High |
| V2500 / CFM56-7B full LLP set, list price (historic) | $1.7M | 2004 | *Aircraft Commerce* Issue 34 | [PDF](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2004/ISSUE%2034-MTCE.pdf) | High for 2004 |
| PW2000 full LLP set, list price (historic) | $2.5M (quoted by P&W VP Jon Beatty) | 2004 | *Aircraft Commerce* Issue 34 | same | High for 2004 |
| CFM56-7 full LLP stack, headline | "$4m" | ~2023–24 (undated article) | Aircraft Value News, "Engine LLP Pricing Continues to Rise – $4m for CFM56-7" | [link](https://www.aircraftvaluenews.com/engine-life-limited-parts-pricing-continues-to-rise-4m-for-cfm56-7/) | Low (headline only; body paywalled, year not stated) |
| LLP OEM list-price escalation | >5%/yr narrowbody, >7%/yr widebody | 2018 | Ackert Handbook §5-V | [link](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| **LLP stub-life loss (life scrapped unused)** | 5–15% retained at replacement; industry standard assumption | 2018 | Ackert Handbook Fig. 75 | same | High |
| Number of LLPs in a CFM56-5B | 18 | 2004 | *Aircraft Commerce* Issue 34 | [PDF](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2004/ISSUE%2034-MTCE.pdf) | High |

**LLP certified life by module (hard-time limits, EFC):**

| Engine | Fan & LPC | HPC | **HPT** | LPT | Year | Source |
|---|---|---|---|---|---|---|
| CFM56-5B | 19,000–30,000 | 13,900–20,000 | **14,300–20,000** | 20,600–25,000 | 2004 | *AC* Issue 34 |
| CFM56-5B/P | 20,000–30,000 | 17,200–20,000 | **20,000 (HPT front shaft 14,300)** | 20,600 / 25,000 | 2004 | *AC* Issue 34 |
| CFM56-7B | 23,600–30,000 | 13,000–20,000 | **14,700–20,000** | 19,500–25,000 | 2004 | *AC* Issue 34 |
| V2500-A5 | 20,000 | 20,000 | **20,000** | 20,000 | 2004 | *AC* Issue 34 |
| V2500-A1 | 20,000 | 12,000–17,000 | **15,000** | 20,000 | 2004 | *AC* Issue 34 |
| Trent XWB-97 | — | HPC 4 disc and HPC 5-6 rear shaft are the binding limiters at **1,850 EFC** (expected to rise as programme matures) | — | — | 2019 | *AC* Issue 127 |

All from [*AC* Issue 34](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2004/ISSUE%2034-MTCE.pdf) and [*AC* Issue 127](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/General%20Articles/2019/127_MTCE_B.pdf). Confidence: High for the lives, but note the CFM/IAE lives are 2004 and several were explicitly "in the process of being extended" — current Chapter 5 limits for CFM56-5B/-7B are generally now uniform at 20,000–30,000 FC.

**Individual LLP piece-part cost — this is the weakest area.** I could not find a public, current catalogue price for a specific HPT disc from any OEM. What is public:

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **Module-level LLP cost, V2500-class** — FAN $400K/30,000 FC; **HPC $500K/20,000 FC; HPT $500K/20,000 FC**; LPT $600K/25,000 FC (stack $2.0M) | see left | 2011 | Ackert, [*Engine Maintenance Concepts for Financiers* v2](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/engine_mx_concepts_for_financiers___v2.pdf) | Medium (worked example, labelled as illustrative) |
| Illustrative LLP piece-part rates: Disk $150,000; Spool $250,000; Shaft $200,000; Seal $100,000 — all @ 20,000 FC | see left | 2018 | Ackert Handbook Fig. 76 | **Low as actual prices** — explicitly an "Example LLP Rate Calculation", not a catalogue price |
| HPT **blade** shipset (not an LLP, but the adjacent hot-section cost) | $400,000–700,000 for 60–80 blades; up to $8,000/blade | 2011 | Ackert, *Engine Mx Concepts v2* | Medium |
| HPC blade shipset | $150,000–300,000 | 2011 | same | Medium |

**Explicit gap:** there is no credible public figure for a single named HPT disc part number's list price for CFM56-5B, LEAP-1A, Trent XWB, GEnx or GE90. For a synthetic dataset, derive the HPT disc from the module share: HPT module LLPs are roughly **20–25% of the narrowbody stack** on the 2011 module breakdown, i.e. on a $4.1M CFM56/V2500 stack the HPT module LLP group is ~$0.9–1.0M, and a single HPT disc is a fraction of that. Mark any such number as derived, not sourced.

---

## 3. How much life a shop visit buys

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **EGT margin restored by a performance restoration** | 65–85% of original EGTM | 2018 | [Ackert Handbook Fig. 46](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| First-run engines stay on wing vs mature-run | 20–30% longer | 2018 | Ackert Handbook Fig. 73 | High |
| NB-class interval decay by SV number | EIS→SV1 **24,000 EFH**; SV1→SV2 **16,000 EFH**; SV2→SV3 **15,000 EFH** (costs $3.0M / $3.5M / $3.4M) | 2018 | Ackert Handbook §5-IV | High |
| Alternate NB decay illustration | 20,000 FH → 16,000 FH → 15,000 FH across SV1/2/3 | 2018 | Ackert Handbook Fig. 73 | High |
| NB engine PR interval, aggregate | 8,000–20,000 **FC** | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| A320-200 engine PR interval | 14,000–16,000 FC | 2020 | Ackert / ISTAT (JSA) | High |
| 777-300ER engine PR interval | 3,500–4,500 FC | 2020 | Ackert / ISTAT (JSA) | High |
| A320 (V2527-A5) PR interval, lease-model | 27,000 FH / 13,000 FC | 2018 | Ackert Handbook Fig. 20 | High |
| A320 MTBPR, first-run / mature-run | 13,500 FC / 9,000 FC | 2011 | Ackert, [*Value & Maintenance Status*](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/the_relationship_between_an_aicrafts_value__its_maintenance_status___v1.pdf) | High |
| **Contractual minimum build standard** (what a lessor demands a PR delivers) | not less than **16,000 FH / 10,000 FC** expected on-wing; no installed LLP with less life than that; warranty ≥6,000 FH / 2,000 FC / 18 months | 2026 | [Global Crossing / UMB Bank A320-233 operating lease, Sch. 6, 6 Mar 2026](https://www.sec.gov/Archives/edgar/data/1846084/000119312526348692/jetmf-ex10_3.htm) | **High — executed contract** |
| Short-haul engine SV interval, general | 6,000–12,000 EFC | 2004 | [*AC* Issue 34](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2004/ISSUE%2034-MTCE.pdf) | High |
| Long-haul engine SV interval, general | 1,500–3,000 EFC | 2004 | *AC* Issue 34 | High |
| Trent XWB-84 first SV interval (DAC method) | 3,000–3,500 EFC | 2019 | [*AC* Issue 127](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/General%20Articles/2019/127_MTCE_B.pdf) | High |
| Trent XWB-97 first SV interval (DAC) | 2,500–3,500 EFC | 2019 | *AC* Issue 127 | High |

**Time-on-wing in FC by engine and thrust (Ackert Handbook App. A, 2018, 2.0 FH/FC flight leg, 10% derate, temperate):**

| Engine | First-run TOW (FC) | Mature-run TOW (FC) |
|---|---|---|
| CFM56-5B6/3 (23.5k) | 16,500–17,500 | 10,500–11,500 |
| CFM56-5B4/3 (27k) | 14,500–15,500 | 9,000–10,000 |
| CFM56-5B3/3 (33k) | 11,000–12,000 | 8,000–9,000 |
| V2527-A5 (27k) | 12,000–13,000 | 9,000–10,000 |
| V2533-A5 (33k) | 9,500–10,500 | 8,000–9,000 |
| CFM56-7B26E | 14,500–15,500 | 9,500–10,500 |
| LEAP-1A26 | 12,000–13,000 | 9,500–10,500 |
| LEAP-1A33 | 9,500–10,500 | 7,500–8,500 |
| LEAP-1B27 | 12,000–13,000 | 9,000–10,000 |
| **@5.0 FH/FC leg:** Trent 772 | 5,000–5,400 | 3,700–4,100 |
| **@7.0 FH/FC leg:** GEnx-1B70 | 3,600–4,000 | 3,000–3,400 |
| GEnx-1B76 | 3,200–3,600 | 2,700–3,100 |
| Trent XWB-84 | 3,300–3,700 | 2,800–3,200 |
| GE90-115B | 3,000–3,400 | 2,400–2,700 |

Confidence: High (as published), Medium for LEAP/GEnx/XWB mature-run, which were forecasts in 2018.

**Shape fact worth encoding:** the relationship between TOW and $/EFH is a **U-curve** — extending TOW raises per-visit cost faster than it extends the interval, past a point. A dataset where cost per visit is independent of interval achieved will look wrong to a practitioner. Source: Ackert Handbook Fig. 49, 2018.

---

## 4. Landing gear overhaul

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **Interval, general** | 10–12 years **and** 18,000–21,000 FC, whichever more limiting | 2018 | [Ackert Handbook §5-II](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| A320 / A330 / 737NG / 777 interval | 120 months / 20,000 FC | 2018 | Ackert Handbook App. A-IV | High |
| A320neo interval | 144 months / 20,000 FC | 2018 | same | High |
| A350 interval | 144 months / 16,700 FC | 2018 | same | High |
| 787 interval | 144 months / 21,000 FC | 2018 | same | High |
| **A320 overhaul cost, initial / ageing** | $440–480K / $500–540K | 2018 | Ackert Handbook App. A-IV | High |
| A320neo | $450–490K / $510–550K | 2018 | same | High |
| 737NG | $400–440K / $460–500K | 2018 | same | High |
| A330 | $850–950K / $950K–1.05M | 2018 | same | High |
| **A350** | **$1.05–1.15M / $1.15–1.35M** | 2018 | same | High |
| **777** | **$1.00–1.20M / $1.10–1.30M** | 2018 | same | High |
| **787** | **$850–950K / $950K–1.15M** | 2018 | same | High |
| A320-200 overhaul, split nose/main | Nose $160K + Main $320K = **$480K** | 2018 | Ackert Handbook Fig. 20 | High |
| Generic NB / WB overhaul (aggregate) | $350–475K / $650K–1.2M, 10–12Y | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| A320-200 overhaul (JSA data) | $425–475K @ 120 Mo / 20,000 FC | 2020 | Ackert / ISTAT | High |
| 777-300ER overhaul (JSA data) | $1.10–1.20M @ 120 Mo / 17,000 FC | 2020 | Ackert / ISTAT | High |
| **Exchange fee component** | NB $40–80K; WB $150–250K | 2018 | Ackert Handbook §5-II | High |
| Downtime | 35–45 days NB; 55–65 days WB | 2018 | Ackert Handbook §4-I-ii | High |
| Cost driver / escalation | ~50% labour & material; 3.5–5.5%/yr | 2020 | Ackert / ISTAT | High |
| Corrosion/fatigue inflection | costs rise markedly after first 8–12 years, so second overhaul > first | 2018 | Ackert Handbook §5-II | High |

---

## 5. APU overhaul / heavy repair

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **Interval, general** | 4,000–8,000 **APU FH** | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| A320 / 737NG interval | 7,000–9,000 APU FH | 2018 | [Ackert Handbook App. A-V](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| A330 / A350 / 777 / 787 interval | 5,000–7,000 APU FH | 2018 | same | High |
| A320 MTBR, first-run / mature | 8,200 / 6,900 APU FH | 2018 | Ackert Handbook Fig. 65 | High |
| **A320 / 737NG cost, initial / ageing** | $320–360K / $350–400K | 2018 | Ackert Handbook App. A-V | High |
| A330 / A350 / 787 cost | $450–550K / $480–580K | 2018 | same | High |
| **777 cost** | **$550–650K / $580–680K** | 2018 | same | High |
| Generic NB / WB (aggregate) | $300–400K / $550–750K | 2020 | Ackert / ISTAT | High |
| A320-200 (JSA) | $325–375K @ 6,000–8,000 APU FH | 2020 | Ackert / ISTAT | High |
| 777-300ER (JSA) | $750–850K @ 5,000–6,000 APU FH | 2020 | Ackert / ISTAT | High |
| A320 (GTCP-131-9A) heavy repair | $350,000 @ 8,000 APU FH | 2018 | Ackert Handbook Fig. 20 | High |
| Downtime | 30–60 days | 2018 | Ackert Handbook §4-I-iii | High |
| Cost driver / escalation | 65–75% material; 4.5–6.5%/yr | 2020 | Ackert / ISTAT | High |
| Qualifying workscope | complete disassembly of power section **and** load compressor, at minimum | 2018 | Ackert Handbook §5-III | High |

**Note:** published APU cost figures normally **exclude APU LLPs**, which are charged separately on a per-cycle basis. Build your model the same way or you will double-count.

---

## 6. Airframe heavy maintenance (C-check and D-check / HSI)

Modern programmes no longer use "D-check" literally — Airbus and Boeing MPDs use escalating C-checks with 6-year/8-year/12-year **heavy structural inspections** layered on. Below, 6Y/8Y/12Y SC/SI/HMV *is* the D-check equivalent.

### 6a. Heavy structural checks — narrowbody (per check, incl. non-routines, interior, paint on 12Y)

| Aircraft | Check | Interval | Initial cost | Initial $/mo | Ageing cost | Ageing $/mo |
|---|---|---|---|---|---|---|
| A319-100 | 6Y SC | 72 mo | $775–875K | $10,800–12,100 | $1.0–1.1M | $13,800–15,200 |
| A319-100 | 12Y SC | 144 mo | $825–925K | $5,700–6,400 | $1.1–1.2M | $7,600–8,300 |
| **A320-200** | **6Y SC** | **72 mo** | **$800–900K** | **$11,100–12,500** | **$1.05–1.15M** | **$14,500–15,900** |
| **A320-200** | **12Y SC** | **144 mo** | **$850–950K** | **$5,900–6,600** | **$1.15–1.25M** | **$7,900–8,600** |
| A321-200 | 6Y / 12Y SC | 72 / 144 mo | $825–925K / $875–975K | — | $1.05–1.15M / $1.2–1.3M | — |
| B737-700 | 8Y / 10Y / 12Y SC | 96 / 120 / 144 mo | $625–725K / $350–450K / $850–950K | — | $825–925K / $500–600K / $1.0–1.2M | — |
| **B737-800** | **8Y / 10Y / 12Y SC** | **96 / 120 / 144 mo** | **$650–750K / $375–475K / $875–975K** | — | **$850–975K / $525–625K / $1.05–1.25M** | — |
| B737-900 | 8Y / 10Y / 12Y SC | 96 / 120 / 144 mo | $675–775K / $400–500K / $925K–1.05M | — | $875K–1.0M / $550–650K / $1.1–1.3M | — |

Source: [Ackert Handbook App. A-I](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf), 2018 USD. A320-family 12Y figure *excludes* the 6Y content. Confidence: High.

### 6b. Heavy structural checks — widebody

| Aircraft | Check | Interval | Initial cost | Initial $/mo | Ageing cost | Ageing $/mo |
|---|---|---|---|---|---|---|
| A330-200 | 6Y / 12Y SI | 72 / 144 mo | $1.55–1.75M / $1.65–1.85M | $21,500–24,300 / $11,400–12,800 | $2.00–2.30M / $2.10–2.30M | — |
| A330-300 | 6Y / 12Y SI | 72 / 144 mo | $1.60–1.80M / $1.70–1.90M | $22,200–25,000 / $11,800–13,100 | $2.10–2.40M / $2.20–2.50M | — |
| **A350-900** | **12Y SI** | **144 mo** | **$2.70–3.00M** | **$18,750–20,800** | **$3.30–3.60M** | **$22,900–25,000** |
| B777-200 | 8Y SI | 96 mo | $3.20–3.60M | $33,250–37,500 | $3.70–4.20M | $38,500–43,750 |
| **B777-300** | **8Y SI** | **96 mo** | **$3.40–3.80M** | **$35,500–39,500** | **$3.90–4.40M** | **$40,600–45,800** |
| B787-8 | 12Y SI | 144 mo | $2.30–2.60M | $16,000–18,000 | $2.90–3.20M | $20,000–22,200 |
| **B787-9** | **12Y SI** | **144 mo** | **$2.40–2.70M** | **$16,700–18,750** | **$3.00–3.30M** | **$20,800–22,900** |
| B787-10 | 12Y SI | 144 mo | $2.50–2.80M | $17,400–19,400 | $3.10–3.40M | $21,500–23,600 |

Source: [Ackert Handbook App. A-II](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf), 2018 USD. Confidence: High.

### 6c. Cross-checks and aggregates

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| Generic NB / WB heavy structural inspection | $800K–1.8M / $2.5–4.5M, interval 6–12Y | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| A320-200 6Y / 12Y SI (JSA) | $850–950K @72mo / $880–980K @144mo | 2020 | Ackert / ISTAT | High |
| 777-300ER 8Y SI (JSA) | $3.50–3.75M @ 96 mo | 2020 | Ackert / ISTAT | High |
| **C-check interval, general** | every 18–36 months | 2018 | [Ackert Handbook §1-IV](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| D-check / HSI interval, general | every 6–12 years | 2018 | same | High |
| A350-900 check structure | A-check 1,200 FH; C1 36 mo (33 tasks); C2 72 mo (176); C3 108 mo (33); **C4/12Y HSI 144 mo (379 tasks)** | 2017 | Ackert Handbook Fig. 13, from A350 MPD 3rd Rev. | High |
| A320 basic C-check interval | 6,000 FH / 20 months | 2006 | [*AC* Issue 44](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf) | High for 2006 |
| **A320 light C-check (C1) total cost** | ~$126,000 (1,700 routine MH + non-routine) | 2006 | *AC* Issue 44 | High for 2006 |
| **A320 C3 check total cost** | ~$143,500 (up to 3,000 MH) | 2006 | *AC* Issue 44 | High for 2006 |
| A320 C4 check (6Y-equivalent heavy) | 12,500–14,300 MH; labour $625–715K + materials/component repairs $360–395K ≈ **$1.0–1.1M** | 2006 | *AC* Issue 44 | High for 2006 |
| A320 C8 check (12Y-equivalent) | 18,000–20,000 MH; **~$1.5M total** | 2006 | *AC* Issue 44 | High for 2006 |
| A320 full 8-check base cycle, 1st cycle | 43,500 MH; **$3.3–3.5M**; reserve **$128/FH** over 26,000 FH (or $98/FH over 34,000 FH under Rev 28A) | 2006 | *AC* Issue 44 | High for 2006 |
| A320 full base cycle, 2nd cycle | 48,500 MH; materials $1.5M; **$3.9M**; reserve **$150/FH** | 2006 | *AC* Issue 44 | High for 2006 |
| Labour rates used in that analysis | $70/MH line & A-check; $50/MH base maintenance | 2006 | *AC* Issue 44 | High for 2006 |
| Airframe HSI cost weighting / escalation | 4–6% of total DMC; 65–75% labour; 2.5–3.5%/yr | 2020 | Ackert / ISTAT | High |
| **Airframe share of global MRO spend** | fell from 26% (2019) to **17% (2024)**; engine rose 41%→**50%**; components 17%→18% | 2024 | [IATA MCX FY2024, citing Oliver Wyman](https://www.iata.org/contentassets/bf8ca67c8bcd4358b3d004b0d6d0916f/fy2024-mcx-report_public.pdf) | High |

---

## 7. End-of-lease / return condition compensation

**Important structural point before the numbers.** There are two distinct lease architectures and they produce completely different cash profiles:

- **Supplemental-rent (reserve) leases** — lessee pays monthly/hourly reserves; shortfall against return conditions is settled out of accumulated reserves, with the lessor topping up or the lessee paying the difference. The executed 2026 A320 lease below works this way: return conditions are set as *minimum remaining life* thresholds (100 FH / 50 FC to next PR; 50 FC on LLPs; 2 months on gear), and non-compliance is remedied either by rectification or by lessee indemnity at commercial rates — **not by a published per-FH compensation tariff.**
- **No-reserve / EOL-adjustment leases** — no monthly reserves; a cash settlement at redelivery computed from the maintenance condition delta. Ackert flags this explicitly as exposing the lessor to greater risk, and it is where a $/FH or $/FC compensation rate gets negotiated.

**I could not find a published, generic market tariff of "$X per flight hour / $Y per cycle" for return-condition shortfalls.** No lessor publishes one; it is negotiated deal by deal. What *is* public is (a) the mechanism, (b) the reserve rates that in practice set the negotiating anchor, and (c) actual settlement sizes. Treating the reserve rates in §8 as the compensation-rate proxy is what practitioners actually do, and I would model it that way with an explicit multiplier.

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **Compensation mechanism — contractual** | Shortfall at redelivery → lessor's option: (i) lessee rectifies, term auto-extends at **150% of monthly basic rent** pro-rated daily, or (ii) lessee redelivers non-compliant and **indemnifies lessor at commercial rates then charged** by lessor's chosen provider | 2026 | [GCA/UMB A320-233 lease, Sch. 3 §1.4](https://www.sec.gov/Archives/edgar/data/1846084/000119312526348692/jetmf-ex10_3.htm) | **High — executed contract** |
| Engine damage from "Excluded Circumstances" at borescope | "good faith" negotiated **compensation value** / lessee buy-out; no formula given | 2026 | same, Sch. 3 §9.2 | High |
| Return condition — engines | ≥100 FH and 50 FC remaining to next PR | 2026 | same, Sch. 3 §6.1 | High |
| Return condition — LLPs | ≥50 FC remaining to life limit at titled thrust | 2026 | same, Sch. 3 §6.2 | High |
| Return condition — landing gear | ≥2 months remaining to next overhaul | 2026 | same, Sch. 3 §8 | High |
| *Delivery* condition for contrast (what a lessee demands) | engine ≤15,000 FH since last PR and ≥5,000 FH expected remaining; LLPs ≥2,500 FC; gear ≥24 months; fresh from next due C-check | 2026 | same, Sch. 2 §6, §8 | High |
| Mathematical basis for any adjustment | **Adjustment from half-life = (% remaining − 50%) × event cost** | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| Full-life recapitalisation cost, A320-200 | in excess of **$11M** (zero-life to full-life) | 2011 | [Ackert, *Value & Mx Status*](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/the_relationship_between_an_aicrafts_value__its_maintenance_status___v1.pdf) | High |
| Total maintenance event value, A320-200 | $17.7–19.2M | 2020 | Ackert / ISTAT (JSA) | High |
| Total maintenance event value, 777-300ER | **$60.4–75.8M** | 2020 | Ackert / ISTAT (JSA) | High |
| Half-life value swing between two same-vintage A320s on different utilisation | **Δ$3.3M** on a $20.8M half-life CMV (AVITAS May-2020 Bluebook) | 2020 | Ackert / ISTAT | High |

### Published settlement sizes

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **Single 737-800 returned off lease — full settlement** | Maintenance Rights Asset settled into **$4,697K capitalised asset improvements** + **$2,716K cash received in excess of MRA** (recognised as revenue); separately $3,982K MRA converted to receivable. Implied total EOL claim ≈ **$6.7M for one narrowbody** | 2025 | [Sun Country Airlines 10-Q, Q2 2025, Note 4](https://www.sec.gov/Archives/edgar/data/1743907/000174390725000029/sncy-20250630.htm) | **High — audited filing, single aircraft** |
| Air Lease Corp, end-of-lease revenue, Q4 | **$60M (Q4 2023)** vs **$6M (Q4 2024)** — fleet-wide quarterly | 2023–24 | [ALC Q4 2024 earnings call transcript, 8-K](https://www.sec.gov/Archives/edgar/data/1487712/000162828025005682/ex-991transcriptq424.htm) | High (aggregate, not per aircraft) |
| ALC forward guidance on EOL | management "continue(s) to anticipate lower levels of end of lease revenue" | 2025 | same | High |
| Lessor rationale for reserves | reserves provide "investors with collateral protection in the event of default"; maintenance status "underpins economic returns" | 2020 | Ackert / ISTAT | High |

**The $60M vs $6M swing is the single most useful fact in this section** — EOL income is extremely lumpy and regime-dependent, not a smooth per-FH accrual. A synthetic dataset that models EOL compensation as a steady function of utilisation will be unrealistic.

---

## 8. Maintenance reserve / supplemental rent rates

This is the best-evidenced section, because reserve rates appear verbatim in executed leases and in appraiser handbooks.

### 8a. Executed lease — Airbus A320-233 / IAE V2527E-A5, lease dated 6 March 2026, rates in 2025 USD

| Reserve | Rate | Escalation |
|---|---|---|
| **Engine Supplemental Rent (performance restoration)** | **$228 per engine flight hour** (at assumed 2.5:1 FH:FC, 10% derate, benign environment) | +4.0%/yr each 1 Jan |
| **Engine LLP Supplemental Rent** | **OEM list price per flight cycle**, per Manufacturer's Chapter 5 life limit — i.e. a formula, not a fixed rate | reset annually to current OEM catalogue list prices |
| **APU Supplemental Rent** | **$55 per APU hour** | +3.0%/yr |
| **HMV 6-Year Check** | **$14,500 per month** | +3.0%/yr |
| **HMV 12-Year Check** | **$6,500 per month** | +3.0%/yr |
| **Landing Gear** | **$4,750 per month** | +3.0%/yr |
| Context: basic rent $210,000/month; agreed value $31M at delivery, −3%/yr; security deposit $630,000 | | |

Source: [Global Crossing Airlines / UMB Bank (Castlelake-serviced) operating lease, EX-10.3, filed 13 Aug 2026](https://www.sec.gov/Archives/edgar/data/1846084/000119312526348692/jetmf-ex10_3.htm). **Confidence: High — this is an unredacted executed contract, and the single most current primary datapoint in this document.**

### 8b. The engine reserve sensitivity grid from that same lease — $/EFH by FH:FC ratio and derate

| FH:FC ratio | 0% derate | 5% derate | 10% derate |
|---|---|---|---|
| < 1.0 | **$913.98** | $794.77 | $722.52 |
| 1.0 – 1.5 | $550.75 | $478.92 | $435.38 |
| 1.5 – 2.0 | $404.09 | $351.38 | $319.44 |
| 2.0 – 2.5 | $329.98 | $286.94 | $260.85 |
| **2.5 – 3.0** | $288.40 | $250.79 | **$228.00** (contract base) |
| 3.0 – 3.5 | $263.54 | $229.16 | $208.33 |
| 3.5 – 4.0 | $247.15 | $214.91 | $195.38 |
| > 4.0 | $233.57 | $203.10 | **$184.64** |

Source: as above, Schedule 5. Confidence: High. Also in that lease: if >40% of flights are in an OEM-defined harsh/severe environment, the parties renegotiate the grid upward per OEM guidance; and operating above 27K thrust lets the lessor re-set the rate.

**This grid is the most valuable single artefact for a synthetic dataset.** It shows the real functional form: engine reserve $/FH is roughly **inversely proportional to flight length**, with a ~5× spread from ultra-short-haul to long-haul on the same engine, and a derate sensitivity of about **−21% going from 0% to 10% derate**.

### 8c. Appraiser/handbook reserve rates — narrowbody engine PR ($/EFH, 2018 USD, 2.0 FH/FC, 10% derate, temperate)

| Engine | First-run | Mature-run |
|---|---|---|
| CFM56-5B6/3 | $90–105 | $140–165 |
| CFM56-5B4/3 | $110–125 | $155–180 |
| CFM56-5B3/3 | $135–150 | $180–205 |
| V2524-A5 | $100–115 | $135–160 |
| V2527-A5 | $115–130 | $160–185 |
| V2533-A5 | $160–175 | $185–210 |
| LEAP-1A24 | $105–120 | $160–185 |
| LEAP-1A26 | $125–140 | $190–215 |
| LEAP-1A33 | $165–180 | $255–280 |
| CFM56-7B24E | $90–105 | $135–160 |
| CFM56-7B26E | $100–115 | $155–180 |
| CFM56-7B27E | $115–130 | $160–185 |
| LEAP-1B25 | $105–120 | $165–190 |
| LEAP-1B27 | $125–140 | $195–220 |
| LEAP-1B28 | $130–145 | $225–250 |
| PW1127G | $120–135 | $185–210 |
| PW1133G | $160–175 | $250–275 |

### 8d. Widebody engine PR ($/EFH, 2018 USD; 5.0 FH/FC for A330-gen, 7.0 for 787/A350/777)

| Engine | First-run | Mature-run |
|---|---|---|
| Trent 772 | $245–275 | $425–455 |
| CF6-80E1A4 | $240–270 | $420–450 |
| PW4170 | $260–290 | $445–475 |
| GEnx-1B70 | $225–255 | $330–360 |
| GEnx-1B76 | $255–285 | $365–395 |
| Trent 1000-70 | $240–270 | $340–370 |
| **Trent XWB-84** | **$260–290** | **$365–395** |
| **GE90-115B** | **$440–480** | **$620–660** |

Both tables: [Ackert Handbook App. A-VI and A-VII](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf), 2018 USD. Excludes LLPs, thrust reversers, QEC/LRU/accessories. Confidence: High as published; Medium for LEAP/GEnx/XWB/PW1100G mature-run (forecast).

### 8e. Non-engine reserve rates

| Reserve | Rate | Basis | Year | Source | Confidence |
|---|---|---|---|---|---|
| A320 6Y SC | $11,100–12,500/mo (initial); $14,500–15,900/mo (ageing) | per month | 2018 | Ackert App. A-I | High |
| A320 12Y SC | $5,900–6,600/mo; $7,900–8,600/mo ageing | per month | 2018 | same | High |
| 737-800 8Y / 10Y / 12Y SC | $6,800–7,800 / $3,100–3,900 / $6,000–6,800 per mo | per month | 2018 | same | High |
| A350-900 12Y SI | $18,750–20,800/mo | per month | 2018 | Ackert App. A-II | High |
| 777-300 8Y SI | $35,500–39,500/mo | per month | 2018 | same | High |
| 787-9 12Y SI | $16,700–18,750/mo | per month | 2018 | same | High |
| A320 landing gear | $3,600–4,000/mo; $4,100–4,500 ageing | per month | 2018 | Ackert App. A-IV | High |
| A350 landing gear | $7,300–8,000/mo | per month | 2018 | same | High |
| 777 landing gear | $8,300–10,000/mo | per month | 2018 | same | High |
| A320 / 737NG APU | $38–44 per APU FH; $40–46 ageing | per APU FH | 2018 | Ackert App. A-V | High |
| 777 APU | $85–95 per APU FH | per APU FH | 2018 | same | High |
| A350 / 787 / A330 APU | $70–80 per APU FH | per APU FH | 2018 | same | High |
| Widebody thrust reverser (per reverser, 2/ac) | A330 $9,200–11,600/mo; A350 & 787 $14,000–16,600/mo; 777 $15,000–17,700/mo; interval 96–120 mo | per month | 2018 | Ackert App. A-III | High |
| **Complete A320-200 reserve set (internally consistent)** | 6Y check $10,830/mo (1st run) & $12,460/mo (2nd run); 12Y check $5,900/mo; landing gear $3,500/mo; **engine PR $92/FH first-run, $154/FH mature-run; engine LLP $94.50/FC; APU $35/APU FH** | mixed | 2011 | [Ackert, *Value & Mx Status*, Fig. 8](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/the_relationship_between_an_aicrafts_value__its_maintenance_status___v1.pdf) | High |
| Implied total A320 DMC | **$380/FH first-run; $510/FH mature-run** | — | 2011 | same | High |
| A320 heavy-component reserves (alt. basis) | tyres $15/FC; wheels $9/FC; brakes $64/FC; **landing gear $19/FC; thrust reverser $29/FC; APU $44/FC** → $180/FC total = $120/FH @1.5 FH/FC | per FC | 2006 | [*AC* Issue 44](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf) | High for 2006 |
| A320 line + ramp check reserve | $212/FH ($595K/yr); A-checks $28/FH ($77K/yr) | per FH | 2006 | *AC* Issue 44 | High for 2006 |

**Reserve-rate construction formulas** (all from [Ackert Handbook §4-I](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf), 2018, High confidence) — worth encoding directly rather than hard-coding outputs:
- Airframe heavy check: avg cost ÷ MPD interval (months), charged per month
- Landing gear: avg overhaul cost ÷ MPD interval (months **or** FC, whichever binds), charged per month or per cycle
- APU: avg heavy repair cost ÷ MTBHR (APU FH), charged per APU FH
- Engine PR: avg PR cost ÷ mean time on-wing between PR (FH), charged per engine FH
- Engine LLP: OEM published LLP cost ÷ OEM published cycle interval, charged per cycle, **adjusted for stub-life factor** (e.g. a $150K disc at 20,000 FC = $7.50/FC becomes $8.33/FC at a 10% stub factor)
- Downtime assumptions: engine PR and LLP replacement 90–120 days; thrust reverser 40–60 days; APU 30–60 days; landing gear 35–45 days NB / 55–65 days WB

### 8f. Benchmark total maintenance cost (all-in, for sanity-checking a synthetic model)

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| Maintenance cost per FH, 28 airlines / 2,703 aircraft | **$1,522/FH** | FY2024 | [IATA MCX FY2024 Executive Report (public)](https://www.iata.org/contentassets/bf8ca67c8bcd4358b3d004b0d6d0916f/fy2024-mcx-report_public.pdf) | High |
| Maintenance cost per FC | **$3,758/FC** | FY2024 | same | High |
| Maintenance cost per aircraft | **$5.05M/AC** | FY2024 | same | High |
| Average fleet age / dispatch reliability of that panel | 10.6 yrs / 98.86% | FY2024 | same | High |
| Global MRO spend | $104B (2024), +11.7% vs 2019; = 11.5% of airline opex, 10.8% of revenue | 2024 | same | High |
| Global MRO spend, alternate estimate | $114B (2024); $120B (2025 f/c); $136B+ (2025 actual, +8% YoY); ~$193B by 2036 | 2024–26 | [Oliver Wyman MRO Survey 2025](https://www.aarcorp.com/globalassets/6.-careers/students/reports/mro-survey-2025.pdf); [Oliver Wyman Apr-2026](https://www.oliverwyman.com/our-expertise/insights/2026/apr/aviation-mro-labor-and-material-supply-chain-paradigm.html) | High |
| Widebody share of fleet vs MRO cost | 20.3% of active fleet, **42% of MRO cost** | 2024 | IATA MCX FY2024 | High |
| Engine share of MRO spend | **50%** (from 41% in 2019) | 2024 | IATA MCX FY2024 | High |
| Engines as % of aircraft total DMC | **>80% for A320-200; >90% for 777-300ER** | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| Engine PR + LLP as % of total DMC | PR 35–40%; LLP 50–55% | 2020 | same | High |
| Narrowbody engine shop TAT | **180–200 days or more** | 2025 | Oliver Wyman Apr-2026 | High |
| Material cost inflation (actual / projected) | 7.7% (2024A) / 6.3% (2025P); 2025 outturn exceeded expectations by 100–200 bps | 2024–25 | Oliver Wyman MRO Survey 2025 & 2026 | High |
| Labour rate inflation — engine segment | 6.9% (2024A) / 6.7% (2025P); 5.5–6.0% settled 2025 vs ~3.0% pre-pandemic | 2024–25 | same | High |
| Next-gen NB engine shop cost overruns | two-thirds of respondents: **>21% over expectation**; a quarter: **>50% over** | 2025 | Oliver Wyman Apr-2026 | High |

---

## 9. Component removal and installation cost

**This is the thinnest item in the request, and I want to be blunt about it: there is no credible public figure for the standalone labour cost of an engine change, a landing gear change, or an APU change on a commercial narrowbody or widebody.** Engine R&I is folded into line-maintenance budgets, FHA rates, or shop visit totals in every public source I examined, and OEM labour allowance guidebooks that give R&I man-hours exist only for piston/GA engines. I searched Aircraft Commerce, Ackert's papers, SEC-filed lease agreements, Oliver Wyman, IATA MCX and Aviation Week. Do not let a model invent this number.

What *is* public and adjacent:

| Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|
| **Landing gear exchange fee** (the commercial substitute for a gear change — repair centre swaps the timed-out unit for a zero-timed one) | **NB $40–80K; WB $150–250K**, added on top of overhaul cost | 2018 | [Ackert Handbook §5-II-d](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| A320 "landing gear exchange and repair" reserve, cycle basis | $19 per FC | 2006 | [*AC* Issue 44](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf) | High for 2006 |
| Landing gear change downtime | 35–45 days NB; 55–65 days WB | 2018 | Ackert Handbook §4-I-ii | High |
| APU change downtime | 30–60 days | 2018 | Ackert Handbook §4-I-iii | High |
| Engine shop visit downtime (incl. R&I) | 90–120 days | 2018 | Ackert Handbook §4-I-iv | High |
| Current narrowbody engine shop TAT | 180–200+ days; >half of MROs expect no improvement within 3 years | 2025 | [Oliver Wyman Apr-2026](https://www.oliverwyman.com/our-expertise/insights/2026/apr/aviation-mro-labor-and-material-supply-chain-paradigm.html) | High |
| What an engine change physically involves (scoping cost) | A "powerplant" = bare engine + **QEC kit** (starters & starter valves, hydraulic pumps, IDGs, anti-ice valves and ducts). Published PR costs **exclude** QEC, LRU and accessory repair/replacement | 2018 | Ackert Handbook §2-V and App. A assumptions | High |
| Base vs line labour rates (for building an R&I estimate from man-hours) | $50/MH base; $70/MH line — 2006 basis, inflate at the 2024–25 labour rates above | 2006 | *AC* Issue 44 | Medium (dated) |

**Recommendation:** build engine change as `man-hours × labour rate + QEC/consumables`, declare the man-hour count as a modelling assumption, and keep it separate from the shop visit cost so it is auditable. The published PR costs explicitly exclude it, so adding a separate line is correct, not double-counting.

---

## 10. Typical utilisation

| Profile | Figure | Value | Year | Source | Confidence |
|---|---|---|---|---|---|
| **(a) Short-haul high-frequency NB** | Ryanair: daily flight-hour utilisation **9.57 h**; 1,109,300 sectors; 613 aircraft; avg sector 783 miles | → **~291 FH/month, ~151 FC/month, 1.93 FH/FC** | FY ending 31 Mar 2025 | [Ryanair 20-F FY2025](https://www.sec.gov/Archives/edgar/data/1038683/000155837025007966/tmb-20250331x20f.htm) | High (FH/FC derived from stated totals) |
| (a) cross-check, US NB <165k lbs MTOW | 8.6 block h/day; 1.975 BH/departure | → **~262 BH/month, ~133 FC/month, 1.98 BH/FC** | YE Jun 2023 | [FAA Economic Values §3, from BTS T2](https://www.faa.gov/regulations_policies/policy_guidance/benefit_cost/econ-value-section-3-capacity.pdf) | High |
| **(b) Mixed NB (A320/737-800/900 class)** | US NB ≥165k lbs MTOW: 9.9 block h/day; 2.813 BH/departure | → **~301 BH/month, ~107 FC/month, 2.81 BH/FC** | YE Jun 2023 | FAA / BTS T2 | High |
| (b) cross-check, global all-fleet | 2,853 FH/aircraft/yr; 1,284 FC/aircraft/yr; 7.82 h/day | → **238 FH/month, 107 FC/month, 2.22 FH/FC** | 2024 | [IATA MCX FY2024, citing Cirium](https://www.iata.org/contentassets/bf8ca67c8bcd4358b3d004b0d6d0916f/fy2024-mcx-report_public.pdf) | High |
| (b) cross-check, MCX airline panel | 9.06 FH/day | → ~276 FH/month | FY2024 | IATA MCX FY2024 | High |
| **(c) Long-haul WB, 787/A350 class** | US WB <580k lbs MTOW: **11.5 block h/day**; 7.898 BH/departure | → **~350 BH/month, ~44 FC/month, 7.90 BH/FC** | YE Jun 2023 | FAA / BTS T2 | High |
| **(c) Long-haul WB, 777-300ER/A380 class** | US WB ≥580k lbs MTOW: **10.6 block h/day**; 7.994 BH/departure | → **~322 BH/month, ~40 FC/month, 7.99 BH/FC** | YE Jun 2023 | FAA / BTS T2 | High |
| (c) cross-check, ULH operator | Emirates A380: **~350 FH/month** per aircraft; **FH:FC 7.3:1** | → ~48 FC/month | 2019 / early 2020 | [IBA, "Utilisation changes in the Emirates fleet"](https://www.iba.aero/resources/articles/utilisation-changes-in-the-emirates-fleet-and-does-this-signify-the-demise-of-the-a380/) | High |
| (c) cross-check, Asian WB network carrier | Cathay Pacific overall fleet: **11.3 h/day** (2025), up from 9.4 (2024) | → ~344 h/month | 2025 | [Cathay Pacific 2025 annual results](https://www.cathaypacific.com/content/dam/cx/about-us/investor-relations/announcements/en/2025-cx-annual-results-en.pdf) | High |
| Appraiser modelling conventions — flight leg by type | **2.0 FH/FC** narrowbody; **5.0** A330/777-200-gen; **7.0** 787 / A350 / 777-300ER / GE90 | 2018 | [Ackert Handbook App. A](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf) | High |
| Lease convention — assumed NB ratio | **2.5:1 FH:FC**, 10% derate, benign environment | 2026 | [GCA/UMB A320 lease Sch. 5](https://www.sec.gov/Archives/edgar/data/1846084/000119312526348692/jetmf-ex10_3.htm) | High |
| A320 appraisal scenarios (shows the realistic NB spread) | 3,000 FH / 1,000 FC per year (3.0 FH/FC) **vs** 3,500 FH / 1,750 FC (2.0 FH/FC) — same vintage, Δ$3.3M in maintenance-adjusted value | 2020 | [Ackert / ISTAT](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf) | High |
| A320 landing-gear limiter sensitivity to cyclic utilisation | At 3,500 FH/yr: 1,500 FC → calendar-limited at 120 mo, $3,500/mo; 2,000 FC → 120 mo, $3,500/mo; 2,500 FC → **cycle-limited at 96 mo, $4,375/mo**; 3,000 FC → **80 mo, $5,250/mo** | 2018 | Ackert Handbook Fig. 63 | High |
| 2024 fleet context | Narrowbody parked 12%, widebody 13%; aircraft lead times a record 5.3 years; carriers "maximising fleet utilisation, achieving record daily usage" | 2024 | IATA MCX FY2024 | High |

**Caveat to carry through:** FAA/BTS figures are **block hours** (ramp-to-ramp); Ryanair reports **flight hours**; Ackert's engine tables are in **engine flight hours**. Block > flight hours by roughly 5–8% on short-haul. Mixing them without conversion will quietly bias any $/FH computation.

---

## Sensitivity: what matters and what does not

### Dominant — get these right or the model is wrong

1. **Engine performance restoration cost and time-on-wing, jointly.** Engines are **>80% of A320-200 total DMC and >90% of 777-300ER**, and PR alone is 35–40% of DMC. More importantly, the output is a *ratio* — cost ÷ interval — so an error in either term propagates fully. The published spread is wide and real: the same A320 engine class runs 9,000–17,500 FC of on-wing life depending on thrust, maturity, derate and environment, a near-2× range, against a cost range of only $3.2–4.4M. **Interval variance dominates cost variance.** If you can only calibrate one thing carefully, calibrate TOW.

2. **Engine LLP stack cost, and the flight-hour-to-cycle ratio that consumes it.** LLP is 50–55% of total DMC — larger than performance restoration. It is hard-time, per-cycle, and 100% material at OEM list price escalating 5–8%/yr. And it is the single most utilisation-sensitive line in the whole model: a long-haul engine may never replace LLPs in its life, a short-haul engine two or three times. Get the FH:FC ratio wrong and the LLP accrual is wrong by a multiple, not a margin.

3. **FH:FC ratio / average flight duration.** This is the master variable. The executed 2026 lease grid proves it: the *same* V2500 engine carries a reserve of **$722.52/FH below 1.0 FH:FC and $184.64/FH above 4.0** — a **3.9× swing** driven purely by flight length. Nothing else in this document has that leverage. Model utilisation as a joint (FH, FC) pair, never as hours alone.

4. **Maintenance status / position in the saw-tooth cycle.** Two same-type, same-vintage A320s differing only in utilisation history showed a **$3.3M swing on a $20.8M half-life value** — about 16% of aircraft value. For leasing economics this *is* the answer, not a refinement.

5. **Cost vintage and escalation.** Most of the best public data is 2018 USD. With engine material inflation at 7.7% actual in 2024, LLP escalation at 5–8%/yr, engine labour at ~6.9%, and next-gen NB shop costs running 21–50% over expectation, a 2018 figure used as a 2026 figure understates by roughly 45–70% on engine events. **This is a larger error than almost any cross-engine or cross-workscope distinction in the dataset.** Encode escalation explicitly with a base year.

6. **Narrowbody vs widebody split.** Order-of-magnitude, not nuance: total maintenance event value is **$17.7–19.2M for an A320-200 vs $60.4–75.8M for a 777-300ER**. WBs are 20.3% of the fleet and 42% of MRO spend. Any mis-assignment of body class swamps everything downstream.

7. **Derate and operating environment.** −21% on engine reserve from 0% to 10% derate in the executed lease. Harsh-high environment: cost +13% *and* TOW −36%, which together take $/FH from $120 to $213 — a **78% increase** on the same engine. Practitioners will immediately notice a dataset where Gulf and northern-European operators have identical engine costs.

8. **First-run vs mature-run phase.** Mature-run engines cost 3–25% more per visit *and* come off wing 20–30% sooner. In reserve terms, A320 PR goes from $92/FH first-run to $154/FH mature-run — **+67%**. A model with a single flat engine rate across an asset's life is not credible.

### Second order — materially affects the answer but will not break it

9. **Airframe heavy checks.** Only 4–6% of DMC, and falling (airframe share of global MRO dropped 26%→17% from 2019 to 2024). The NB range is narrow ($625K–1.05M across the whole A320/737NG family), so even a sloppy value stays roughly right. Widebody matters more in absolute terms ($2.4–4.4M) but is still single-digit percent.

10. **Landing gear.** 2–3% of DMC. Hard-time and fully recapitalising, so it is easy to model correctly. The one subtlety worth including is the **limiter switch**: below ~2,000 FC/yr it is calendar-limited and the monthly reserve is flat; above that it becomes cycle-limited and the reserve rises steeply ($3,500 → $5,250/month from 1,500 to 3,000 FC/yr). Nice realism, low stakes.

11. **APU.** 1–2% of DMC. Wide published ranges, driven by APU hours rather than aircraft hours — which means it needs its own utilisation driver, and APU-hours-per-flight-hour varies enormously by operator and climate. Worth a separate variable; not worth agonising over the cost.

12. **Thrust reversers.** 8–10 year interval, $275–375K NB / $500–750K WB. Ackert notes these are "often difficult to include." Reasonable to omit from a narrowbody model entirely; include for widebody, where they run $14,000–17,700 per reverser per month.

13. **End-of-lease compensation.** High variance, low predictability — the regime shift matters far more than the rate. Model it as lumpy and conditional (ALC: $60M one quarter, $6M the next), anchored on reserve rates as the negotiating proxy, with a single published per-aircraft benchmark (~$6.7M for one 737-800, Sun Country 2025) as the scale check.

### Barely matters

14. **Individual LLP piece-part prices, including the HPT disc.** Only the **stack total** and the **binding (shortest) life limit** affect cash flows, because LLPs are replaced in groups at shop visits and the engine comes off when the shortest-lifed part expires. Resolving a single disc price to the dollar changes nothing — which is fortunate, because as noted in §2 there is no credible public figure for one.

15. **Workscope tier granularity beyond two levels.** The three WPG tiers describe *modules*, not engines; a real shop visit mixes tiers across modules (minimum fan, performance core, minimum LPT). The economically meaningful distinction is binary: **build-for-interval** ($5.0M, 20,000 FC goal) vs **build-for-cash** ($3.5M, 8,000 FC goal). A three-tier engine-level price list is false precision.

16. **Component removal and installation labour.** Rounding error against a $3–12M shop visit — and, per §9, not publicly sourced anyway. Leave it as a declared assumption. The genuinely consequential cost of an engine change is not the labour; it is the **180–200 day shop TAT** and the spare-engine cover it forces.

17. **C-check cost precision.** $90K–143K per light C-check on a narrowbody, against a $17.7M lifetime maintenance bill. Model the *cycle* total ($3.3–3.9M over 8 checks) rather than individual checks.

18. **Wheels, tyres and brakes.** $88/FC combined on an A320 against $180/FC for all heavy components. Consumable-like, smooth, uninteresting. Fold into a flat per-cycle line.

### One modelling check worth running

Whatever you build, reconcile it against the IATA MCX FY2024 panel: **$1,522 per flight hour, $3,758 per flight cycle, $5.05M per aircraft per year** across 28 airlines and 2,703 aircraft at 9.06 hours/day and 10.6 years average age. If a synthetic fleet's aggregate maintenance cost lands far outside that envelope once mix-adjusted, the error is in one of items 1–8 above, not in items 14–18.

---

### Sources

- [Ackert, S. — *Aircraft Maintenance Handbook for Financiers*, 1st Ed., Aircraft Monitor, 2018](http://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/aircraft_mx_handbook_for_financiers_v1.pdf)
- [Ackert, S. — *Aircraft Maintenance Implications During Uncertainty*, ISTAT Learning Lab, Oct 2020](https://www.istat.org/Portals/0/Ackert_ISTAT_LearningLab_pdf.pdf)
- [Ackert, S. — *The Relationship between an Aircraft's Value and its Maintenance Status*, Apr 2011](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/the_relationship_between_an_aicrafts_value__its_maintenance_status___v1.pdf)
- [Ackert, S. — *Engine Maintenance Concepts for Financiers* v2, Sep 2011](https://www.aircraftmonitor.com/uploads/1/5/9/9/15993320/engine_mx_concepts_for_financiers___v2.pdf)
- [Aircraft Monitor — reports index](https://www.aircraftmonitor.com/reports.html)
- [*Aircraft Commerce* Issue 127, Dec 2019/Jan 2020 — "The in-service performance of the Trent XWB"](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/General%20Articles/2019/127_MTCE_B.pdf)
- [*Aircraft Commerce* Issue 34, Apr/May 2004 — management of disk and shaft LLPs](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Maintenance/2004/ISSUE%2034-MTCE.pdf)
- [*Aircraft Commerce* Issue 44, Feb/Mar 2006 — A320 family maintenance analysis & budget](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Aircraft%20guides/A320%20FAMILY/ISSUE%2044-A320%20MTCE.pdf)
- [*Aircraft Commerce* Issue 122, 2019 — GEnx and Trent 1000 families](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/General%20Articles/2019/122_MTCE_A.pdf)
- [*Aircraft Commerce* Issue 112, Jun/Jul 2017 — widebody engine analysis](https://www.ajw-group.com/storage/downloads/1502365548_widebody_engine_analysis.aircraft_commerce.pdf)
- [*Aircraft Commerce* Issue 28, 2003 — CFM56-5B/-7 and V2500 maintenance cost analysis](https://www.aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs1/Maintenance/2003/ISSUE%2028-MTCE-B.pdf)
- [Global Crossing Airlines / UMB Bank (Castlelake-serviced) A320-233 operating lease, EX-10.3, 6 Mar 2026](https://www.sec.gov/Archives/edgar/data/1846084/000119312526348692/jetmf-ex10_3.htm)
- [Sun Country Airlines 10-Q, Q2 2025](https://www.sec.gov/Archives/edgar/data/1743907/000174390725000029/sncy-20250630.htm)
- [Air Lease Corporation Q4 2024 earnings call transcript (8-K)](https://www.sec.gov/Archives/edgar/data/1487712/000162828025005682/ex-991transcriptq424.htm)
- [Ryanair Holdings plc Form 20-F, FY ended 31 Mar 2025](https://www.sec.gov/Archives/edgar/data/1038683/000155837025007966/tmb-20250331x20f.htm)
- [LATAM Airlines Group 20-F 2021, form of A321-200 operating lease (EX-4.31)](https://www.sec.gov/Archives/edgar/data/1047716/000121390022015962/f20f2021ex4-31_latamair.htm)
- [IATA — Maintenance Cost data eXchange (MCX) FY2024 Executive Report, public version](https://www.iata.org/contentassets/bf8ca67c8bcd4358b3d004b0d6d0916f/fy2024-mcx-report_public.pdf)
- [IATA — MCX programme](https://www.iata.org/mcx)
- [FAA — *Economic Values for FAA Investment and Regulatory Decisions*, Section 3: Aircraft Capacity and Utilization (BTS T2, YE June 2023)](https://www.faa.gov/regulations_policies/policy_guidance/benefit_cost/econ-value-section-3-capacity.pdf)
- [Oliver Wyman — *MRO Survey 2025*](https://www.aarcorp.com/globalassets/6.-careers/students/reports/mro-survey-2025.pdf)
- [Oliver Wyman — MRO supply chain shifts: labor, materials and AI trends, Apr 2026](https://www.oliverwyman.com/our-expertise/insights/2026/apr/aviation-mro-labor-and-material-supply-chain-paradigm.html)
- [Oliver Wyman — Aviation MRO In Demand Amid Supply And Labor Constraints, 2025](https://www.oliverwyman.com/our-expertise/insights/2025/apr/mro-industry-sees-growth-amid-supply-and-labor-pressure.html)
- [IBA — Engine and Lease Rate Update, H2 2026](https://www.iba.aero/resources/articles/iba-engine-and-lease-rate-update-h2-2026/)
- [IBA — Utilisation changes in the Emirates fleet](https://www.iba.aero/resources/articles/utilisation-changes-in-the-emirates-fleet-and-does-this-signify-the-demise-of-the-a380/)
- [Aviation Week — Data Tool: The Future Of LEAP Engine Aftermarket](https://aviationweek.com/mro/aircraft-propulsion/data-tool-future-leap-engine-aftermarket)
- [Aviation Week — 2025 Commercial Fleet & MRO Market Summary Report](https://aviationweek.com/sites/default/files/2024-11/2025%20Commercial%20Fleet%20and%20MRO%20Market%20Summary%20Report.pdf)
- [Aviation Week — IBA predicts 40% increase in shop visits from 2024 to 2025](https://aviationweek.com/mro/iba-predicts-40-cent-increase-shop-visits-2024-2025)
- [Aviation Week — Widebody Comeback Drives New Engine Life-Cycle Strategies](https://aviationweek.com/mro/aircraft-propulsion/widebody-comeback-drives-new-engine-life-cycle-strategies)
- [ISTAT — Kane Ray (Aviation Values), New Tech Aircraft Engines, Aug 2023](https://www.istat.org/Portals/0/ISTAT%20Online/New%20Tech%20Aircraft%20Engines_Kane%20Ray_8.1.23.pdf)
- [Aircraft Value News — Engine LLP pricing continues to rise – $4m for CFM56-7](https://www.aircraftvaluenews.com/engine-life-limited-parts-pricing-continues-to-rise-4m-for-cfm56-7/) *(paywalled body; headline figure only)*
- [Cathay Pacific — 2025 Annual Results](https://www.cathaypacific.com/content/dam/cx/about-us/investor-relations/announcements/en/2025-cx-annual-results-en.pdf)
- [Lufthansa Technik — world-first LEAP-1A performance restoration shop visit](https://www.laranews.net/lufthansa-technik-carries-out-world-first-performance-restoration-shop-visit-of-leap-1a-engine/)
- [StandardAero — completes first CFM LEAP-1A PRSV, Feb 2026](https://www.businesswire.com/news/home/20260203818787/en/StandardAero-Completes-First-CFM-LEAP-1A-PRSV)

**Excluded on credibility grounds:** safefly.aero's "Engine Shop Visit Costs Worldwide 2026", "2026 Jet Engine Cost Crisis" white paper and related pages, and aviationtitans.com's "D-Check Guide ($5M–$10M)". These rank well on the relevant queries and carry confident-looking figures, but are unattributed marketing content with no stated methodology or data source. If a figure from them matches something above it adds nothing; where it does not, it should not be trusted.