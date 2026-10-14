import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuth0 } from '@auth0/auth0-react'
import { vi } from 'vitest'
import { useAvatar } from '../hooks/useAvatar.ts'
import { ProfilePage } from './ProfilePage.tsx'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
vi.mock('../hooks/useAvatar.ts', () => ({ useAvatar: vi.fn() }))

const upload = vi.fn()

describe('ProfilePage', () => {
  beforeEach(() => {
    upload.mockReset()
    vi.mocked(useAuth0).mockReturnValue({ user: { name: 'Mai Nguyen', email: 'mai@example.test' }, logout: vi.fn() } as unknown as ReturnType<typeof useAuth0>)
    vi.mocked(useAvatar).mockReturnValue({ avatar: null, isLoading: false, isUploading: false, error: null, upload })
  })

  it('falls back from backend avatar to Auth0 picture and then initials', () => {
    vi.mocked(useAuth0).mockReturnValue({ user: { name: 'Mai Nguyen', picture: 'https://auth.example/avatar.jpg' }, logout: vi.fn() } as unknown as ReturnType<typeof useAuth0>)
    const { rerender } = render(<ProfilePage />)
    expect(screen.getByRole('img', { name: "Mai Nguyen's avatar" })).toHaveAttribute('src', 'https://auth.example/avatar.jpg')
    vi.mocked(useAuth0).mockReturnValue({ user: { name: 'Mai Nguyen' }, logout: vi.fn() } as unknown as ReturnType<typeof useAuth0>)
    rerender(<ProfilePage />)
    expect(screen.getByText('MN')).toBeInTheDocument()
  })

  it('rejects unsupported formats and files larger than 5 MiB', async () => {
    const { container } = render(<ProfilePage />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(input, new File(['text'], 'avatar.gif', { type: 'image/gif' }))
    expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG, or WebP')
    await user.upload(input, new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }))
    expect(screen.getByRole('alert')).toHaveTextContent('5 MB or smaller')
    expect(upload).not.toHaveBeenCalled()
  })

  it('accepts JPEG, PNG, and WebP files', async () => {
    const { container } = render(<ProfilePage />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const user = userEvent.setup()
    for (const [name, type] of [['avatar.jpg', 'image/jpeg'], ['avatar.png', 'image/png'], ['avatar.webp', 'image/webp']]) {
      await user.upload(input, new File(['image'], name, { type }))
    }
    expect(upload).toHaveBeenCalledTimes(3)
  })

  it('renders backend avatar metadata', () => {
    vi.mocked(useAvatar).mockReturnValue({ avatar: { deliveryUrl: 'https://cdn/avatar.png', contentType: 'image/png', sizeBytes: 1024 * 1024 }, isLoading: false, isUploading: false, error: null, upload })
    render(<ProfilePage />)
    expect(screen.getByText('PNG')).toBeInTheDocument()
    expect(screen.getByText('1.00 MB')).toBeInTheDocument()
  })
})
