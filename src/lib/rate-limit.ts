interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Prosty limiter w pamięci procesu (wystarczający dla pojedynczej instancji).
 * Zwraca true, gdy limit został przekroczony.
 */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  bucket.count++
  return bucket.count > max
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}
