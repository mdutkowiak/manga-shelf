import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Wstępna (optymistyczna) kontrola dostępu do panelu admina.
// Właściwa autoryzacja odbywa się w każdym route handlerze (requireAdmin / requireUser).
export const proxy = auth((req) => {
  const user = req.auth?.user

  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*'],
}
