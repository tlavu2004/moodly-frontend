import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

function TestButton() {
  const [pressed, setPressed] = useState(false)
  return <button onClick={() => setPressed(true)}>{pressed ? 'Ready' : 'Start'}</button>
}

describe('test foundation', () => {
  it('renders components and handles user interactions', async () => {
    const user = userEvent.setup()
    render(<TestButton />)

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument()
  })
})
