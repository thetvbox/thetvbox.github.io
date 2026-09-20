import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// `FollowButton` reads `window.matchMedia(...)` once, at module-load time, to
// compute its module-level `supportsHover` constant. jsdom does not implement
// `matchMedia` by default, so it must be stubbed via `vi.hoisted` (which runs
// before the static import below evaluates the module) for the hover-relabel
// branch to be exercised here.
vi.hoisted(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
})

import FollowButton from './FollowButton'

describe('FollowButton', () => {
  it('shows "Follow" and aria-pressed="false" when not following', () => {
    render(<FollowButton isFollowing={false} onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Follow')
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows "Following" and aria-pressed="true" when following (not hovering)', () => {
    render(<FollowButton isFollowing onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Following')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onFollow when clicked while not following', () => {
    const onFollow = vi.fn()
    const onUnfollow = vi.fn()
    render(<FollowButton isFollowing={false} onFollow={onFollow} onUnfollow={onUnfollow} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onFollow).toHaveBeenCalledTimes(1)
    expect(onUnfollow).not.toHaveBeenCalled()
  })

  it('calls onUnfollow when clicked while following', () => {
    const onFollow = vi.fn()
    const onUnfollow = vi.fn()
    render(<FollowButton isFollowing onFollow={onFollow} onUnfollow={onUnfollow} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onUnfollow).toHaveBeenCalledTimes(1)
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('sets aria-label to "Follow" when not following', () => {
    render(<FollowButton isFollowing={false} onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Follow')
  })

  it('sets aria-label to "Unfollow" when following', () => {
    render(<FollowButton isFollowing onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Unfollow')
  })

  it('shows the saving ellipsis and is disabled while saving and not following', () => {
    render(<FollowButton isFollowing={false} saving onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('…')
    expect(button).toBeDisabled()
  })

  it('shows the saving ellipsis and is disabled while saving and following', () => {
    render(<FollowButton isFollowing saving onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('…')
    expect(button).toBeDisabled()
  })

  it('does not call onFollow or onUnfollow when clicked while saving', () => {
    const onFollow = vi.fn()
    const onUnfollow = vi.fn()
    render(<FollowButton isFollowing={false} saving onFollow={onFollow} onUnfollow={onUnfollow} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onFollow).not.toHaveBeenCalled()
    expect(onUnfollow).not.toHaveBeenCalled()
  })

  it('applies small size classes when size="sm"', () => {
    render(<FollowButton isFollowing={false} size="sm" onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-2.5', 'py-1', 'text-xs')
    expect(button).not.toHaveClass('px-3.5', 'py-1.5', 'text-sm')
  })

  it('applies medium size classes by default', () => {
    render(<FollowButton isFollowing={false} onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-3.5', 'py-1.5', 'text-sm')
    expect(button).not.toHaveClass('px-2.5', 'py-1', 'text-xs')
  })

  it('relabels "Following" to "Unfollow" on hover, and back on mouse leave', () => {
    render(<FollowButton isFollowing onFollow={vi.fn()} onUnfollow={vi.fn()} />)
    const button = screen.getByRole('button')
    expect(screen.getByText('Following')).toBeInTheDocument()

    fireEvent.mouseEnter(button)
    expect(screen.getByText('Unfollow')).toBeInTheDocument()
    expect(screen.queryByText('Following')).not.toBeInTheDocument()

    fireEvent.mouseLeave(button)
    expect(screen.getByText('Following')).toBeInTheDocument()
    expect(screen.queryByText('Unfollow')).not.toBeInTheDocument()
  })
})
