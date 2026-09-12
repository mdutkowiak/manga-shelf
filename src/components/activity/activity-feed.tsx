'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, BookmarkPlus, Star, Trash2, CheckCircle } from 'lucide-react'

interface User {
  id: string
  name: string | null
  username: string
  avatar: string | null
}

interface Volume {
  id: string
  volumeNumber: number
  coverImage: string | null
}

interface Manga {
  id: string
  title: string
  defaultCover: string | null
}

export interface Activity {
  id: string
  type: string
  userId: string
  volumeId: string | null
  mangaId: string | null
  content: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: User
  volume: Volume | null
  manga: Manga | null
}

interface ActivityFeedProps {
  activities: Activity[]
  loading?: boolean
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'ADDED_TO_COLLECTION':
      return <BookmarkPlus className="h-4 w-4 text-green-500" />
    case 'REMOVED_FROM_COLLECTION':
      return <Trash2 className="h-4 w-4 text-red-500" />
    case 'STATUS_CHANGED':
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    case 'RATED':
      return <Star className="h-4 w-4 text-yellow-500" />
    case 'COMPLETED_SERIES':
      return <BookOpen className="h-4 w-4 text-purple-500" />
    default:
      return <BookmarkPlus className="h-4 w-4 text-muted-foreground" />
  }
}

function getActivityText(type: string) {
  switch (type) {
    case 'ADDED_TO_COLLECTION':
      return 'dodał do kolekcji'
    case 'REMOVED_FROM_COLLECTION':
      return 'usunął z kolekcji'
    case 'STATUS_CHANGED':
      return 'zmienił status na'
    case 'RATED':
      return 'ocenił na'
    case 'COMPLETED_SERIES':
      return 'ukończył serię'
    default:
      return 'zaktualizował'
  }
}

function getActivityLink(activity: Activity) {
  if (activity.volume && activity.manga) {
    return `/manga/${activity.manga.id}/volume/${activity.volume.volumeNumber}`
  }
  if (activity.manga) {
    return `/manga/${activity.manga.id}`
  }
  return '#'
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Brak aktywności do wyświetlenia</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Card key={activity.id} className="transition-colors hover:bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <Link href={`/users/${activity.user.username}`}>
                {activity.user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activity.user.avatar}
                    alt={activity.user.name || activity.user.username}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <span className="text-sm font-bold">
                      {(activity.user.name || activity.user.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getActivityIcon(activity.type)}
                  <p className="text-sm">
                    <Link
                      href={`/users/${activity.user.username}`}
                      className="font-medium hover:underline"
                    >
                      {activity.user.name || activity.user.username}
                    </Link>
                    <span className="text-muted-foreground">
                      {' '}
                      {getActivityText(activity.type)}
                    </span>
                    {activity.content && (
                      <span className="font-medium"> {activity.content}</span>
                    )}
                  </p>
                </div>

                {/* Volume/Manga link */}
                {activity.volume && activity.manga && (
                  <Link
                    href={getActivityLink(activity)}
                    className="mt-1 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <span className="truncate">{activity.manga.title}</span>
                    <span>tom {activity.volume.volumeNumber}</span>
                  </Link>
                )}

                {/* Timestamp */}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleDateString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
