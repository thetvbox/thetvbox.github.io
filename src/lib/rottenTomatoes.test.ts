import { describe, expect, it } from 'vitest'
import { rottenTomatoesSlug, rottenTomatoesUrl } from './rottenTomatoes'

describe('rottenTomatoesSlug', () => {
  it('lowercases and joins words with underscores', () => {
    expect(rottenTomatoesSlug('Ted Lasso')).toBe('ted_lasso')
    expect(rottenTomatoesSlug('Breaking Bad')).toBe('breaking_bad')
  })

  it('collapses punctuation into a single underscore', () => {
    expect(rottenTomatoesSlug('Brooklyn Nine-Nine')).toBe('brooklyn_nine_nine')
    expect(rottenTomatoesSlug("It's Always Sunny in Philadelphia")).toBe('it_s_always_sunny_in_philadelphia')
  })

  it('expands an ampersand to "and"', () => {
    expect(rottenTomatoesSlug('Fear & Desire')).toBe('fear_and_desire')
  })

  it('lowercases a mixed-case title with no spaces', () => {
    expect(rottenTomatoesSlug('iZombie')).toBe('izombie')
  })

  it('trims leading/trailing punctuation instead of leaving stray underscores', () => {
    expect(rottenTomatoesSlug('  !Ted Lasso!  ')).toBe('ted_lasso')
  })
})

describe('rottenTomatoesUrl', () => {
  it('builds a full RT TV show URL from the slug', () => {
    expect(rottenTomatoesUrl('Ted Lasso')).toBe('https://www.rottentomatoes.com/tv/ted_lasso')
  })
})
