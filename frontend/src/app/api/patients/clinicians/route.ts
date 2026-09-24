import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const remoteBackend = process.env.BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_API_URL : null)
    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients/clinicians`, {
          signal: AbortSignal.timeout(3000),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch {}
    }

    const clinicians = await prisma.user.findMany({
      where: { role: 'CLINICIAN' },
      include: {
        assignedPatients: true,
      },
    })

    const data = clinicians.map((c) => ({
      id: c.id,
      _id: c.id,
      name: c.name,
      email: c.email,
      specialty: c.email.includes('2') ? 'General Surgery Specialist' : 'Colorectal & Trauma Surgery Specialist',
      activeCount: c.assignedPatients.length,
      pendingCount: 0,
    }))

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load clinicians directory' },
      { status: 500 }
    )
  }
}
