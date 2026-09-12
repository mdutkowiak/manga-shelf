'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  username: z
    .string()
    .min(3, 'Nazwa użytkownika musi mieć co najmniej 3 znaki')
    .max(20, 'Nazwa użytkownika może mieć maksymalnie 20 znaków')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia'),
  password: z.string().min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  name: z.string().min(2, 'Imię musi mieć co najmniej 2 znaki').optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>

export async function register(data: RegisterInput) {
  const validated = registerSchema.safeParse(data)

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors }
  }

  const { email, username, password, name } = validated.data

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  })

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'username'
    return {
      success: false,
      error: {
        [field]: [
          field === 'email'
            ? 'Użytkownik z tym emailem już istnieje'
            : 'Ta nazwa użytkownika jest już zajęta',
        ],
      },
    }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      name,
    },
  })

  return { success: true, userId: user.id }
}
