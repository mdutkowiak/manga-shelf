/**
 * Skrypt do bezpiecznego zarządzania użytkownikami i resetowania hasła.
 * Działa bezpośrednio z bazą PostgreSQL (używa natywnego pg i bcryptjs).
 * 
 * Sposób użycia w kontenerze produkcyjnym:
 *   docker exec -it manga_shelf_app node scripts/set-password.js
 *   docker exec -it manga_shelf_app node scripts/set-password.js <login_lub_email> <nowe_hasło>
 *   docker exec -it manga_shelf_app node scripts/set-password.js --create <login> <email> <hasło>
 */

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config()
} catch {}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require('pg')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs')

async function run() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('[BŁĄD] Brak zmiennej DATABASE_URL w środowisku.')
    process.exit(1)
  }

  // Handle schema query parameter if present
  const client = new Client({ connectionString: dbUrl })

  try {
    await client.connect()
  } catch (connErr) {
    console.error('[BŁĄD POŁĄCZENIA Z BAZĄ DANYCH]:', connErr.message)
    process.exit(1)
  }

  const args = process.argv.slice(2)

  // 1. Tryb tworzenia nowego użytkownika: --create <username> <email> <password>
  if (args[0] === '--create') {
    const newUsername = args[1] ? args[1].trim() : null
    const newEmail = args[2] ? args[2].trim() : null
    const newPassword = args[3]

    if (!newUsername || !newEmail || !newPassword) {
      console.log('Użycie opcji --create:')
      console.log('  node scripts/set-password.js --create <login> <email> <hasło>')
      await client.end()
      process.exit(1)
    }

    if (newPassword.length < 6) {
      console.error('[BŁĄD] Hasło musi mieć co najmniej 6 znaków.')
      await client.end()
      process.exit(1)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    const newId = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9)

    try {
      await client.query(
        `INSERT INTO users (id, username, email, password, role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'ADMIN', NOW(), NOW())`,
        [newId, newUsername, newEmail.toLowerCase(), hashedPassword]
      )
      console.log('=========================================================')
      console.log(`[SUKCES] Utworzono nowego administratora: "${newUsername}" (${newEmail})`)
      console.log('Rola: ADMIN')
      console.log('Możesz się teraz zalogować w przeglądarce podanym hasłem.')
      console.log('=========================================================')
    } catch (insertErr) {
      console.error('[BŁĄD TWORZENIA UŻYTKOWNIKA]:', insertErr.message)
    }

    await client.end()
    return
  }

  // 2. Brak argumentów -> wylistuj wszystkich użytkowników
  if (args.length === 0) {
    console.log('=========================================================')
    console.log('MANGOWO - ZARZĄDZANIE UŻYTKOWNIKAMI I HASŁAMI')
    console.log('=========================================================')
    try {
      const res = await client.query(
        'SELECT id, username, email, role, name, "createdAt" FROM users ORDER BY "createdAt" ASC'
      )
      if (res.rows.length === 0) {
        console.log('Baza danych nie zawiera jeszcze żadnych kont użytkowników.')
        console.log('\nAby utworzyć pierwsze konto administratora, użyj:')
        console.log('  node scripts/set-password.js --create <login> <email> <hasło>')
      } else {
        console.log('Konta zarejestrowane w bazie danych:')
        res.rows.forEach((u, i) => {
          console.log(`  ${i + 1}. Login: ${u.username} | Email: ${u.email} | Rola: ${u.role} | Imię: ${u.name || '(brak)'}`)
        })
        console.log('\nAby zmienić hasło użytkownika, uruchom:')
        console.log('  node scripts/set-password.js <login_lub_email> <nowe_hasło>')
        console.log('Przykład:')
        console.log(`  node scripts/set-password.js ${res.rows[0].username} MojeNoweHaslo123`)
      }
    } catch (queryErr) {
      console.error('[BŁĄD ODCZYTU UŻYTKOWNIKÓW]:', queryErr.message)
    }
    console.log('=========================================================')
    await client.end()
    return
  }

  // 3. Zmiana hasła użytkownika: <login_lub_email> <nowe_hasło>
  const identifier = args[0].trim()
  const newPassword = args[1]

  if (!newPassword) {
    console.error('[BŁĄD] Nie podano nowego hasła!')
    console.log('Użycie: node scripts/set-password.js <login_lub_email> <nowe_hasło>')
    await client.end()
    process.exit(1)
  }

  if (newPassword.length < 6) {
    console.error('[BŁĄD] Nowe hasło musi mieć co najmniej 6 znaków.')
    await client.end()
    process.exit(1)
  }

  try {
    const userRes = await client.query(
      'SELECT id, username, email, role FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [identifier]
    )

    if (userRes.rows.length === 0) {
      console.error(`[BŁĄD] Nie znaleziono użytkownika o loginie lub emailu: "${identifier}"`)
      console.log('\nDostępne konta w bazie:')
      const allUsers = await client.query('SELECT username, email, role FROM users')
      allUsers.rows.forEach(u => console.log(` - ${u.username} (${u.email}) [${u.role}]`))
      console.log('\nMożesz też utworzyć nowe konto administratora poleceniem:')
      console.log(`  node scripts/set-password.js --create ${identifier} ${identifier}@manga.pl ${newPassword}`)
      await client.end()
      process.exit(1)
    }

    const user = userRes.rows[0]
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await client.query(
      'UPDATE users SET password = $1, role = \'ADMIN\', "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    )

    console.log('=========================================================')
    console.log(`[SUKCES] Hasło dla "${user.username}" (${user.email}) zostało zaktualizowane!`)
    console.log(`Rola w systemie: ADMIN`)
    console.log('Możesz się teraz zalogować w aplikacji podanym hasłem.')
    console.log('=========================================================')
  } catch (err) {
    console.error('[BŁĄD AKTUALIZACJI HASŁA]:', err.message)
  } finally {
    await client.end()
  }
}

run()
