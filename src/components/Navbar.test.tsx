import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/ThemeContext', () => ({ useTheme: vi.fn() }))
vi.mock('./ReportBugButton', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => (
    <button type="button" onClick={() => onOpenChange(!open)}>
      {open ? 'bug-open' : 'bug-closed'}
    </button>
  ),
}))
vi.mock('./NotificationsBell', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => (
    <button type="button" onClick={() => onOpenChange(!open)}>
      {open ? 'notifications-open' : 'notifications-closed'}
    </button>
  ),
}))

import { useTheme } from '../contexts/ThemeContext'
import Navbar from './Navbar'

function renderNavbar(path = '/home') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue({ theme: 'dark', toggleTheme: vi.fn(), setTheme: vi.fn() })
})

describe('Navbar', () => {
  it('renders the nav items, each appearing twice (desktop + mobile)', () => {
    renderNavbar()
    expect(screen.getAllByText('Home')).toHaveLength(2)
    expect(screen.getAllByText('Search')).toHaveLength(2)
  })

  it('marks the current route active on both desktop and mobile nav', () => {
    renderNavbar('/search')
    const links = screen.getAllByText('Search').map((el) => el.closest('a'))
    expect(links[0]).toHaveClass('text-accent-300')
    expect(links[1]).toHaveClass('text-accent-400')
  })

  it('calls toggleTheme when the theme button is clicked', () => {
    const toggleTheme = vi.fn()
    vi.mocked(useTheme).mockReturnValue({ theme: 'dark', toggleTheme, setTheme: vi.fn() })
    renderNavbar()
    fireEvent.click(screen.getByLabelText('Switch to light mode'))
    expect(toggleTheme).toHaveBeenCalledTimes(1)
  })

  it('shows the light-mode label when already dark, and vice versa', () => {
    vi.mocked(useTheme).mockReturnValue({ theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() })
    renderNavbar()
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument()
  })

  it('opens only one utility panel at a time', () => {
    renderNavbar()
    fireEvent.click(screen.getByText('bug-closed'))
    expect(screen.getByText('bug-open')).toBeInTheDocument()
    fireEvent.click(screen.getByText('notifications-closed'))
    expect(screen.getByText('notifications-open')).toBeInTheDocument()
    expect(screen.getByText('bug-closed')).toBeInTheDocument()
  })

  it('closes an open panel on an outside pointerdown', () => {
    renderNavbar()
    fireEvent.click(screen.getByText('bug-closed'))
    expect(screen.getByText('bug-open')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.getByText('bug-closed')).toBeInTheDocument()
  })

  it('scrolls to top when clicking the tab already active', () => {
    const scrollToSpy = vi.fn()
    vi.stubGlobal('scrollTo', scrollToSpy)
    renderNavbar('/home')
    fireEvent.click(screen.getAllByText('Home')[0])
    expect(scrollToSpy).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
