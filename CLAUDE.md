# DQ-Dental-Techniq

## Critical Defaults
- This module has **two modes**: integrated (submodule in DentalQuoteCreator) and standalone (full-stack app)
- Never mix standalone and integrated code paths — keep them in separate directories
- Core types and shared components must remain mode-agnostic
- Preserve the barrel export in `index.ts` — it is the public API for DentalQuoteCreator integration

## Architecture

```
dq-techniq/
├── core/           # Shared types and constants (mode-agnostic)
├── shared/         # Shared UI components (mode-agnostic)
├── integrated/     # DentalQuoteCreator submodule integration
│   ├── api.ts      # API calls via host app's /backend endpoints
│   ├── components/ # PrintableWorksheet (PDF generation)
│   ├── hooks/      # useLabWorkOrders React hook
│   └── pages/      # Full page components (Partners, Orders, Editor)
├── standalone/     # Independent full-stack application
│   ├── backend/    # Express server + Prisma
│   ├── frontend/   # Standalone React UI
│   └── prisma/     # Standalone database schema
└── index.ts        # Barrel export (public API for DentalQuoteCreator)
```

## Key Types (core/types.ts)
- `LabWorkOrderStatus`: draft | sent | in_progress | ready | delivered | accepted | revision | cancelled
- `LabWorkOrderPriority`: normal | urgent
- `LabPartner`: dental lab company (name, contact, tax number)
- `LabWorkOrder`: work order with patient, lab, doctor, items, deadlines, impressions
- `LabWorkOrderItem`: individual item in a work order (tooth, description, quantity, price)

## Integration with DentalQuoteCreator
- Git submodule at: `src/modules/dq-techniq`
- Host app imports via: `import { LabWorkOrdersPage, ... } from '@dq-techniq'` or relative path
- Integrated API calls go to `/backend/lab-partners` and `/backend/lab-work-orders`
- Uses host app's auth context (`getAuthHeaders()`) for API authentication
- Pages receive host app's translation context and theme

## Key Patterns
- **Status workflow**: draft → sent → in_progress → ready → delivered → accepted (or revision/cancelled)
- **Shade system**: VITA Classical (A1-D4) + BL shades
- **Impression tracking**: boolean flags for upper, lower, bite, facebow, photos
- **PDF generation**: `generateWorksheetPdf()` creates printable lab work order sheets

## Standalone Mode
- Has its own `package.json`, `vite.config.ts`, `tsconfig.json` in `standalone/`
- Own Prisma schema in `standalone/prisma/schema.prisma`
- Own Express backend in `standalone/backend/server.ts`
- Docker support via `standalone/docker-compose.yml`
- Run with: `cd standalone && npm run dev`

## Conventions
- Work order IDs: `WO` + sequential number
- Lab partner IDs: `LP` + nanoid
- All monetary values stored as numbers (not strings)
- Currency field supports multi-currency (default: HUF)
- Dates stored as ISO strings
- Soft delete is not used — work orders use status `cancelled` instead

## Scope Control
- Do not add DentalQuoteCreator-specific imports in `core/` or `shared/`
- `integrated/` may import from DentalQuoteCreator's context and utilities
- `standalone/` must be fully self-contained
- New types go in `core/types.ts`, new constants in `core/constants.ts`
- New shared UI components go in `shared/`
