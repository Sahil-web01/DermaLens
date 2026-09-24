import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'assigned'

    // Forward to remote backend if available
    const remoteBackend = process.env.BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_API_URL : null)
    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients?scope=${scope}`, {
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

    const clinicianEmail = session?.user?.email || 'clinician@demo.com'
    const clinician = await prisma.user.findUnique({
      where: { email: clinicianEmail },
    })

    const allPatients = await prisma.user.findMany({
      where: { role: 'PATIENT' },
      include: {
        patientEpisodes: {
          include: {
            checkIns: true,
          },
        },
        assignedClinician: true,
      },
    })

    const assignedPatients = clinician
      ? allPatients.filter((p) => p.assignedClinicianId === clinician.id)
      : allPatients.filter((p) => p.assignedClinicianId !== null)

    const unassignedPatients = allPatients.filter((p) => !p.assignedClinicianId)

    let filtered = assignedPatients
    if (scope === 'unassigned') {
      filtered = unassignedPatients
    }

    const data = filtered.map((p) => {
      const episode = p.patientEpisodes[0]
      return {
        _id: p.id,
        id: p.id,
        name: p.name,
        email: p.email,
        mrn: `MRN-${new Date().getFullYear()}-${p.id.slice(-4).toUpperCase()}`,
        surgeryType: episode?.procedureLabel || 'General Post-Op Surveillance',
        surgeryDate: episode?.surgeryDate ? episode.surgeryDate.toISOString() : p.createdAt.toISOString(),
        assignedClinicianId: p.assignedClinicianId,
        assignedClinician: p.assignedClinician ? {
          id: p.assignedClinician.id,
          name: p.assignedClinician.name,
          email: p.assignedClinician.email,
        } : null,
        assignmentStatus: p.assignedClinicianId ? 'assigned' : 'unassigned',
        checkInsCount: episode?.checkIns?.length || 0,
        createdAt: p.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data,
      assignedCount: assignedPatients.length,
      incomingRequestsCount: 0,
      unassignedCount: unassignedPatients.length,
      pendingOffersCount: 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}
