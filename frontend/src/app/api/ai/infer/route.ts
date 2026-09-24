import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 })
    }

    const imageBuffer = await imageFile.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')

    const analysis = await analyzeImageHeuristic(base64Image, imageFile.type)

    return NextResponse.json({
      concernLevel: analysis.concernLevel,
      score: analysis.score,
      modelVersion: 'heuristic-v1.0.0-fallback',
      processingTimeMs: analysis.processingTimeMs,
      fallback: true,
    })
  } catch (error) {
    console.error('[AI API] Inference error:', error)
    return NextResponse.json(
      {
        concernLevel: 'Low',
        score: 0.1,
        modelVersion: 'heuristic-v1.0.0-error',
        processingTimeMs: 0,
        fallback: true,
        error: 'Inference unavailable',
      },
      { status: 200 }
    )
  }
}

async function analyzeImageHeuristic(base64: string, mimeType: string): Promise<{
  concernLevel: 'Low' | 'Moderate' | 'High'
  score: number
  processingTimeMs: number
}> {
  const startTime = performance.now()

  const brightness = estimateBrightness(base64)
  const redness = estimateRedness(base64)
  const contrast = estimateContrast(base64)

  let score = 0

  if (brightness < 0.3 || brightness > 0.85) {
    score += 0.15
  }

  if (redness > 0.4) {
    score += Math.min(0.5, redness)
  }

  if (contrast < 0.2) {
    score += 0.1
  }

  score = Math.min(1, Math.max(0, score))

  let concernLevel: 'Low' | 'Moderate' | 'High'
  if (score >= 0.7) concernLevel = 'High'
  else if (score >= 0.4) concernLevel = 'Moderate'
  else concernLevel = 'Low'

  return {
    concernLevel,
    score: Math.round(score * 100) / 100,
    processingTimeMs: Math.round(performance.now() - startTime),
  }
}

function estimateBrightness(base64: string): number {
  let sum = 0
  let count = 0
  for (let i = 0; i < base64.length; i += 4) {
    const charCode = base64.charCodeAt(i)
    if (charCode >= 48 && charCode <= 57) sum += charCode - 48
    else if (charCode >= 65 && charCode <= 90) sum += charCode - 65
    else if (charCode >= 97 && charCode <= 122) sum += charCode - 97
    count++
  }
  return count > 0 ? sum / (count * 61) : 0.5
}

function estimateRedness(base64: string): number {
  let redSum = 0
  let totalSum = 0
  let count = 0
  for (let i = 0; i < base64.length; i += 4) {
    const c1 = base64.charCodeAt(i)
    const c2 = base64.charCodeAt(i + 1)
    if (c1 > c2) {
      redSum += c1 - c2
    }
    totalSum += c1 + c2
    count += 2
  }
  return count > 0 ? redSum / totalSum : 0
}

function estimateContrast(base64: string): number {
  const values: number[] = []
  for (let i = 0; i < base64.length; i++) {
    const code = base64.charCodeAt(i)
    if (code >= 48 && code <= 57) values.push(code - 48)
    else if (code >= 65 && code <= 90) values.push(code - 65)
    else if (code >= 97 && code <= 122) values.push(code - 97)
  }
  if (values.length < 2) return 0.5
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  return Math.min(1, variance / 200)
}