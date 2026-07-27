import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profileId, library } = body

    if (!profileId || !Array.isArray(library)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    let imported = 0

    for (const item of library) {
      // 1. Crear o actualizar el título en el catálogo global
      await prisma.title.upsert({
        where: { id: item.tmdbId },
        update: {},
        create: {
          id: item.tmdbId,
          mediaType: item.mediaType,
          name: item.name,
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
          overview: item.overview,
          releaseDate: item.releaseDate,
          voteAverage: item.voteAverage,
          genres: item.genres,
        },
      })

      // 2. Crear o actualizar la entrada en la biblioteca del perfil
      await prisma.watchEntry.upsert({
        where: {
          profileId_titleId: {
            profileId,
            titleId: item.tmdbId,
          },
        },
        update: {
          status: item.status,
          currentSeason: item.currentSeason,
          currentEpisode: item.currentEpisode,
          seenTogether: item.seenTogether,
          updatedAt: new Date(),
        },
        create: {
          profileId,
          titleId: item.tmdbId,
          status: item.status,
          currentSeason: item.currentSeason,
          currentEpisode: item.currentEpisode,
          seenTogether: item.seenTogether,
          platforms: [],
        },
      })

      imported++
    }

    return NextResponse.json({ success: true, imported })
  } catch (error) {
    console.error('Error al importar JSON:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}