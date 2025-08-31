import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from '../PasswordInput'

describe('PasswordInput', () => {
  it('toggles visibility', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PasswordInput
        label="Password"
        value="secret"
        onChange={onChange}
        placeholder="Enter password"
      />
    )

    const input = screen.getByPlaceholderText('Enter password') as HTMLInputElement
    expect(input.type).toBe('password')

    const toggle = screen.getByRole('button', { name: /show password/i })
    await user.click(toggle)

    expect(input.type).toBe('text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})


