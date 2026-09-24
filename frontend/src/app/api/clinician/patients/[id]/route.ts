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

    const patient = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        patientEpisodes: {
          include: {
            checkIns: {
              orderBy: { capturedAt: 'desc' },
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

    return NextResponse.json({ patient })
  } catch (error) {
    console.error('Get patient error:', error)
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 })
  }
}