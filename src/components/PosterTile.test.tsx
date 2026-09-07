import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PosterTile from './PosterTile'

describe('PosterTile', () => {
  it('renders an image when a poster path is given', () => {
    render(<PosterTile posterPath="/abc.jpg" name="Show One" />)
    const img = screen.getByRole('img', { name: 'Show One' })
    expect(img).toHaveAttribute('src', expect.stringContaining('/abc.jpg'))
  })

  it('falls back to the show name as text when there is no poster', () => {
    render(<PosterTile posterPath={null} name="Show One" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Show One')).toBeInTheDocument()
  })

  it('renders children as overlays on top of the art', () => {
    render(
      <PosterTile posterPath={null} name="Show One">
        <span>Badge</span>
      </PosterTile>,
    )
    expect(screen.getByText('Badge')).toBeInTheDocument()
  })
})
