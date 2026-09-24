import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, newPassword } = body

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const candidateEmails = [normalizedEmail]
    if (normalizedEmail === 'sahil@gmail.com') candidateEmails.push('sahildh@gmail.com')
    if (normalizedEmail === 'sahildh@gmail.com') candidateEmails.push('sahil@gmail.com')

    const hashedPassword = await hash(newPassword, 10)

    // 1. Update Prisma SQLite
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: candidateEmails } },
    })

    if (existingUsers.length > 0) {
      for (const u of existingUsers) {
        await prisma.user.update({
          where: { id: u.id },
          data: { password: hashedPassword },
        })
      }
    } else {
      // Create user if not present
      await prisma.user.create({
        data: {
          name: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: hashedPassword,
          role: 'PATIENT',
        },
      })
    }

    // Ensure both sahil@gmail.com and sahildh@gmail.com are present in Prisma
    if (candidateEmails.length > 1) {
      for (const alias of ['sahil@gmail.com', 'sahildh@gmail.com']) {
        const found = await prisma.user.findUnique({ where: { email: alias } })
        if (!found) {
          const sample = existingUsers[0]
          await prisma.user.create({
            data: {
              name: sample?.name || 'Sahil',
              email: alias,
              password: hashedPassword,
              role: sample?.role || 'PATIENT',
              assignedClinicianId: sample?.assignedClinicianId || null,
            },
          }).catch(() => {})
        } else {
          await prisma.user.update({
            where: { id: found.id },
            data: { password: hashedPassword },
          }).catch(() => {})
        }
      }
    }

    // 2. Synchronize with Express MongoDB backend
    try {
      await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, newPassword }),
      })
    } catch (backendErr) {
      console.warn('Backend sync warning on reset-password:', backendErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    })
  } catch (error: any) {
    console.error('Password reset API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset password.' },
      { status: 500 }
    )
  }
}
