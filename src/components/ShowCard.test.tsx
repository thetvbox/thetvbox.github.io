import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'
import { vi } from 'vitest'

vi.mock('framer-motion', () => framerMotionMock)

import ShowCard from './ShowCard'
import type { TmdbShowSummary } from '../types'

function show(overrides: Partial<TmdbShowSummary> = {}): TmdbShowSummary {
  return {
    id: 1,
    name: 'Show One',
    poster_path: '/poster.jpg',
    first_air_date: '2020-01-01',
    vote_average: 8,
    ...overrides,
  }
}

function renderCard(props: Partial<Parameters<typeof ShowCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ShowCard show={show()} {...props} />
    </MemoryRouter>,
  )
}

describe('ShowCard', () => {
  it('links to the show detail route', () => {
    renderCard()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/show/1')
  })

  it('shows the name and year', () => {
    renderCard()
    expect(screen.getByText('Show One')).toBeInTheDocument()
    expect(screen.getByText('2020')).toBeInTheDocument()
  })

  it('omits the year when first_air_date is null', () => {
    renderCard({ show: show({ first_air_date: null }) })
    expect(screen.queryByText('2020')).not.toBeInTheDocument()
  })

  it('includes the year in the aria-label', () => {
    renderCard()
    expect(screen.getByRole('link', { name: 'Show One (2020)' })).toBeInTheDocument()
  })

  it('renders a streaming badge when a provider with a logo is given', () => {
    const { container } = renderCard({ provider: { provider_name: 'Netflix', logo_path: '/n.png' } })
    expect(container.querySelector('[title="Netflix"]')).toBeInTheDocument()
  })
})
