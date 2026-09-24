import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    const targetId = params?.id

    const remoteBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? process.env.NEXT_PUBLIC_API_URL
        : null)

    if (remoteBackend && targetId) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients/${targetId}/cancel-offer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.user?.email ? { 'X-Clinician-Email': session.user.email } : {}),
          },
          signal: AbortSignal.timeout(4000),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch (err) {
        console.warn('[CancelOffer API] Remote backend error, falling back to SQLite:', err)
      }
    }

    const patient = await prisma.user.findUnique({ where: { id: targetId } })
    if (!patient) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: patient.id },
      data: { assignedClinicianId: null },
    })

    return NextResponse.json({
      success: true,
      message: `Care offer for ${patient.name} withdrawn successfully.`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
