Read HANDOFF.md first, then open reference-poc/ChassisIQ_POC.html and the files in reference-poc/src/ and screenshots/. That POC is the source of truth for behaviour, numbers and look.

Task: port the ChassisIQ POC into this repo as a React 18 + Vite + TypeScript app, frontend only, using the folder structure in HANDOFF.md.

Rules:
- Re-platform, don't redesign. Port styles.css as the global stylesheet and keep every screen, label, flow and role rule from the POC.
- No real backend. Put all data access behind an ApiClient interface (src/api/client.ts). Implement mockClient.ts from api.js: in-memory DB, localStorage persistence, 180–600 ms latency, 403 for forbidden roles, and a request log for the API pill. Add an httpClient.ts stub for the REST contract in HANDOFF.md, selected by VITE_API_MODE=mock|http (default mock).
- Move the seed data to domain/seed.ts and the costing engine to domain/engine.ts as pure, typed functions. Add Vitest tests that check the values in HANDOFF.md: copper landed ₹1,490.52/kg, Voltas ₹29,031/set, Daikin ₹30,148/set, and the Daikin v1→v3 split of +₹2,018 rate effect and −₹128 scope effect.
- Keep the charts as small SVG React components ported from charts.js, including the hover tooltips. No chart or UI libraries.

Work in this order and commit after each step:
1. Scaffold, global CSS, types, seed, engine and tests.
2. API layer: mock, inspector, http stub.
3. Shell: deck, ticker, rate-source switch, user switch, tabs, palette, toasts, API pill, login.
4. Features: requests and spec, then costing workbench, commodities, simulation, SAP BOM, history and customer sheet, library, admin.
5. Run the acceptance checklist in HANDOFF.md end to end and fix anything that differs from the POC.

When done, give me the run commands and list any place the port differs from the POC.
