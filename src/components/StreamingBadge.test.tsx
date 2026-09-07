import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StreamingBadge from './StreamingBadge'

describe('StreamingBadge', () => {
  it('renders nothing when provider is null', () => {
    const { container } = render(<StreamingBadge provider={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when provider is undefined', () => {
    const { container } = render(<StreamingBadge provider={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the provider has no logo', () => {
    const { container } = render(<StreamingBadge provider={{ provider_name: 'Netflix', logo_path: null }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a titled badge with the logo when both are present', () => {
    const { container } = render(<StreamingBadge provider={{ provider_name: 'Netflix', logo_path: '/n.png' }} />)
    expect(container.querySelector('[title="Netflix"]')).toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringContaining('/n.png'))
  })
})
