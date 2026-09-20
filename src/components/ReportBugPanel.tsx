import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { submitBugReport } from '../lib/bugReport'
import { appVersion } from '../lib/changelog'
import { useDesktopAutoFocus } from '../hooks/useDesktopAutoFocus'
import { BUG_REPORT_DESCRIPTION_MAX_LENGTH, BUG_REPORT_TITLE_MAX_LENGTH } from '../lib/constants'
import { errorMessage } from '../lib/format'
import ErrorText from './ErrorText'
import Modal from './Modal'
import PanelHeader from './PanelHeader'

type Status = 'idle' | 'saving' | 'success' | 'error'

/** Centered modal bug-report form, opened from Profile's More menu -- tucked away from the
 * minimal top bar the same way Settings/Help are tucked behind an account screen in most
 * native apps, rather than living as a persistent icon in the chrome. */
export default function ReportBugPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; number: number } | null>(null)
  const titleInputRef = useDesktopAutoFocus(true)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (status === 'saving') return
    if (!title.trim() || !description.trim()) return
    setStatus('saving')
    setError(null)
    try {
      const res = await submitBugReport({
        title: title.trim(),
        description: description.trim(),
        username: user?.username,
        page: location.pathname,
        appVersion,
        userAgent: navigator.userAgent,
      })
      setResult(res)
      setStatus('success')
    } catch (err) {
      setError(errorMessage(err, 'Failed to submit your report. Try again.'))
      setStatus('error')
    }
  }

  return (
    <Modal onClose={onClose} label="Report a bug" className="p-6">
      {status === 'success' && result ? (
        <div>
          <p className="font-display text-lg font-semibold text-base-100">Thanks for the report</p>
          <p className="mt-1.5 text-sm text-base-400">Filed as issue #{result.number}.</p>
          <div className="mt-5 flex items-center gap-4">
            <a href={result.url} target="_blank" rel="noreferrer" className="text-sm text-accent-400 hover:underline">
              View on GitHub &rarr;
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm text-base-300 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <PanelHeader title="Report a bug" onClose={onClose} />
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <input
              ref={titleInputRef}
              type="text"
              aria-label="Bug title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What went wrong, in a few words"
              maxLength={BUG_REPORT_TITLE_MAX_LENGTH}
              className="rounded-lg border border-hairline-strong bg-base-950 px-3 py-2.5 text-sm text-base-200 placeholder:text-base-600"
            />
            <textarea
              aria-label="Bug description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, and what did you expect instead?"
              rows={5}
              maxLength={BUG_REPORT_DESCRIPTION_MAX_LENGTH}
              className="resize-none rounded-lg border border-hairline-strong bg-base-950 px-3 py-2.5 text-sm text-base-200 placeholder:text-base-600"
            />
            <p className="text-xs text-base-600">
              Sent with the page you&apos;re on, your username, and the app version — no screenshot needed.
            </p>
            {error && <ErrorText className="text-xs">{error}</ErrorText>}
            <div className="mt-1 flex items-center gap-3">
              <button
                type="submit"
                disabled={status === 'saving' || !title.trim() || !description.trim()}
                className="rounded-lg bg-accent-500/15 px-4 py-2 text-sm font-medium text-accent-300 ring-1 ring-accent-500/40 transition-opacity duration-150 disabled:opacity-50"
              >
                {status === 'saving' ? 'Sending…' : 'Send report'}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-base-500 hover:text-base-300">
                Cancel
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}
