import { useLocation, useNavigate } from 'react-router-dom'

/** Returns a function that goes back to the previous in-app screen, or to `fallback` when this is the first screen in the session. */
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
