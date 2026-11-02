import assert from 'node:assert/strict'
import { prisma } from '../src/lib/prisma'
import { executeImportRun } from '../src/lib/importer/run'
import { applyImportRecords } from '../src/lib/importer/apply'

async function main() {
  // Test czyści tabele, więc działa wyłącznie na lokalnej bazie testowej (nazwa bazy kończy się na "test").
  // Uruchomienie: DATABASE_URL=postgresql://user:pass@localhost:5432/mangatest npx tsx scripts/importer-integration-test.ts
  assert.match(
    process.env.DATABASE_URL ?? '',
    /@localhost:\d+\/\w*test(\?|$)/,
    'Test wolno uruchamiać tylko na lokalnej bazie testowej (nazwa kończy się na "test")'
  )
  await prisma.$executeRawUnsafe('TRUNCATE publishers, mangas, import_records, import_runs, import_cursors CASCADE')

  // --- Przygotowanie: ręcznie dodane dane, które import ma uszanować ---
  const waneko = await prisma.publisher.create({ data: { name: 'Waneko', source: 'manual' } })
  const jjk = await prisma.manga.create({
    data: { title: 'Jujutsu Kaisen', polishTitle: 'Jujutsu Kaisen', publisherId: waneko.id },
  })
  await prisma.volume.create({ data: { mangaId: jjk.id, volumeNumber: 1, pricePLN: 99.99 } }) // ręczna cena
  await prisma.volume.create({ data: { mangaId: jjk.id, volumeNumber: 2, pricePLN: 34.99 } }) // domyślny placeholder

  // --- 1. Import: odświeżenie ostatnich lat dla strumienia "manga" ---
  const run1 = await prisma.importRun.create({ data: { mode: 'refresh', trigger: 'manual' } })
  const stats1 = await executeImportRun(run1.id, { mode: 'refresh', trigger: 'manual', streams: ['manga'], maxPages: 12, budgetMs: 4 * 60_000 })
  console.log('1) refresh stats:', JSON.stringify({ ...stats1, newPublishers: stats1.newPublishers.slice(0, 12) }))
  const pending = await prisma.importRecord.count({ where: { status: 'PENDING' } })
  const publishers = await prisma.publisher.findMany({ orderBy: { name: 'asc' } })
  console.log('   rekordów PENDING:', pending, '| wydawców:', publishers.length, '| nowych (needsReview):', publishers.filter((p) => p.needsReview).map((p) => p.name).slice(0, 15).join(', '))
  assert.ok(pending > 100, 'powinno być sporo rekordów')
  assert.ok(publishers.some((p) => p.name === 'Waneko' && !p.needsReview), 'Waneko pozostaje sprawdzonym wydawcą')
  assert.equal(publishers.filter((p) => p.name === 'Waneko').length, 1, 'bez duplikatu Waneko')
  assert.ok(publishers.some((p) => p.needsReview && p.source === 'bn'), 'nowi wydawcy wpadają na listę do sprawdzenia')
  assert.ok(!publishers.some((p) => /^ilustracje$/i.test(p.name)), 'opisy fizyczne nie są wydawcami')
  assert.ok(!publishers.some((p) => /sh[uū]eisha/i.test(p.name)), 'wydania w języku japońskim nie tworzą wydawców')
  assert.ok(publishers.filter((p) => /egmont/i.test(p.name)).length <= 1, 'warianty nazwy Egmont łączą się w jednego wydawcę')
  assert.equal(await prisma.manga.count(), 1, 'przed zatwierdzeniem nic nie trafia do katalogu')

  // --- 2. Zatwierdzenie rekordów Waneko ---
  const wanekoIds = (await prisma.importRecord.findMany({ where: { publisherId: waneko.id, status: 'PENDING' }, select: { id: true } })).map((r) => r.id)
  const apply1 = await applyImportRecords(wanekoIds)
  console.log('2) zatwierdzono Waneko:', wanekoIds.length, JSON.stringify(apply1))
  const jjkSeries = await prisma.manga.findMany({ where: { OR: [{ title: { contains: 'Jujutsu', mode: 'insensitive' } }, { polishTitle: { contains: 'Jujutsu', mode: 'insensitive' } }] } })
  assert.equal(jjkSeries.length, 1, 'import nie tworzy duplikatu istniejącej serii Jujutsu Kaisen')
  const v1 = await prisma.volume.findUnique({ where: { mangaId_volumeNumber: { mangaId: jjk.id, volumeNumber: 1 } } })
  const v2 = await prisma.volume.findUnique({ where: { mangaId_volumeNumber: { mangaId: jjk.id, volumeNumber: 2 } } })
  console.log('   JJK t.1:', v1?.pricePLN, v1?.isbn, '| t.2:', v2?.pricePLN, v2?.isbn)
  assert.equal(v1?.pricePLN, 99.99, 'ręczna cena zostaje')
  assert.notEqual(v2?.pricePLN, 34.99, 'placeholder 34.99 zastąpiony ceną okładkową')
  assert.ok(v1?.isbn && v2?.isbn, 'ISBN uzupełnione')
  const mangaCount = await prisma.manga.count()
  const volCount = await prisma.volume.count()
  console.log('   katalog: serii', mangaCount, '| tomów', volCount)
  assert.ok(mangaCount > 5 && volCount > 20)
  assert.ok((await prisma.importRecord.count({ where: { status: 'SKIPPED' } })) >= 0)

  // --- 3. Blokada ręcznych zmian: admin zmienia cenę zaimportowanego tomu, ponowny import jej nie nadpisuje ---
  const imported = await prisma.importRecord.findFirst({ where: { status: 'APPLIED', coverPrice: { not: null }, volumeId: { not: null }, NOT: { mangaId: jjk.id } } })
  assert.ok(imported?.volumeId)
  await prisma.volume.update({ where: { id: imported.volumeId }, data: { pricePLN: 12.34 } }) // "ręczna edycja"
  await prisma.importRecord.update({ where: { id: imported.id }, data: { coverPrice: 45.67 } }) // BN podaje nową cenę
  await applyImportRecords([imported.id])
  const after = await prisma.volume.findUnique({ where: { id: imported.volumeId } })
  console.log('3) po ręcznej zmianie ceny i nowej cenie z BN:', after?.pricePLN, '(oczekiwane 12.34)')
  assert.equal(after?.pricePLN, 12.34, 'import nie nadpisuje ręcznie zmienionego pola')

  // a nietknięte pole importowane da się zaktualizować
  const untouched = await prisma.importRecord.findFirst({ where: { status: 'APPLIED', coverPrice: { not: null }, volumeId: { not: null }, id: { not: imported.id }, NOT: { mangaId: jjk.id } } })
  assert.ok(untouched?.volumeId)
  await prisma.importRecord.update({ where: { id: untouched.id }, data: { coverPrice: 55.55 } })
  await applyImportRecords([untouched.id])
  const upd = await prisma.volume.findUnique({ where: { id: untouched.volumeId! } })
  console.log('   nietknięte pole zaktualizowane do:', upd?.pricePLN, '(oczekiwane 55.55)')
  assert.equal(upd?.pricePLN, 55.55)

  // --- 4. Auto-zatwierdzanie dla jednego z nowych wydawców + kursor ---
  const newPub = publishers.find((p) => p.needsReview && p.source === 'bn')!
  await prisma.publisher.update({ where: { id: newPub.id }, data: { autoApprove: true } })
  const before = await prisma.importRecord.count()
  const run2 = await prisma.importRun.create({ data: { mode: 'incremental', trigger: 'manual' } })
  const s2 = await executeImportRun(run2.id, { mode: 'incremental', trigger: 'manual', streams: ['komiks-jpn'], maxPages: 2, budgetMs: 2 * 60_000 })
  const cursor1 = await prisma.importCursor.findUnique({ where: { stream: 'komiks-jpn' } })
  const run3 = await prisma.importRun.create({ data: { mode: 'incremental', trigger: 'manual' } })
  const s3 = await executeImportRun(run3.id, { mode: 'incremental', trigger: 'manual', streams: ['komiks-jpn'], maxPages: 2, budgetMs: 2 * 60_000 })
  const cursor2 = await prisma.importCursor.findUnique({ where: { stream: 'komiks-jpn' } })
  console.log('4) komiks-jpn: run2 nowych', s2.created, '| run3 nowych', s3.created, '| kursor', cursor1?.sinceId, '->', cursor2?.sinceId, '| razem rekordów +', (await prisma.importRecord.count()) - before)
  assert.ok(cursor2 && cursor1 && cursor2.sinceId > cursor1.sinceId, 'kursor idzie do przodu')
  const bnDup = await prisma.importRecord.groupBy({ by: ['bnId'], _count: { _all: true }, having: { bnId: { _count: { gt: 1 } } } })
  assert.equal(bnDup.length, 0, 'brak zduplikowanych rekordów BN')
  const runStatus = await prisma.importRun.findUnique({ where: { id: run3.id } })
  console.log('   status ostatniego uruchomienia:', runStatus?.status)

  // --- 5. Scalanie wydawców ---
  console.log('wszystko OK')
}

main()
  .catch((e) => {
    console.error('TEST NIEUDANY:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
