import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'
import { EASE_OUT_EXPO, scrollBehavior } from '../lib/motion'
import AppLogo from './AppLogo'
import ReportBugButton from './ReportBugButton'
import NotificationsBell from './NotificationsBell'

const linkBase =
  'relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-200 md:flex-row md:gap-1.5 md:text-sm md:px-3.5 md:py-1.5 md:rounded-full'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'var(--color-accent-400)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5v-7Z" fill={active ? 'var(--color-accent-400)' : 'currentColor'} stroke="none" />
    </svg>
  )
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'var(--color-accent-400)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'var(--color-accent-400)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 12.5h2l1.3-3.4 2 6.8 1.3-3.4h2.4" />
    </svg>
  )
}

function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'var(--color-accent-400)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c1.2-3.4 4-5.2 6.5-5.2s5.3 1.8 6.5 5.2" />
      <path d="M16 8.2a3 3 0 1 1 3.2 3" />
      <path d="M15.5 14.9c2.1.3 4 1.8 4.9 5.1" />
    </svg>
  )
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? 'var(--color-accent-400)' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a.6.6 0 0 0-.76-.76A9.7 9.7 0 1 0 21.26 15.26a.6.6 0 0 0-.76-.76Z" />
    </svg>
  )
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-base-400 transition duration-200 hover:bg-hover hover:text-base-100 active:scale-90"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -80, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 80, scale: 0.5 }}
          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          className="flex"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

const NAV_ITEMS = [
  { to: '/home', label: 'Home', Icon: HomeIcon },
  { to: '/activity', label: 'Activity', Icon: ActivityIcon },
  { to: '/search', label: 'Search', Icon: SearchIcon },
  { to: '/members', label: 'People', Icon: PeopleIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
] as const

type UtilityPanel = 'bug' | 'notifications'

export default function Navbar() {
  const location = useLocation()
  const [openPanel, setOpenPanel] = useState<UtilityPanel | null>(null)
  const utilityRef = useRef<HTMLDivElement>(null)

  // React Router fires no navigation when a Link targets the current route,
  // so "tap the tab you're already on to scroll to top" needs explicit handling.
  function handleNavClick(to: string) {
    if (location.pathname === to) {
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior() })
    }
  }

  // Tapping outside either panel closes it, the standard dismiss gesture for
  // an inline dropdown -- Escape (see useEscapeAndFocusReturn) covers desktop
  // keyboard users, but touch has no equivalent without this.
  useEffect(() => {
    if (!openPanel) return
    function handlePointerDown(e: PointerEvent) {
      if (utilityRef.current && !utilityRef.current.contains(e.target as Node)) {
        setOpenPanel(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openPanel])

  return (
    <>
      {/* Top bar. pt-[env(safe-area-inset-top)] clears the iOS status bar/notch
          when installed to the home screen. Sticky (not fixed) so the extra
          height reserves space in normal flow. */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-base-950/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <NavLink
            to="/home"
            onClick={() => handleNavClick('/home')}
            className="flex min-h-11 items-center gap-2"
          >
            <AppLogo size={24} />
            <span className="font-display text-lg font-semibold tracking-tight text-base-100">
              TV Box
            </span>
          </NavLink>

          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => handleNavClick(to)}
                  className={({ isActive }) =>
                    `${linkBase} ${
                      isActive
                        ? 'bg-accent-500/10 text-accent-300'
                        : 'text-base-400 hover:bg-hover hover:text-base-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon active={isActive} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            {/* `relative` lives here, not on each individual button -- a
                dropdown panel anchored to its own 44px trigger only avoids
                overflowing the viewport when that trigger happens to be the
                rightmost icon. ReportBugButton sits in the middle of this
                row, so anchoring its panel to the shared cluster instead
                guarantees it always opens flush with the true right edge,
                never overlapping ThemeToggle or NotificationsBell. */}
            <div ref={utilityRef} className="relative flex items-center gap-1.5">
              <ThemeToggle />
              <ReportBugButton
                open={openPanel === 'bug'}
                onOpenChange={(isOpen) => setOpenPanel(isOpen ? 'bug' : null)}
              />
              <NotificationsBell
                open={openPanel === 'notifications'}
                onOpenChange={(isOpen) => setOpenPanel(isOpen ? 'notifications' : null)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Bottom tab bar (mobile only). transform-gpu forces its own compositing
          layer up front -- fixed + backdrop-blur otherwise desyncs from the
          viewport mid-scroll on mobile Safari/Chrome. */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-x-0 bottom-0 z-40 flex transform-gpu border-t border-hairline bg-base-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md will-change-transform md:hidden"
      >
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => handleNavClick(to)}
            className={({ isActive }) =>
              `${linkBase} flex-1 py-2.5 ${isActive ? 'text-accent-400' : 'text-base-400'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="mobile-tab-dot"
                    className="absolute top-0.5 h-1 w-1 rounded-full bg-accent-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <Icon active={isActive} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </motion.nav>
    </>
  )
}
