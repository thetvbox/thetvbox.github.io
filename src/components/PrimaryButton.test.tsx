import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PrimaryButton from './PrimaryButton'

describe('PrimaryButton', () => {
  it('renders as a submit button by default', () => {
    render(<PrimaryButton>Go</PrimaryButton>)
    expect(screen.getByText('Go')).toHaveAttribute('type', 'submit')
  })

  it('merges a custom className with the base classes', () => {
    render(<PrimaryButton className="mt-4">Go</PrimaryButton>)
    expect(screen.getByText('Go')).toHaveClass('mt-4', 'w-full')
  })

  it('forwards other button props like onClick and disabled', () => {
    const onClick = vi.fn()
    render(
      <PrimaryButton onClick={onClick} disabled>
        Go
      </PrimaryButton>,
    )
    const button = screen.getByText('Go')
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
