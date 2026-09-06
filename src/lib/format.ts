/** Returns "s" unless count is exactly 1, for inline pluralization in JSX/templates. */
export function pluralSuffix(count: number | undefined): string {
  return count === 1 ? '' : 's'
}
