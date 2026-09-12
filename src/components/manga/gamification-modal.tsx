'use client'

import { useMemo } from 'react'
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
  Award,
  Target,
  Flame,
} from 'lucide-react'
import { RANK_TIERS, getLevelProgress, calculateLevel, type XPActivity } from '@/lib/gamification'
import { getSavedCollection } from '@/lib/collection-store'

interface GamificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userXP: number
  userHistory?: XPActivity[]
}

export function GamificationModal({
  open,
  onOpenChange,
  userXP = 1850,
  userHistory = [
    { id: '1', action: 'Przeczytano tom Chainsaw Man 19', xp: 15, date: 'Dzisiaj, 16:30' },
    { id: '2', action: 'Ukończono miesięczny cel czytelniczy (8/10)', xp: 50, date: 'Dzisiaj, 14:15' },
    { id: '3', action: 'Dodano 4 tomy do kolekcji (Zaklikiwanie)', xp: 40, date: 'Wczoraj, 18:20' },
    { id: '4', action: 'Zsynchronizowano plan wydawnictw Waneko', xp: 20, date: '2 dni temu' },
  ],
}: GamificationModalProps) {
  const { currentTier, percentage, remainingXP, nextXP } = getLevelProgress(userXP)
  const currentLevel = calculateLevel(userXP)

  const challenges = useMemo(() => {
    if (typeof window === 'undefined') return []
    const col = getSavedCollection()
    let readCount = 0
    let wanekoCount = 0
    let sjgCount = 0
    let completedCount = 0

    col.forEach((s) => {
      const ownedOrRead = s.volumes.filter((v) => v.status === 'OWNED' || v.status === 'READ').length
      const reads = s.volumes.filter((v) => v.status === 'READ').length
      readCount += reads
      const pub = (s.publisher || '').toLowerCase()
      if (pub.includes('waneko')) wanekoCount += ownedOrRead
      if (pub.includes('studio jg') || pub.includes('jg')) sjgCount += ownedOrRead
      if (ownedOrRead >= s.totalVolumes && s.totalVolumes > 0) completedCount++
    })

    return [
      {
        id: 'backlog',
        title: 'Pogromca Zaległości',
        desc: 'Przeczytaj przynajmniej 5 tomów ze swojego regału',
        current: Math.min(5, readCount),
        target: 5,
        xp: 50,
        icon: '📖',
      },
      {
        id: 'waneko',
        title: 'Klub Czytelnika Waneko',
        desc: 'Zgromadź co najmniej 10 tomów wydawnictwa Waneko',
        current: Math.min(10, wanekoCount),
        target: 10,
        xp: 75,
        icon: '🔴',
      },
      {
        id: 'sjg',
        title: 'Fanatyk Studio JG',
        desc: 'Zgromadź co najmniej 10 tomów wydawnictwa Studio JG',
        current: Math.min(10, sjgCount),
        target: 10,
        xp: 75,
        icon: '🟣',
      },
      {
        id: 'complete',
        title: 'Mistrz Kompletowania',
        desc: 'Skompletuj całą serię mangi w 100%',
        current: Math.min(1, completedCount),
        target: 1,
        xp: 150,
        icon: '🏆',
      },
    ]
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#090D18]/95 border-white/15 text-white backdrop-blur-3xl shadow-2xl rounded-3xl p-0 overflow-hidden sm:max-w-3xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-[#0B1020] to-cyan-950/30">
          <DialogHeader>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-[11px] font-bold text-purple-300 mb-1">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>Grywalizacja • Ranga i Osiągnięcia Kolekcjonera</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-white">
              Twój Poziom Kolekcjonerski
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Zdobywaj punkty doświadczenia (XP) za dodawanie tomów, czytanie i aktywność w portalu!
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 max-h-[62vh] overflow-y-auto space-y-6">
          {/* Current Rank Banner */}
          <div className={`relative overflow-hidden rounded-2xl border ${currentTier.borderColor} bg-gradient-to-r ${currentTier.bgGradient} p-5 shadow-xl`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/40 border border-white/20 text-3xl shadow-2xl backdrop-blur-md">
                  {currentTier.badgeIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Aktualna Ranga</span>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px]">
                      Poziom {currentLevel}
                    </Badge>
                  </div>
                  <h3 className={`text-xl font-black ${currentTier.textColor} tracking-tight mt-0.5`}>
                    {currentTier.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentTier.description}</p>
                </div>
              </div>

              {/* XP Summary Badge */}
              <div className="text-center sm:text-right shrink-0 bg-black/40 p-3 rounded-xl border border-white/10 backdrop-blur-md">
                <span className="text-[10px] font-bold text-muted-foreground block">ŁĄCZNE XP</span>
                <span className="text-2xl font-black text-white">{userXP} <span className="text-xs font-extrabold text-cyan-300">XP</span></span>
              </div>
            </div>

            {/* Level XP Progress Bar */}
            <div className="mt-4 space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white/80">Postęp do kolejnej rangi:</span>
                <span className="text-cyan-300">{percentage}% (Pozostało: {remainingXP} XP)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-black/60 overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-primary to-purple-400 transition-all duration-500 shadow-md"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* XP Action Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400" />
              Jak zdobywać punkty doświadczenia (XP)?
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs shrink-0">
                  +10 XP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Dodanie Tomu</h5>
                  <p className="text-[9px] text-muted-foreground">do swojej kolekcji</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-black text-xs shrink-0">
                  +15 XP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Przeczytanie Tomu</h5>
                  <p className="text-[9px] text-muted-foreground">oznaczenie w 100%</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs shrink-0">
                  +50 XP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Cel Miesięczny</h5>
                  <p className="text-[9px] text-muted-foreground">osiągnięcie celu</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400 font-black text-xs shrink-0">
                  +20 XP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Synchronizacja</h5>
                  <p className="text-[9px] text-muted-foreground">planu wydawców</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs shrink-0">
                  +100 XP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Seria w 100%</h5>
                  <p className="text-[9px] text-muted-foreground">cała skompletowana</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-black text-xs shrink-0">
                  +5 XP
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white">Wishlist</h5>
                  <p className="text-[9px] text-muted-foreground">zapisanie tomu</p>
                </div>
              </div>
            </div>
          </div>

          {/* Wyzwania i Odznaki Czytelnicze */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-4 w-4 text-cyan-400" />
                Wyzwania & Odznaki Czytelnicze
              </h4>
              <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30">
                <Flame className="h-3 w-3 mr-1 text-amber-400" />
                Zbieraj XP
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {challenges.map((challenge) => {
                const isComplete = challenge.current >= challenge.target
                const pct = Math.round((challenge.current / challenge.target) * 100)

                return (
                  <div
                    key={challenge.id}
                    className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                      isComplete
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-white/[0.03] border-white/10'
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/40 border border-white/10 text-xl">
                      {challenge.icon}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-xs font-bold text-white truncate">{challenge.title}</h5>
                        <Badge className="text-[9px] font-black bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                          +{challenge.xp} XP
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{challenge.desc}</p>
                      <div className="pt-1 space-y-0.5">
                        <div className="flex items-center justify-between text-[9px] font-semibold">
                          <span className="text-muted-foreground">Postęp: {challenge.current}/{challenge.target}</span>
                          <span className={isComplete ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>
                            {isComplete ? 'Ukończono! ✓' : `${pct}%`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isComplete ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-purple-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 7-Tier Rank RoadMap */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-4 w-4 text-purple-400" />
              Drabina Rangi i Tytułów (7 Poziomów)
            </h4>

            <div className="space-y-2">
              {RANK_TIERS.map((tier, idx) => {
                const isUnlocked = userXP >= tier.minXP
                const isCurrent = currentTier.title === tier.title

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? `${tier.borderColor} bg-white/[0.08] ring-2 ring-purple-500/40 shadow-lg`
                        : isUnlocked
                        ? 'border-white/10 bg-white/[0.03]'
                        : 'border-white/5 bg-white/[0.01] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                        isUnlocked ? 'bg-white/10' : 'bg-black/40'
                      }`}>
                        {tier.badgeIcon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className={`text-xs font-extrabold ${isUnlocked ? 'text-white' : 'text-muted-foreground'}`}>
                            {tier.title}
                          </h5>
                          {isCurrent && (
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[9px]">
                              Aktualny
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{tier.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-cyan-300 block">{tier.minXP} XP</span>
                      <span className="text-[9px] text-muted-foreground">Poz. {tier.minLevel}–{tier.maxLevel}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* XP History Log */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Ostatnio zdobyte punkty XP
            </h4>

            <div className="space-y-2">
              {userHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-white font-medium">{item.action}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    <span className="text-xs font-extrabold text-emerald-400">+{item.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#070A12] flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Następna ranga przy: <strong className="text-white">{nextXP} XP</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs border-white/15 text-white hover:bg-white/10 rounded-xl"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
