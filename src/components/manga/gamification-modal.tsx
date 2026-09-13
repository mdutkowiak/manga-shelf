'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Pin,
  PinOff,
  Flame,
  Award,
  Layers,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import {
  RANK_TIERS,
  getLevelProgress,
  calculateLevel,
  evaluateAchievements,
  ACHIEVEMENTS,
  type EvaluatedAchievement,
} from '@/lib/gamification'
import { getSavedCollection } from '@/lib/collection-store'

interface GamificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userXP?: number
}

export function GamificationModal({
  open,
  onOpenChange,
  userXP = 0,
}: GamificationModalProps) {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'achievements' | 'ladder'>('achievements')
  const [pinnedBadges, setPinnedBadges] = useState<string[]>([])
  const [savingPin, setSavingPin] = useState(false)

  const currentLevel = calculateLevel(userXP)
  const { currentTier, percentage, remainingXP, nextXP } = getLevelProgress(userXP)

  // Evaluate achievements based on user's real collection
  const achievements = useMemo<EvaluatedAchievement[]>(() => {
    if (typeof window === 'undefined') return []
    const col = getSavedCollection()
    return evaluateAchievements(col, userXP)
  }, [userXP, open])

  // Fetch current user's pinned badges
  useEffect(() => {
    if (!open || !session?.user?.id) return
    fetch(`/api/users/me?userId=${session.user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.pinnedBadges) {
          setPinnedBadges(data.user.pinnedBadges)
        }
      })
      .catch(() => {})
  }, [open, session?.user?.id])

  // Toggle pin/unpin badge for profile showcase (max 4)
  const handleTogglePin = async (badgeId: string) => {
    if (!session?.user?.id) return
    setSavingPin(true)

    const isAlreadyPinned = pinnedBadges.includes(badgeId)
    let nextPinned: string[]

    if (isAlreadyPinned) {
      nextPinned = pinnedBadges.filter((id) => id !== badgeId)
    } else {
      if (pinnedBadges.length >= 4) {
        alert('Możesz wyróżnić maksymalnie 4 osiągnięcia w swojej gablotce!')
        setSavingPin(false)
        return
      }
      nextPinned = [...pinnedBadges, badgeId]
    }

    setPinnedBadges(nextPinned)

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          pinnedBadges: nextPinned,
        }),
      })

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('mangowo_user_updated'))
      }
    } catch (err) {
      console.error('Error saving pinned badges:', err)
    } finally {
      setSavingPin(false)
    }
  }

  const completedCount = achievements.filter((a) => a.completed).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#090D18]/98 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header Hero Banner */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-purple-950/60 via-[#0B1020] to-cyan-950/40 shrink-0">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-[11px] font-bold text-purple-300">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Grywalizacja i Rangi Kolekcjonera</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">
                  Gablotka profilowa: <strong className="text-cyan-300">{pinnedBadges.length}/4</strong> przypiętych
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
                  <span className="text-2xl">{currentTier.badgeIcon}</span>
                  <span>{currentTier.title}</span>
                  <Badge className="bg-purple-600/30 border-purple-400/50 text-purple-200 text-xs font-black">
                    Poziom {currentLevel}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {currentTier.description}
                </DialogDescription>
              </div>

              {/* Quick Level Progress Capsule */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 min-w-[220px] shrink-0">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-purple-300">{userXP} XP</span>
                  <span className="text-muted-foreground text-[10px]">Następny cel: {nextXP} XP</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1 font-semibold">
                  <span>Postęp rangi: {percentage}%</span>
                  <span>Pozostało: {remainingXP} XP</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'achievements'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md'
                  : 'bg-white/5 text-muted-foreground hover:text-white border border-white/5'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Osiągnięcia ({completedCount}/{achievements.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ladder')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'ladder'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-white/5 text-muted-foreground hover:text-white border border-white/5'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Drabinka Poziomów (16 Rang • do 100+ Lvl)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Zadania i Odznaki Kolekcjonerskie
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Wykonuj zadania, zdobywaj punkty doświadczenia i przypinaj do 4 odznak w swojej gablotce profilowej!
                  </p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-extrabold">
                  Zdobyto {completedCount} z {achievements.length}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {achievements.map((ach) => {
                  const isPinned = pinnedBadges.includes(ach.id)
                  return (
                    <div
                      key={ach.id}
                      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all ${
                        ach.completed
                          ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-white/15 hover:border-cyan-500/50'
                          : 'bg-white/[0.02] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Achievement Badge Icon */}
                        <div
                          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-md border ${
                            ach.completed
                              ? 'bg-gradient-to-tr from-purple-900/60 to-cyan-900/40 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                              : 'bg-black/40 border-white/10 grayscale'
                          }`}
                        >
                          {ach.icon}
                          {ach.completed && (
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-black">
                              <CheckCircle2 className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="text-xs font-black text-white truncate">{ach.title}</h5>
                            <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded">
                              +{ach.xpReward} XP
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                            {ach.description}
                          </p>

                          {/* Progress Bar */}
                          <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                              <span className="text-muted-foreground">Postęp:</span>
                              <span className={ach.completed ? 'text-emerald-400 font-bold' : 'text-cyan-300'}>
                                {ach.current} / {ach.target} {ach.unit}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  ach.completed
                                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                                    : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                                }`}
                                style={{ width: `${ach.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Pin to Profile Showcase Toggle */}
                      {ach.completed && (
                        <div className="pt-2.5 mt-2.5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Odznaka odblokowana
                          </span>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTogglePin(ach.id)}
                            disabled={savingPin}
                            className={`h-6 px-2 text-[10px] font-bold rounded-lg gap-1 transition-colors ${
                              isPinned
                                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-red-950/40 hover:text-red-300 hover:border-red-500/40'
                                : 'text-muted-foreground hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isPinned ? (
                              <>
                                <Pin className="h-2.5 w-2.5 fill-cyan-300" />
                                <span>W gablotce</span>
                              </>
                            ) : (
                              <>
                                <Pin className="h-2.5 w-2.5" />
                                <span>Przypnij w gablotce</span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LADDER */}
          {activeTab === 'ladder' && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground mb-2">
                Każdy zdobyty tom, przeczytana seria oraz ocena dodają punkty doświadczenia (XP). Rozwijaj swój profil i pnij się po kolejnych szczeblach wtajemniczenia!
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {RANK_TIERS.map((tier) => {
                  const isCurrent = currentTier.title === tier.title
                  const isUnlocked = userXP >= tier.minXP

                  return (
                    <div
                      key={tier.title}
                      className={`relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-r from-purple-950/80 via-[#120D26] to-cyan-950/60 border-cyan-400/80 shadow-[0_0_18px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/50'
                          : isUnlocked
                          ? 'bg-white/[0.03] border-white/15'
                          : 'bg-white/[0.01] border-white/5 opacity-40'
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md border ${
                          isCurrent
                            ? 'bg-gradient-to-tr from-cyan-500 to-purple-600 border-white/30 text-white animate-bounce-subtle'
                            : isUnlocked
                            ? 'bg-white/10 border-white/20'
                            : 'bg-black/30 border-white/5 grayscale'
                        }`}
                      >
                        {tier.badgeIcon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-white truncate">{tier.title}</h5>
                          {isCurrent && (
                            <Badge className="text-[9px] font-black bg-cyan-400 text-black py-0 px-1.5">
                              Twój Poziom
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold text-muted-foreground">
                          <span>Poziom {tier.minLevel} - {tier.maxLevel === 999 ? '100+' : tier.maxLevel}</span>
                          <span>•</span>
                          <span className="text-cyan-300">{tier.minXP.toLocaleString('pl-PL')} XP</span>
                        </div>

                        <p className="text-[10px] text-muted-foreground/80 mt-1 line-clamp-1">
                          {tier.description}
                        </p>
                      </div>

                      {!isUnlocked && (
                        <div className="shrink-0 text-muted-foreground pr-1" title="Zablokowane">
                          <Lock className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            Wskazówka: Dodawaj tomy i zapisuj postęp czytania, aby stale otrzymywać XP!
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs border-white/15 text-white hover:bg-white/10 rounded-xl font-bold"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
