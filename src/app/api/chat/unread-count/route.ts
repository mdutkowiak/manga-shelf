import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireFeature } from '@/lib/site-settings'

export async function GET() {
  const disabled = await requireFeature('chat')
  if (disabled) return disabled

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ unreadCount: 0 })
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        receiverId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      unreadCount,
    })
  } catch (error) {
    console.error('GET /api/chat/unread-count error:', error)
    return NextResponse.json({ unreadCount: 0 })
  }
}
