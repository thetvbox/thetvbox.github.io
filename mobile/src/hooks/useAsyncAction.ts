import { useCallback, useRef, useState } from 'react'

export interface AsyncActionState {
  busy: boolean
  error: string | null
  run: (action: () => Promise<void>) => void
  clearError: () => void
}

/** Runs an async action with shared busy/error state, ignoring taps while one is already in flight. */
export function useAsyncAction(): AsyncActionState {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busyRef = useRef(false)

  const run = useCallback((action: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setError(null)
    setBusy(true)
    action()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      })
      .finally(() => {
        busyRef.current = false
        setBusy(false)
      })
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { busy, error, run, clearError }
}
