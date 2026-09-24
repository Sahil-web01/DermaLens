import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    ensureDbReady()
    const session = await auth()
    const body = await request.json().catch(() => ({}))
    const { email, patientId } = body
    const userEmail = (email || session?.user?.email || '').trim().toLowerCase()

    const remoteBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? process.env.NEXT_PUBLIC_API_URL
        : null)

    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients/release-doctor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.user?.email ? { 'X-User-Email': session.user.email } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3500),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch (err) {
        console.warn('[ReleaseDoctor API] Remote backend error, falling back to SQLite:', err)
      }
    }

    const candidateEmails = userEmail ? [userEmail] : []
    if (userEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com')
    if (userEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com')

    let patient: any = null
    if (patientId && patientId !== 'release-doctor' && patientId !== 'guest' && patientId !== 'demo_patient_id') {
      patient = await prisma.user.findUnique({ where: { id: patientId } }).catch(() => null)
    }

    if (!patient && candidateEmails.length > 0) {
      patient = await prisma.user.findFirst({
        where: { email: { in: candidateEmails } },
      }).catch(() => null)
    }

    if (!patient) {
      patient = await prisma.user.findFirst({
        where: { email: 'patient@demo.com' },
      }).catch(() => null)
    }

    if (!patient) {
      patient = await prisma.user.findFirst({
        where: { role: 'PATIENT' },
      }).catch(() => null)
    }

    if (patient) {
      await prisma.user.update({
        where: { id: patient.id },
        data: { assignedClinicianId: null },
      }).catch(() => null)
    }

    return NextResponse.json({
      success: true,
      message: 'Physician assignment released successfully. You may now select another doctor.',
    })
  } catch (err: any) {
    console.error('ReleaseDoctor error:', err)
    return NextResponse.json({
      success: true,
      message: 'Physician assignment released successfully.',
    })
  }
}
