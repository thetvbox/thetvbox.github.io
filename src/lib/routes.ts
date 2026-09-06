export const ROUTES = {
  login: '/login',
  home: '/home',
  activity: '/activity',
  search: '/search',
  show: '/show/:id',
  profile: '/profile',
  members: '/members',
  publicProfile: '/u/:username',
  showDiary: '/u/:username/shows/:showId',
  compare: '/compare/:username',
  listDetail: '/u/:username/lists/:listId',
  recap: '/recap',
} as const

/** Builds the show detail route for a given show id. */
export function showRoute(showId: number | string): string {
  return `/show/${showId}`
}

/** Builds a user's public profile route. */
export function profileRoute(username: string): string {
  return `/u/${username}`
}

/** Builds a user's per-show diary route. */
export function showDiaryRoute(username: string, showId: number | string): string {
  return `/u/${username}/shows/${showId}`
}

/** Builds the taste-compare route against a given user. */
export function compareRoute(username: string): string {
  return `/compare/${username}`
}

/** Builds a shareable list detail route. */
export function listDetailRoute(username: string, listId: string): string {
  return `/u/${username}/lists/${listId}`
}
