import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Chip from './Chip'

describe('Chip', () => {
  it('reports its active state via aria-pressed', () => {
    render(
      <Chip active onClick={vi.fn()}>
        Drama
      </Chip>,
    )
    expect(screen.getByText('Drama')).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports inactive via aria-pressed when not active', () => {
    render(
      <Chip active={false} onClick={vi.fn()}>
        Drama
      </Chip>,
    )
    expect(screen.getByText('Drama')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(
      <Chip active={false} onClick={onClick}>
        Drama
      </Chip>,
    )
    fireEvent.click(screen.getByText('Drama'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is not disabled by default', () => {
    render(
      <Chip active={false} onClick={vi.fn()}>
        Drama
      </Chip>,
    )
    expect(screen.getByText('Drama').closest('button')).not.toBeDisabled()
  })

  it('disables the button and blocks onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Chip active={false} onClick={onClick} disabled>
        Drama
      </Chip>,
    )
    const button = screen.getByText('Drama').closest('button')
    expect(button).toBeDisabled()
    fireEvent.click(button as HTMLButtonElement)
    expect(onClick).not.toHaveBeenCalled()
  })
})
