import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'CLINICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: params.id },
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
    })

    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    }

    return NextResponse.json({ checkIn })
  } catch (error) {
    console.error('Get check-in error:', error)
    return NextResponse.json({ error: 'Failed to fetch check-in' }, { status: 500 })
  }
}