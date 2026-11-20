import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth0 } from '@auth0/auth0-react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { AppShell } from './AppShell.tsx'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

describe('AppShell', () => {
  it('marks the current destination in desktop and mobile navigation', () => {
    vi.mocked(useAuth0).mockReturnValue({} as ReturnType<typeof useAuth0>)
    render(<MemoryRouter initialEntries={['/today']}><AppShell /></MemoryRouter>)

    for (const name of ['Primary navigation', 'Mobile navigation']) {
      const navigation = within(screen.getByRole('navigation', { name }))
      expect(navigation.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
      expect(navigation.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
    }
    expect(screen.getByText('Moodly user')).toBeInTheDocument()
  })

  it('shows the email fallback and a safe profile picture', () => {
    const picture = 'https://example.com/avatar.png'
    vi.mocked(useAuth0).mockReturnValue({ user: { email: 'reader@example.com', picture } } as ReturnType<typeof useAuth0>)
    render(<MemoryRouter><AppShell /></MemoryRouter>)

    const profile = screen.getByRole('link', { name: /reader@example.com/ })
    expect(profile).toHaveAttribute('href', '/profile')
    expect(within(profile).getByAltText('')).toHaveAttribute('src', picture)
  })

  it('logs out with the current origin as returnTo', async () => {
    const logout = vi.fn()
    vi.mocked(useAuth0).mockReturnValue({ logout, user: { name: 'Moodly User' } } as unknown as ReturnType<typeof useAuth0>)
    const user = userEvent.setup()
    render(<MemoryRouter><AppShell /></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(logout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } })
  })
})
