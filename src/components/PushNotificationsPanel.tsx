import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import PanelHeader from './PanelHeader'
import Toast from './Toast'
import { isPushSubscribed, isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications'
import { useToast } from '../hooks/useToast'
import { errorMessage } from '../lib/format'

interface PushNotificationsPanelProps {
  userId: string
  onClose: () => void
}

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

/** Enable/disable sheet for Web Push notifications on this device. */
export default function PushNotificationsPanel({ userId, onClose }: PushNotificationsPanelProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const { toast, showError, dismiss } = useToast()

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isPushSupported()) {
        if (!cancelled) setStatus('unsupported')
        return
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        if (!cancelled) setStatus('denied')
        return
      }
      const subscribed = await isPushSubscribed()
      if (!cancelled) setStatus(subscribed ? 'subscribed' : 'unsubscribed')
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleEnable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'unsubscribed')
        return
      }
      await subscribeToPush(userId)
      setStatus('subscribed')
    } catch (err) {
      showError(errorMessage(err, 'Failed to enable push notifications. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setStatus('unsubscribed')
    } catch (err) {
      showError(errorMessage(err, 'Failed to disable push notifications. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} label="Push Notifications" className="p-4">
      <PanelHeader title="Push Notifications" onClose={onClose} />

      {status === 'loading' && <div className="h-14 animate-pulse rounded-xl bg-base-850/70" />}

      {status === 'unsupported' && (
        <p className="text-xs leading-relaxed text-base-500">
          This browser doesn&apos;t support push notifications. Try a recent version of Chrome, Safari, or
          Edge, or install TV Box to your home screen first.
        </p>
      )}

      {status === 'denied' && (
        <p className="text-xs leading-relaxed text-base-500">
          Notifications are blocked for TV Box in this browser. Allow them in your browser or system
          settings, then reopen this panel.
        </p>
      )}

      {status === 'unsubscribed' && (
        <>
          <p className="mb-4 text-xs leading-relaxed text-base-500">
            Get a notification on this device when someone follows you, rates a show you follow, or
            finishes one.
          </p>
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="w-full min-h-11 rounded-lg bg-accent-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition-colors duration-200 hover:bg-accent-600 disabled:opacity-50"
          >
            {busy ? 'Enabling…' : 'Enable push notifications'}
          </button>
        </>
      )}

      {status === 'subscribed' && (
        <>
          <p className="mb-4 text-xs leading-relaxed text-base-500">
            Push notifications are on for this device.
          </p>
          <button
            type="button"
            onClick={handleDisable}
            disabled={busy}
            className="w-full min-h-11 rounded-lg border border-hairline-strong py-2.5 text-sm font-medium text-base-300 transition-colors duration-200 hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            {busy ? 'Disabling…' : 'Disable on this device'}
          </button>
        </>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </BottomSheet>
  )
}
