'use client'

import { useState } from 'react'
import { Trophy, Sparkles, Award, Plus, Lock } from 'lucide-react'
import { ACHIEVEMENTS, getRankTier, calculateLevel } from '@/lib/gamification'
import { GamificationModal } from '@/components/manga/gamification-modal'

interface BadgeShowcaseProps {
  pinnedBadges?: string[]
  userXP?: number
  isOwner?: boolean
}

export function BadgeShowcase({
  pinnedBadges = [],
  userXP = 0,
  isOwner = false,
}: BadgeShowcaseProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const currentTier = getRankTier(userXP)
  const currentLevel = calculateLevel(userXP)

  const activeBadges = ACHIEVEMENTS.filter((ach) => pinnedBadges.includes(ach.id))

  return (
    <>
      <GamificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userXP={userXP}
      />

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0E1324]/90 via-[#0B0F1C]/80 to-[#120D24]/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Gablotka Osiągnięć</span>
                <span className="text-xs font-semibold text-purple-300">({activeBadges.length}/4)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Ranga: <strong className="text-white">{currentTier.title}</strong> • Poziom {currentLevel} ({userXP.toLocaleString('pl-PL')} XP)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/40 bg-purple-950/40 text-xs font-bold text-purple-200 hover:bg-purple-900/40 hover:border-purple-300 hover:text-white transition-all shadow-sm"
          >
            <Award className="h-3.5 w-3.5 text-cyan-400" />
            <span>Wszystkie Osiągnięcia i Rangi</span>
          </button>
        </div>

        {/* Badges Grid (4 Slots) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, index) => {
            const badge = activeBadges[index]

            if (badge) {
              return (
                <div
                  key={badge.id}
                  onClick={() => setModalOpen(true)}
                  className="group relative flex flex-col items-center text-center p-4 rounded-2xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-cyan-500/30 hover:border-cyan-400/70 shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer"
                >
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-2xl bg-gradient-to-tr from-purple-900/60 to-cyan-900/60 border border-cyan-400/60 shadow-md group-hover:scale-110 transition-transform mb-2.5">
                    {badge.icon}
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-black">
                      <Sparkles className="h-2.5 w-2.5" />
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                    {badge.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                    {badge.description}
                  </p>
                  <span className="mt-2 text-[9px] font-bold text-amber-300 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    +{badge.xpReward} XP
                  </span>
                </div>
              )
            }

            // Empty Showcase Slot
            return (
              <div
                key={`empty-slot-${index}`}
                onClick={() => setModalOpen(true)}
                className="flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] hover:border-purple-500/40 hover:bg-white/[0.03] transition-all cursor-pointer min-h-[140px] group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-muted-foreground group-hover:text-purple-300 group-hover:scale-110 transition-transform mb-2">
                  {isOwner ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </div>
                <span className="text-[11px] font-bold text-muted-foreground group-hover:text-white transition-colors">
                  {isOwner ? 'Przypnij odznakę' : 'Wolne miejsce'}
                </span>
                <span className="text-[9px] text-muted-foreground/60 mt-0.5">
                  Slot #{index + 1}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
