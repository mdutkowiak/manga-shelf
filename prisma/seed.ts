import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter }) as unknown as PrismaClient

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@manga.pl' },
    update: {},
    create: {
      email: 'admin@manga.pl',
      username: 'admin',
      name: 'Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const userPassword = await bcrypt.hash('user123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'user@manga.pl' },
    update: {},
    create: {
      email: 'user@manga.pl',
      username: 'jan_kowalski',
      name: 'Jan Kowalski',
      password: userPassword,
      role: 'USER',
    },
  })

  console.log('Utworzono użytkowników:')
  console.log(`  Admin: ${admin.email} / admin123`)
  console.log(`  User:  ${user.email} / user123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
