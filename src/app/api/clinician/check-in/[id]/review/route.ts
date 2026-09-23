import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'CLINICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { note, action, nextCheckInDate } = body

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: params.id },
      include: { clinicianReview: true },
    })

    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    }

    if (checkIn.clinicianReview) {
      return NextResponse.json({ error: 'Check-in already reviewed' }, { status: 400 })
    }

    const review = await prisma.clinicianReview.create({
      data: {
        checkInId: params.id,
        clinicianId: session.user.id,
        note,
        action: action || 'ROUTINE_FOLLOW_UP',
        nextCheckInDate: nextCheckInDate ? new Date(nextCheckInDate) : null,
      },
    })

    await prisma.checkIn.update({
      where: { id: params.id },
      data: { status: 'REVIEWED' },
    })

    await prisma.notification.create({
      data: {
        userId: checkIn.woundEpisode.patientId,
        type: 'REVIEW_COMPLETE',
        title: 'Clinical Review Completed',
        message: `Your check-in has been reviewed by a clinician. Action: ${action}`,
        relatedEntityType: 'CHECK_IN',
        relatedEntityId: params.id,
      },
    })

    return NextResponse.json({ checkIn, review })
  } catch (error) {
    console.error('Review check-in error:', error)
    return NextResponse.json({ error: 'Failed to review check-in' }, { status: 500 })
  }
}