import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import PasscodeGate from './components/PasscodeGate'
import ErrorBoundary from './components/ErrorBoundary'
import Spinner from './components/Spinner'
import { hasPassedGate, isGateConfigured } from './lib/siteGate'
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

/** Wraps a lazy page in its own Suspense boundary inside Routes. */
function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function AppShell() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const showNav = Boolean(user) && location.pathname !== ROUTES.login
  const [gatePassed, setGatePassed] = useState(hasPassedGate)

  useScrollRestoration()

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
    <div className="min-h-dvh bg-base-950">
      {showNav && <Navbar />}
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} {...ROUTE_TRANSITION_MOTION}>
          <ErrorBoundary>
            <Routes location={location}>
              <Route path={ROUTES.login} element={<Login />} />
              <Route
                path={ROUTES.home}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Home />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.activity}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Activity />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.search}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Search />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.show}
                element={
                  <ProtectedRoute>
                    <Page>
                      <ShowDetail />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.profile}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Profile />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.members}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Members />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.publicProfile}
                element={
                  <ProtectedRoute>
                    <Page>
                      <PublicProfile />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.showDiary}
                element={
                  <ProtectedRoute>
                    <Page>
                      <ShowDiary />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.compare}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Compare />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.listDetail}
                element={
                  <ProtectedRoute>
                    <Page>
                      <ListDetail />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.recap}
                element={
                  <ProtectedRoute>
                    <Page>
                      <Recap />
                    </Page>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to={user ? ROUTES.home : ROUTES.login} replace />} />
              <Route path="*" element={<Navigate to={user ? ROUTES.home : ROUTES.login} replace />} />
            </Routes>
          </ErrorBoundary>
        </motion.div>
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
