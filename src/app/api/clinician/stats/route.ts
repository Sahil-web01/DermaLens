import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'CLINICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await prisma.checkIn.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        status: {
          in: ['SUBMITTED', 'UNDER_REVIEW', 'FLAGGED', 'REVIEWED'],
        },
      },
    })

    const statMap = stats.reduce((acc, s) => {
      acc[s.status.toLowerCase()] = s._count.id
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      total: Object.values(statMap).reduce((a, b) => a + b, 0),
      pending: statMap.submitted || 0,
      flagged: statMap.flagged || 0,
      underReview: statMap.under_review || 0,
      reviewed: statMap.reviewed || 0,
    })
  } catch (error) {
    console.error('Get clinician stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}