'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, DollarSign, TrendingUp } from 'lucide-react'

const stats = [
  { title: 'Manga', value: '156', icon: BookOpen, description: 'Wszystkie serie' },
  { title: 'Tomów', value: '1,247', icon: TrendingUp, description: 'Wszystkie tomy' },
  { title: 'Użytkownicy', value: '23', icon: Users, description: 'Zarejestrowani' },
  { title: 'Wartość', value: '34,521 PLN', icon: DollarSign, description: 'Szacowana wartość' },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-muted-foreground">Przegląd systemu</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie aktywności</CardTitle>
            <CardDescription>Ostatnie 7 dni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  user: 'Jan Kowalski',
                  action: 'dodał Attack on Titan tom 15',
                  time: '2 godz. temu',
                },
                { user: 'Anna Nowak', action: 'zaimportowała Chainsaw Man', time: '5 godz. temu' },
                {
                  user: 'Piotr Wiśniewski',
                  action: 'zmienił status One Piece tom 5',
                  time: '1 dzień temu',
                },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{activity.user}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szybkie akcje</CardTitle>
            <CardDescription>Często używane funkcje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/manga/new" className="rounded-md border p-3 text-sm hover:bg-muted">
                ➕ Dodaj mangę
              </Link>
              <Link href="/admin/releases" className="rounded-md border p-3 text-sm hover:bg-muted text-cyan-400 font-bold">
                🗓️ Kalendarz premier & Scraper
              </Link>
              <Link
                href="/admin/publishers"
                className="rounded-md border p-3 text-sm hover:bg-muted"
              >
                🏢 Wydawnictwa
              </Link>
              <Link href="/admin/users" className="rounded-md border p-3 text-sm hover:bg-muted">
                👥 Zarządzaj użytkownikami
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
