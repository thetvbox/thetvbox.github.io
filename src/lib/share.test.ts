import { afterEach, describe, expect, it, vi } from 'vitest'
import { shareOrCopyLink } from './share'

describe('shareOrCopyLink', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share })
    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('shared')
    expect(share).toHaveBeenCalledWith({ title: 'Severance', text: undefined, url: 'https://example.com/show/1' })
  })

  it('falls back to the clipboard when canShare rejects the payload', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const canShare = vi.fn().mockReturnValue(false)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share, canShare, clipboard: { writeText } })

    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('copied')
    expect(share).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledWith('https://example.com/show/1')
  })

  it('reports cancelled without touching the clipboard when the user dismisses the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText } })

    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('falls back to the clipboard when the share sheet fails for another reason', async () => {
    const share = vi.fn().mockRejectedValue(new Error('boom'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share, clipboard: { writeText } })

    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.com/show/1')
  })

  it('copies to the clipboard when the Web Share API is unsupported', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })

    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.com/show/1')
  })

  it('reports failed when neither the share sheet nor the clipboard are available', async () => {
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: undefined })
    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('failed')
  })

  it('reports failed when the clipboard write itself rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { ...navigator, share: undefined, clipboard: { writeText } })

    const result = await shareOrCopyLink({ title: 'Severance', url: 'https://example.com/show/1' })
    expect(result).toBe('failed')
  })

  it('defaults the url to the current page when none is given', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, share })
    await shareOrCopyLink({ title: 'My profile' })
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: window.location.href }))
  })
})
