# ChassisIQ: handoff spec for porting the POC into the codebase

ChassisIQ is a cost and specification studio for Amber Enterprises' room-AC business. A brand (Daikin, Voltas, LG…) sends a spec request. Team leads allocate it to R&D, R&D fills the spec sheet, a lead approves it, and Costing prices it. The price is chassis base cost (common parts, ~80% of parts) plus brand-exclusive parts, re-priced from commodity rates (copper, aluminium, steel, resin, compressor, refrigerant, USD/INR). Every quote is saved as a version and can be traced years later. A trimmed customer sheet is emailed from the system.

The working POC is `reference-poc/ChassisIQ_POC.html` (open it in Chrome). Its source is in `reference-poc/src/`. Screens are in `screenshots/`. **The port must match the POC's behaviour and look; it is a re-platform, not a redesign.**

## Scope of this phase

- Frontend only, with a **mock API layer**. Do not build the Express/Postgres backend yet.
- Structure the code so a real HTTP API can replace the mock later by switching one environment variable.
- All seed data stays as-is (it is labelled demo data in the UI).

## Recommended stack (PERN-ready)

- React 18 + Vite + TypeScript, React Router (hash or browser routes).
- Plain CSS: port `styles.css` as the global stylesheet (design tokens are CSS variables at the top). No UI kit and no Tailwind, so the look stays identical.
- Charts: keep the hand-rolled SVG chart functions from `charts.js` as React components (waterfall, donut, line, diverging bars, sparkline). No chart library.
- State: React context or Zustand for session (user, rate-source mode). Data comes only through the API layer.
- Fonts: Bricolage Grotesque (display) and Instrument Sans (body), from Google Fonts.

## Target folder structure

```
src/
  main.tsx, App.tsx, routes.tsx
  styles/global.css                 ← from styles.css
  domain/
    types.ts                        ← Commodity, Chassis, BomLine, ExclusivePart, Model, Request, Version, Scenario, AuditEvent, Person, Role
    seed.ts                         ← everything from data.js (COMMODITIES, chassis, lines, EXCLUSIVES, MODELS, PEOPLE, ROLES, SPEC_TEMPLATE, SEED_*)
    engine.ts                       ← landed(), rates(), compute(), engineWeights(), snapshotFrom(), specFor()  (pure functions, unit-tested)
    permissions.ts                  ← role → modules and actions
  api/
    client.ts                       ← interface ApiClient { login, requests, createRequest, allocate, saveSpec, submitSpec, decide, startCosting, chassis, commodities, syncAICM, saveManual, uploadManual, saveVersion, sapBom, sapLpp, saveScenario, sendMail, audit }
    mock/mockClient.ts              ← from api.js: in-memory DB, localStorage persistence, latency 180–600 ms, 403 on wrong role
    mock/db.ts                      ← freshDB(), resetDB()
    http/httpClient.ts              ← stub that calls the REST endpoints below (not used yet)
    index.ts                        ← picks mock or http from VITE_API_MODE
    inspector.ts                    ← request log + busy state for the API pill
  components/  Shell, Ticker, SourceSwitch, RoleSwitch, CommandPalette, Drawer, Toasts, ApiInspector, StatusPill, Avatar, charts/*
  features/
    login/ home/ requests/ spec/ costing/ commodities/ simulation/ bom/ history/ customer/ library/ admin/
```

## Modules and routes

| Route | Screen | Roles |
|---|---|---|
| `/login` | Role picker (5 main users + 4 extra) | all |
| `/home` | Command centre: pipeline, "needs your action", copper exposure (costing only), copper quarterly chart, activity | all |
| `/requests`, `/requests/:id` | List with filters; detail with 7-step flow, role-specific action panel, timeline, spec change log; "Log a customer request" drawer | all |
| `/spec`, `/spec/:id` | 72-row spec sheet; editable only by the assigned R&D engineer while status is RND/ALLOCATED/RETURNED; changed fields highlighted; internal costing section visible to Costing only | lead, rnd, costing |
| `/costing`, `/costing/:id` | Queue; workbench: hero total + delta vs last version, clickable unit drawing (filters parts), waterfall, common parts table, exclusive parts add/remove/edit price, overheads with capped contingency, rates used, weight donut, LPP vs SAP average toggle, previous versions, save-version drawer | costing |
| `/commodities` | Commodity master. AICM mode: spot, Q1, Q2, Q3 avg (used), sync button. Manual mode: editable rates, upload rates sheet, "last quote used" column. Side panel: trend chart + landed-cost working per commodity | costing |
| `/simulation` | 7 sliders (±30%), presets (copper to ₹1,700/kg landed, rupee −3%, metals −8%, compressor +10%), model selection, baseline vs scenario table, annual impact, per-commodity diverging bars, saved scenarios | costing |
| `/bom` | Model code → animated 5-step SAP fetch → KPIs, BOM breakup with SAP moving average vs LPP and gap, material roll-up donut | costing |
| `/history`, `/history/:verId` | Searchable versions; pick one to see details, pick two to compare (rate effect vs scope effect, rate table, parts added/removed) | costing |
| `/customer/:verId` | Customer view (55 rows) vs internal view (72 rows); email compose; send from system | costing |
| `/library`, `/library/:modelId` | Customer → series → model tree with search; model card with quote trend (costing only) and requests | all |
| `/admin` | Users, permissions matrix, audit trail, reset demo data | admin |

Global: top deck with brand, Ctrl/Cmd+K command palette, **AICM linked / Manual** rate-source switch, user switcher, scrolling commodity ticker, module tabs (locked tabs show a padlock and a "restricted" page), toasts, API pill + request log, demo banner.

## Workflow (status machine)

`NEW → (lead allocates) RND → (R&D submits) SUBMITTED → (lead approves) APPROVED | (lead returns, note required) RETURNED → RND …`
`APPROVED → (costing opens workbench) COSTING → (save version) COSTED → (send email) SENT`

Every transition appends to the request `hist` and to the global audit log, with who and when.

## Costing engine (must produce the same numbers as the POC)

Rates snapshot: AICM mode uses each commodity's `q3` (last-quarter average, used to quote next quarter). Manual mode uses `DB.manual`.

Landed cost per commodity:
- LME (copper, aluminium): `idx × FX / 1000 × (1 + premium) + conversion` → ₹/kg
- Domestic steel: `(HRC + CRC spread) / 1000 + freight` → ₹/kg
- Polymer: `styrene monomer × FX / 1000 + compounding` → ₹/kg
- Import (compressor, HSN 8414 30 00): `CIF×FX + BCD 15% + AIDC 2.25% + SWS 10% on (BCD+AIDC) + clearing 1.5%`. IGST 18% is shown but **not** costed (input credit).
- Flat (refrigerant): supplier rate.

Line cost:
- Material line: `kg × chassis scale × (1 + scrap) × landed rate + process cost`
- Compressor: `landed × chassis compressor factor`
- Bought-out: LPP (or the SAP moving average when toggled), scaled by chassis

Totals:
- `material = common + exclusive` (exclusive credits are negative)
- `cost = material + assembly (₹420 + ₹610) + freight 1.2% + warranty 2% + contingency`, where `contingency = min(₹1,00,000 ÷ lot 2,500, 0.6% × material)`
- `quote = cost × 1.08`

Seed check values (AICM mode, Q3 snapshot):
- Copper landed ₹1,490.52/kg
- Voltas VL-183V-3S = ₹29,031/set
- Daikin DK-FTKM18-5S = ₹30,148/set

Write unit tests for these.

## REST contract for the future Express backend (the mock implements the same shapes)

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | sign in |
| GET | /api/requests | list |
| POST | /api/requests | log a request |
| PATCH | /api/requests/:id/allocate | lead only |
| PUT | /api/requests/:id/spec | R&D only; writes the spec log |
| POST | /api/requests/:id/submit | R&D submits the spec |
| POST | /api/requests/:id/approve, /return | lead only; return requires a note |
| POST | /api/costing/:id/start | moves APPROVED → COSTING |
| GET | /api/chassis/:code | chassis master |
| GET | /api/commodities?source=aicm\|manual | commodity master |
| POST | /api/integrations/aicm/sync | refresh from AICM |
| PUT | /api/commodities/manual | save manual rates |
| POST | /api/commodities/manual/upload | rates sheet upload |
| POST | /api/costing/:reqId/versions | freezes snapshot, exclusives, total |
| GET | /api/sap/bom/:modelCode | BOM from SAP |
| GET | /api/sap/lpp?material= | latest purchase prices |
| POST | /api/simulations | save a scenario |
| POST | /api/mail/send | send the customer sheet |
| GET | /api/audit | audit trail |

## Acceptance checklist (run every scenario before calling it done)

1. Rahul logs a request; it appears as NEW with the team-lead badge count.
2. Navdeep allocates to Ritika (default selection); status becomes RND.
3. Ritika edits ISEER; the field highlights; submitting saves the change, logs it and sets SUBMITTED.
4. Navdeep returning without a note is blocked; approving sets APPROVED.
5. Vivek opens the workbench: total, unit drawing zone filter, add/remove exclusive part, edit price, LPP/average toggle all update live.
6. Saving a version freezes the rates; the app routes to the customer sheet; sending validates the email and sets SENT.
7. The AICM/Manual switch changes the totals everywhere; manual edits and upload work; manual mode hides the AICM columns.
8. The simulation copper preset lands at ~₹1,700/kg; the table and bars update; scenarios save and load.
9. SAP BOM fetch animates the 5 steps; an unknown code shows an error toast.
10. History: comparing Daikin v1 with v3 shows rate effect +₹2,018 and scope effect −₹128.
11. Rahul and Ritika cannot open Costing (padlocked tab and restricted page); the mock API returns 403 on forbidden actions.
12. Admin reset restores the seed; Ctrl+K palette navigation works; the API pill logs calls.
13. Responsive down to 390px, visible keyboard focus, reduced motion respected.
