import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cookies, headers } from 'next/headers'

export async function GET() {
  try {
    const session = await auth()
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll().map((c) => ({
      name: c.name,
      valueLength: c.value.length,
      sample: c.value.substring(0, 15) + '...',
    }))
    const headerStore = await headers()

    return NextResponse.json({
      success: true,
      authenticated: !!session?.user,
      user: session?.user || null,
      cookiesFound: allCookies,
      clientHeaders: {
        host: headerStore.get('host'),
        xForwardedProto: headerStore.get('x-forwarded-proto'),
        xForwardedHost: headerStore.get('x-forwarded-host'),
        cookieHeaderPresent: !!headerStore.get('cookie'),
      },
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || String(err),
    })
  }
}
