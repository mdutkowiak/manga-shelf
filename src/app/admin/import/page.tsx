'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCheck, Loader2, Play, RefreshCw, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'

interface RunStats {
  pages?: number
  fetched?: number
  created?: number
  updated?: number
  applied?: number
  skipped?: number
  failed?: number
  notManga?: number
  newPublishers?: string[]
  streams?: Record<string, { pages: number; done: boolean }>
}
interface RunItem {
  id: string
  status: 'RUNNING' | 'DONE' | 'PARTIAL' | 'FAILED'
  mode: string
  trigger: string
  startedAt: string
  finishedAt: string | null
  stats: RunStats | null
  error: string | null
}
interface Overview {
  runs: RunItem[]
  cursors: { stream: string; sinceId: string; doneAt: string | null }[]
  counts: Record<string, number>
  publishersToReview: number
  running: boolean
}
interface RecordItem {
  id: string
  bnId: string
  publisher: { id: string; name: string } | null
  publisherRaw: string
  seriesTitle: string
  originalTitle: string | null
  volumeNumber: number | null
  isbn: string | null
  coverPrice: number | null
  releaseYear: number | null
  releaseMonth: number | null
  special: boolean
  status: 'PENDING' | 'APPLIED' | 'REJECTED' | 'SKIPPED'
  note: string | null
  mangaId: string | null
}
interface PublisherOption {
  id: string
  name: string
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Do zatwierdzenia',
  APPLIED: 'W katalogu',
  SKIPPED: 'Pominięte',
  REJECTED: 'Odrzucone',
}
const RUN_LABELS: Record<RunItem['status'], string> = {
  RUNNING: 'Trwa',
  DONE: 'Zakończony',
  PARTIAL: 'Przerwany limitem czasu (kontynuacja przy następnym uruchomieniu)',
  FAILED: 'Błąd',
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pl-PL') : '-')

export default function AdminImportPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('PENDING')
  const [publisherId, setPublisherId] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [publishers, setPublishers] = useState<PublisherOption[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const pageSize = 50
  const initialised = useRef(false)

  const loadOverview = useCallback(async () => {
    const res = await fetch('/api/admin/import')
    if (res.ok) setOverview(await res.json())
  }, [])

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ status, page: String(page) })
    if (publisherId) params.set('publisherId', publisherId)
    if (debouncedQuery) params.set('q', debouncedQuery)
    try {
      const res = await fetch(`/api/admin/import/records?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRecords(data.records)
      setTotal(data.total)
      setSelected(new Set())
    } catch {
      toastError('Nie udało się wczytać rekordów')
    } finally {
      setLoading(false)
    }
  }, [status, page, publisherId, debouncedQuery])

  useEffect(() => {
    // filtr wydawcy z linku z listy wydawców (?publisherId=...)
    if (!initialised.current) {
      initialised.current = true
      const fromUrl = new URLSearchParams(window.location.search).get('publisherId')
      if (fromUrl) setPublisherId(fromUrl)
    }
    fetch('/api/admin/publishers')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPublishers(d.publishers.map((p: PublisherOption) => ({ id: p.id, name: p.name }))))
      .catch(() => {})
    loadOverview().catch(() => toastError('Nie udało się wczytać stanu importu'))
  }, [loadOverview])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // gdy import trwa, odświeżamy stan co kilka sekund
  useEffect(() => {
    if (!overview?.running) return
    const t = setInterval(() => {
      loadOverview().catch(() => {})
    }, 4000)
    return () => clearInterval(t)
  }, [overview?.running, loadOverview])

  async function startImport(mode: 'incremental' | 'refresh') {
    setBusy('run')
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.started) toastSuccess('Import wystartował', 'Działa w tle, stan odświeża się automatycznie.')
      else toastInfo('Import już trwa')
      await loadOverview()
    } catch {
      toastError('Nie udało się uruchomić importu')
    } finally {
      setBusy(null)
    }
  }

  async function bulk(action: 'approve' | 'reject' | 'reset', ids: string[] | null) {
    setBusy(action)
    let processed = 0
    try {
      // dla filtra serwer przetwarza paczki po 300 rekordów, więc powtarzamy aż do wyczerpania
      for (let i = 0; i < 100; i++) {
        const res = await fetch('/api/admin/import/records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            ...(ids ? { ids } : { filter: { status, publisherId: publisherId || undefined, q: debouncedQuery || undefined } }),
          }),
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        processed += data.processed
        if (ids || data.remaining === 0 || data.processed === 0) break
      }
      toastSuccess(`Przetworzono rekordów: ${processed}`)
      await Promise.all([loadRecords(), loadOverview()])
    } catch {
      toastError('Nie udało się wykonać akcji', processed ? `Przetworzono do tej pory: ${processed}` : undefined)
    } finally {
      setBusy(null)
    }
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const lastRun = overview?.runs[0]
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const canApprove = status === 'PENDING'
  const canReset = status === 'REJECTED' || status === 'SKIPPED'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Import z Biblioteki Narodowej</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Pobiera polskie wydania mang i komiksów azjatyckich: tytuły, tomy, ISBN, daty i ceny okładkowe. Nowi
            wydawcy trafiają na listę wydawców. Pola, które ręcznie zmienisz w katalogu, import zostawia w spokoju.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => startImport('incremental')} disabled={busy !== null || overview?.running} className="min-h-[44px] gap-2">
            {overview?.running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {overview?.running ? 'Import trwa…' : 'Pobierz nowe rekordy'}
          </Button>
          <Button variant="outline" onClick={() => startImport('refresh')} disabled={busy !== null || overview?.running} className="min-h-[44px] gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Odśwież ostatnie lata
          </Button>
        </div>
      </div>

      {overview && overview.publishersToReview > 0 && (
        <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          {overview.publishersToReview} nowych wydawców czeka na sprawdzenie.{' '}
          <Link href="/admin/publishers" className="font-bold underline">
            Przejdź do listy wydawców
          </Link>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(['PENDING', 'APPLIED', 'SKIPPED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
            aria-pressed={status === s}
            className={`rounded-xl border p-4 text-left transition-colors ${
              status === s ? 'border-primary bg-primary/10' : 'border-[var(--control-border)] bg-surface-2 hover:bg-white/5'
            }`}
          >
            <p className="text-sm text-muted-foreground">{STATUS_LABELS[s]}</p>
            <p className="text-2xl font-extrabold tabular-nums">{overview?.counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-white/10 bg-surface-2 p-5" aria-labelledby="runs-h">
        <h2 id="runs-h" className="mb-3 text-lg font-bold">Ostatnie uruchomienia</h2>
        {!overview || overview.runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Import jeszcze nie był uruchamiany. Pierwsze uruchomienie pobiera cały katalog etapami (każde do 10 minut), a
            kolejne tylko nowe rekordy.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {overview.runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <strong>{RUN_LABELS[r.status]}</strong> · {r.mode === 'refresh' ? 'odświeżanie' : 'nowe rekordy'} ·{' '}
                  {r.trigger === 'cron' ? 'automatyczny' : 'ręczny'} · {fmtDate(r.startedAt)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  stron: {r.stats?.pages ?? 0}, nowych: {r.stats?.created ?? 0}, zmienionych: {r.stats?.updated ?? 0}, w katalogu:{' '}
                  {r.stats?.applied ?? 0}
                  {r.stats?.newPublishers?.length ? `, nowi wydawcy: ${r.stats.newPublishers.length}` : ''}
                </span>
                {r.error && <span className="w-full text-rose-300">Błąd: {r.error}</span>}
              </li>
            ))}
          </ul>
        )}
        {lastRun?.stats?.streams && (
          <p className="mt-3 text-xs text-muted-foreground">
            Strumienie: {overview?.cursors.map((c) => `${c.stream}${c.doneAt ? ' (pobrany w całości)' : ' (w trakcie)'}`).join(', ') || 'brak'}
          </p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="queue-h">
        <h2 id="queue-h" className="text-lg font-bold">
          {STATUS_LABELS[status]} <span className="tabular-nums text-muted-foreground">({total})</span>
        </h2>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="imp-q" className="sr-only">Szukaj po tytule lub ISBN</label>
            <Input id="imp-q" placeholder="Szukaj po tytule lub ISBN" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label htmlFor="imp-pub" className="sr-only">Wydawca</label>
            <select
              id="imp-pub"
              value={publisherId}
              onChange={(e) => { setPublisherId(e.target.value); setPage(1) }}
              className="h-11 rounded-lg border border-[var(--control-border)] bg-surface-1 px-3 text-sm"
            >
              <option value="">Wszyscy wydawcy</option>
              <option value="none">Bez wydawcy</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <>
              <Button size="sm" disabled={selected.size === 0 || busy !== null} onClick={() => bulk('approve', [...selected])} className="gap-2">
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Zatwierdź zaznaczone ({selected.size})
              </Button>
              <Button size="sm" variant="outline" disabled={total === 0 || busy !== null} onClick={() => bulk('approve', null)} className="gap-2">
                {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
                Zatwierdź wszystkie z filtra ({total})
              </Button>
            </>
          )}
          {(canApprove || status === 'SKIPPED') && (
            <Button size="sm" variant="outline" disabled={selected.size === 0 || busy !== null} onClick={() => bulk('reject', [...selected])} className="gap-2">
              <XCircle className="h-4 w-4" aria-hidden="true" /> Odrzuć zaznaczone
            </Button>
          )}
          {canReset && (
            <Button size="sm" variant="outline" disabled={selected.size === 0 || busy !== null} onClick={() => bulk('reset', [...selected])} className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Przywróć do zatwierdzenia
            </Button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-surface-1 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 p-3"><span className="sr-only">Zaznacz</span></th>
                <th className="p-3">Seria</th>
                <th className="p-3">Wydawca</th>
                <th className="p-3">Tom</th>
                <th className="p-3">ISBN</th>
                <th className="p-3">Cena</th>
                <th className="p-3">Premiera</th>
                <th className="p-3">Uwagi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" aria-label="Wczytywanie" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Brak rekordów dla tego filtra.</td></tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-white/5">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[var(--primary)]"
                        aria-label={`Zaznacz ${r.seriesTitle} tom ${r.volumeNumber ?? ''}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">{r.seriesTitle}</p>
                      {r.originalTitle && <p className="text-xs text-muted-foreground">{r.originalTitle}</p>}
                    </td>
                    <td className="p-3">{r.publisher?.name ?? <span className="text-muted-foreground">{r.publisherRaw || '-'}</span>}</td>
                    <td className="p-3 tabular-nums">{r.volumeNumber ?? '-'}{r.special && <span className="ml-1 rounded bg-white/10 px-1.5 text-xs">spec.</span>}</td>
                    <td className="p-3 tabular-nums">{r.isbn ?? '-'}</td>
                    <td className="p-3 tabular-nums">{r.coverPrice !== null ? `${r.coverPrice.toFixed(2)} zł` : '-'}</td>
                    <td className="p-3 tabular-nums">{r.releaseYear ? `${r.releaseMonth ? String(r.releaseMonth).padStart(2, '0') + '.' : ''}${r.releaseYear}` : '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.note ?? ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground tabular-nums">Strona {page} z {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Poprzednia</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Następna</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
