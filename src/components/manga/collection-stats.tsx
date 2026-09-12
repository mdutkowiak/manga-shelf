'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, DollarSign, Layers, Wallet } from 'lucide-react'

interface CollectionStatsProps {
  totalVolumes: number
  totalValue: number
  totalSpent: number
  uniqueManga: number
}

export function CollectionStats({
  totalVolumes,
  totalValue,
  totalSpent,
  uniqueManga,
}: CollectionStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card className="glass-panel border-border/70 hover:border-primary/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4 sm:p-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground">Posiadane Tomy</CardTitle>
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight">{totalVolumes}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">fizycznych woluminów</p>
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/70 hover:border-cyan-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4 sm:p-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground">Wycena Katalogowa</CardTitle>
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-cyan-300">
            {totalValue.toFixed(0)} <span className="text-xs font-medium text-muted-foreground">PLN</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">wg cen rynkowych</p>
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/70 hover:border-emerald-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4 sm:p-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground">Suma Wydatków</CardTitle>
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-400">
            {totalSpent.toFixed(0)} <span className="text-xs font-medium text-muted-foreground">PLN</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">realnie wydane</p>
        </CardContent>
      </Card>

      <Card className="glass-panel border-border/70 hover:border-purple-500/40 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 p-4 sm:p-5">
          <CardTitle className="text-xs font-semibold text-muted-foreground">Unikalne Serie</CardTitle>
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-purple-300">{uniqueManga}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">różnych mang</p>
        </CardContent>
      </Card>
    </div>
  )
}
