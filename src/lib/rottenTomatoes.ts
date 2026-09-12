/**
 * Guesses a show's Rotten Tomatoes URL from its title alone, with no network call --
 * RT doesn't offer a public API or expose page slugs through OMDb, and RT's own Terms
 * of Use explicitly prohibit scraping/automated data extraction from the site, so this
 * is the only fast, compliant way to link to something more useful than a search page.
 * RT's TV show slugs are lowercase words joined by underscores; verified against a
 * spread of real shows (Ted Lasso, Breaking Bad, Brooklyn Nine-Nine, iZombie, Money
 * Heist, etc.) before relying on it here. It won't be right 100% of the time -- a show
 * with a slug RT chose not to derive from its title will 404 into RT's own not-found
 * page, not break anything -- but it's right far more often than not.
 */
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
