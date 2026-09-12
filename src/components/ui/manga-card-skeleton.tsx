'use client'

import React from 'react'

interface MangaCardSkeletonProps {
  count?: number
  className?: string
}

export function MangaCardSkeleton({ count = 10, className = '' }: MangaCardSkeletonProps) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col rounded-2xl bg-[#0E1424]/60 p-2.5 border border-white/5 shadow-md animate-pulse"
        >
          {/* Cover Shimmer Placeholder (2:3 aspect ratio) */}
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-tr from-white/[0.03] via-white/[0.08] to-white/[0.02] border border-white/10">
            {/* Publisher chip shimmer */}
            <div className="absolute top-2 left-2 h-4 w-14 rounded-md bg-white/10" />
            {/* Bottom progress bar shimmer */}
            <div className="absolute inset-x-0 bottom-0 p-2 space-y-1 bg-black/40">
              <div className="h-2 w-16 bg-white/10 rounded" />
              <div className="h-1.5 w-full rounded-full bg-white/10" />
            </div>
          </div>

          {/* Title & Info Shimmer */}
          <div className="mt-2.5 px-0.5 space-y-1.5">
            <div className="h-4 w-4/5 rounded-md bg-white/10" />
            <div className="flex items-center justify-between pt-0.5">
              <div className="h-3 w-12 rounded bg-white/5" />
              <div className="h-3 w-14 rounded bg-white/10" />
            </div>
            <div className="h-3 w-full rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
