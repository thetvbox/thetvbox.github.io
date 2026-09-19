import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Returns a function that goes back to the previous in-app screen. When
 * this is the first screen in the browser's session history -- a direct
 * link or a fresh reload, where `location.key` is still React Router's
 * `'default'` sentinel -- there's nothing to go back to, so it navigates to
 * `fallback` instead of calling navigate(-1) and leaving the app entirely.
 */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    if (location.key === 'default') {
      navigate(fallback)
    } else {
      navigate(-1)
    }
  }
}
