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
          const apiBase = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

          // 1. Search Prisma SQLite for user matching email or any alias
          let user = await prisma.user.findFirst({
            where: { email: { in: candidateEmails } },
          }).catch((err) => {
            console.warn('[Auth] Prisma lookup error:', err)
            return null
          })
          
          let passwordMatches = false
          if (user) {
            passwordMatches = await compare(password, user.password).catch(() => false)
          }

          let backendUserSession: { id: string; name: string; email: string; role: 'PATIENT' | 'CLINICIAN' } | null = null

          // 2. If user not found OR password didn't match in Prisma, query Express MongoDB
          if (!user || !passwordMatches) {
            for (const cEmail of candidateEmails) {
              try {
                const res = await fetch(`${apiBase}/auth/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: cEmail, password }),
                })
                if (res.ok) {
                  const data = await res.json()
                  if (data.success && data.user) {
                    backendUserSession = {
                      id: String(data.user.id || data.user._id || normalizedEmail),
                      name: data.user.name || normalizedEmail.split('@')[0],
                      email: normalizedEmail,
                      role: ((data.user.role || 'PATIENT').toUpperCase() === 'CLINICIAN' ? 'CLINICIAN' : 'PATIENT'),
                    }

                    // Best effort sync into Prisma
                    try {
                      const hashedPassword = await hash(password, 10)
                      if (!user) {
                        user = await prisma.user.create({
                          data: {
                            name: data.user.name || normalizedEmail.split('@')[0],
                            email: normalizedEmail,
                            password: hashedPassword,
                            role: backendUserSession.role,
                          },
                        })
                      } else {
                        user = await prisma.user.update({
                          where: { id: user.id },
                          data: { password: hashedPassword },
                        })
                      }
                    } catch (syncErr) {
                      console.warn('[Auth] Prisma sync error (non-fatal):', syncErr)
                    }

                    passwordMatches = true
                    break
                  }
                }
              } catch (backendErr) {
                console.warn('[Auth] Backend login check warning:', backendErr)
              }
            }
          }

          if (!passwordMatches) return null

          // If Prisma user exists and matched, return Prisma user
          if (user) {
            // Guarantee alias record exists in Prisma so future lookups are instant
            if (user.email !== normalizedEmail) {
              try {
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
                  })
                }
              } catch {}
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role as 'PATIENT' | 'CLINICIAN',
            }
          }

          // Otherwise return validated backend user session
          if (backendUserSession) {
            return backendUserSession
          }

          return null
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