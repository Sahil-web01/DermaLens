import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const emailParam = searchParams.get('email')
    const nameParam = searchParams.get('name')

    const userEmail = (emailParam || session?.user?.email || '').trim().toLowerCase()
    const userName = (nameParam || session?.user?.name || '').trim()

    const candidateEmails = [userEmail]
    if (userEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com')
    if (userEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com')

    // 1. Try remote Express backend if configured with an external HTTPS URL
    const remoteBackend = process.env.BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_API_URL : null)
    if (remoteBackend) {
      try {
        const query = userEmail ? `?email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}` : ''
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients/timeline${query}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.user?.email ? { 'X-Clinician-Email': session.user.email, 'X-User-Email': session.user.email } : {}),
          },
          signal: AbortSignal.timeout(3500),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch (e) {
        console.warn('[Timeline API] Remote backend fetch error (falling back to Prisma):', e)
      }
    }

    // 2. Fetch directly from Prisma SQLite (supports Vercel serverless with /tmp)
    let user = await prisma.user.findFirst({
      where: { email: { in: candidateEmails } },
      include: {
        patientEpisodes: {
          include: {
            checkIns: {
              include: {
                clinicianReview: {
                  include: {
                    clinician: true,
                  },
                },
              },
              orderBy: { capturedAt: 'asc' },
            },
          },
        },
        assignedClinician: true,
      },
    })

    // If no user found by email, try default demo patient
    if (!user && (userEmail === 'patient@demo.com' || !userEmail)) {
      user = await prisma.user.findUnique({
        where: { email: 'patient@demo.com' },
        include: {
          patientEpisodes: {
            include: {
              checkIns: {
                include: {
                  clinicianReview: {
                    include: {
                      clinician: true,
                    },
                  },
                },
                orderBy: { capturedAt: 'asc' },
              },
            },
          },
          assignedClinician: true,
        },
      })
    }

    // If still no user, synthesize default patient record
    if (!user) {
      return NextResponse.json({
        success: true,
        patient: {
          _id: 'guest',
          name: userName || 'Patient',
          email: userEmail,
          mrn: `MRN-${new Date().getFullYear()}-0001`,
          surgeryType: 'General Post-Op Surveillance',
          surgeryDate: new Date().toISOString(),
          assignedClinicianId: null,
          assignedClinician: null,
          assignmentStatus: 'unassigned',
        },
        timeline: [],
      })
    }

    const episode = user.patientEpisodes?.[0]
    const checkIns = episode?.checkIns || []

    const timeline = checkIns.map((c) => {
      let photo = c.imageUrl || '/uploads/demo_david_day1.png'
      return {
        _id: c.id,
        photoUrl: photo,
        capturedAt: c.capturedAt.toISOString(),
        symptoms: {
          fever: Boolean(c.fever),
          increasingPain: c.painScore >= 4,
          purulentDischarge: Boolean(c.drainage),
          spreadingRedness: Boolean(c.redness),
        },
        mlOutput: {
          concernScore: c.aiScore ?? 0.15,
          predictedClass: c.aiConcernLevel || 'Low Concern',
          modelVersion: c.modelVersion || 'MobileNetV2-Wound-v1.0',
        },
        reviewStatus: c.status ? c.status.toLowerCase() : 'reviewed',
        clinicianNotes: c.clinicianReview?.note || c.notes || '',
      }
    })

    const patientObj = {
      _id: user.id,
      name: user.name,
      email: user.email,
      mrn: `MRN-${new Date().getFullYear()}-${user.id.slice(-4).toUpperCase()}`,
      surgeryType: episode?.procedureLabel || 'Open Appendectomy',
      surgeryDate: episode?.surgeryDate ? episode.surgeryDate.toISOString() : new Date().toISOString(),
      assignedClinicianId: user.assignedClinicianId,
      assignedClinician: user.assignedClinician
        ? {
            id: user.assignedClinician.id,
            _id: user.assignedClinician.id,
            name: user.assignedClinician.name,
            email: user.assignedClinician.email,
          }
        : null,
      assignmentStatus: user.assignedClinicianId ? 'assigned' : 'unassigned',
    }

    return NextResponse.json({
      success: true,
      patient: patientObj,
      timeline,
    })
  } catch (error: any) {
    console.error('Patient timeline API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load timeline' },
      { status: 500 }
    )
  }
}
