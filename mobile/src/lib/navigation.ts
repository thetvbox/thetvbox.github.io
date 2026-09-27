import type { Href } from 'expo-router'

/** Typed href for the show detail route, optionally requesting an auto-scroll to watch progress. */
export function showHref(showId: number | string, opts?: { jumpToProgress?: boolean }): Href {
  return {
    pathname: '/show/[id]',
    params: opts?.jumpToProgress ? { id: showId, jumpToProgress: '1' } : { id: showId },
  }
}

/** Typed href for a user's public profile route. */
export function profileHref(username: string): Href {
  return { pathname: '/u/[username]', params: { username } }
}

/** Typed href for a user's per-show diary route. */
export function showDiaryHref(username: string, showId: number | string): Href {
  return { pathname: '/u/[username]/shows/[showId]', params: { username, showId } }
}

/** Typed href for the taste-compare route against a given user. */
export function compareHref(username: string): Href {
  return { pathname: '/compare/[username]', params: { username } }
}

/** Typed href for a shareable list detail route. */
export function listDetailHref(username: string, listId: string): Href {
  return { pathname: '/u/[username]/lists/[listId]', params: { username, listId } }
}
