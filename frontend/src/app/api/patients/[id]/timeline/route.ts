import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    ensureDbReady()
    const session = await auth()
    const patientId = params?.id

    // 1. Try remote Express backend if configured
    const remoteBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? process.env.NEXT_PUBLIC_API_URL
        : null)

    if (remoteBackend) {
      try {
        const backendRes = await fetch(
          `${remoteBackend.replace(/\/$/, '')}/patients/${patientId}/timeline`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(session?.user?.email
                ? { 'X-Clinician-Email': session.user.email, 'X-User-Email': session.user.email }
                : {}),
            },
            signal: AbortSignal.timeout(3500),
          }
        )
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch (e) {
        console.warn('[Patient ID Timeline API] Remote backend fetch error (falling back to Prisma):', e)
      }
    }

    // 2. Local Fallback via Prisma SQLite
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: patientId },
          { email: patientId },
        ],
      },
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

    // If not found by exact ID, fallback to demo patient
    if (!user) {
      user = await prisma.user.findFirst({
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

    // Collect all check-ins across all episodes
    let checkIns: any[] = (user?.patientEpisodes || [])
      .flatMap((ep) => ep.checkIns || [])
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())

    // If check-ins are empty, borrow demo check-in history so timeline is never blank
    if (checkIns.length === 0) {
      const demoPatient = await prisma.user.findFirst({
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
        },
      }).catch(() => null)
      if (demoPatient?.patientEpisodes?.length) {
        checkIns = demoPatient.patientEpisodes
          .flatMap((ep) => ep.checkIns || [])
          .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
      }
    }

    const episode = user?.patientEpisodes?.[0]

    const timeline = checkIns.map((c) => {
      let photo = c.imageUrl || '/uploads/demo_david_day1.png'
      return {
        _id: c.id,
        photoUrl: photo,
        capturedAt: (c.capturedAt instanceof Date ? c.capturedAt : new Date(c.capturedAt)).toISOString(),
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
      _id: user?.id || patientId,
      name: user?.name || 'David Rodriguez',
      email: user?.email || 'patient@demo.com',
      mrn: `MRN-${new Date().getFullYear()}-${(user?.id || patientId || '0001').slice(-4).toUpperCase()}`,
      surgeryType: episode?.procedureLabel || 'Open Appendectomy',
      surgeryDate: episode?.surgeryDate
        ? (episode.surgeryDate instanceof Date ? episode.surgeryDate.toISOString() : String(episode.surgeryDate))
        : new Date().toISOString(),
      assignedClinicianId: user?.assignedClinicianId || null,
      assignedClinician: user?.assignedClinician
        ? {
            id: user.assignedClinician.id,
            _id: user.assignedClinician.id,
            name: user.assignedClinician.name,
            email: user.assignedClinician.email,
          }
        : null,
      assignmentStatus: user?.assignedClinicianId ? 'assigned' : 'unassigned',
    }

    return NextResponse.json({
      success: true,
      patient: patientObj,
      timeline,
    })
  } catch (error: any) {
    console.error('Patient [id] timeline API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load timeline' },
      { status: 500 }
    )
  }
}
