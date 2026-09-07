import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import FollowActivityRow from './FollowActivityRow'
import type { FollowActivityEvent } from '../lib/showActivity'

function event(overrides: Partial<FollowActivityEvent> = {}): FollowActivityEvent {
  return {
    kind: 'follow',
    key: 'follow-1',
    followerId: 'u1',
    followerUsername: 'alice',
    followedId: 'u2',
    followedUsername: 'bob',
    at: '2026-01-01T00:00:00Z',
    atUnknown: false,
    ...overrides,
  }
}

describe('FollowActivityRow', () => {
  it('describes who followed whom', () => {
    render(
      <MemoryRouter>
        <FollowActivityRow event={event()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
    expect(screen.getByText('started following')).toBeInTheDocument()
  })

  it('links to the followed user\'s profile', () => {
    render(
      <MemoryRouter>
        <FollowActivityRow event={event()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/u/bob')
  })
})
