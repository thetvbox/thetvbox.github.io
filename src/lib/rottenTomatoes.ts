/** Guesses a show's Rotten Tomatoes URL slug from its title alone, with no network call. */
export function rottenTomatoesSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function rottenTomatoesUrl(title: string): string {
  return `https://www.rottentomatoes.com/tv/${rottenTomatoesSlug(title)}`
}
