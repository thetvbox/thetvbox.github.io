import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../../lib/tmdb', () => ({ getAllTvProviders: vi.fn(), providerLogoUrl: vi.fn(() => 'https://logo/netflix.png') }))

import { getAllTvProviders } from '../../lib/tmdb'
import ShowDetailStreaming from './ShowDetailStreaming'
import type { TmdbWatchProviderRegion } from '../../types'

function region(overrides: Partial<TmdbWatchProviderRegion> = {}): TmdbWatchProviderRegion {
  return { link: 'https://justwatch.com/show', ...overrides }
}

function renderStreaming(props: Partial<Parameters<typeof ShowDetailStreaming>[0]> = {}) {
  return render(
    <ShowDetailStreaming
      effectiveProvider={null}
      loading={false}
      override={null}
      regionProviders={null}
      region="US"
      pickerOpen={false}
      onTogglePicker={vi.fn()}
      onClosePicker={vi.fn()}
      onPickProvider={vi.fn()}
      onClearOverride={vi.fn()}
      {...props}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAllTvProviders).mockResolvedValue([])
})

describe('ShowDetailStreaming', () => {
  it('renders nothing while loading', () => {
    const { container } = renderStreaming({ loading: true })
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a not-available message with no provider and no region data', () => {
    renderStreaming()
    expect(screen.getByText(/isn't available for this show yet/)).toBeInTheDocument()
  })

  it('shows a not-free message when region data exists but no free provider was found', () => {
    renderStreaming({ regionProviders: region() })
    expect(screen.getByText('Not free to stream in your region right now.')).toBeInTheDocument()
  })

  it('shows the resolved provider name', () => {
    renderStreaming({ effectiveProvider: { provider_name: 'Netflix', logo_path: null } })
    expect(screen.getByText('Netflix')).toBeInTheDocument()
  })

  it('shows "Set manually" only when there is a manual override', () => {
    renderStreaming({ effectiveProvider: { provider_name: 'Netflix', logo_path: null }, override: { id: 'o1' } as never })
    expect(screen.getByText('Set manually')).toBeInTheDocument()
  })

  it('shows a JustWatch link when region data is available', () => {
    renderStreaming({ regionProviders: region() })
    expect(screen.getByText('See all options (JustWatch)')).toHaveAttribute('href', 'https://justwatch.com/show')
  })

  it('the fix-it toggle label changes based on whether a provider was resolved', () => {
    const { rerender } = renderStreaming()
    expect(screen.getByText('Know where? Set it')).toBeInTheDocument()
    rerender(
      <ShowDetailStreaming
        effectiveProvider={{ provider_name: 'Netflix', logo_path: null }}
        loading={false}
        override={null}
        regionProviders={null}
        region="US"
        pickerOpen={false}
        onTogglePicker={vi.fn()}
        onClosePicker={vi.fn()}
        onPickProvider={vi.fn()}
        onClearOverride={vi.fn()}
      />,
    )
    expect(screen.getByText('Not right? Fix it')).toBeInTheDocument()
  })

  it('calls onTogglePicker when the fix-it link is clicked', () => {
    const onTogglePicker = vi.fn()
    renderStreaming({ onTogglePicker })
    fireEvent.click(screen.getByText('Know where? Set it'))
    expect(onTogglePicker).toHaveBeenCalledTimes(1)
  })

  it('calls onClearOverride when Reset to automatic is clicked', () => {
    const onClearOverride = vi.fn()
    renderStreaming({ effectiveProvider: { provider_name: 'Netflix', logo_path: null }, override: { id: 'o1' } as never, onClearOverride })
    fireEvent.click(screen.getByText('Reset to automatic'))
    expect(onClearOverride).toHaveBeenCalledTimes(1)
  })

  it('renders the provider picker when pickerOpen is true', () => {
    renderStreaming({ pickerOpen: true })
    expect(screen.getByPlaceholderText(/Search platforms/)).toBeInTheDocument()
  })
})
