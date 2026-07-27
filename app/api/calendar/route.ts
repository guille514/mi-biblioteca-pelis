import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const profileId = url.searchParams.get('profileId')
    
    if (!profileId) {
      return NextResponse.json({ error: 'Falta profileId' }, { status: 400 })
    }

    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB_API_KEY no configurada' }, { status: 500 })
    }

    // 1. Obtener todos los títulos del perfil en estado "watching" o "want_to_watch"
    const entries = await prisma.watchEntry.findMany({
      where: {
        profileId,
        status: { in: ['watching', 'want_to_watch'] },
      },
      include: { title: true },
    })

    const upcomingReleases: Array<{
      titleId: number
      name: string
      mediaType: string
      posterUrl: string | null
      releaseDate: string
      seasonNumber: number | null
      status: string
    }> = []

    // 2. Para cada título, obtener la próxima fecha de estreno
    for (const entry of entries) {
      const title = entry.title
      const now = new Date()
      const lastUpdated = title.airDateUpdatedAt ? new Date(title.airDateUpdatedAt) : null
      
      // Solo actualizar si nunca se actualizó o han pasado más de 24 horas
      const needsUpdate = !lastUpdated || 
        (now.getTime() - lastUpdated.getTime()) > 24 * 60 * 60 * 1000

      let nextAirDate = title.nextAirDate
      let nextSeasonNumber = title.nextSeasonNumber

      if (needsUpdate) {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/${title.mediaType}/${title.id}?api_key=${apiKey}&language=es-ES`,
            { headers: { accept: 'application/json' } }
          )
          
          if (res.ok) {
            const data = await res.json()
            
            if (title.mediaType === 'tv') {
              // Para series: buscar el próximo episodio a emitir
              if (data.next_episode_to_air) {
                nextAirDate = data.next_episode_to_air.air_date
                nextSeasonNumber = data.next_episode_to_air.season_number
              } else if (data.last_episode_to_air && data.status === 'Returning Series') {
                // Si está en emisión pero no hay próximo episodio, usar info de temporadas
                const upcomingSeason = data.seasons?.find(
                  (s: any) => s.air_date && new Date(s.air_date) > now && s.season_number > 0
                )
                if (upcomingSeason) {
                  nextAirDate = upcomingSeason.air_date
                  nextSeasonNumber = upcomingSeason.season_number
                }
              } else {
                // Serie terminada o sin próximos episodios
                nextAirDate = null
                nextSeasonNumber = null
              }
            } else {
              // Para películas: usar release_date si es futura
              if (data.release_date && new Date(data.release_date) > now) {
                nextAirDate = data.release_date
                nextSeasonNumber = null
              } else {
                nextAirDate = null
                nextSeasonNumber = null
              }
            }

            // Actualizar en la base de datos (caché)
            await prisma.title.update({
              where: { id: title.id },
              data: {
                nextAirDate,
                nextSeasonNumber,
                airDateUpdatedAt: now,
              },
            })
          }
        } catch (err) {
          console.error(`Error actualizando ${title.name}:`, err)
        }

        // Pausa para no saturar la API de TMDB
        await new Promise(r => setTimeout(r, 250))
      }

      // Añadir a la lista solo si tiene fecha de estreno futura
      if (nextAirDate && new Date(nextAirDate) >= now) {
        upcomingReleases.push({
          titleId: title.id,
          name: title.name,
          mediaType: title.mediaType,
          posterUrl: title.posterUrl,
          releaseDate: nextAirDate,
          seasonNumber: nextSeasonNumber,
          status: entry.status,
        })
      }
    }

    // Ordenar por fecha
    upcomingReleases.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))

    return NextResponse.json({ releases: upcomingReleases })
  } catch (error) {
    console.error('Error en calendario:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}