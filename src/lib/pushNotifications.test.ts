import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'
import { STORAGE_KEYS } from './constants'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  hasSeenPushOnboarding,
  isPushSubscribed,
  isPushSupported,
  markPushOnboardingSeen,
  shouldOfferPushOnboarding,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
} from './pushNotifications'

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

function stubServiceWorker(pushManager: Record<string, unknown>) {
  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: { ready: Promise.resolve({ pushManager }) },
  })
  vi.stubGlobal('PushManager', class {})
}

function stubNotificationPermission(permission: NotificationPermission) {
  vi.stubGlobal('Notification', { permission })
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isPushSupported', () => {
  it('is true when serviceWorker and PushManager are both available', () => {
    stubServiceWorker({})
    expect(isPushSupported()).toBe(true)
  })

  it('is false when PushManager is missing', () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: {} })
    expect(isPushSupported()).toBe(false)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('decodes a URL-safe base64 string into the matching bytes', () => {
    // "hello" -> base64 "aGVsbG8=" -> url-safe "aGVsbG8"
    const bytes = urlBase64ToUint8Array('aGVsbG8')
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
  })

  it('handles the -/_ url-safe substitutions', () => {
    // Bytes 0xfb 0xff encode to base64 "-/8=" in standard form, "-_8" url-safe.
    const bytes = urlBase64ToUint8Array('-_8')
    expect(Array.from(bytes)).toEqual([0xfb, 0xff])
  })
})

describe('isPushSubscribed', () => {
  it('is false when push is unsupported', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: {} })
    expect(await isPushSubscribed()).toBe(false)
  })

  it('is true when there is an active subscription', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/1' }) })
    expect(await isPushSubscribed()).toBe(true)
  })

  it('is false when there is no active subscription', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue(null) })
    expect(await isPushSubscribed()).toBe(false)
  })
})

describe('subscribeToPush', () => {
  it('throws when push is unsupported', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: {} })
    await expect(subscribeToPush('u1')).rejects.toThrow('Push notifications are not supported in this browser.')
  })

  it('subscribes and saves the subscription for the user', async () => {
    const builder = mockFrom({ data: null, error: null })
    const subscribe = vi.fn().mockResolvedValue({
      toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'pk', auth: 'ak' } }),
    })
    stubServiceWorker({ subscribe })

    await subscribeToPush('u1')

    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) }),
    )
    expect(builder.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', endpoint: 'https://push.example/1', p256dh: 'pk', auth: 'ak' },
      { onConflict: 'endpoint' },
    )
  })

  it('throws when the subscription is missing expected fields', async () => {
    const subscribe = vi.fn().mockResolvedValue({ toJSON: () => ({}) })
    stubServiceWorker({ subscribe })
    await expect(subscribeToPush('u1')).rejects.toThrow('Could not read the push subscription details.')
  })

  it('throws when saving the subscription fails', async () => {
    mockFrom({ data: null, error: { message: 'boom' } })
    const subscribe = vi.fn().mockResolvedValue({
      toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'pk', auth: 'ak' } }),
    })
    stubServiceWorker({ subscribe })
    await expect(subscribeToPush('u1')).rejects.toEqual({ message: 'boom' })
  })
})

describe('unsubscribeFromPush', () => {
  it('is a no-op when push is unsupported', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: {} })
    await expect(unsubscribeFromPush()).resolves.toBeUndefined()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('is a no-op when there is no active subscription', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue(null) })
    await unsubscribeFromPush()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('unsubscribes and removes the saved row', async () => {
    const builder = mockFrom({ data: null, error: null })
    const unsubscribe = vi.fn().mockResolvedValue(true)
    stubServiceWorker({
      getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/1', unsubscribe }),
    })

    await unsubscribeFromPush()

    expect(unsubscribe).toHaveBeenCalled()
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('endpoint', 'https://push.example/1')
  })

  it('throws when removing the saved row fails', async () => {
    mockFrom({ data: null, error: { message: 'boom' } })
    stubServiceWorker({
      getSubscription: vi.fn().mockResolvedValue({
        endpoint: 'https://push.example/1',
        unsubscribe: vi.fn().mockResolvedValue(true),
      }),
    })
    await expect(unsubscribeFromPush()).rejects.toEqual({ message: 'boom' })
  })
})


describe('hasSeenPushOnboarding / markPushOnboardingSeen', () => {
  it('is false until the prompt has been marked seen', () => {
    expect(hasSeenPushOnboarding()).toBe(false)
    markPushOnboardingSeen()
    expect(hasSeenPushOnboarding()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.pushOnboardingSeen)).toBe('1')
  })
})

describe('shouldOfferPushOnboarding', () => {
  it('is true when supported, undecided, unsubscribed, and not yet seen', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue(null) })
    stubNotificationPermission('default')
    expect(await shouldOfferPushOnboarding()).toBe(true)
  })

  it('is false once already marked seen', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue(null) })
    stubNotificationPermission('default')
    markPushOnboardingSeen()
    expect(await shouldOfferPushOnboarding()).toBe(false)
  })

  it('is false when push is unsupported', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: {} })
    expect(await shouldOfferPushOnboarding()).toBe(false)
  })

  it('is false when the browser permission has already been decided', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue(null) })
    stubNotificationPermission('granted')
    expect(await shouldOfferPushOnboarding()).toBe(false)
  })

  it('is false when this device is already subscribed', async () => {
    stubServiceWorker({ getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/1' }) })
    stubNotificationPermission('default')
    expect(await shouldOfferPushOnboarding()).toBe(false)
  })
})
