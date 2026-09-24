import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'CLINICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        woundEpisode: {
          include: {
            patient: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        clinicianReview: true,
      },
      orderBy: { capturedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ checkIns })
  } catch (error) {
    console.error('Get recent check-ins error:', error)
    return NextResponse.json({ error: 'Failed to fetch recent check-ins' }, { status: 500 })
  }
}