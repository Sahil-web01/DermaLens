import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { compare } from 'bcryptjs'
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

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })
          
          if (!user) return null

          const passwordMatches = await compare(password, user.password)
          if (!passwordMatches) return null

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