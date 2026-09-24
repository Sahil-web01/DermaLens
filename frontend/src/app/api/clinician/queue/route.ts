import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    ensureDbReady()
    const session = await auth()
    const remoteBackend = process.env.BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_API_URL : null)
    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/clinician/queue`, {
          headers: {
            ...(session?.user?.email ? { 'X-Clinician-Email': session.user.email } : {}),
          },
          signal: AbortSignal.timeout(3000),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch {}
    }

    const headerEmail = request.headers.get('x-clinician-email') || request.headers.get('x-user-email')
    const clinicianEmail = (session?.user?.email || headerEmail || 'clinician@demo.com').trim().toLowerCase()
    const clinician = await prisma.user.findUnique({
      where: { email: clinicianEmail },
    })

    if (!clinician) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
      })
    }

    // Fetch check-ins strictly for patients assigned to THIS clinician's cohort
    const checkIns = await prisma.checkIn.findMany({
      where: {
        woundEpisode: {
          patient: {
            assignedClinicianId: clinician.id,
          },
        },
      },
      include: {
        woundEpisode: {
          include: {
            patient: true,
          },
        },
        clinicianReview: true,
      },
      orderBy: { capturedAt: 'desc' },
    })

    const queue = checkIns.map((c) => {
      const p = c.woundEpisode.patient
      const isHighRisk = (c.aiScore ?? 0) >= 0.5 || Boolean(c.fever) || Boolean(c.drainage)
      return {
        _id: c.id,
        patientId: {
          _id: p.id,
          name: p.name,
          mrn: `MRN-${new Date().getFullYear()}-${p.id.slice(-4).toUpperCase()}`,
          surgeryType: c.woundEpisode.procedureLabel,
          surgeryDate: c.woundEpisode.surgeryDate.toISOString(),
        },
        photoUrl: c.imageUrl || '/uploads/demo_david_day7.png',
        capturedAt: c.capturedAt.toISOString(),
        symptoms: {
          fever: Boolean(c.fever),
          increasingPain: c.painScore >= 4,
          purulentDischarge: Boolean(c.drainage),
          spreadingRedness: Boolean(c.redness),
        },
        mlOutput: {
          concernScore: c.aiScore ?? 0.1,
          predictedClass: c.aiConcernLevel || 'Low Concern',
          modelVersion: c.modelVersion || 'MobileNetV2-Wound-v1.0',
        },
        reviewStatus: c.status ? c.status.toLowerCase() : 'pending',
        clinicianNotes: c.clinicianReview?.note || c.notes || '',
        isHighRisk,
      }
    })

    return NextResponse.json({
      success: true,
      data: queue,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load clinician queue' },
      { status: 500 }
    )
  }
}
