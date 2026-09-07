import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tmdb', () => ({
  getAllTvProviders: vi.fn(),
  providerLogoUrl: vi.fn((path: string | null) => (path ? `https://logo/${path}` : null)),
}))

import { getAllTvProviders } from '../lib/tmdb'
import ProviderPicker from './ProviderPicker'
import type { TmdbProviderListItem } from '../types'

function provider(overrides: Partial<TmdbProviderListItem> = {}): TmdbProviderListItem {
  return {
    provider_id: 1,
    provider_name: 'Netflix',
    logo_path: '/netflix.png',
    display_priority: 1,
    display_priorities: {},
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(getAllTvProviders).mockReset()
})

describe('ProviderPicker', () => {
  it('shows a loading state while fetching providers', () => {
    vi.mocked(getAllTvProviders).mockReturnValue(new Promise(() => {}))
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Loading platforms…')).toBeInTheDocument()
  })

  it('lists matching providers once loaded', async () => {
    vi.mocked(getAllTvProviders).mockResolvedValue([provider(), provider({ provider_id: 2, provider_name: 'Hulu' })])
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
    expect(screen.getByText('Hulu')).toBeInTheDocument()
  })

  it('shows a no-matches message on an empty fetch', async () => {
    vi.mocked(getAllTvProviders).mockResolvedValue([])
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('No matches.')).toBeInTheDocument())
  })

  it('falls back to an empty list when the fetch rejects', async () => {
    vi.mocked(getAllTvProviders).mockRejectedValue(new Error('boom'))
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('No matches.')).toBeInTheDocument())
  })

  it('filters providers by the search query', async () => {
    vi.mocked(getAllTvProviders).mockResolvedValue([provider(), provider({ provider_id: 2, provider_name: 'Hulu' })])
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/Search platforms/), { target: { value: 'hulu' } })
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
    expect(screen.getByText('Hulu')).toBeInTheDocument()
  })

  it('calls onPick with the chosen provider', async () => {
    const onPick = vi.fn().mockResolvedValue(undefined)
    vi.mocked(getAllTvProviders).mockResolvedValue([provider()])
    render(<ProviderPicker region="US" onPick={onPick} onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Netflix'))
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(provider()))
  })

  it('calls onClose when Close is clicked', async () => {
    const onClose = vi.fn()
    vi.mocked(getAllTvProviders).mockResolvedValue([])
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    vi.mocked(getAllTvProviders).mockResolvedValue([])
    render(<ProviderPicker region="US" onPick={vi.fn()} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
