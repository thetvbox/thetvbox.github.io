import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CenteredMessage from './CenteredMessage'

function renderMessage(props: Partial<Parameters<typeof CenteredMessage>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CenteredMessage message="Nothing found" {...props} />
    </MemoryRouter>,
  )
}

describe('CenteredMessage', () => {
  it('renders the message', () => {
    renderMessage()
    expect(screen.getByText('Nothing found')).toBeInTheDocument()
  })

  it('defaults the back link to /members with "Back to people"', () => {
    renderMessage()
    expect(screen.getByText(/Back to people/)).toHaveAttribute('href', '/members')
  })

  it('accepts a custom backTo and backLabel', () => {
    renderMessage({ backTo: '/search', backLabel: 'Back to search' })
    expect(screen.getByText(/Back to search/)).toHaveAttribute('href', '/search')
  })
})
