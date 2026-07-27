import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      profileId,
      tmdbId,
      mediaType,
      name,
      posterUrl,
      backdropUrl,
      overview,
      releaseDate,
      voteAverage,
      genres,
      status,
      platforms,
    } = body

    if (!profileId || !tmdbId || !mediaType || !name) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios' },
        { status: 400 }
      )
    }

    // Crear o actualizar el título en el catálogo
    const title = await prisma.title.upsert({
      where: { id: tmdbId },
      update: {},
      create: {
        id: tmdbId,
        mediaType,
        name,
        posterUrl,
        backdropUrl,
        overview,
        releaseDate,
        voteAverage,
        genres: genres || [],
      },
    })

    // Crear o actualizar la entrada en la biblioteca del perfil
    const watchEntry = await prisma.watchEntry.upsert({
      where: {
        profileId_titleId: {
          profileId,
          titleId: tmdbId,
        },
      },
      update: {
        status: status || 'want_to_watch',
        platforms: platforms || [],
        updatedAt: new Date(),
      },
      create: {
        profileId,
        titleId: tmdbId,
        status: status || 'want_to_watch',
        platforms: platforms || [],
      },
    })

    return NextResponse.json({ success: true, watchEntry })
  } catch (error) {
    console.error('Error al añadir a la biblioteca:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}