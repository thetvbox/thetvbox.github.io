import { describe, expect, it } from 'vitest'
import { offscreenSkipStyle } from './layout'

describe('offscreenSkipStyle', () => {
  it('enables content-visibility with the given size as the placeholder', () => {
    expect(offscreenSkipStyle(72)).toEqual({
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 72px',
    })
  })

  it('reflects a different size in the placeholder value', () => {
    expect(offscreenSkipStyle(300)).toEqual({
      contentVisibility: 'auto',
      containIntrinsicSize: 'auto 300px',
    })
  })
})
