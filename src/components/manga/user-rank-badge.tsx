'use client'

import { useState } from 'react'
import { getLevelProgress, calculateLevel } from '@/lib/gamification'
import { GamificationModal } from '@/components/manga/gamification-modal'

interface UserRankBadgeProps {
  userXP?: number
  className?: string
}

export function UserRankBadge({
  userXP = 1850,
  className = '',
}: UserRankBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { currentTier, percentage } = getLevelProgress(userXP)
  const currentLevel = calculateLevel(userXP)

  return (
    <>
      <GamificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userXP={userXP}
      />

      {/* Gamification Capsule Badge matching user screenshot */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`group relative flex items-center gap-2.5 rounded-full border border-purple-500/40 bg-gradient-to-r from-purple-950/80 via-[#0F0C20] to-purple-900/60 px-3 py-1.5 transition-all duration-300 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/20 focus:outline-none ${className}`}
        title="Kliknij, aby otworzyć Osiągnięcia i Rangi"
      >
        {/* Glowing Badge Icon circle */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm shadow-md border border-purple-400/30 group-hover:scale-110 transition-transform">
          {currentTier.badgeIcon}
        </div>

        {/* Title, Level & XP text */}
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 group-hover:text-cyan-300 transition-colors">
            {currentTier.title}
          </span>
          <span className="text-[9px] font-bold text-purple-300/80">
            Poziom {currentLevel} • {userXP} XP
          </span>
        </div>

        {/* Subtitle XP Progress Bar at the bottom edge */}
        <div className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </button>
    </>
  )
}
