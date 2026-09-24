import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        readAt: null,
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Get unread count error:', error)
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
  }
}