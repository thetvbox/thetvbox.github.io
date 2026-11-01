import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** One URL search param as a string state, so a search box survives Back and reloads; setting "" removes it. */
export function useQueryParam(name: string): [string, (next: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(name) ?? ''
  const setValue = useCallback(
    (next: string) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev)
          if (next) nextParams.set(name, next)
          else nextParams.delete(name)
          return nextParams
        },
        { replace: true },
      )
    },
    [name, setSearchParams],
  )
  return [value, setValue]
}
