import changelogRaw from '../../CHANGELOG.md?raw'

export type ChangelogBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export interface ChangelogRelease {
  version: string
  date: string | null
  blocks: ChangelogBlock[]
}

/** Parses CHANGELOG.md's fixed Keep-a-Changelog subset into structured releases. */
export function parseChangelog(raw: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = []
  let current: ChangelogRelease | null = null

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trimEnd()

    const releaseMatch = line.match(/^## \[(.+?)\](?: - (.+))?/)
    if (releaseMatch) {
      current = { version: releaseMatch[1], date: releaseMatch[2] ?? null, blocks: [] }
      releases.push(current)
      continue
    }
    if (!current) continue

    if (line.startsWith('### ')) {
      current.blocks.push({ type: 'heading', text: line.slice(4).trim() })
      continue
    }
    if (line.startsWith('- ')) {
      const last = current.blocks[current.blocks.length - 1]
      if (last?.type === 'list') last.items.push(line.slice(2).trim())
      else current.blocks.push({ type: 'list', items: [line.slice(2).trim()] })
      continue
    }
    if (/^\[.+\]:\s*https?:\/\//.test(line)) continue
    if (line.trim() === '') continue

    const last = current.blocks[current.blocks.length - 1]
    if (last?.type === 'paragraph') last.text += ' ' + line.trim()
    else current.blocks.push({ type: 'paragraph', text: line.trim() })
  }

  return releases.filter((r) => r.blocks.length > 0)
}

export const changelogReleases: ChangelogRelease[] = parseChangelog(changelogRaw)

export const appVersion = __APP_VERSION__
