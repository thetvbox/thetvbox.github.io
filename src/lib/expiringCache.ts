/** A Map whose entries expire after `ttlMs`, so a tab left open for days still picks up new seasons and episodes. */
export class ExpiringCache<K, V> {
  private readonly entries = new Map<K, { value: V; storedAt: number }>()
  private readonly ttlMs: number
  private readonly now: () => number

  constructor(ttlMs: number, now: () => number = () => Date.now()) {
    this.ttlMs = ttlMs
    this.now = now
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (this.now() - entry.storedAt >= this.ttlMs) {
      this.entries.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: K, value: V): void {
    this.entries.set(key, { value, storedAt: this.now() })
  }

  delete(key: K): void {
    this.entries.delete(key)
  }
}

/** Returns the cached promise for `key`, or starts `load` and caches its promise so concurrent callers share one request; a rejected load is dropped so the next call retries. */
export function getOrLoad<K, V>(cache: ExpiringCache<K, Promise<V>>, key: K, load: () => Promise<V>): Promise<V> {
  const cached = cache.get(key)
  if (cached) return cached
  const pending = load()
  cache.set(key, pending)
  pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key)
  })
  return pending
}
