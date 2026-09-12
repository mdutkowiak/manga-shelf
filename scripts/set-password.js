const bcrypt = require('bcryptjs')
const { PrismaClient } = require('../src/generated/prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const usernameOrEmail = process.argv[2]
const newPassword = process.argv[3]

if (!usernameOrEmail || !newPassword) {
  console.log('Użycie: node scripts/set-password.js <login_lub_email> <nowe_hasło>')
  console.log('Przykład: node scripts/set-password.js DaQu SuperHaslo123')
  process.exit(1)
}

if (newPassword.length < 6) {
  console.error('Błąd: Nowe hasło musi mieć co najmniej 6 znaków.')
  process.exit(1)
}

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('Błąd: Brak zmiennej DATABASE_URL w środowisku kontenera.')
    process.exit(1)
  }

  const adapter = new PrismaPg({ connectionString: dbUrl })
  const prisma = new PrismaClient({ adapter })

  try {
    const cleanIdentifier = usernameOrEmail.trim()
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier, mode: 'insensitive' } },
          { username: { equals: cleanIdentifier, mode: 'insensitive' } },
        ],
      },
    })

    if (!user) {
      console.error(`[BŁĄD] Nie znaleziono użytkownika o loginie lub emailu "${cleanIdentifier}".`)
      process.exit(1)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    console.log('---------------------------------------------------------')
    console.log(`[SUKCES] Hasło dla użytkownika "${user.username}" (${user.email}) zostało pomyślnie zmienione!`)
    console.log(`Rola w systemie: ADMIN`)
    console.log('Możesz się teraz zalogować w przeglądarce nowym hasłem.')
    console.log('---------------------------------------------------------')
  } catch (err) {
    console.error('Wystąpił błąd bazy danych:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
