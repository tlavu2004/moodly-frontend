import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth0 } from '@auth0/auth0-react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AppShell } from './AppShell.tsx'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

describe('AppShell', () => {
  it('logs out with the current origin as returnTo', async () => {
    const logout = vi.fn()
    vi.mocked(useAuth0).mockReturnValue({ logout, user: { name: 'Moodly User' } } as unknown as ReturnType<typeof useAuth0>)
    const user = userEvent.setup()
    render(<MemoryRouter><AppShell /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(logout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } })
  })
})
