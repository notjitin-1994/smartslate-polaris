# Smartslate Polaris (React + TypeScript + Vite)

Smartslate Polaris is a React + Vite application for creating AI-assisted L&D discovery starmaps with Supabase auth/storage and a job-based flow. The app ships with lazy-loaded routes, a protected portal, and an async report pipeline with webhooks.

## Features

- Optimized router with lazy loading (`src/router/OptimizedAppRouter.tsx`)
- Supabase Auth and session adoption (`src/contexts/AuthContext.tsx`)
- Job-based Polaris flow and dashboards
- AI-assisted report generation and editing
- Webhook-backed async report jobs and monitoring
- Dev-only API debug overlay

## Quick Start

1) Install
```bash
npm install
```

2) Configure environment
```bash
cp .env.example .env
# Fill Supabase and AI provider keys. See env.example for all options.
```

3) Run
```bash
npm run dev
```

4) Build
```bash
npm run build && npm run preview
```

## Key Routes

- Public: `/login`, `/auth/callback`, `/pricing`, `/:username`, `/report/public/:id`
- Dev only: `/dev/debug`, `/dev/card-comparison`
- Portal (protected): `/` with nested
  - `discover` (new starmap)
  - `starmaps` and `starmap/:id`
  - `polaris/jobs`, `polaris/new`, `polaris/job/:jobId`, `polaris/job/:jobId/resume`
  - `discover/new` (Polaris Nova)

See `src/router/OptimizedAppRouter.tsx` for the exact definitions.

## Environment

Edit `.env` using `env.example` as reference. Important keys:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_LLM_PROVIDER` and related provider keys (Anthropic/OpenAI/Perplexity)
- Webhook settings: `WEBHOOK_SECRET`, `WEBHOOK_BASE_URL`

## Documentation

- Start here: `docs/README.md`
- Quick start: `docs/getting-started/QUICK_START_GUIDE.md`
- Architecture: `docs/architecture/`
- Features: `docs/features/`
- Troubleshooting: `docs/troubleshooting/`
- Testing: `docs/testing/WEBHOOK_TESTING_GUIDE.md`
- Refactoring guide: `docs/REFACTORING_GUIDE.md`
- Styling: `docs/STYLING_GUIDE.md`

## Scripts

- `npm run dev` – start dev server
- `npm run build` – typecheck and build
- `npm run preview` – preview production build
- `npm run lint` – run ESLint

## Notes

- Core functionality, API routes, and AI services live in `api/` and `src/services/` and were not altered by cleanup.
- Dev-only API debug overlay is auto-enabled in development.
