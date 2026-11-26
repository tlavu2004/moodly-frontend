import { render } from '@testing-library/react'
import { HighlightText } from './HighlightText.tsx'

it('highlights UTF-16 ranges after an emoji and treats markup as text', () => {
  const { container } = render(<HighlightText fragment={{
    text: '😴 calm <b>today</b>',
    ranges: [{ start: 3, end: 7 }],
  }} />)
  expect(container.querySelector('mark')).toHaveTextContent('calm')
  expect(container.textContent).toBe('😴 calm <b>today</b>')
  expect(container.querySelector('b')).toBeNull()
})

it.each([
  [{ start: -1, end: 7 }],
  [{ start: 3, end: 8 }],
  [{ start: 1, end: 7 }],
  [{ start: 3, end: 6 }, { start: 5, end: 7 }],
])('shows plain text when any range is invalid', (...ranges) => {
  const { container } = render(<HighlightText fragment={{ text: '😴 calm', ranges }} />)
  expect(container.querySelector('mark')).toBeNull()
  expect(container.textContent).toBe('😴 calm')
})
