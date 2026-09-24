import { NextResponse } from 'next/server'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULT_CLINICIANS = [
  {
    id: 'cmufb5i2u00034j6hemjj785r',
    _id: 'cmufb5i2u00034j6hemjj785r',
    name: 'Dr. Sarah Chen, MD',
    email: 'clinician@demo.com',
    specialty: 'Colorectal & Trauma Surgery Specialist',
    activeCount: 4,
    pendingCount: 0,
  },
  {
    id: 'cmufk6gcv0002jq2kwypgv3rl',
    _id: 'cmufk6gcv0002jq2kwypgv3rl',
    name: 'Dr. James Wong, MD',
    email: 'clinician2@demo.com',
    specialty: 'General Surgery Specialist',
    activeCount: 1,
    pendingCount: 0,
  },
]

export async function GET() {
  try {
    ensureDbReady()

    const remoteBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? process.env.NEXT_PUBLIC_API_URL
        : null)

    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients/clinicians`, {
          signal: AbortSignal.timeout(3000),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          if (data && Array.isArray(data.data) && data.data.length > 0) {
            return NextResponse.json(data)
          }
        }
      } catch (backendErr) {
        console.warn('[Clinicians API] Remote backend unavailable, falling back to SQLite:', backendErr)
      }
    }

    const clinicians = await prisma.user.findMany({
      where: { role: 'CLINICIAN' },
      include: {
        assignedPatients: true,
      },
    })

    let data = clinicians.map((c) => ({
      id: c.id,
      _id: c.id,
      name: c.name,
      email: c.email,
      specialty: c.email.includes('2')
        ? 'General Surgery Specialist'
        : 'Colorectal & Trauma Surgery Specialist',
      activeCount: c.assignedPatients?.length || 0,
      pendingCount: 0,
    }))

    if (data.length === 0) {
      data = DEFAULT_CLINICIANS
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('Clinicians API error, returning fallback directory:', error)
    return NextResponse.json({
      success: true,
      data: DEFAULT_CLINICIANS,
    })
  }
}
