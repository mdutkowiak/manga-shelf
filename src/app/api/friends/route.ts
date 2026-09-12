import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/friends - Pobierz znajomych i zaproszenia użytkownika
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Brak userId' }, { status: 400 })
  }

  try {
    // Znajomi (zaakceptowane)
    const friends = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'ACCEPTED' },
          { addresseeId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
            bio: true,
            _count: { select: { collections: true } },
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
            bio: true,
            _count: { select: { collections: true } },
          },
        },
      },
    })

    // Oczekujące zaproszenia (otrzymane)
    const pendingReceived = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
            bio: true,
            _count: { select: { collections: true } },
          },
        },
      },
    })

    // Oczekujące zaproszenia (wysłane)
    const pendingSent = await prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'PENDING',
      },
      include: {
        addressee: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
            bio: true,
            _count: { select: { collections: true } },
          },
        },
      },
    })

    // Mapuj znajomych - wyciągnij drugą osobę z relacji
    const friendsList = friends.map((f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester
      return {
        friendshipId: f.id,
        id: friend.id,
        username: friend.username,
        name: friend.name,
        avatar: friend.avatar || friend.image || null,
        bio: friend.bio || null,
        _count: friend._count,
      }
    })

    return NextResponse.json({
      friends: friendsList,
      pendingReceived: pendingReceived.map((p) => ({
        friendshipId: p.id,
        id: p.requester.id,
        username: p.requester.username,
        name: p.requester.name,
        avatar: p.requester.avatar || p.requester.image || null,
        bio: p.requester.bio || null,
        _count: p.requester._count,
      })),
      pendingSent: pendingSent.map((p) => ({
        friendshipId: p.id,
        id: p.addressee.id,
        username: p.addressee.username,
        name: p.addressee.name,
        avatar: p.addressee.avatar || p.addressee.image || null,
        bio: p.addressee.bio || null,
        _count: p.addressee._count,
      })),
    })
  } catch (error) {
    console.error('GET /api/friends:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// POST /api/friends - Wyślij zaproszenie
export async function POST(request: NextRequest) {
  try {
    const { requesterId, addresseeId } = await request.json()

    if (!requesterId || !addresseeId) {
      return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 })
    }

    if (requesterId === addresseeId) {
      return NextResponse.json({ error: 'Nie możesz dodać siebie' }, { status: 400 })
    }

    // Sprawdź czy już istnieje taka relacja
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    })

    if (existing) {
      if (existing.status === 'PENDING') {
        return NextResponse.json({ error: 'Zaproszenie już wysłane' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Jesteście już znajomymi' }, { status: 400 })
    }

    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ success: true, friendship })
  } catch (error) {
    console.error('POST /api/friends:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// PATCH /api/friends - Zaakceptuj lub odrzuć zaproszenie
export async function PATCH(request: NextRequest) {
  try {
    const { friendshipId, action } = await request.json()

    if (!friendshipId || !action) {
      return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 })
    }

    if (!['accept', 'reject', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'Nieprawidłowa akcja' }, { status: 400 })
    }

    if (action === 'remove') {
      await prisma.friendship.delete({ where: { id: friendshipId } })
      return NextResponse.json({ success: true })
    }

    const friendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
    })

    return NextResponse.json({ success: true, friendship })
  } catch (error) {
    console.error('PATCH /api/friends:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// DELETE /api/friends - Usuń znajomego
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const friendshipId = searchParams.get('id')

  if (!friendshipId) {
    return NextResponse.json({ error: 'Brak friendshipId' }, { status: 400 })
  }

  try {
    await prisma.friendship.delete({ where: { id: friendshipId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/friends:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
