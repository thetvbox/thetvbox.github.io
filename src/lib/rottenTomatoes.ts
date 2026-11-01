/** Rotten Tomatoes search results for a title: unlike a guessed show-page slug, this page always exists. */
export function rottenTomatoesSearchUrl(title: string): string {
  return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title.trim())}`
}
