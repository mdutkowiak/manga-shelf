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
  try {
    const validated = registerSchema.safeParse(data)

    if (!validated.success) {
      return { success: false, error: validated.error.flatten().fieldErrors }
    }

    const { email, username, password, name } = validated.data

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase() }, { username }],
      },
    })

    if (existingUser) {
      const field = existingUser.email.toLowerCase() === email.toLowerCase() ? 'email' : 'username'
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

    const isInitialAdmin =
      username.toLowerCase() === 'daqu' || email.toLowerCase() === '7dudek@gmail.com'
    const role = isInitialAdmin ? 'ADMIN' : 'USER'

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        password: hashedPassword,
        name,
        role,
      },
    })

    return { success: true, userId: user.id }
  } catch (error: unknown) {
    console.error('[REGISTER_ERROR]', error)
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: {
        _form: [
          message.includes('relation "users" does not exist') || message.includes('does not exist')
            ? 'Baza danych nie ma jeszcze utworzonych tabel. Uruchom npx prisma db push na serwerze.'
            : `Błąd rejestracji: ${message}`,
        ],
      },
    }
  }
}
