import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface ConversationItem {
  id: string
  userId: string
  username: string
  name: string | null
  avatar: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageSenderId: string | null
  unreadCount: number
  isFriend: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
    }

    const currentUserId = session.user.id
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('q')?.toLowerCase().trim() || ''

    // 1. Fetch recent messages involving user
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: currentUserId },
          { receiverId: currentUserId },
        ],
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
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    })

    // 2. Fetch accepted friends
    const friends = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUserId, status: 'ACCEPTED' },
          { addresseeId: currentUserId, status: 'ACCEPTED' },
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
          },
        },
        addressee: {
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

    const friendIds = new Set<string>()
    const friendUsers = new Map<string, { id: string; username: string; name: string | null; avatar: string | null }>()

    for (const f of friends) {
      const friendObj = f.requesterId === currentUserId ? f.addressee : f.requester
      friendIds.add(friendObj.id)
      friendUsers.set(friendObj.id, {
        id: friendObj.id,
        username: friendObj.username,
        name: friendObj.name,
        avatar: friendObj.avatar || friendObj.image || null,
      })
    }

    // 3. Group messages by partner
    const conversationsMap = new Map<string, ConversationItem>()

    for (const msg of recentMessages) {
      const isSender = msg.senderId === currentUserId
      const partner = isSender ? msg.receiver : msg.sender
      if (!partner || partner.id === currentUserId) continue

      if (!conversationsMap.has(partner.id)) {
        conversationsMap.set(partner.id, {
          id: partner.id,
          userId: partner.id,
          username: partner.username,
          name: partner.name,
          avatar: partner.avatar || partner.image || null,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt.toISOString(),
          lastMessageSenderId: msg.senderId,
          unreadCount: 0,
          isFriend: friendIds.has(partner.id),
        })
      }

      // If message was received by current user and unread
      if (!isSender && !msg.isRead) {
        const conv = conversationsMap.get(partner.id)!
        conv.unreadCount += 1
      }
    }

    // 4. Add any friends who don't have messages yet
    for (const [fId, fUser] of friendUsers.entries()) {
      if (!conversationsMap.has(fId)) {
        conversationsMap.set(fId, {
          id: fId,
          userId: fId,
          username: fUser.username,
          name: fUser.name,
          avatar: fUser.avatar,
          lastMessage: null,
          lastMessageAt: null,
          lastMessageSenderId: null,
          unreadCount: 0,
          isFriend: true,
        })
      }
    }

    // 5. If search query is present, search additional users in the database
    if (searchQuery.length >= 2) {
      const searchUsers = await prisma.user.findMany({
        where: {
          id: { not: currentUserId },
          isActive: true,
          OR: [
            { username: { contains: searchQuery, mode: 'insensitive' } },
            { name: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
          image: true,
        },
        take: 10,
      })

      for (const u of searchUsers) {
        if (!conversationsMap.has(u.id)) {
          conversationsMap.set(u.id, {
            id: u.id,
            userId: u.id,
            username: u.username,
            name: u.name,
            avatar: u.avatar || u.image || null,
            lastMessage: null,
            lastMessageAt: null,
            lastMessageSenderId: null,
            unreadCount: 0,
            isFriend: friendIds.has(u.id),
          })
        }
      }
    }

    // 6. Sort conversations: unread first, then by lastMessageAt descending, then alphabetically
    let conversations = Array.from(conversationsMap.values())

    if (searchQuery) {
      conversations = conversations.filter(
        (c) =>
          c.username.toLowerCase().includes(searchQuery) ||
          (c.name && c.name.toLowerCase().includes(searchQuery))
      )
    }

    conversations.sort((a, b) => {
      // Unread count priority
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1

      // Most recent message date
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      }
      if (a.lastMessageAt && !b.lastMessageAt) return -1
      if (!a.lastMessageAt && b.lastMessageAt) return 1

      // Friends first
      if (a.isFriend && !b.isFriend) return -1
      if (!a.isFriend && b.isFriend) return 1

      return (a.name || a.username).localeCompare(b.name || b.username, 'pl')
    })

    return NextResponse.json({
      success: true,
      conversations,
    })
  } catch (error) {
    console.error('GET /api/chat/conversations error:', error)
    return NextResponse.json({ error: 'Błąd pobierania konwersacji' }, { status: 500 })
  }
}
