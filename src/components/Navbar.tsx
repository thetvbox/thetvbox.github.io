import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MOBILE_TAB_INDICATOR_SPRING, NAV_FADE_IN_TRANSITION, scrollBehavior } from '../lib/motion'
import { useOutsideClick } from '../hooks/useOutsideClick'
import { ROUTES } from '../lib/routes'
import AppLogo from './AppLogo'
import NotificationsBell from './NotificationsBell'
import HapticOverlay from './HapticOverlay'

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

const NAV_ITEMS = [
  { to: ROUTES.home, label: 'Home', Icon: HomeIcon },
  { to: ROUTES.activity, label: 'Activity', Icon: ActivityIcon },
  { to: ROUTES.search, label: 'Search', Icon: SearchIcon },
  { to: ROUTES.members, label: 'People', Icon: PeopleIcon },
  { to: ROUTES.profile, label: 'Profile', Icon: UserIcon },
] as const

/** Minimal iOS-Apple-TV-style chrome: a transparent top bar (just a floating notifications icon; each page supplies its own large title) and a floating glass bottom tab bar on mobile -- theme and bug-report live in Profile, not here. */
export default function Navbar() {
  const location = useLocation()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const utilityRef = useOutsideClick<HTMLDivElement>(notificationsOpen, () => setNotificationsOpen(false))

  /** Scrolls to top when tapping the tab you're already on. */
  function handleNavClick(to: string) {
    if (location.pathname === to) {
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior() })
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] md:glass-surface md:border-b md:border-hairline">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <NavLink
            to={ROUTES.home}
            onClick={() => handleNavClick(ROUTES.home)}
            viewTransition
            className="hidden min-h-11 items-center gap-2 md:flex"
          >
            <AppLogo size={24} />
            <span className="font-display text-lg font-semibold tracking-tight text-base-100">
              TV Box
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => handleNavClick(to)}
                viewTransition
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

          <div ref={utilityRef} className="relative ml-auto flex items-center">
            <NotificationsBell
              className="icon-float"
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
            />
          </div>
        </div>
      </header>

      <motion.nav
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={NAV_FADE_IN_TRANSITION}
        className="glass-surface-strong fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex transform-gpu rounded-full border border-hairline-strong px-1 shadow-xl shadow-black/30 will-change-transform md:hidden"
      >
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => handleNavClick(to)}
            viewTransition
            className={({ isActive }) =>
              `${linkBase} flex-1 py-2.5 ${isActive ? 'text-accent-400' : 'text-base-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <HapticOverlay />
                {isActive && (
                  <motion.span
                    layoutId="mobile-tab-dot"
                    className="absolute top-1 h-1 w-1 rounded-full bg-accent-400"
                    transition={MOBILE_TAB_INDICATOR_SPRING}
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
