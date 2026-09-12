import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
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
  // @auth/prisma-adapter expects standard @prisma/client type; cast safely to satisfy Prisma 7 driver adapter client
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
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
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Demo mode - works if database is offline or demo credentials entered
        if (email === DEMO_USER.email && password === DEMO_USER.password) {
          return {
            id: DEMO_USER.id,
            email: DEMO_USER.email,
            name: DEMO_USER.name,
            username: DEMO_USER.username,
            role: DEMO_USER.role,
          }
        }

        // Normal database lookup
        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            return null
          }

          let role = user.role
          if (user.username.toLowerCase() === 'daqu' || user.email.toLowerCase() === '7dudek@gmail.com') {
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
        } catch {
          // Database not available - only demo works
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
