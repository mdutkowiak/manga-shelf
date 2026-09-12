import 'next-auth'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
    username?: string
    avatar?: string | null
    bio?: string | null
  }

  interface Session {
    user: {
      id: string
      role: string
      username?: string
      avatar?: string | null
      bio?: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    id: string
    username?: string
    avatar?: string | null
    bio?: string | null
  }
}

