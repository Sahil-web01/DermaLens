import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json().catch(() => ({}))
    const { clinicianId, email } = body

    const userEmail = (email || session?.user?.email || '').trim().toLowerCase()

    const remoteBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? process.env.NEXT_PUBLIC_API_URL
        : null)

    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients/request-doctor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.user?.email ? { 'X-User-Email': session.user.email } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(4000),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch (err) {
        console.warn('[RequestDoctor API] Remote backend error, falling back to SQLite:', err)
      }
    }

    let patient = userEmail ? await prisma.user.findUnique({ where: { email: userEmail } }) : null
    if (!patient) {
      patient = await prisma.user.findFirst({ where: { role: 'PATIENT' } })
    }

    if (!patient) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 })
    }

    const doctor = clinicianId ? await prisma.user.findUnique({ where: { id: clinicianId } }) : null

    if (clinicianId) {
      await prisma.user.update({
        where: { id: patient.id },
        data: { assignedClinicianId: clinicianId },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Care request sent to ${doctor?.name || 'the physician'}. Awaiting confirmation.`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
