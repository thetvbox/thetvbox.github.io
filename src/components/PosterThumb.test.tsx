import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PosterThumb from './PosterThumb'

describe('PosterThumb', () => {
  it('renders an image when a poster path is given', () => {
    const { container } = render(<PosterThumb posterPath="/abc.jpg" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', expect.stringContaining('/abc.jpg'))
  })

  it('renders no image when posterPath is null', () => {
    const { container } = render(<PosterThumb posterPath={null} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('applies the requested size class', () => {
    const { container } = render(<PosterThumb posterPath={null} size="lg" />)
    expect(container.firstChild).toHaveClass('h-16', 'w-11')
  })

  it('defaults to the md size class', () => {
    const { container } = render(<PosterThumb posterPath={null} />)
    expect(container.firstChild).toHaveClass('h-14', 'w-10')
  })
})
