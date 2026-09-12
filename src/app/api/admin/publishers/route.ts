import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const INITIAL_PUBLISHERS = [
  { name: 'Waneko', website: 'https://waneko.pl' },
  { name: 'Studio JG', website: 'https://studiojg.pl' },
  { name: 'J.P.Fantastica', website: 'https://jpf.com.pl' },
  { name: 'Kotori', website: 'https://kotori.pl' },
  { name: 'Dango', website: 'https://sklep-dango.pl' },
  { name: 'Hanami', website: 'https://wydawnictwohanami.pl' },
]

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const count = await prisma.publisher.count()
    if (count === 0) {
      for (const pub of INITIAL_PUBLISHERS) {
        await prisma.publisher.upsert({
          where: { name: pub.name },
          update: {},
          create: pub,
        })
      }
    }

    const publishers = await prisma.publisher.findMany({
      include: {
        _count: {
          select: { mangas: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, publishers })
  } catch (error) {
    console.error('[ADMIN_PUBLISHERS_GET]', error)
    return NextResponse.json({ error: 'Błąd podczas pobierania wydawców' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const { name, website } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nazwa wydawcy jest wymagana' }, { status: 400 })
    }

    const publisher = await prisma.publisher.create({
      data: {
        name: name.trim(),
        website: website?.trim() || null,
      },
      include: {
        _count: {
          select: { mangas: true },
        },
      },
    })

    return NextResponse.json({ success: true, publisher })
  } catch (error: unknown) {
    console.error('[ADMIN_PUBLISHERS_POST]', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Wydawca o tej nazwie już istnieje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Błąd podczas dodawania wydawcy' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, website } = body

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Brak wymaganych danych (id, nazwa)' }, { status: 400 })
    }

    const publisher = await prisma.publisher.update({
      where: { id },
      data: {
        name: name.trim(),
        website: website !== undefined ? (website ? website.trim() : null) : undefined,
      },
      include: {
        _count: {
          select: { mangas: true },
        },
      },
    })

    return NextResponse.json({ success: true, publisher })
  } catch (error) {
    console.error('[ADMIN_PUBLISHERS_PATCH]', error)
    return NextResponse.json({ error: 'Błąd podczas aktualizacji wydawcy' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Brak uprawnień administratora' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await request.json()
        id = body.id
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Brak ID wydawcy do usunięcia' }, { status: 400 })
    }

    await prisma.publisher.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Wydawca usunięty' })
  } catch (error) {
    console.error('[ADMIN_PUBLISHERS_DELETE]', error)
    return NextResponse.json({ error: 'Błąd podczas usuwania wydawcy' }, { status: 500 })
  }
}
