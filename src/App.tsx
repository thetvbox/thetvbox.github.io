import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import PasscodeGate from './components/PasscodeGate'
import PushNotificationsPanel from './components/PushNotificationsPanel'
import ErrorBoundary from './components/ErrorBoundary'
import Spinner from './components/Spinner'
import { hasPassedGate, isGateConfigured } from './lib/siteGate'
import { markPushOnboardingSeen, shouldOfferPushOnboarding } from './lib/pushNotifications'
import { ROUTES } from './lib/routes'
import { ROUTE_TRANSITION_MOTION } from './lib/motion'
import { useScrollRestoration } from './hooks/useScrollRestoration'
import Login from './pages/Login'

const Home = lazy(() => import('./pages/Home'))
const Activity = lazy(() => import('./pages/Activity'))
const Search = lazy(() => import('./pages/Search'))
const ShowDetail = lazy(() => import('./pages/ShowDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Members = lazy(() => import('./pages/Members'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const ShowDiary = lazy(() => import('./pages/ShowDiary'))
const Compare = lazy(() => import('./pages/Compare'))
const ListDetail = lazy(() => import('./pages/ListDetail'))
const Recap = lazy(() => import('./pages/Recap'))

function PageLoader() {
  return (
    <div className="flex h-[70vh] items-center justify-center">
      <Spinner />
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const showNav = Boolean(user) && location.pathname !== ROUTES.login
  const [gatePassed, setGatePassed] = useState(hasPassedGate)
  const [showPushOnboarding, setShowPushOnboarding] = useState(false)

  useScrollRestoration()

  useEffect(() => {
    if (!user) return
    let cancelled = false
    shouldOfferPushOnboarding().then((should) => {
      if (cancelled || !should) return
      markPushOnboardingSeen()
      setShowPushOnboarding(true)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-base-950">
        <Spinner />
      </div>
    )
  }

  if (!user && isGateConfigured && !gatePassed) {
    return <PasscodeGate onSuccess={() => setGatePassed(true)} />
  }

  return (
    <div className="relative min-h-dvh bg-base-950">
      {showNav && <Navbar />}
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="popLayout">
          <motion.div key={location.pathname} {...ROUTE_TRANSITION_MOTION}>
            <ErrorBoundary>
              <Routes location={location}>
                <Route path={ROUTES.login} element={<Login />} />
                <Route
                  path={ROUTES.home}
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.activity}
                  element={
                    <ProtectedRoute>
                      <Activity />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.search}
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.show}
                  element={
                    <ProtectedRoute>
                      <ShowDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.profile}
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.members}
                  element={
                    <ProtectedRoute>
                      <Members />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.publicProfile}
                  element={
                    <ProtectedRoute>
                      <PublicProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.showDiary}
                  element={
                    <ProtectedRoute>
                      <ShowDiary />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.compare}
                  element={
                    <ProtectedRoute>
                      <Compare />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.listDetail}
                  element={
                    <ProtectedRoute>
                      <ListDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.recap}
                  element={
                    <ProtectedRoute>
                      <Recap />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to={user ? ROUTES.home : ROUTES.login} replace />} />
                <Route path="*" element={<Navigate to={user ? ROUTES.home : ROUTES.login} replace />} />
              </Routes>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </Suspense>
      <AnimatePresence>
        {showPushOnboarding && user && (
          <PushNotificationsPanel
            key="push-onboarding"
            userId={user.id}
            onClose={() => setShowPushOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <HashRouter>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </HashRouter>
        </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
