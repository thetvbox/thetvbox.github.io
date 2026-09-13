import { useEffect } from 'react'

const BASE_TITLE = 'TV Box'

/** Sets the browser tab title to "title · TV Box" while mounted; restores the base title on unmount. */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
