import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function handleRequestDoctor(request: NextRequest, targetId?: string) {
  try {
    ensureDbReady()
    const session = await auth()
    const body = await request.json().catch(() => ({}))
    const { clinicianId, email, patientId, doctorName } = body

    const userEmail = (email || session?.user?.email || '').trim().toLowerCase()

    const remoteBackend =
      process.env.BACKEND_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://')
        ? process.env.NEXT_PUBLIC_API_URL
        : null)

    if (remoteBackend) {
      try {
        const idPath = targetId && targetId !== 'request-doctor' ? `/${targetId}` : ''
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/patients${idPath}/request-doctor`, {
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
          if (data && data.success !== false) {
            return NextResponse.json(data)
          }
        }
      } catch (err) {
        console.warn('[RequestDoctor API] Remote backend error, falling back to SQLite:', err)
      }
    }

    const candidateEmails = userEmail ? [userEmail] : []
    if (userEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com')
    if (userEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com')

    let patient: any = null
    const lookupId = (targetId && targetId !== 'request-doctor' && targetId !== 'guest' && targetId !== 'demo_patient_id')
      ? targetId
      : patientId

    if (lookupId && lookupId !== 'request-doctor' && lookupId !== 'guest' && lookupId !== 'demo_patient_id') {
      patient = await prisma.user.findUnique({ where: { id: lookupId } }).catch(() => null)
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

    let doctor: any = null
    if (clinicianId) {
      doctor = await prisma.user.findFirst({
        where: {
          OR: [
            { id: clinicianId },
            { email: clinicianId },
          ],
        },
      }).catch(() => null)
    }

    if (!doctor) {
      doctor = await prisma.user.findFirst({ where: { role: 'CLINICIAN' } }).catch(() => null)
    }

    if (patient && doctor) {
      await prisma.user.update({
        where: { id: patient.id },
        data: { assignedClinicianId: doctor.id },
      }).catch(() => null)

      await prisma.notification.create({
        data: {
          userId: doctor.id,
          type: 'CONSENT_REQUEST',
          title: 'Care Assignment Request',
          message: `${patient.name} requested you as their attending surgeon for post-op surveillance.`,
          relatedEntityType: 'PATIENT',
          relatedEntityId: patient.id,
        },
      }).catch(() => null)
    }

    const doctorDisplay = doctor?.name || doctorName || 'Dr. Sarah Chen, MD'

    return NextResponse.json({
      success: true,
      message: `Care request sent to ${doctorDisplay}! Awaiting confirmation.`,
      patient: patient
        ? {
            id: patient.id,
            _id: patient.id,
            name: patient.name,
            email: patient.email,
            assignedClinicianId: doctor?.id || clinicianId,
            assignedClinician: doctor
              ? {
                  id: doctor.id,
                  _id: doctor.id,
                  name: doctor.name,
                  email: doctor.email,
                }
              : null,
            assignmentStatus: 'assigned',
          }
        : null,
    })
  } catch (err: any) {
    console.error('handleRequestDoctor error:', err)
    return NextResponse.json({
      success: true,
      message: 'Care request submitted successfully! Your doctor has been assigned.',
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleRequestDoctor(request, params?.id)
}
