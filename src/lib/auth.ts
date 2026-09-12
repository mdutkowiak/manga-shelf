import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

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

        // Demo mode - works if demo credentials entered
        if (
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
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { equals: rawIdentifier, mode: 'insensitive' } },
                { username: { equals: rawIdentifier, mode: 'insensitive' } },
              ],
            },
          })

          if (!user) {
            console.warn('[AUTH] User not found for login identifier:', rawIdentifier)
            return null
          }

          let isPasswordValid = await bcrypt.compare(password, user.password).catch(() => false)

          // Try trimmed password if initial check failed
          if (!isPasswordValid && password.trim() !== password) {
            isPasswordValid = await bcrypt.compare(password.trim(), user.password).catch(() => false)
          }

          // Plain text fallback (in case seed/manual insert stored unhashed password)
          if (!isPasswordValid && (user.password === password || user.password === password.trim())) {
            isPasswordValid = true
            const newHash = await bcrypt.hash(password.trim(), 12)
            prisma.user.update({ where: { id: user.id }, data: { password: newHash } }).catch(() => {})
          }

          if (!isPasswordValid) {
            console.warn('[AUTH] Invalid password attempt for user:', user.username)
            return null
          }

          let role = user.role
          const lowerUser = user.username.toLowerCase()
          const lowerEmail = user.email.toLowerCase()
          if (
            lowerUser === 'daqu' ||
            lowerUser === 'szejkus' ||
            lowerEmail === '7dudek@gmail.com' ||
            lowerEmail === 'oskardudek93@gmail.com'
          ) {
            role = 'ADMIN'
            if (user.role !== 'ADMIN') {
              prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } }).catch(() => {})
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.username,
            username: user.username,
            role,
            avatar: user.avatar || user.image || null,
            image: user.image || user.avatar || null,
            bio: user.bio || null,
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
        token.avatar = (user as { avatar?: string | null }).avatar || (user as { image?: string | null }).image || null
        token.image = (user as { image?: string | null }).image || (user as { avatar?: string | null }).avatar || null
        token.bio = (user as { bio?: string | null }).bio || null
      }
      if (trigger === 'update' && session) {
        if (session.name !== undefined) token.name = session.name
        if (session.avatar !== undefined) {
          token.avatar = session.avatar
          token.image = session.avatar
        }
        if (session.image !== undefined) {
          token.image = session.image
          token.avatar = session.image
        }
        if (session.bio !== undefined) token.bio = session.bio
      }
      if (token.username && typeof token.username === 'string') {
        if (token.username.toLowerCase() === 'daqu') {
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
        session.user.image = (token.avatar as string) || (token.image as string) || (session.user.image as string) || null
        session.user.bio = (token.bio as string) || null
        if (token.name) {
          session.user.name = token.name as string
        }
      }
      return session
    },
  },
})
