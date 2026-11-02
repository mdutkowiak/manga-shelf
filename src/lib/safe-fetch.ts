// Moduły Node ładowane są dopiero w czasie wykonania po stronie serwera: pliki scraperów są współdzielone z
// komponentami klienckimi, więc statyczny import 'dns'/'net' zepsułby bundle przeglądarki.
function nodeNet() {
  return process.getBuiltinModule('node:net')
}
function nodeDns() {
  return process.getBuiltinModule('node:dns/promises')
}

const MAX_REDIRECTS = 3

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIp(ip: string): boolean {
  const family = nodeNet().isIP(ip)
  if (family === 4) return isPrivateIPv4(ip)
  if (family === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateIPv4(mapped[1])
    // URL normalizuje ::ffff:127.0.0.1 do postaci szesnastkowej ::ffff:7f00:1
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16)
      const lo = parseInt(mappedHex[2], 16)
      return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return false
  }
  return true
}

/** Rzuca błąd, jeśli URL nie jest publicznym adresem http(s). */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Nieprawidłowy adres URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Dozwolone są tylko adresy http(s)')
  }
  if (url.username || url.password) {
    throw new Error('Adres URL nie może zawierać danych logowania')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new Error('Adres wewnętrzny jest niedozwolony')
  }
  const addresses = nodeNet().isIP(host)
    ? [{ address: host }]
    : await nodeDns().lookup(host, { all: true })
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error('Adres wewnętrzny jest niedozwolony')
  }
  return url
}

/**
 * fetch chroniony przed SSRF: waliduje każdy adres (także po przekierowaniach),
 * ogranicza liczbę przekierowań i czas żądania.
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let current = rawUrl
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const url = await assertPublicUrl(current)
    const res = await fetch(url, {
      ...init,
      redirect: 'manual',
      signal: init.signal ?? AbortSignal.timeout(10_000),
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString()
      continue
    }
    return res
  }
  throw new Error('Zbyt wiele przekierowań')
}
