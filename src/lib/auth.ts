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

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.username,
            username: user.username,
            role: user.role,
          }
        } catch {
          // Database not available - only demo works
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.id = user.id
        token.username = (user as { username?: string }).username
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
})
