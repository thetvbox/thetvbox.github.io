import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../lib/routes'

/** Layout route for every signed-in page: sends signed-out visitors to Login, otherwise renders the matched child route. */
export default function ProtectedRoute() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to={ROUTES.login} replace />
}
