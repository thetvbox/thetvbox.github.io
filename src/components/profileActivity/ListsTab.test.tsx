import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import ListsTab from './ListsTab'
import type { ShowListWithCount } from '../../types'

function list(overrides: Partial<ShowListWithCount> = {}): ShowListWithCount {
  return {
    id: 'l1',
    user_id: 'u1',
    name: 'Favorites',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    itemCount: 2,
    ...overrides,
  }
}

function renderTab(props: Partial<Parameters<typeof ListsTab>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ListsTab
        lists={[]}
        isMe
        username="bob"
        creatingList={false}
        newListName=""
        onNewListNameChange={vi.fn()}
        savingList={false}
        onStartCreating={vi.fn()}
        onCancelCreating={vi.fn()}
        onCreateList={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ListsTab', () => {
  it('shows an empty state with no lists', () => {
    renderTab()
    expect(screen.getByText('No lists yet.')).toBeInTheDocument()
  })

  it('renders lists with item counts', () => {
    renderTab({ lists: [list({ name: 'Favorites', itemCount: 3 })] })
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('3 shows')).toBeInTheDocument()
  })

  it('uses singular "show" for a single-item list', () => {
    renderTab({ lists: [list({ itemCount: 1 })] })
    expect(screen.getByText('1 show')).toBeInTheDocument()
  })

  it('shows the description when present', () => {
    renderTab({ lists: [list({ description: 'My favorite shows' })] })
    expect(screen.getByText('My favorite shows')).toBeInTheDocument()
  })

  it('shows New list button for the owner, hides it for a visitor', () => {
    const { rerender } = renderTab({ isMe: true })
    expect(screen.getByText('New list')).toBeInTheDocument()
    rerender(
      <MemoryRouter>
        <ListsTab
          lists={[]}
          isMe={false}
          username="bob"
          creatingList={false}
          newListName=""
          onNewListNameChange={vi.fn()}
          savingList={false}
          onStartCreating={vi.fn()}
          onCancelCreating={vi.fn()}
          onCreateList={vi.fn()}
        />
      </MemoryRouter>,
    )
    expect(screen.queryByText('New list')).not.toBeInTheDocument()
  })

  it('calls onStartCreating when New list is clicked', () => {
    const onStartCreating = vi.fn()
    renderTab({ onStartCreating })
    fireEvent.click(screen.getByText('New list'))
    expect(onStartCreating).toHaveBeenCalledTimes(1)
  })

  it('shows the create form when creatingList is true, and submits it', () => {
    const onCreateList = vi.fn()
    renderTab({ creatingList: true, newListName: 'New List', onCreateList })
    fireEvent.click(screen.getByText('Create'))
    expect(onCreateList).toHaveBeenCalledTimes(1)
  })

  it('disables Create when the name is empty', () => {
    renderTab({ creatingList: true, newListName: '' })
    expect(screen.getByText('Create')).toBeDisabled()
  })

  it('calls onCancelCreating when Cancel is clicked', () => {
    const onCancelCreating = vi.fn()
    renderTab({ creatingList: true, onCancelCreating })
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancelCreating).toHaveBeenCalledTimes(1)
  })

  it('calls onNewListNameChange as the input changes', () => {
    const onNewListNameChange = vi.fn()
    renderTab({ creatingList: true, onNewListNameChange })
    fireEvent.change(screen.getByPlaceholderText('List name'), { target: { value: 'X' } })
    expect(onNewListNameChange).toHaveBeenCalledWith('X')
  })
})
