import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { countryCode } = body

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Falta el código de país' },
        { status: 400 }
      )
    }

    const profile = await prisma.profile.update({
      where: { id },
      data: { countryCode },
    })

    return NextResponse.json({ success: true, profile })
  } catch (error) {
    console.error('Error al actualizar país:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}