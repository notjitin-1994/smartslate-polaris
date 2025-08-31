import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BeginDiscovery from '../BeginDiscovery'

// Stub heavy child components to avoid deep trees
vi.mock('@/components/forms/DynamicQuestionnaire', () => ({
  DynamicQuestionnaire: () => <div>Dynamic Questionnaire Stub</div>,
}))
vi.mock('@/components/DynamicLoadingScreen', () => ({
  DynamicLoadingScreen: () => <div>Dynamic Loading Stub</div>,
}))

// Mock the services used to fetch the starmap
const getStarmapById = vi.fn()
vi.mock('@/services', () => ({
  getStarmapById: (...args: any[]) => getStarmapById(...args),
}))

describe('BeginDiscovery route', () => {
  beforeEach(() => {
    getStarmapById.mockReset()
  })

  it('renders static form when no starmapId is provided', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/begin-discovery' }]}>
        <Routes>
          <Route path="/begin-discovery" element={<BeginDiscovery />} />
        </Routes>
      </MemoryRouter>
    )

    // Static form should show skip link and form UI
    expect(screen.getByRole('link', { name: /skip to form/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })
  })

  it('renders loading phase when forced via query param', async () => {
    getStarmapById.mockResolvedValueOnce({ id: 'rec_1', dynamic_questions: null })

    render(
      <MemoryRouter initialEntries={[{ pathname: '/begin-discovery', search: '?starmapId=rec_1&loading=1' }]}>
        <Routes>
          <Route path="/begin-discovery" element={<BeginDiscovery />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Dynamic Loading Stub')).toBeInTheDocument()
    })
  })

  it('renders dynamic questionnaire when dynamic questions exist', async () => {
    getStarmapById.mockResolvedValueOnce({ id: 'rec_2', dynamic_questions: { stages: [{}] } })

    render(
      <MemoryRouter initialEntries={[{ pathname: '/begin-discovery', search: '?starmapId=rec_2' }]}>
        <Routes>
          <Route path="/begin-discovery" element={<BeginDiscovery />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Dynamic Questionnaire Stub')).toBeInTheDocument()
    })
  })
})


