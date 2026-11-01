import { describe, expect, it } from 'vitest'
import { rottenTomatoesSearchUrl } from './rottenTomatoes'

describe('rottenTomatoesSearchUrl', () => {
  it('searches Rotten Tomatoes for the title', () => {
    expect(rottenTomatoesSearchUrl('Ted Lasso')).toBe('https://www.rottentomatoes.com/search?search=Ted%20Lasso')
  })

  it('trims and encodes punctuation so the query survives intact', () => {
    expect(rottenTomatoesSearchUrl('  Fear & Desire? ')).toBe('https://www.rottentomatoes.com/search?search=Fear%20%26%20Desire%3F')
  })
})
