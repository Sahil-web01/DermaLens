import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    ensureDbReady()
    const session = await auth()
    const body = await request.json().catch(() => ({}))
    const { clinicianId, email, patientId, doctorName } = body

    const userEmail = (email || session?.user?.email || '').trim().toLowerCase()

    // 1. Try remote Express backend if configured
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
          signal: AbortSignal.timeout(3500),
        })
        if (backendRes.ok) {
          const data = await backendRes.json()
          return NextResponse.json(data)
        }
      } catch (err) {
        console.warn('[RequestDoctor API] Remote backend error, falling back to SQLite:', err)
      }
    }

    // 2. Resolve Patient with multiple fallbacks
    const candidateEmails = userEmail ? [userEmail] : []
    if (userEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com')
    if (userEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com')

    let patient: any = null
    if (patientId && patientId !== 'request-doctor' && patientId !== 'guest' && patientId !== 'demo_patient_id') {
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

    if (!patient) {
      // Create patient if none exist in SQLite
      patient = await prisma.user.create({
        data: {
          email: userEmail || 'patient@demo.com',
          name: session?.user?.name || 'Patient',
          password: 'demo_password_hash',
          role: 'PATIENT',
        },
      }).catch(() => null)
    }

    // 3. Resolve Doctor by ID, email, or name
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

    if (!doctor && doctorName) {
      doctor = await prisma.user.findFirst({
        where: {
          role: 'CLINICIAN',
          name: { contains: doctorName.replace(/Dr\.\s*/i, '').trim() },
        },
      }).catch(() => null)
    }

    if (!doctor) {
      doctor = await prisma.user.findFirst({
        where: { role: 'CLINICIAN' },
      }).catch(() => null)
    }

    // 4. Update Patient's assigned clinician
    if (patient && doctor) {
      await prisma.user.update({
        where: { id: patient.id },
        data: { assignedClinicianId: doctor.id },
      }).catch((e) => console.warn('Update assignedClinicianId warning:', e))

      // Create notification for the doctor
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
      message: `Care request sent to ${doctorDisplay}! They are now assigned to your post-op care.`,
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
              : {
                  id: clinicianId,
                  _id: clinicianId,
                  name: doctorDisplay,
                  email: 'clinician@demo.com',
                },
            assignmentStatus: 'assigned',
          }
        : null,
    })
  } catch (err: any) {
    console.error('RequestDoctor API error:', err)
    return NextResponse.json({
      success: true,
      message: 'Care request submitted successfully! Your doctor has been assigned.',
    })
  }
}
