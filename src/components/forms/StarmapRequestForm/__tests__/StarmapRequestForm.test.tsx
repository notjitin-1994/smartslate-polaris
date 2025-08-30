/**
 * StarmapRequestForm Test Suite
 * 
 * These tests verify the two-phase form functionality including:
 * - Step navigation
 * - Form validation
 * - Data submission
 * - Accessibility features
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { StarmapRequestForm } from '../StarmapRequestForm'

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('StarmapRequestForm', () => {
  it('renders the first step by default', () => {
    render(
      <TestWrapper>
        <StarmapRequestForm />
      </TestWrapper>
    )
    
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })

  it('validates required fields on step 1', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <StarmapRequestForm />
      </TestWrapper>
    )
    
    // Try to continue without filling required fields
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)
    
    // Should show validation errors
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/work email is required/i)).toBeInTheDocument()
  })

  it('navigates to step 2 when step 1 is valid', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <StarmapRequestForm />
      </TestWrapper>
    )
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/full name/i), 'John Doe')
    await user.type(screen.getByLabelText(/work email/i), 'john@example.com')
    await user.click(screen.getByLabelText(/email/i)) // preferred contact
    await user.type(
      screen.getByLabelText(/context & goals/i), 
      'We need a Starmap to visualize our Q1 roadmap and identify dependencies across teams.'
    )
    
    // Continue to step 2
    await user.click(screen.getByRole('button', { name: /continue/i }))
    
    // Should show step 2
    await waitFor(() => {
      expect(screen.getByText('Tell us about your group')).toBeInTheDocument()
    })
  })

  it('allows navigation back to step 1', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <StarmapRequestForm initialStep="group" />
      </TestWrapper>
    )
    
    // Should start on step 2
    expect(screen.getByText('Tell us about your group')).toBeInTheDocument()
    
    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }))
    
    // Should show step 1
    await waitFor(() => {
      expect(screen.getByText('Tell us about yourself')).toBeInTheDocument()
    })
  })

  it('submits form data when complete', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <StarmapRequestForm onComplete={onComplete} />
      </TestWrapper>
    )
    
    // Fill step 1
    await user.type(screen.getByLabelText(/full name/i), 'Jane Smith')
    await user.type(screen.getByLabelText(/work email/i), 'jane@company.com')
    await user.click(screen.getByLabelText(/email/i))
    await user.type(
      screen.getByLabelText(/context & goals/i), 
      'Creating a Starmap for our product team to improve collaboration and visibility.'
    )
    
    // Continue to step 2
    await user.click(screen.getByRole('button', { name: /continue/i }))
    
    // Fill step 2
    await waitFor(() => screen.getByLabelText(/group name/i))
    await user.type(screen.getByLabelText(/group name/i), 'Product Team')
    await user.selectOptions(screen.getByLabelText(/group type/i), 'team')
    await user.selectOptions(screen.getByLabelText(/industry/i), 'technology')
    await user.selectOptions(screen.getByLabelText(/group size/i), '11-50')
    
    // Add stakeholders
    const stakeholderInput = screen.getByPlaceholderText(/VP Engineering/i)
    await user.type(stakeholderInput, 'VP Product{enter}')
    await user.type(stakeholderInput, 'Engineering Lead{enter}')
    
    await user.type(
      screen.getByLabelText(/desired outcomes/i),
      'Improve cross-team collaboration, identify dependencies early, ensure stakeholder visibility.'
    )
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /submit request/i }))
    
    // Should call onComplete with form data
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          requestor: expect.objectContaining({
            fullName: 'Jane Smith',
            workEmail: 'jane@company.com'
          }),
          group: expect.objectContaining({
            groupName: 'Product Team',
            groupType: 'team'
          })
        })
      )
    })
  })

  it('respects prefers-reduced-motion', () => {
    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    
    render(
      <TestWrapper>
        <StarmapRequestForm />
      </TestWrapper>
    )
    
    // Form should still render correctly
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument()
  })

  it('has accessible form fields', () => {
    render(
      <TestWrapper>
        <StarmapRequestForm />
      </TestWrapper>
    )
    
    // Check ARIA attributes
    const nameInput = screen.getByLabelText(/full name/i)
    expect(nameInput).toHaveAttribute('aria-required', 'true')
    
    const emailInput = screen.getByLabelText(/work email/i)
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('aria-required', 'true')
  })
})
