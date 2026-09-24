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
        status: {
          in: ['SUBMITTED', 'UNDER_REVIEW', 'FLAGGED'],
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
    })

    return NextResponse.json({ checkIns })
  } catch (error) {
    console.error('Get review queue error:', error)
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
  }
}