import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { submitBugReport } from '../lib/bugReport'
import { appVersion } from '../lib/changelog'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { useDesktopAutoFocus } from '../hooks/useDesktopAutoFocus'
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate'
import {
  MODAL_BACKDROP_ANIMATE,
  MODAL_BACKDROP_EXIT,
  MODAL_BACKDROP_INITIAL,
  MODAL_BACKDROP_TRANSITION,
  MODAL_PANEL_ANIMATE,
  MODAL_PANEL_EXIT,
  MODAL_PANEL_INITIAL,
  MODAL_PANEL_TRANSITION,
} from '../lib/motion'

/** Top-bar trigger for a centered modal (this app's only one -- everything
 * else toggled from the top bar is an inline dropdown anchored under its
 * trigger, but a short bug-report form reads better as a proper dialog than
 * a cramped corner popup). */
interface ReportBugButtonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Controlled by Navbar so opening this closes NotificationsBell's panel and
 * vice versa -- see Navbar's `openPanel` state. */
export default function ReportBugButton({ open, onOpenChange }: ReportBugButtonProps) {
  // Navbar never unmounts across route changes -- without this, tapping a
  // nav link while this panel is open leaves it floating over the new page.
  useCloseOnNavigate(() => onOpenChange(false))

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Report a bug"
        aria-expanded={open}
        title="Report a bug"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base-400 transition duration-200 hover:bg-hover hover:text-base-100 active:scale-90"
      >
        <BugGlyph />
      </button>
      <AnimatePresence>{open && <ReportBugPanel onClose={() => onOpenChange(false)} />}</AnimatePresence>
    </>
  )
}

function BugGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <rect x="6" y="9" width="12" height="10" rx="5" />
      <path d="M6 13H3M21 13h-3M9 5 7.5 3.5M15 5l1.5-1.5M6 17l-2 2M18 17l2 2" />
    </svg>
  )
}

type Status = 'idle' | 'saving' | 'success' | 'error'

function ReportBugPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; number: number } | null>(null)
  // Desktop-only autofocus -- see the hook. On mobile, autofocusing here
  // would pop the keyboard the instant the bug icon is tapped, before the
  // panel has even settled into place.
  const titleInputRef = useDesktopAutoFocus(true)

  useEscapeAndFocusReturn(true, onClose)

  // A background page scrolling behind a centered modal reads as broken --
  // none of this app's other top-bar panels need this, since they're inline
  // dropdowns that don't cover the page.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // The submit button is disabled while saving, but a native form still
    // submits on Enter from the title field regardless of that -- without
    // this guard, pressing Enter again during a slow request re-fires
    // handleSubmit and files a second, duplicate issue.
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
      setError(err instanceof Error ? err.message : 'Failed to submit your report. Try again.')
      setStatus('error')
    }
  }

  // Portaled straight to <body>: this component mounts inside Navbar's
  // <header>, which has backdrop-blur-md -- backdrop-filter (like filter)
  // creates a containing block for position:fixed descendants, so without
  // the portal `inset-0` below resolves against the ~72px header bar
  // instead of the viewport, squeezing the whole dialog into it. Confirmed
  // live on both desktop and mobile before this fix; broken on both, just
  // more obviously so on the shorter mobile viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={MODAL_BACKDROP_INITIAL}
        animate={MODAL_BACKDROP_ANIMATE}
        exit={MODAL_BACKDROP_EXIT}
        transition={MODAL_BACKDROP_TRANSITION}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Report a bug"
        initial={MODAL_PANEL_INITIAL}
        animate={MODAL_PANEL_ANIMATE}
        exit={MODAL_PANEL_EXIT}
        transition={MODAL_PANEL_TRANSITION}
        className="relative z-10 w-full max-w-md rounded-2xl border border-hairline-strong bg-base-900 p-6 shadow-2xl shadow-black/40"
      >
        {status === 'success' && result ? (
          <div>
            <p className="font-display text-lg font-semibold text-base-100">Thanks for the report</p>
            <p className="mt-1.5 text-sm text-base-400">Filed as issue #{result.number}.</p>
            <div className="mt-5 flex items-center gap-4">
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent-400 hover:underline"
              >
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-lg font-semibold text-base-100">Report a bug</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base-500 transition-colors duration-200 hover:bg-hover hover:text-base-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <input
              ref={titleInputRef}
              type="text"
              aria-label="Bug title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What went wrong, in a few words"
              maxLength={200}
              className="rounded-lg border border-hairline-strong bg-base-950 px-3 py-2.5 text-sm text-base-200 placeholder:text-base-600"
            />
            <textarea
              aria-label="Bug description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, and what did you expect instead?"
              rows={5}
              maxLength={4000}
              className="resize-none rounded-lg border border-hairline-strong bg-base-950 px-3 py-2.5 text-sm text-base-200 placeholder:text-base-600"
            />
            <p className="text-xs text-base-600">
              Sent with the page you&apos;re on, your username, and the app version — no screenshot needed.
            </p>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="mt-1 flex items-center gap-3">
              <button
                type="submit"
                disabled={status === 'saving' || !title.trim() || !description.trim()}
                className="rounded-lg bg-accent-500/15 px-4 py-2 text-sm font-medium text-accent-300 ring-1 ring-accent-500/40 transition-opacity duration-150 disabled:opacity-50"
              >
                {status === 'saving' ? 'Sending…' : 'Send report'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-base-500 hover:text-base-300"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>,
    document.body,
  )
}
