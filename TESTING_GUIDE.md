# Polaris Testing Suite - Quick Start Guide

## Overview

The Polaris Testing Suite provides comprehensive testing capabilities for the Smartslate Polaris application, including:

- **Dynamic Form Autofilling** - Fills forms with realistic, locale-specific data
- **API Testing** - Tests all productionServices endpoints without HTTP
- **UI Automation** - Browser-based automated testing scenarios
- **Performance Testing** - Load, stress, and memory leak detection
- **Test Data Generation** - Creates realistic users, jobs, and reports

## Installation

The testing suite is already integrated into the project. To install the required dependency for running tests:

```bash
npm install -D tsx
```

## Quick Start

### 1. Run All Tests
```bash
npm run test:polaris:all
```

### 2. Run Specific Test Types
```bash
# End-to-end test flow
npm run test:polaris:e2e

# Form validation tests
npm run test:polaris:forms

# Bulk data testing
npm run test:polaris:bulk

# Performance benchmarking
npm run test:polaris:performance
```

## Using the Testing Utilities

### Form Autofilling

```typescript
import { FormAutofiller } from './src/testing';

// Create autofiller
const autofiller = new FormAutofiller({ locale: 'en-IN' });

// Fill form in browser automatically
await autofiller.fillFormInBrowser('form');
```

### API Testing

```typescript
import { ApiTester } from './src/testing';

const tester = new ApiTester();

// Test an endpoint
const result = await tester.explore('/api/starmap-jobs', 'GET');

// Stress test
const stress = await tester.stressTest('/api/starmap-jobs', 'GET', 100);
```

### Test Data Generation

```typescript
import { TestDataGenerator } from './src/testing';

const generator = new TestDataGenerator();

// Generate test data
const user = generator.generateUser();
const job = generator.generateStarmapJob();
const scenario = generator.generateCompleteScenario();
```

### UI Automation

```typescript
import { UIAutomation } from './src/testing';

const automation = new UIAutomation();

// Create and run a test scenario
const scenario = automation.createScenario('My Test')
  .navigate('/portal/discover/new')
  .wait(2000)
  .type('input[name="org_name"]', 'Test Company')
  .click('[data-testid="submit-button"]')
  .screenshot()
  .build();

const result = await automation.runScenario(scenario);
```

### Performance Testing

```typescript
import { PerformanceTester } from './src/testing';

const perfTester = new PerformanceTester();

// Run a load test
const configs = perfTester.getTestConfigurations();
const result = await perfTester.runTest(configs['standard-load']);
```

## Test Data Examples

### Generated User
- Realistic Indian names (Aarav Sharma, Priya Patel)
- Indian phone numbers (+91 format)
- Indian cities (Mumbai, Bangalore, Delhi)
- Company names and job titles

### Generated Starmap Job
- Complete L&D program data
- Realistic business objectives
- Performance gaps and requirements
- AI-generated reports

### Form Data
- Organization: TCS, Infosys, Wipro, etc.
- Industries: Technology, Healthcare, Finance
- Objectives: Revenue growth, compliance, efficiency
- Constraints: Budget, timeline, technology

## Features

### 1. Dynamic Data Generation
- Seeded random generation for reproducibility
- Locale-specific data (Indian context)
- Edge case generation
- Bulk data creation

### 2. Comprehensive Testing
- Unit tests for individual components
- Integration tests for workflows
- E2E tests for complete user journeys
- Performance and load testing

### 3. Reporting
- JSON, HTML, and Markdown reports
- Performance metrics and analytics
- Memory leak detection
- Test coverage tracking

## Best Practices

1. **Use Realistic Data**: The generator creates contextually appropriate data
2. **Test Edge Cases**: Always test boundaries and error conditions
3. **Monitor Performance**: Track response times and resource usage
4. **Clean Up**: Use teardown functions to clean test data
5. **Reproducible Tests**: Use seeds for consistent test data

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout values in test configuration
2. **Form selectors not found**: Update selectors to match current UI
3. **API tests failing**: Ensure productionServices are initialized
4. **Memory issues**: Run tests in smaller batches

### Debug Mode

Enable detailed logging:
```typescript
const apiTester = new ApiTester({ enableLogging: true });
```

## Advanced Usage

### Custom Test Suite

```typescript
import { TestRunner } from './src/testing';

const runner = new TestRunner();

// Add custom test suite
runner.addTestSuite({
  name: 'My Custom Tests',
  tests: [
    {
      name: 'Custom Test',
      type: 'unit',
      run: async () => {
        // Your test logic
        return {
          name: 'Custom Test',
          passed: true,
          duration: 100
        };
      }
    }
  ]
});

// Run tests
const report = await runner.runAll();
```

### Memory Leak Detection

```typescript
const leakResult = await perfTester.detectMemoryLeaks(
  async () => {
    // Your test scenario
  },
  10 // iterations
);
```

## Contributing

To add new test capabilities:

1. Add types to `src/testing/types.ts`
2. Implement in respective utility files
3. Add to test runner in `src/testing/test-runner.ts`
4. Update documentation

## Support

For issues or questions:
- Check the detailed documentation in `src/testing/README.md`
- Review sample tests in `src/testing/sample-tests.ts`
- Look at type definitions in `src/testing/types.ts`
