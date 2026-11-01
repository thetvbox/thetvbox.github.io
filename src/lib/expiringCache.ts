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
}
