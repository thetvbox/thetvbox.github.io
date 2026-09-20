import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import BottomSheet from './BottomSheet'
import PanelHeader from './PanelHeader'
import EmptyState from './EmptyState'
import ErrorText from './ErrorText'
import Toast from './Toast'
import {
  createPersonalAccessToken,
  fetchPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../lib/personalAccessTokens'
import { useToast } from '../hooks/useToast'
import { formatShortDate } from '../lib/date'
import { errorMessage } from '../lib/format'
import { staggerRowMotion, TRIGGER_SWAP_MOTION } from '../lib/motion'
import type { PersonalAccessTokenSummary } from '../types'

const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-episode-watched`

interface ShortcutsPanelProps {
  userId: string
  onClose: () => void
}

/** Manage-tokens sheet for the Shortcuts/Siri "log an episode" webhook. */
export default function ShortcutsPanel({ userId, onClose }: ShortcutsPanelProps) {
  const [tokens, setTokens] = useState<PersonalAccessTokenSummary[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null)
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const { toast, showInfo, showError, dismiss } = useToast()

  useEffect(() => {
    let cancelled = false
    fetchPersonalAccessTokens(userId)
      .then((rows) => {
        if (!cancelled) setTokens(rows)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, 'Failed to load your tokens.'))
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleCreate() {
    setSaving(true)
    try {
      const { token, summary } = await createPersonalAccessToken(userId, newLabel)
      setTokens((prev) => [summary, ...(prev ?? [])])
      setJustCreatedToken(token)
      setNewLabel('')
      setCreating(false)
    } catch (err) {
      showError(errorMessage(err, 'Failed to create a token. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyToken() {
    if (!justCreatedToken) return
    try {
      await navigator.clipboard.writeText(justCreatedToken)
      showInfo('Token copied to clipboard')
    } catch {
      showError('Failed to copy. Select and copy the token manually.')
    }
  }

  async function handleRevoke(id: string) {
    setConfirmingRevokeId(null)
    setRevokingId(id)
    const previous = tokens
    setTokens((prev) => prev?.filter((t) => t.id !== id))
    try {
      await revokePersonalAccessToken(id)
    } catch {
      setTokens(previous)
      showError('Failed to revoke this token. Try again.')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <BottomSheet onClose={onClose} label="Shortcuts & Siri" className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
      <PanelHeader title="Shortcuts & Siri" onClose={onClose} icon={<ShortcutIcon />} />

      <p className="mb-4 text-sm leading-relaxed text-base-400">
        Create a token to log episodes from an iOS Shortcut (and Siri) without opening the app.
      </p>

      {justCreatedToken && (
        <div className="mb-4 rounded-xl border border-accent-500/40 bg-accent-500/10 p-3">
          <p className="mb-2 text-xs font-medium text-accent-300">
            Copy this now -- you won&apos;t be able to see it again.
          </p>
          <code className="block break-all rounded-lg bg-base-950/60 px-2.5 py-2 text-[11px] text-base-200">
            {justCreatedToken}
          </code>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyToken}
              className="rounded-lg bg-accent-500/15 px-2.5 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40 transition-colors duration-200 hover:bg-accent-500/25"
            >
              Copy token
            </button>
            <button
              type="button"
              onClick={() => setJustCreatedToken(null)}
              className="text-xs text-base-500 hover:text-base-300"
            >
              Done
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-base-500">
            POST it as a Bearer token to <code className="text-base-400">{WEBHOOK_URL}</code>. See the
            Edge Function&apos;s README for the exact request shape and a step-by-step Shortcuts setup.
          </p>
        </div>
      )}

      {loadError && <ErrorText className="mb-3">{loadError}</ErrorText>}

      {tokens === undefined ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-base-850/70" />
          ))}
        </div>
      ) : tokens.length === 0 && !creating ? (
        <EmptyState icon="✨" className="mt-2 py-10">
          <p className="text-sm text-base-500">No tokens yet.</p>
        </EmptyState>
      ) : (
        <ul className="mb-3 space-y-2">
          {tokens.map((t, i) => (
            <motion.li
              key={t.id}
              {...staggerRowMotion(i, 8)}
              className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-base-850/60 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-base-100">{t.label}</p>
                <p className="text-xs text-base-500">
                  Created {formatShortDate(t.created_at)} ·{' '}
                  {t.last_used_at ? `Last used ${formatShortDate(t.last_used_at)}` : 'Never used'}
                </p>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {confirmingRevokeId === t.id ? (
                  <motion.div key="confirm" className="flex shrink-0 items-center gap-1.5" {...TRIGGER_SWAP_MOTION}>
                    <button
                      type="button"
                      disabled={revokingId === t.id}
                      onClick={() => handleRevoke(t.id)}
                      className="rounded-lg bg-danger/15 px-2.5 py-1.5 text-xs font-medium text-danger ring-1 ring-danger/40 transition-opacity duration-150 disabled:opacity-60"
                    >
                      {revokingId === t.id ? 'Revoking…' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRevokeId(null)}
                      className="text-xs text-base-500 hover:text-base-300"
                    >
                      Cancel
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="trigger"
                    type="button"
                    onClick={() => setConfirmingRevokeId(t.id)}
                    className="shrink-0 rounded-lg border border-hairline-strong px-2.5 py-1.5 text-xs text-base-400 transition-colors duration-200 hover:border-danger/40 hover:text-danger"
                    {...TRIGGER_SWAP_MOTION}
                  >
                    Revoke
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      )}

      {creating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
          className="flex items-center gap-1.5"
        >
          <input
            autoFocus
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. iPhone Shortcuts"
            className="w-full rounded-lg border border-hairline-strong bg-base-900 px-2.5 py-1.5 text-xs text-base-200 placeholder:text-base-600"
          />
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 rounded-lg bg-accent-500/15 px-2.5 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="shrink-0 text-xs text-base-500 hover:text-base-300"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500/15 px-3 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40 transition-colors duration-200 hover:bg-accent-500/25"
        >
          New token
        </button>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </BottomSheet>
  )
}

function ShortcutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />
    </svg>
  )
}
