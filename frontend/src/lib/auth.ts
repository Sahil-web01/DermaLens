import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { compare, hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const normalizedEmail = email.toLowerCase().trim()

        const getCandidateEmails = (norm: string): string[] => {
          if (norm === 'sahil@gmail.com' || norm === 'sahildh@gmail.com') {
            return ['sahil@gmail.com', 'sahildh@gmail.com']
          }
          return [norm]
        }

        const candidateEmails = getCandidateEmails(normalizedEmail)

        try {
          // 1. Search Prisma SQLite for user matching email or any alias
          let user = await prisma.user.findFirst({
            where: { email: { in: candidateEmails } },
          })
          
          let passwordMatches = false
          if (user) {
            passwordMatches = await compare(password, user.password)
          }

          // 2. If user not found OR password didn't match in Prisma, query Express MongoDB
          if (!user || !passwordMatches) {
            for (const cEmail of candidateEmails) {
              try {
                const res = await fetch('http://localhost:5000/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: cEmail, password }),
                })
                if (res.ok) {
                  const data = await res.json()
                  if (data.success && data.user) {
                    const hashedPassword = await hash(password, 10)
                    if (!user) {
                      user = await prisma.user.create({
                        data: {
                          name: data.user.name || normalizedEmail.split('@')[0],
                          email: normalizedEmail,
                          password: hashedPassword,
                          role: (data.user.role || 'PATIENT').toUpperCase(),
                        },
                      })
                    } else {
                      // Update Prisma user password with the validated hash
                      user = await prisma.user.update({
                        where: { id: user.id },
                        data: { password: hashedPassword },
                      })
                    }
                    passwordMatches = true
                    break
                  }
                }
              } catch (backendErr) {
                console.warn('Backend login check warning:', backendErr)
              }
            }
          }

          if (!user || !passwordMatches) return null

          // Guarantee alias record exists in Prisma so future lookups are instant
          if (user.email !== normalizedEmail) {
            const aliasExists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
            if (!aliasExists) {
              await prisma.user.create({
                data: {
                  name: user.name,
                  email: normalizedEmail,
                  password: user.password,
                  role: user.role,
                  assignedClinicianId: user.assignedClinicianId,
                },
              }).catch(() => {})
            }
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as 'PATIENT' | 'CLINICIAN',
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role as string
      }
      return token
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'PATIENT' | 'CLINICIAN'
      }
      return session
    },
  },
})

export type UserRole = 'PATIENT' | 'CLINICIAN'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  image?: string | null
}

declare module 'next-auth' {
  interface Session {
    user: AuthUser & { id: string }
    accessToken?: string
  }
  interface User {
    role: UserRole
    image?: string | null
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: string
  }
}