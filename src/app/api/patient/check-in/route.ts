import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const episodeId = formData.get('episodeId') as string
    const painScore = parseInt(formData.get('painScore') as string) || 0
    const redness = formData.get('redness') === 'true'
    const swelling = formData.get('swelling') === 'true'
    const drainage = formData.get('drainage') === 'true'
    const fever = formData.get('fever') === 'true'
    const temperature = formData.get('temperature') ? parseFloat(formData.get('temperature') as string) : null
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null

    if (!episodeId) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 })
    }

    const episode = await prisma.woundEpisode.findUnique({
      where: { id: episodeId },
    })

    if (!episode || episode.patientId !== session.user.id) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    let imageUrl: string | null = null
    if (imageFile && imageFile.size > 0) {
      const buffer = await imageFile.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      imageUrl = `data:${imageFile.type};base64,${base64}`
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        woundEpisodeId: episodeId,
        painScore,
        redness,
        swelling,
        drainage,
        fever,
        temperature,
        notes,
        imageUrl,
        status: 'SUBMITTED',
      },
    })

    return NextResponse.json({ checkIn })
  } catch (error) {
    console.error('Create check-in error:', error)
    return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 })
  }
}