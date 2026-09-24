import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 })
    }

    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        readAt: null,
      },
    }).catch(() => 0)

    return NextResponse.json({ count })
  } catch (error) {
    return NextResponse.json({ count: 0 })
  }
}