import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    ensureDbReady()
    const session = await auth()
    const clinicianEmail = session?.user?.email || 'clinician@demo.com'

    // 1. Try remote backend if configured
    const remoteBackend = process.env.BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_API_URL : null)
    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/clinician/patients`, {
          headers: {
            'X-Clinician-Email': clinicianEmail,
          },
          signal: AbortSignal.timeout(3000),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch {}
    }

    const clinician = await prisma.user.findUnique({
      where: { email: clinicianEmail },
    })

    let patients = await prisma.user.findMany({
      where: {
        role: 'PATIENT',
        ...(clinician ? { assignedClinicianId: clinician.id } : {}),
      },
      include: {
        patientEpisodes: {
          include: {
            checkIns: {
              orderBy: { capturedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If no assigned patients found for this specific ID, load all patients in system
    if (!patients || patients.length === 0) {
      patients = await prisma.user.findMany({
        where: { role: 'PATIENT' },
        include: {
          patientEpisodes: {
            include: {
              checkIns: {
                orderBy: { capturedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    return NextResponse.json({ success: true, patients })
  } catch (error) {
    console.error('Get patients error:', error)
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
  }
}