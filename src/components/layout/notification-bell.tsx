'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Bell,
  UserPlus,
  Check,
  X,
  Loader2,
  Users,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PendingFriendRequest {
  friendshipId: string
  id: string
  username: string
  name: string | null
  avatar: string | null
}

export function NotificationBell() {
  const { data: session } = useSession()
  const userId = (session?.user as { id?: string })?.id

  const [isOpen, setIsOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/friends?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.pendingReceived && Array.isArray(data.pendingReceived)) {
          setPendingRequests(data.pendingReceived)
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err)
    }
  }, [userId])

  // Polling every 12 seconds and on tab focus so friend requests appear in real time
  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(fetchNotifications, 12000)

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }
    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('mangowo_friends_updated', fetchNotifications)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('mangowo_friends_updated', fetchNotifications)
    }
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAction = async (friendshipId: string, action: 'accept' | 'reject') => {
    setLoadingId(friendshipId)
    try {
      const res = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      })

      if (res.ok) {
        setPendingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId))
        window.dispatchEvent(new Event('mangowo_friends_updated'))
      }
    } catch (err) {
      console.error('Error handling friend action:', err)
    } finally {
      setLoadingId(null)
    }
  }

  const count = pendingRequests.length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button with Ringing Animation when count > 0 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Powiadomienia"
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
          count > 0
            ? 'border-rose-500/50 bg-rose-950/30 text-rose-300 shadow-md shadow-rose-500/20 hover:bg-rose-900/40'
            : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
        }`}
      >
        <Bell
          className={`h-4 w-4 transition-transform duration-300 ${
            count > 0 ? 'animate-[bell-swing_1.2s_ease-in-out_infinite] text-rose-400' : ''
          }`}
        />

        {/* Pulsing red badge */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-md shadow-rose-500/60 ring-2 ring-[#090D16] animate-pulse">
            {count}
          </span>
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-white/15 bg-[#0C101D]/95 p-3 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-black text-white">Powiadomienia</span>
            </div>
            {count > 0 && (
              <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-extrabold text-rose-300">
                {count} {count === 1 ? 'nowe' : 'nowych'}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 py-1 scrollbar-thin scrollbar-thumb-white/10">
            {count === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p>Brak nowych powiadomień</p>
                <p className="text-[10px] text-muted-foreground/60">Gdy ktoś wyśle Ci zaproszenie do znajomych, pojawi się tutaj.</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.friendshipId}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      href={`/users/${req.username}`}
                      onClick={() => setIsOpen(false)}
                      className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-black border border-white/15 hover:scale-105 transition-transform"
                    >
                      {req.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={req.avatar}
                          alt={req.username}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-cyan-950/40 text-xs font-black text-cyan-300">
                          {req.name?.[0] || req.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/users/${req.username}`}
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-bold text-white hover:text-cyan-300 transition-colors truncate block"
                      >
                        {req.name || req.username}
                      </Link>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @{req.username} zaprasza Cię do znajomych
                      </p>
                    </div>
                  </div>

                  {/* Fast Action Buttons: Zaakceptuj & Odrzuć */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAction(req.friendshipId, 'accept')}
                      disabled={loadingId === req.friendshipId}
                      className="flex-1 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/30"
                    >
                      {loadingId === req.friendshipId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Zaakceptuj
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(req.friendshipId, 'reject')}
                      disabled={loadingId === req.friendshipId}
                      className="h-7 rounded-lg border-white/15 text-muted-foreground hover:text-rose-400 hover:border-rose-500/40 text-xs font-medium"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between">
            <Link
              href="/friends"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Wszyscy znajomi
              <ChevronRight className="h-3 w-3" />
            </Link>
            <span className="text-[10px] text-muted-foreground">MangOwO</span>
          </div>
        </div>
      )}
    </div>
  )
}
