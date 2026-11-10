# ChassisIQ (React port of the POC)

Frontend-only React 18 + Vite + TypeScript port of `chassisiq-handoff/reference-poc/ChassisIQ_POC.html`.
See `chassisiq-handoff/HANDOFF.md` for the spec.

```bash
pnpm install
pnpm dev          # http://localhost:5173 (mock API, default)
pnpm test         # Vitest: engine check values, mock API (403s, workflow), simulation preset
pnpm build        # typecheck + production build to dist/
VITE_API_MODE=http VITE_API_BASE_URL=http://localhost:4000 pnpm dev   # use the REST client instead
```

- `src/domain/` — types, seed data, pure costing engine, permissions
- `src/api/` — `ApiClient` contract, mock backend (localStorage key `chassisiq-poc-v1`), HTTP stub, request inspector
- `src/components/`, `src/features/` — shell and screens; charts are hand-rolled SVG
