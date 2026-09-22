import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { vi } from 'vitest'
import { useEntrySearch } from '../hooks/useEntrySearch.ts'
import { SearchPage } from './SearchPage.tsx'

vi.mock('../hooks/useEntrySearch.ts', () => ({ useEntrySearch: vi.fn() }))

function Location() {
  return <output aria-label="Current URL">{useLocation().search}</output>
}

function renderPage(url = '/search') {
  return render(<MemoryRouter initialEntries={[url]}><SearchPage /><Location /></MemoryRouter>)
}

describe('SearchPage', () => {
  beforeEach(() => vi.mocked(useEntrySearch).mockReturnValue({ results: [], isLoading: false, error: null }))

  it('submits a trimmed query into the URL', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Search entries'), '  morning walk  ')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('?q=morning+walk')
  })

  it('updates and clears date filters', async () => {
    renderPage('/search?q=walk')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('From'), '2026-09-01')
    await user.type(screen.getByLabelText('To'), '2026-09-22')
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('from=2026-09-01')
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('to=2026-09-22')
    await user.click(screen.getByRole('button', { name: 'Clear dates' }))
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('?q=walk')
  })

  it('shows an inverted-range error', () => {
    renderPage('/search?q=walk&from=2026-09-22&to=2026-09-01')
    expect(screen.getByRole('alert')).toHaveTextContent('start date must be before')
  })

  it('renders highlight fragments as text and links to the result date', () => {
    vi.mocked(useEntrySearch).mockReturnValue({
      results: [{
        entryId: 'entry-1',
        date: '2026-09-20',
        highlights: { 'mood.note': [{ text: '<img src=x onerror=alert(1)>', ranges: [{ start: 0, end: 3 }] }] },
      }],
      isLoading: false,
      error: null,
    })
    const { container } = renderPage('/search?q=walk')
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('link', { name: 'View in journal' })).toHaveAttribute('href', '/entries?from=2026-09-20&to=2026-09-20')
  })
})
