import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const currentUserId = session.user.id
    const { searchParams } = new URL(request.url)
    const withUserId = searchParams.get('withUserId')
    const before = searchParams.get('before') // ISO date string for cursor pagination
    const limit = Math.min(50, Math.max(10, parseInt(searchParams.get('limit') || '25', 10)))

    if (!withUserId) {
      return NextResponse.json({ error: 'Brak withUserId' }, { status: 400 })
    }

    // 1. Fetch messages between the two users
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: withUserId },
          { senderId: withUserId, receiverId: currentUserId },
        ],
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }, // Latest first for limit
      take: limit + 1,
    })

    const hasMore = messages.length > limit
    const trimmed = hasMore ? messages.slice(0, limit) : messages
    const chronologicallyOrdered = trimmed.reverse() // oldest to newest for UI display

    // 2. Mark any unread messages from the other user as read
    await prisma.chatMessage.updateMany({
      where: {
        senderId: withUserId,
        receiverId: currentUserId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    }).catch((err) => console.warn('Error marking messages as read:', err))

    return NextResponse.json({
      success: true,
      messages: chronologicallyOrdered,
      hasMore,
      oldestTimestamp: chronologicallyOrdered.length > 0 ? chronologicallyOrdered[0].createdAt : null,
    })
  } catch (error) {
    console.error('GET /api/chat error:', error)
    return NextResponse.json({ error: 'Błąd pobierania wiadomości' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const currentUserId = session.user.id
    const body = await request.json()
    const { receiverId, content } = body

    if (!receiverId || !content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Odbiorca i treść wiadomości są wymagane' }, { status: 400 })
    }

    if (receiverId === currentUserId) {
      return NextResponse.json({ error: 'Nie możesz pisać wiadomości do samego siebie' }, { status: 400 })
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isActive: true },
    })

    if (!receiver || !receiver.isActive) {
      return NextResponse.json({ error: 'Odbiorca nie istnieje lub jest nieaktywny' }, { status: 404 })
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        senderId: currentUserId,
        receiverId,
        content: content.trim(),
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: newMessage,
    })
  } catch (error) {
    console.error('POST /api/chat error:', error)
    return NextResponse.json({ error: 'Błąd wysyłania wiadomości' }, { status: 500 })
  }
}
