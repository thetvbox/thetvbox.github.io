import { describe, expect, it } from 'vitest'
import { parseChangelog } from './changelog'

describe('parseChangelog', () => {
  it('parses a release heading with a version and date', () => {
    const releases = parseChangelog('## [1.2.0] - 2024-05-01\n### Added\n- New thing\n')
    expect(releases).toHaveLength(1)
    expect(releases[0]).toMatchObject({ version: '1.2.0', date: '2024-05-01' })
  })

  it('parses a release heading with no date (e.g. Unreleased)', () => {
    const releases = parseChangelog('## [Unreleased]\n### Added\n- Something\n')
    expect(releases[0]).toMatchObject({ version: 'Unreleased', date: null })
  })

  it('groups consecutive "- " lines into one list block', () => {
    const releases = parseChangelog('## [1.0.0]\n### Added\n- First\n- Second\n- Third\n')
    expect(releases[0].blocks).toEqual([
      { type: 'heading', text: 'Added' },
      { type: 'list', items: ['First', 'Second', 'Third'] },
    ])
  })

  it('merges consecutive non-list lines into one paragraph block', () => {
    const releases = parseChangelog('## [1.0.0]\nFirst line.\nSecond line.\n')
    expect(releases[0].blocks).toEqual([{ type: 'paragraph', text: 'First line. Second line.' }])
  })

  it('starts a new list block after a paragraph interrupts a previous list', () => {
    const releases = parseChangelog('## [1.0.0]\n- Item one\nSome prose.\n- Item two\n')
    expect(releases[0].blocks).toEqual([
      { type: 'list', items: ['Item one'] },
      { type: 'paragraph', text: 'Some prose.' },
      { type: 'list', items: ['Item two'] },
    ])
  })

  it('ignores markdown reference-link definition lines', () => {
    const releases = parseChangelog('## [1.0.0]\n- Item\n[1.0.0]: https://example.com/compare/a...b\n')
    expect(releases[0].blocks).toEqual([{ type: 'list', items: ['Item'] }])
  })

  it('ignores blank lines and content before the first release heading', () => {
    const releases = parseChangelog('# Changelog\n\nSome intro text.\n\n## [1.0.0]\n- Item\n')
    expect(releases).toHaveLength(1)
    expect(releases[0].blocks).toEqual([{ type: 'list', items: ['Item'] }])
  })

  it('drops releases that end up with no blocks', () => {
    const releases = parseChangelog('## [1.0.0]\n## [2.0.0]\n- Item\n')
    expect(releases).toHaveLength(1)
    expect(releases[0].version).toBe('2.0.0')
  })

  it('returns an empty array for empty input', () => {
    expect(parseChangelog('')).toEqual([])
  })

  it('parses multiple releases in document order', () => {
    const releases = parseChangelog('## [2.0.0] - 2024-06-01\n- New\n## [1.0.0] - 2024-01-01\n- Old\n')
    expect(releases.map((r) => r.version)).toEqual(['2.0.0', '1.0.0'])
  })
})
