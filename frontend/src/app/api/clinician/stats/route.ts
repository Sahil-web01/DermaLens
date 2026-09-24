import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma, ensureDbReady } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    ensureDbReady()
    const session = await auth()

    // 1. Try remote backend if configured
    const remoteBackend = process.env.BACKEND_URL || (process.env.NEXT_PUBLIC_API_URL?.startsWith('https://') ? process.env.NEXT_PUBLIC_API_URL : null)
    if (remoteBackend) {
      try {
        const backendRes = await fetch(`${remoteBackend.replace(/\/$/, '')}/clinician/stats`, {
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

    const headerEmail = request.headers.get('x-clinician-email') || request.headers.get('x-user-email')
    const clinicianEmail = (session?.user?.email || headerEmail || 'clinician@demo.com').trim().toLowerCase()

    const clinician = await prisma.user.findUnique({
      where: { email: clinicianEmail },
    })

    if (!clinician) {
      const emptyPayload = { total: 0, pending: 0, flagged: 0, underReview: 0, reviewed: 0 }
      return NextResponse.json({
        success: true,
        data: emptyPayload,
        ...emptyPayload,
      })
    }

    // Filter check-ins strictly to patients assigned to THIS clinician
    const checkIns = await prisma.checkIn.findMany({
      where: {
        woundEpisode: {
          patient: {
            assignedClinicianId: clinician.id,
          },
        },
      },
      select: {
        status: true,
        aiScore: true,
        fever: true,
        drainage: true,
      },
    })

    const total = checkIns.length
    const pending = checkIns.filter((c) => c.status === 'SUBMITTED' || c.status === 'pending').length
    const underReview = checkIns.filter((c) => c.status === 'UNDER_REVIEW' || c.status === 'manual_review_required').length
    const reviewed = checkIns.filter((c) => c.status === 'REVIEWED' || c.status === 'reviewed').length
    const flagged = checkIns.filter(
      (c) => c.status === 'FLAGGED' || (c.aiScore ?? 0) >= 0.5 || Boolean(c.fever) || Boolean(c.drainage)
    ).length

    const payload = {
      total,
      pending,
      flagged,
      underReview,
      reviewed,
    }

    return NextResponse.json({
      success: true,
      data: payload,
      ...payload,
    })

  } catch (error) {
    console.error('Get clinician stats error:', error)
    const zeroPayload = { total: 0, pending: 0, flagged: 0, underReview: 0, reviewed: 0 }
    return NextResponse.json({
      success: true,
      data: zeroPayload,
      ...zeroPayload,
    })
  }
}