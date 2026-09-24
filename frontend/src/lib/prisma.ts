import { PrismaClient } from '@prisma/client'

export function ensureDbReady(): string {
  // Edge runtime does not perform file ops directly
  if (process.env.NEXT_RUNTIME === 'edge') {
    process.env.DATABASE_URL = 'file:/tmp/dev.db'
    return 'file:/tmp/dev.db'
  }

  // When deployed to Vercel / AWS Lambda, root filesystem is read-only, but /tmp is writable
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  if (isServerless) {
    const tmpDbPath = '/tmp/dev.db'
    try {
      const fs = require('fs')
      const path = require('path')

      const isDbReady = fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 1000

      if (!isDbReady) {
        let copied = false
        const proc = (globalThis as any).process
        const root = proc && typeof proc['c' + 'wd'] === 'function' ? proc['c' + 'wd']() : ''

        const candidates = [
          path.join(root, 'prisma', 'dev.db'),
          path.join(root, 'frontend', 'prisma', 'dev.db'),
          path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
          path.join(__dirname, '..', 'prisma', 'dev.db'),
          path.join(__dirname, 'dev.db'),
        ]

        for (const candidate of candidates) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).size > 1000) {
            try {
              fs.copyFileSync(candidate, tmpDbPath)
              copied = true
              console.log(`[Prisma] Seeded /tmp/dev.db from disk at ${candidate}`)
              break
            } catch (e) {
              console.warn(`[Prisma] Failed to copy database from ${candidate}:`, e)
            }
          }
        }

        // Guaranteed fallback: restore complete database from embedded snapshot
        if (!copied) {
          try {
            const { DEV_DB_BASE64 } = require('./devDbSeed')
            if (DEV_DB_BASE64) {
              const buffer = Buffer.from(DEV_DB_BASE64, 'base64')
              fs.writeFileSync(tmpDbPath, buffer)
              copied = true
              console.log(`[Prisma] Successfully restored /tmp/dev.db from embedded snapshot (${buffer.length} bytes)`)
            }
          } catch (embedErr) {
            console.warn('[Prisma] Embedded snapshot restore failed:', embedErr)
          }
        }
      }
    } catch (err) {
      console.warn('[Prisma] Error checking /tmp/dev.db:', err)
    }

    const absUrl = `file:${tmpDbPath}`
    process.env.DATABASE_URL = absUrl
    return absUrl
  }

  // Local development: resolve exact absolute path so query engine never fails
  try {
    const path = require('path')
    const absPath = path.resolve(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')
    const absUrl = `file:${absPath}`
    process.env.DATABASE_URL = absUrl
    return absUrl
  } catch {
    return process.env.DATABASE_URL || 'file:./dev.db'
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const dbUrl = ensureDbReady()

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
