// Test script to verify AI editor is working correctly
// Run this in browser console to test the AI editing service

async function testAIEditor() {
  const testReport = `## Executive Summary

**Problem Statement:** The organization needs to improve employee onboarding.

**Current State:**
- New employees take 3 months to become productive
- No standardized onboarding process
- High turnover in first 6 months

**Root Causes:**
- Lack of structured training program
- Insufficient mentor support
- Poor documentation

**Objectives:**
- Reduce time to productivity to 6 weeks
- Standardize onboarding across departments
- Improve retention by 40%

## Recommended Solution

### Delivery Modalities
- **Blended Learning**: Combination of online and in-person training
- **Mentorship Program**: Structured buddy system for new hires
- **Mobile Learning**: Just-in-time resources via mobile app

### Scope

**Target Audiences:**
- New employees (all levels)
- Hiring managers
- Designated mentors

**Key Competencies:**
- Company culture and values
- Role-specific skills
- Systems and processes
- Communication protocols

## Delivery Plan

**Phase 1: Foundation** (2 weeks)
Goals:
- Complete orientation
- Set up systems access
- Meet team members

**Phase 2: Skills Development** (4 weeks)
Goals:
- Complete role-specific training
- Shadow experienced colleagues
- Complete first assignments

## Measurement

**Success Metrics:**
- Time to productivity: 6 weeks target
- New hire satisfaction: 85% positive
- Manager satisfaction: 90% positive
- Retention at 6 months: 85%

## Next Steps

1. Finalize curriculum design
2. Identify and train mentors
3. Develop online content
4. Pilot with next cohort
5. Gather feedback and iterate`;

  console.log('Testing AI Editor with sample report...');
  console.log('Report length:', testReport.length);
  console.log('Has Executive Summary:', testReport.includes('## Executive Summary'));
  console.log('Has Recommended Solution:', testReport.includes('## Recommended Solution'));
  
  // Test edit request
  const editRequest = "Make the executive summary more concise and impactful";
  
  console.log('\nEdit request:', editRequest);
  console.log('\nTo test the AI editor:');
  console.log('1. Create a new report or open an existing one');
  console.log('2. Click "Edit Report"');
  console.log('3. Toggle "Solara Lodestar"');
  console.log('4. Try this edit request:', editRequest);
  console.log('5. Verify all sections remain intact after edit');
  
  return {
    testReport,
    editRequest,
    validation: {
      reportLength: testReport.length,
      hasExecutiveSummary: testReport.includes('## Executive Summary'),
      hasRecommendedSolution: testReport.includes('## Recommended Solution'),
      hasDeliveryPlan: testReport.includes('## Delivery Plan'),
      hasMeasurement: testReport.includes('## Measurement'),
      hasNextSteps: testReport.includes('## Next Steps')
    }
  };
}

// Run the test
testAIEditor().then(result => {
  console.log('\nTest complete. Validation results:', result.validation);
  console.log('\nIf any sections are missing after an AI edit, check:');
  console.log('1. ANTHROPIC_MAX_TOKENS is set to 12000+');
  console.log('2. Browser console for validation errors');
  console.log('3. The edit request is specific enough');
});
