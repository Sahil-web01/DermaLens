import { PrismaClient } from '@prisma/client'

function resolveDatabaseUrl(): string {
  // If explicitly overridden by DATABASE_URL (and not the default relative file), use it
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:.')) {
    return process.env.DATABASE_URL
  }

  // Edge runtime does not perform file ops directly
  if (process.env.NEXT_RUNTIME === 'edge') {
    return 'file:/tmp/dev.db'
  }

  // When deployed to Vercel / AWS Lambda, the root filesystem is read-only, but /tmp is writable
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = '/tmp/dev.db'

    try {
      // Dynamic require ensures Next.js Edge compiler does not flag static node built-ins
      const fs = require('fs')
      const path = require('path')

      if (!fs.existsSync(tmpDbPath)) {
        const getCwd = (): string => {
          try {
            return typeof process !== 'undefined' && typeof (process as any).cwd === 'function'
              ? (process as any).cwd()
              : ''
          } catch {
            return ''
          }
        }
        const root = getCwd()

        const candidates = [
          path.join(root, 'prisma', 'dev.db'),
          path.join(root, 'frontend', 'prisma', 'dev.db'),
          path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
          path.join(__dirname, '..', 'prisma', 'dev.db'),
          path.join(__dirname, 'dev.db'),
        ]


        let copied = false
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            try {
              fs.copyFileSync(candidate, tmpDbPath)
              copied = true
              console.log(`[Prisma] Seeded /tmp/dev.db from ${candidate}`)
              break
            } catch (e) {
              console.warn(`[Prisma] Failed to copy database from ${candidate}:`, e)
            }
          }
        }

        if (!copied) {
          console.warn('[Prisma] Bundled dev.db not found, creating fresh database at /tmp/dev.db')
        }
      }
    } catch {}

    return `file:${tmpDbPath}`
  }

  return process.env.DATABASE_URL || 'file:./dev.db'
}


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = resolveDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma