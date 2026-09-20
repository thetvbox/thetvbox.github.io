import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/ThemeContext', () => ({ useTheme: vi.fn() }))
vi.mock('./NotificationsBell', () => ({
  default: ({
    open,
    onOpenChange,
    className,
  }: {
    open: boolean
    onOpenChange: (o: boolean) => void
    className?: string
  }) => (
    <button type="button" className={className} onClick={() => onOpenChange(!open)}>
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
  vi.mocked(useTheme).mockReturnValue({
    theme: 'dark',
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
    transparency: 'system',
    setTransparency: vi.fn(),
  })
})

describe('Navbar', () => {
  it('applies the glass surface treatment to the desktop header and to the mobile tab bar', () => {
    const { container } = renderNavbar()
    expect(container.querySelector('header')).toHaveClass('md:glass-surface')
    expect(container.querySelector('nav.fixed')).toHaveClass('glass-surface-strong')
  })

  it('renders the mobile tab bar as a floating pill, inset from the screen edges', () => {
    const { container } = renderNavbar()
    const bottomNav = container.querySelector('nav.fixed')
    expect(bottomNav).toHaveClass('rounded-full')
    expect(bottomNav).toHaveClass('inset-x-4')
  })

  it('gives the notifications and theme icons a floating glass backing, suppressed on desktop', () => {
    renderNavbar()
    expect(screen.getByText('notifications-closed')).toHaveClass('icon-float')
    expect(screen.getByLabelText('Switch to light mode')).toHaveClass('icon-float')
  })

  it('shows the TV Box wordmark on mobile too, with the same floating glass backing as the icons', () => {
    renderNavbar()
    const wordmark = screen.getByText('TV Box').closest('a')
    expect(wordmark).not.toHaveClass('hidden')
    expect(wordmark).toHaveClass('icon-float')
  })

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

  it('renders a theme toggle that calls toggleTheme, but no bug-report trigger -- that stays in Profile', () => {
    const toggleTheme = vi.fn()
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      toggleTheme,
      setTheme: vi.fn(),
      transparency: 'system',
      setTransparency: vi.fn(),
    })
    renderNavbar()
    fireEvent.click(screen.getByLabelText('Switch to light mode'))
    expect(toggleTheme).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Report a bug')).not.toBeInTheDocument()
  })

  it('toggles the notifications dropdown open and closed', () => {
    renderNavbar()
    fireEvent.click(screen.getByText('notifications-closed'))
    expect(screen.getByText('notifications-open')).toBeInTheDocument()
    fireEvent.click(screen.getByText('notifications-open'))
    expect(screen.getByText('notifications-closed')).toBeInTheDocument()
  })

  it('closes the notifications dropdown on an outside pointerdown', () => {
    renderNavbar()
    fireEvent.click(screen.getByText('notifications-closed'))
    expect(screen.getByText('notifications-open')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.getByText('notifications-closed')).toBeInTheDocument()
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
