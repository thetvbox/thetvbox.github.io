import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExternalRatings from './ExternalRatings'

describe('ExternalRatings', () => {
  it('renders nothing when there is no OMDb data and no show name to guess an RT link from', () => {
    const { container } = render(<ExternalRatings ratings={null} imdbId="tt1234567" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when OMDb has resolved with neither score and there is no show name', () => {
    const { container } = render(
      <ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: null }} imdbId="tt1234567" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the IMDb rating linked to the show\'s IMDb page', () => {
    render(<ExternalRatings ratings={{ imdbRating: 8.4, rottenTomatoesScore: null }} imdbId="tt1234567" />)
    expect(screen.getByText('IMDb')).toBeInTheDocument()
    expect(screen.getByText('8.4')).toBeInTheDocument()
    const link = screen.getByText('IMDb').closest('a')
    expect(link).toHaveAttribute('href', 'https://www.imdb.com/title/tt1234567/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows the IMDb rating as plain text (not a link) when there is no IMDb id', () => {
    render(<ExternalRatings ratings={{ imdbRating: 8.4, rottenTomatoesScore: null }} imdbId={null} />)
    expect(screen.getByText('IMDb')).toBeInTheDocument()
    expect(screen.getByText('IMDb').closest('a')).not.toBeInTheDocument()
  })

  it('shows the Rotten Tomatoes score once OMDb has resolved one, labeled so it reads as RT and not just a percentage', () => {
    render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" />)
    expect(screen.getByText('RT')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByTitle('Rotten Tomatoes')).toBeInTheDocument()
  })

  it("links the Rotten Tomatoes score straight to its guessed RT show page when a show name is given", () => {
    render(
      <ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" showName="Breaking Bad" />,
    )
    const link = screen.getByTitle('Rotten Tomatoes').closest('a')
    expect(link).toHaveAttribute('href', 'https://www.rottentomatoes.com/tv/breaking_bad')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows the Rotten Tomatoes score as plain text (not a link) when there is no show name', () => {
    render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" />)
    expect(screen.getByTitle('Rotten Tomatoes').closest('a')).not.toBeInTheDocument()
  })

  it('shows both scores together', () => {
    render(<ExternalRatings ratings={{ imdbRating: 7.9, rottenTomatoesScore: 45 }} imdbId="tt1234567" />)
    expect(screen.getByText('7.9')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows the Rotten Tomatoes icon, linked, with a "click to see score" hint before OMDb has resolved at all -- as long as a show name is known', () => {
    render(<ExternalRatings ratings={null} imdbId="tt1234567" showName="Ted Lasso" />)
    const link = screen.getByTitle('Rotten Tomatoes').closest('a')
    expect(link).toHaveAttribute('href', 'https://www.rottentomatoes.com/tv/ted_lasso')
    expect(screen.getByText('RT')).toBeInTheDocument()
    expect(screen.getByText('Click to see score')).toBeInTheDocument()
    // No score to show yet -- just the badge, the icon, the hint, and the link.
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
  })

  it('keeps showing the Rotten Tomatoes icon, linked, with the same hint when OMDb resolves with no score for this show', () => {
    render(
      <ExternalRatings
        ratings={{ imdbRating: 8.0, rottenTomatoesScore: null }}
        imdbId="tt1234567"
        showName="Ted Lasso"
      />,
    )
    const link = screen.getByTitle('Rotten Tomatoes').closest('a')
    expect(link).toHaveAttribute('href', 'https://www.rottentomatoes.com/tv/ted_lasso')
    expect(screen.getByText('Click to see score')).toBeInTheDocument()
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
  })
})
