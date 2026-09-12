'use client'

import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, Sparkles, CheckCircle2, ShoppingCart } from 'lucide-react'
import { getSavedCollection } from '@/lib/collection-store'

interface StoreShippingRule {
  id: string
  name: string
  thresholdPLN: number
  standardShippingPLN: number
  publishers: string[]
  badgeClass: string
}

const MANGA_STORES: StoreShippingRule[] = [
  {
    id: 'yatta',
    name: 'Yatta.pl (Studio JG)',
    thresholdPLN: 150,
    standardShippingPLN: 14.99,
    publishers: ['Studio JG', 'Hanami'],
    badgeClass: 'text-red-300 bg-red-500/10 border-red-500/30',
  },
  {
    id: 'waneko',
    name: 'Sklep Waneko',
    thresholdPLN: 150,
    standardShippingPLN: 14.0,
    publishers: ['Waneko'],
    badgeClass: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  },
  {
    id: 'mangastore',
    name: 'Mangastore.pl (J.P.F)',
    thresholdPLN: 150,
    standardShippingPLN: 14.5,
    publishers: ['J.P.Fantastica', 'JPF'],
    badgeClass: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'gildia',
    name: 'Gildia.pl (Wszyscy Wydawcy)',
    thresholdPLN: 200,
    standardShippingPLN: 15.9,
    publishers: ['Waneko', 'Studio JG', 'J.P.Fantastica', 'Kotori', 'Dango', 'Hanami'],
    badgeClass: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'kotori',
    name: 'Sklep Kotori',
    thresholdPLN: 130,
    standardShippingPLN: 13.99,
    publishers: ['Kotori'],
    badgeClass: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'dango',
    name: 'Sklep Dango',
    thresholdPLN: 120,
    standardShippingPLN: 12.99,
    publishers: ['Dango'],
    badgeClass: 'text-pink-300 bg-pink-500/10 border-pink-500/30',
  },
]

export function ShippingOptimizerCard() {
  const storeCalculations = useMemo(() => {
    const col = getSavedCollection()

    // Find wishlist and missing volumes
    const missingByPublisher: Record<string, { count: number; totalCost: number }> = {}

    col.forEach((series) => {
      const pub = series.publisher || 'Inne'
      if (!missingByPublisher[pub]) {
        missingByPublisher[pub] = { count: 0, totalCost: 0 }
      }

      series.volumes.forEach((vol) => {
        if (vol.status === 'WISHLIST' || vol.status === 'NONE') {
          missingByPublisher[pub].count++
          missingByPublisher[pub].totalCost += vol.purchasePrice || 34.99
        }
      })
    })

    return MANGA_STORES.map((store) => {
      // Sum missing costs for publishers supported by this store
      let cartValue = 0
      let eligibleVolumes = 0

      store.publishers.forEach((p) => {
        if (missingByPublisher[p]) {
          cartValue += missingByPublisher[p].totalCost
          eligibleVolumes += missingByPublisher[p].count
        }
      })

      // For multi-publisher stores like Gildia, cap cartValue to threshold + some realistic basket
      const currentCart = Math.min(cartValue, store.thresholdPLN * 2)
      const missingToFree = Math.max(0, store.thresholdPLN - currentCart)
      const percent = Math.min(100, Math.round((currentCart / store.thresholdPLN) * 100))
      const isFreeUnlocked = currentCart >= store.thresholdPLN
      const volumesNeeded = Math.ceil(missingToFree / 34.99)

      return {
        store,
        cartValue: currentCart,
        missingToFree,
        percent,
        isFreeUnlocked,
        volumesNeeded,
        eligibleVolumes,
      }
    })
  }, [])

  return (
    <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-[#0B0F19] to-purple-950/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
              <Truck className="h-3 w-3" />
              Optymalizator Zakupów
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 font-bold">
            <Sparkles className="h-3 w-3 mr-1" />
            Oszczędzaj na wysyłce
          </Badge>
        </div>
        <CardTitle className="text-base font-bold text-white mt-1">
          Progi Darmowej Dostawy w Księgarniach Mangowych
        </CardTitle>
        <CardDescription className="text-xs">
          Sprawdź, ile brakuje do darmowej wysyłki przy zamawianiu tomów z Twojej Listy Życzeń i braków
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {storeCalculations.map(
            ({
              store,
              cartValue,
              missingToFree,
              percent,
              isFreeUnlocked,
              volumesNeeded,
            }) => (
              <div
                key={store.id}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate">{store.name}</h4>
                    <span className="text-[10px] font-black text-muted-foreground">
                      od {store.thresholdPLN} zł
                    </span>
                  </div>

                  {/* Progress bar towards free threshold */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Wartość braków:</span>
                      <span className="font-bold text-cyan-300">{cartValue.toFixed(2)} zł</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFreeUnlocked
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                            : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status text */}
                <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px]">
                  {isFreeUnlocked ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Darmowa dostawa! (-{store.standardShippingPLN.toFixed(2)} zł)
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-semibold flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3 text-amber-400" />
                      Brakuje {missingToFree.toFixed(0)} zł (~{volumesNeeded}{' '}
                      {volumesNeeded === 1 ? 'tom' : 'tomy'})
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground font-semibold">{percent}%</span>
                </div>
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
