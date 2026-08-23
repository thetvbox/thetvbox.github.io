import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerRowMotion } from '../../lib/motion'
import EmptyState from '../EmptyState'
import type { ShowListWithCount } from '../../types'

interface ListsTabProps {
  lists: ShowListWithCount[]
  isMe: boolean
  username: string
  creatingList: boolean
  newListName: string
  onNewListNameChange: (value: string) => void
  savingList: boolean
  onStartCreating: () => void
  onCancelCreating: () => void
  onCreateList: () => void
}

/** Lists tab body -- the owner's curated lists, plus the new-list form. */
export default function ListsTab({
  lists,
  isMe,
  username,
  creatingList,
  newListName,
  onNewListNameChange,
  savingList,
  onStartCreating,
  onCancelCreating,
  onCreateList,
}: ListsTabProps) {
  return (
    <div>
      {isMe && (
        <div className="mb-4">
          {creatingList ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onCreateList()
              }}
              className="flex items-center gap-1.5"
            >
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={(e) => onNewListNameChange(e.target.value)}
                placeholder="List name"
                className="w-full max-w-xs rounded-lg border border-hairline-strong bg-base-900 px-2.5 py-1.5 text-xs text-base-200 placeholder:text-base-600"
              />
              <button
                type="submit"
                disabled={!newListName.trim() || savingList}
                className="shrink-0 rounded-lg bg-accent-500/15 px-2.5 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={onCancelCreating}
                className="shrink-0 text-xs text-base-500 hover:text-base-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={onStartCreating}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500/15 px-3 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40 transition-colors duration-200 hover:bg-accent-500/25"
            >
              <PlusGlyph />
              New list
            </button>
          )}
        </div>
      )}

      {lists.length === 0 ? (
        <EmptyState icon="📋" className="mt-6">
          <p className="text-sm text-base-500">No lists yet.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {lists.map((l, i) => (
            <motion.li key={l.id} {...staggerRowMotion(i, 8)}>
              <Link
                to={`/u/${username}/lists/${l.id}`}
                className="flex items-center justify-between rounded-xl border border-hairline bg-base-850/60 p-3 transition-colors duration-200 hover:bg-base-800/70"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-base-100">{l.name}</p>
                  {l.description && <p className="truncate text-xs text-base-500">{l.description}</p>}
                </div>
                <span className="shrink-0 text-xs text-base-500">
                  {l.itemCount} show{l.itemCount === 1 ? '' : 's'}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PlusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
