import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { changelogReleases } from '../lib/changelog'
import type { ChangelogBlock } from '../lib/changelog'
import { formatShortDate } from '../lib/date'
import InlinePanel from './InlinePanel'
import PanelHeader from './PanelHeader'

/** Inline read-only "What's new" panel. */
export default function ChangelogPanel({ onClose }: { onClose: () => void }) {
  useEscapeAndFocusReturn(true, onClose)

  return (
    <InlinePanel className="max-h-[70vh] overflow-y-auto p-4">
      <PanelHeader title="What's new" onClose={onClose} />

      {changelogReleases.length === 0 ? (
        <p className="text-xs text-base-500">Nothing logged yet.</p>
      ) : (
        <div className="space-y-6">
          {changelogReleases.map((release) => (
            <div key={release.version}>
              <h3 className="text-sm font-semibold text-base-100">
                {release.version === 'Unreleased' ? 'Unreleased' : `v${release.version}`}
                {release.date && (
                  <span className="ml-1.5 font-normal text-base-500">{formatShortDate(release.date)}</span>
                )}
              </h3>
              <div className="mt-1.5 space-y-1.5">
                {release.blocks.map((block, i) => (
                  <ChangelogBlockView key={i} block={block} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </InlinePanel>
  )
}

function ChangelogBlockView({ block }: { block: ChangelogBlock }) {
  if (block.type === 'heading') {
    return <p className="pt-1 text-xs font-semibold text-accent-400">{block.text}</p>
  }
  if (block.type === 'paragraph') {
    return <p className="text-xs leading-relaxed text-base-400">{block.text}</p>
  }
  return (
    <ul className="space-y-1 text-xs leading-relaxed text-base-300">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="text-base-600">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
