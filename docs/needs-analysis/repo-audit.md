# SmartSlate Polaris Repository Audit

## Overview
This document provides a comprehensive audit of the SmartSlate Polaris repository structure, technology stack, and conventions.

## Technology Stack

### Frontend Framework
- **React 19.1.1** with TypeScript
- **Vite 7.1.2** as build tool and dev server
- **React Router DOM 7.8.1** for routing

### Styling
- **Tailwind CSS 3.4.17** for utility-first CSS
- **PostCSS** with Autoprefixer
- **Framer Motion 12.23.12** for animations

### Database & Backend
- **Supabase** (PostgreSQL) as primary database
- Service uses `@supabase/supabase-js` v2.56.0
- Authentication integrated with Supabase Auth
- Google OAuth configured

### AI/LLM Integration
- **Anthropic Claude** (primary, claude-3-5-sonnet-latest)
- **OpenAI** (gpt-4o-mini)
- **Perplexity** for research capabilities
- Proxied through Vite dev server to avoid CORS

### Build & Development Tools
- **TypeScript 5.8.3**
- **ESLint 9.33.0** with React hooks and refresh plugins
- **Package Manager**: npm (package-lock.json present)
- **Node.js**: Engine requirement ^20

### Additional Libraries
- **docx 9.5.1** - Document generation
- **jspdf 3.0.1** & **html2canvas 1.4.1** - PDF generation
- **date-fns 3.0.0** - Date utilities
- **recharts 3.1.2** - Data visualization

## Project Structure

```
/src
├── components/        # Reusable UI components
├── contexts/         # React contexts (AuthContext)
├── features/         # Feature modules
│   ├── auth/        # Authentication feature
│   └── polaris/     # Polaris wizard feature
├── hooks/           # Custom React hooks
├── lib/             # Utilities and client setup
├── pages/           # Route components
├── polaris/         # Polaris-specific modules
│   └── needs-analysis/  # Existing needs analysis code
├── portal/          # Portal/dashboard features
├── router/          # Routing configuration
├── routes/          # Route path definitions
├── services/        # API and service layer
├── styles/          # Global styles
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Key Conventions

### Code Organization
- Feature-based organization with dedicated folders
- Lazy loading for route components
- Index exports for cleaner imports
- Separation of concerns (components, services, types)

### TypeScript Configuration
- Modular config with app and node configs
- Path alias: `@/` → `./src/`
- Strict type checking enabled

### Environment Variables
- Client-side: `VITE_` prefix
- Server-side: Standard names (no prefix)
- Configuration via `src/config/env.ts`

### Routing
- Centralized path definitions in `src/routes/paths.ts`
- Protected routes via `ProtectedRoute` component
- Lazy loading with custom `withLazyLoad` wrapper

### State Management
- Context API for auth state
- Local component state
- Supabase for persistent data

### API Design
- Vercel-style serverless functions in `/api`
- Local dev middleware for API routes
- Service layer abstraction in `/src/services`

### Authentication
- Supabase Auth integration
- Google OAuth support
- Protected route handling
- User profiles in database

### UI/UX Patterns
- Small screen gate (800px minimum)
- Loading states with lazy loading
- Error boundaries
- Breadcrumb navigation (dev only)

### Build Optimization
- Code splitting with manual chunks
- Asset optimization
- Source maps in development
- HMR optimizations

## Security & Best Practices
- Environment variables for secrets
- CORS handling in dev proxy
- Auth token management via Supabase
- Protected API routes

## Testing Strategy
- No test framework currently configured
- Would need to add Vitest or Jest

## CI/CD
- Vercel deployment configuration present
- No CI workflows visible in repo

## Database Schema
- Managed through Supabase
- Types generated in `src/types/database.types.ts`
- Tables include: profiles, polaris_summaries, starmap_jobs, report_jobs

## Feature Flags
- No formal feature flag system
- Environment-based feature toggling possible
- Recommendation: Implement proper feature flags for needs analysis

## Accessibility
- No specific a11y tooling configured
- Manual implementation required

## Internationalization
- No i18n framework present
- English-only currently

## Performance Monitoring
- Custom performance hooks present
- No APM integration visible

## Error Handling
- Custom error classes in `lib/errors.ts`
- Error boundaries for React components
- Service-level error handling
