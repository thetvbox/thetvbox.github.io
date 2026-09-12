import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExternalRatings from './ExternalRatings'

describe('ExternalRatings', () => {
  it('renders nothing while the OMDb lookup has not resolved yet', () => {
    const { container } = render(<ExternalRatings ratings={null} imdbId="tt1234567" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when OMDb has neither score for this show', () => {
    const { container } = render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: null }} imdbId="tt1234567" />)
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

  it('shows the Rotten Tomatoes score', () => {
    render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" />)
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByTitle('Rotten Tomatoes')).toBeInTheDocument()
  })

  it("links the Rotten Tomatoes score to its search results when a show name is given", () => {
    render(
      <ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" showName="Breaking Bad" />,
    )
    const link = screen.getByTitle('Rotten Tomatoes').closest('a')
    expect(link).toHaveAttribute('href', 'https://www.rottentomatoes.com/search?search=Breaking%20Bad')
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
})
