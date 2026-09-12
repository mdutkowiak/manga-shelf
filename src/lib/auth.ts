import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { Pool } from 'pg'

let pgPoolInstance: Pool | null = null
function getPgPool(): Pool | null {
  if (!pgPoolInstance && process.env.DATABASE_URL) {
    pgPoolInstance = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pgPoolInstance
}

// Demo user - works without database
const DEMO_USER = {
  id: 'demo-admin-001',
  email: 'admin@manga.pl',
  username: 'admin',
  name: 'Administrator (Demo)',
  role: 'ADMIN',
  password: 'admin123',
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'manga-super-secret-auth-key-change-me',
  session: {
    strategy: 'jwt',
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email lub Login', type: 'text' },
        password: { label: 'Hasło', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const rawIdentifier = String(credentials.email).trim()
        const password = String(credentials.password)

        // Demo mode - only in development/test
        if (
          process.env.NODE_ENV !== 'production' &&
          rawIdentifier.toLowerCase() === DEMO_USER.email.toLowerCase() &&
          (password === DEMO_USER.password || password === 'admin' || password === 'admin123')
        ) {
          // Ensure demo user exists in DB for foreign key relations
          await prisma.user.upsert({
            where: { id: DEMO_USER.id },
            update: { role: 'ADMIN' },
            create: {
              id: DEMO_USER.id,
              email: DEMO_USER.email,
              username: DEMO_USER.username,
              name: DEMO_USER.name,
              role: 'ADMIN',
              password: await bcrypt.hash('admin123', 10),
            },
          }).catch(() => {})

          return {
            id: DEMO_USER.id,
            email: DEMO_USER.email,
            name: DEMO_USER.name,
            role: 'ADMIN',
            username: DEMO_USER.username,
            avatar: null,
            image: null,
            bio: null,
          }
        }

// Database lookup - supports email OR username (case-insensitive)
        try {
          console.log(`[AUTH] Próba logowania dla identyfikatora: "${rawIdentifier}"`)
          
          let candidates: any[] = []

          // 1. Bezpośrednie zapytanie przez natywny pg.Pool (najbardziej niezawodne w kontenerze)
          const pool = getPgPool()
          if (pool) {
            try {
              const res = await pool.query(
                'SELECT id, username, email, password, role, name, bio, avatar, image FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
                [rawIdentifier]
              )
              candidates = res.rows
              if (candidates.length > 0) {
                console.log(`[AUTH] Znaleziono ${candidates.length} pasujących kont przez pg.Pool:`, candidates.map((c: any) => `${c.username} (${c.email})`).join(', '))
              }
            } catch (pgErr: any) {
              console.warn('[AUTH_PG_WARN] Błąd zapytania pg.Pool, przejście do Prisma:', pgErr?.message)
            }
          }

          // 2. Rezerwa: Prisma Client
          if (candidates.length === 0) {
            try {
              candidates = await prisma.user.findMany({
                where: {
                  OR: [
                    { email: { equals: rawIdentifier, mode: 'insensitive' } },
                    { username: { equals: rawIdentifier, mode: 'insensitive' } },
                  ],
                },
              })
              if (candidates.length > 0) {
                console.log(`[AUTH] Znaleziono ${candidates.length} pasujących kont przez Prisma:`, candidates.map((c: any) => `${c.username} (${c.email})`).join(', '))
              }
            } catch (prismaErr) {
              console.error('[AUTH_PRISMA_ERROR]', prismaErr)
            }
          }

          if (candidates.length === 0) {
            console.warn(`[AUTH] Nie znaleziono żadnego konta dla identyfikatora: "${rawIdentifier}"`)
            return null
          }

          let matchedUser: any = null

          for (const candidate of candidates) {
            let isPasswordValid = await bcrypt.compare(password, candidate.password).catch(() => false)

            if (!isPasswordValid && password.trim() !== password) {
              isPasswordValid = await bcrypt.compare(password.trim(), candidate.password).catch(() => false)
            }

            // Fallback na hasło tekstowe (np. po bezpośrednim wpisie SQL do bazy)
            if (!isPasswordValid && (candidate.password === password || candidate.password === password.trim())) {
              isPasswordValid = true
              const newHash = await bcrypt.hash(password.trim(), 12)
              if (pool) {
                pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, candidate.id]).catch(() => {})
              } else {
                prisma.user.update({ where: { id: candidate.id }, data: { password: newHash } }).catch(() => {})
              }
            }

            if (isPasswordValid) {
              matchedUser = candidate
              break
            }
          }

          if (!matchedUser) {
            console.warn(`[AUTH] Hasło nie pasowało do żadnego z ${candidates.length} kont powiązanych z: "${rawIdentifier}"`)
            return null
          }

          console.log(`[AUTH_SUCCESS] Pomyślne uwierzytelnienie dla: "${matchedUser.username}" (${matchedUser.email})`)

          let role = matchedUser.role
          const lowerUser = matchedUser.username.toLowerCase()
          const lowerEmail = matchedUser.email.toLowerCase()
          if (
            lowerUser === 'daqu' ||
            lowerUser === 'szejkus' ||
            lowerEmail === '7dudek@gmail.com' ||
            lowerEmail === 'oskardudek93@gmail.com'
          ) {
            role = 'ADMIN'
            if (matchedUser.role !== 'ADMIN') {
              if (pool) {
                pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [matchedUser.id]).catch(() => {})
              } else {
                prisma.user.update({ where: { id: matchedUser.id }, data: { role: 'ADMIN' } }).catch(() => {})
              }
            }
          }

          const sanitizeUrl = (url: any) =>
            typeof url === 'string' &&
            (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) &&
            !url.startsWith('data:') &&
            url.length < 300
              ? url
              : null
          const cleanAvatar = sanitizeUrl(matchedUser.avatar) || sanitizeUrl(matchedUser.image)

          return {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name || matchedUser.username,
            username: matchedUser.username,
            role,
            avatar: cleanAvatar,
            image: cleanAvatar,
            bio: null,
          }
        } catch (dbErr) {
          console.error('[AUTH_AUTHORIZE_ERROR]', dbErr)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.id = user.id
        token.username = (user as { username?: string }).username
        token.name = (user as { name?: string }).name || (user as { username?: string }).username
        
        // Ciasteczka sesyjne JWT nie mogą zawierać obrazów Base64 (data:image/...) ani wielkich tekstów,
        // bo przekraczają limit bufora Nginx (proxy_buffer_size) wywołując błąd 502 Bad Gateway!
        const sanitizeUrl = (url: any) =>
          typeof url === 'string' &&
          (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) &&
          !url.startsWith('data:') &&
          url.length < 300
            ? url
            : null
        const cleanAvatar = sanitizeUrl((user as any).avatar) || sanitizeUrl((user as any).image)
        token.avatar = cleanAvatar
        token.image = cleanAvatar
      }
      if (trigger === 'update' && session) {
        if (session.name !== undefined) token.name = session.name
        const sanitizeUrl = (url: any) =>
          typeof url === 'string' &&
          (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) &&
          !url.startsWith('data:') &&
          url.length < 300
            ? url
            : null
        if (session.avatar !== undefined || session.image !== undefined) {
          const cleanAvatar = sanitizeUrl(session.avatar) || sanitizeUrl(session.image)
          token.avatar = cleanAvatar
          token.image = cleanAvatar
        }
      }
      if (token.username && typeof token.username === 'string') {
        const lower = token.username.toLowerCase()
        if (lower === 'daqu' || lower === 'szejkus') {
          token.role = 'ADMIN'
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.avatar = (token.avatar as string) || (token.image as string) || null
        session.user.image = (token.avatar as string) || (token.image as string) || null
        session.user.bio = null
        if (token.name) {
          session.user.name = token.name as string
        }
      }
      return session
    },
  },
})
