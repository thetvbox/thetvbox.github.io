import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ExternalRatings from './ExternalRatings'

describe('ExternalRatings', () => {
  it('renders nothing while OMDb is still loading', () => {
    const { container } = render(<ExternalRatings ratings={undefined} imdbId="tt1234567" showName="Lupin" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the IMDb rating linked to the show's IMDb page", () => {
    render(<ExternalRatings ratings={{ imdbRating: 8.4, rottenTomatoesScore: null }} imdbId="tt1234567" />)
    expect(screen.getByText('8.4')).toBeInTheDocument()
    const link = screen.getByRole('img', { name: 'IMDb' }).closest('a')
    expect(link).toHaveAttribute('href', 'https://www.imdb.com/title/tt1234567/')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows the IMDb rating as plain text when there is no IMDb id', () => {
    render(<ExternalRatings ratings={{ imdbRating: 8.4, rottenTomatoesScore: null }} imdbId={null} />)
    expect(screen.getByText('8.4')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'IMDb' }).closest('a')).not.toBeInTheDocument()
  })

  it('shows the Rotten Tomatoes score linked to a Rotten Tomatoes search for the show', () => {
    render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" showName="Breaking Bad" />)
    expect(screen.getByText('92%')).toBeInTheDocument()
    const link = screen.getByTitle('Rotten Tomatoes')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'https://www.rottentomatoes.com/search?search=Breaking%20Bad')
  })

  it('shows the Rotten Tomatoes score as plain text when there is no show name', () => {
    render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 92 }} imdbId="tt1234567" />)
    expect(screen.getByTitle('Rotten Tomatoes').tagName).toBe('SPAN')
  })

  it('shows both scores together', () => {
    render(<ExternalRatings ratings={{ imdbRating: 7.9, rottenTomatoesScore: 45 }} imdbId="tt1234567" showName="Lupin" />)
    expect(screen.getByText('7.9')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.queryByText('Not available')).not.toBeInTheDocument()
  })

  it('says "Not available" for a missing IMDb rating, without a link', () => {
    render(<ExternalRatings ratings={{ imdbRating: null, rottenTomatoesScore: 80 }} imdbId="tt1234567" showName="Lupin" />)
    expect(screen.getByTitle('IMDb')).toHaveTextContent('Not available')
    expect(screen.getByTitle('IMDb').tagName).toBe('SPAN')
  })

  it('says "Not available" for a missing Rotten Tomatoes score, without a link that could 404', () => {
    render(<ExternalRatings ratings={{ imdbRating: 7.5, rottenTomatoesScore: null }} imdbId="tt1234567" showName="Lupin" />)
    expect(screen.getByTitle('Rotten Tomatoes')).toHaveTextContent('Not available')
    expect(screen.getByTitle('Rotten Tomatoes').tagName).toBe('SPAN')
  })

  it('says "Not available" for both when OMDb has nothing for the show', () => {
    render(<ExternalRatings ratings={null} imdbId="tt1234567" showName="Lupin" />)
    expect(screen.getAllByText('Not available')).toHaveLength(2)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
