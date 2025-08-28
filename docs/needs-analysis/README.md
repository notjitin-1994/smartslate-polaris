# Needs Analysis Feature

## Overview
The Needs Analysis feature is a comprehensive tool for Learning & Development professionals to conduct training needs assessments. It guides users through a structured process from initial business problem identification to final training recommendations and budget estimates.

## Quick Start

### 1. Enable the Feature
Add to your `.env` file:
```bash
VITE_NEEDS_ANALYSIS_ENABLED=true
```

### 2. Run Database Migration
Execute the migration script in Supabase:
- Navigate to SQL Editor in Supabase Dashboard
- Copy contents from `src/features/needs-analysis/migrations/001_needs_analysis_init.sql`
- Run the script

### 3. Access the Feature
- Start the dev server: `npm run dev`
- Navigate to the portal dashboard
- Click on "Needs Analysis" card

## Architecture

### Directory Structure
```
src/features/needs-analysis/
├── components/           # UI components
│   ├── FeatureGate.tsx  # Feature flag wrapper
│   ├── NeedsWizard/     # Intake wizard components
│   ├── Diagnostic/      # Diagnostic flow (placeholder)
│   ├── Recommendation/  # Recommendation view (placeholder)
│   └── Report/          # Report viewer (placeholder)
├── pages/               # Route pages
│   └── NeedsAnalysisDashboard.tsx
├── services/            # Business logic
│   ├── needsAnalysisService.ts    # Database operations
│   ├── estimatorService.ts        # Calculation logic
│   └── api/
│       └── needsAnalysisApi.ts    # Frontend API client
├── types/               # TypeScript definitions
│   ├── database.types.ts
│   └── index.ts
├── utils/               # Utilities
│   └── featureFlag.ts
└── migrations/          # Database migrations
    └── 001_needs_analysis_init.sql
```

### Key Technologies
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **API**: Vercel Serverless Functions
- **Build**: Vite

## Features

### Current Implementation
1. **Project Management**
   - Create, list, update, delete projects
   - Track project status lifecycle

2. **Intake Wizard**
   - 4-step guided process
   - Auto-save functionality
   - Progress tracking

3. **Data Collection**
   - Business context and goals
   - Stakeholder identification
   - Audience analysis
   - Project constraints

4. **Feature Flag System**
   - Environment-based toggling
   - Development mode override
   - Graceful feature hiding

### Planned Features
1. **Diagnostic Assessment**
   - Root cause analysis
   - Performance gap calculation
   - Training vs non-training decision

2. **AI Recommendations**
   - Modality selection
   - Blended learning design
   - Automated estimation

3. **Report Generation**
   - Executive summary
   - Detailed findings
   - PDF/Word export
   - Approval workflow

## API Reference

See [API Documentation](./api.md) for detailed endpoint information.

### Key Endpoints
- `GET /api/needs/projects` - List projects
- `POST /api/needs/projects` - Create project
- `GET /api/needs/projects/:id` - Get project details
- `POST /api/needs/projects/:id/analyze` - Run diagnostic
- `GET /api/needs/projects/:id/report` - Get report

## Database Schema

See [Data Model Documentation](./data-model.md) for complete schema.

### Core Tables
- `needs_projects` - Main project entity
- `needs_stakeholders` - Project stakeholders
- `needs_audiences` - Target learner groups
- `needs_recommendations` - Generated recommendations
- `needs_estimates` - Cost/time projections

## Development

### Local Development
```bash
# Install dependencies
npm install

# Set up environment
cp env.example .env
# Add your Supabase credentials and set VITE_NEEDS_ANALYSIS_ENABLED=true

# Run migrations in Supabase

# Start dev server
npm run dev
```

### Adding New Features
1. Create components in appropriate directories
2. Add types to `types/` directory
3. Update service layer as needed
4. Add routes to router
5. Document changes

### Testing
```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check
```

## Deployment

### Environment Variables
Required for production:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
VITE_NEEDS_ANALYSIS_ENABLED=true
```

### Database Setup
1. Run migration script in production Supabase
2. Verify RLS policies are active
3. Test with a non-admin user

### Feature Toggle
- Set `VITE_NEEDS_ANALYSIS_ENABLED=false` to hide feature
- No code deployment needed to enable/disable

## Troubleshooting

### Feature Not Visible
- Check `VITE_NEEDS_ANALYSIS_ENABLED` is set to `true`
- Verify you're logged in
- Check browser console for errors

### Database Errors
- Ensure migrations have been run
- Check RLS policies are not blocking access
- Verify Supabase credentials are correct

### API Errors
- Check authentication token is valid
- Verify CORS settings for production
- Check API endpoint URLs

## Contributing

### Code Style
- Follow existing TypeScript patterns
- Use Tailwind CSS for styling
- Keep components focused and reusable

### Pull Request Process
1. Create feature branch from `trial`
2. Implement changes
3. Update documentation
4. Submit PR with checklist

### Future Enhancements
- Email notifications
- Multi-language support
- Advanced analytics
- Integration with LMS
- Collaborative features

## Support

For issues or questions:
1. Check existing documentation
2. Review error messages
3. Check Supabase logs
4. Create detailed issue report
