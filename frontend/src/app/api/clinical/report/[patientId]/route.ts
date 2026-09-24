import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'CLINICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patient = await prisma.user.findUnique({
      where: { id: params.patientId },
      include: {
        patientEpisodes: {
          include: {
            checkIns: {
              orderBy: { capturedAt: 'desc' },
              include: { clinicianReview: true },
            },
          },
        },
      },
    })

    if (!patient || patient.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    if (patient.assignedClinicianId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const episodes = patient.patientEpisodes
    const checkIns = episodes.flatMap((e) => e.checkIns)

    return NextResponse.json({ patient, episodes, checkIns })
  } catch (error) {
    console.error('Get report error:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}