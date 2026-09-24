import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const userRole = role === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT'

    // 1. Check if user already exists in Prisma SQLite
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      )
    }

    // 2. Hash password
    const hashedPassword = await hash(password, 10)

    // 3. Create user in Prisma
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole,
      },
    })

    // 4. Also synchronize registration with Express backend MongoDB (best-effort)
    try {
      await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role: userRole,
        }),
      })

      // If registered as patient, also create a patient profile in MongoDB if needed
      if (userRole === 'PATIENT') {
        const mrn = `MRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        await fetch(`${API_BASE}/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: normalizedEmail,
            mrn,
            surgeryType: 'General Post-Op Surveillance',
            surgeryDate: new Date().toISOString(),
          }),
        }).catch(() => {})
      }
    } catch (err) {
      // Backend sync error should not prevent user creation
      console.warn('Backend sync warning on register:', err)
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully.',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create account.' },
      { status: 500 }
    )
  }
}
