/** Returns "s" unless count is exactly 1, for inline pluralization in JSX/templates. */
export function pluralSuffix(count: number | undefined): string {
  return count === 1 ? '' : 's'
}

/** Unwraps a catch-block error to a user-facing message, falling back for non-Error throws. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}
