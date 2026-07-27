import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params

    const entries = await prisma.watchEntry.findMany({
      where: { profileId },
      include: {
        title: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error al obtener biblioteca:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}