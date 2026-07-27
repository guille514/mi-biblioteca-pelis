import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    const titleId = searchParams.get('titleId')

    if (!profileId || !titleId) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      )
    }

    const entry = await prisma.watchEntry.findUnique({
      where: {
        profileId_titleId: {
          profileId,
          titleId: parseInt(titleId),
        },
      },
    })

    return NextResponse.json({ exists: !!entry, entry })
  } catch (error) {
    console.error('Error al verificar biblioteca:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}