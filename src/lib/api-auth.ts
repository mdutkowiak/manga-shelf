import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'

type GuardResult =
  | { session: Session & { user: NonNullable<Session['user']> & { id: string } }; error?: undefined }
  | { session?: undefined; error: NextResponse }

/** Wymaga zalogowanego użytkownika. Użycie: `const g = await requireUser(); if (g.error) return g.error` */
export async function requireUser(): Promise<GuardResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 }) }
  }
  return { session: session as GuardResult['session'] & object }
}

/** Wymaga zalogowanego administratora. */
export async function requireAdmin(): Promise<GuardResult> {
  const guard = await requireUser()
  if (guard.error) return guard
  if (guard.session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 }) }
  }
  return guard
}
