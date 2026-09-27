import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChipGroup, FilterSection } from './FilterSection'

describe('FilterSection', () => {
  it('renders its title and children', () => {
    render(
      <FilterSection title="Genre">
        <p>content</p>
      </FilterSection>,
    )
    expect(screen.getByText('Genre')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})

describe('ChipGroup', () => {
  it('renders one chip per option, reflecting the selected set', () => {
    render(<ChipGroup options={['Drama', 'Comedy']} selected={new Set(['Drama'])} onToggle={vi.fn()} />)
    expect(screen.getByText('Drama').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Comedy').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle with the clicked option', () => {
    const onToggle = vi.fn()
    render(<ChipGroup options={['Drama']} selected={new Set()} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Drama'))
    expect(onToggle).toHaveBeenCalledWith('Drama')
  })

  it('shows no counts when the counts map is omitted', () => {
    render(<ChipGroup options={['Drama']} selected={new Set()} onToggle={vi.fn()} />)
    expect(screen.getByText('Drama').closest('button')).not.toBeDisabled()
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it("shows each option's live count", () => {
    render(
      <ChipGroup
        options={['Drama', 'Comedy']}
        selected={new Set()}
        onToggle={vi.fn()}
        counts={new Map([['Drama', 3], ['Comedy', 0]])}
      />,
    )
    expect(screen.getByText('· 3')).toBeInTheDocument()
    expect(screen.getByText('· 0')).toBeInTheDocument()
  })

  it('disables an unselected option at zero count instead of hiding it', () => {
    render(
      <ChipGroup options={['Drama', 'Comedy']} selected={new Set()} onToggle={vi.fn()} counts={new Map([['Comedy', 0]])} />,
    )
    expect(screen.getByText('Comedy')).toBeInTheDocument()
    expect(screen.getByText('Comedy').closest('button')).toBeDisabled()
    expect(screen.getByText('Drama').closest('button')).not.toBeDisabled()
  })

  it('keeps an already-selected option clickable even at zero count, so it can still be cleared', () => {
    const onToggle = vi.fn()
    render(
      <ChipGroup
        options={['Comedy']}
        selected={new Set(['Comedy'])}
        onToggle={onToggle}
        counts={new Map([['Comedy', 0]])}
      />,
    )
    const button = screen.getByText('Comedy').closest('button') as HTMLButtonElement
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledWith('Comedy')
  })
})
