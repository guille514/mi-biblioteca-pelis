import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaType: string; id: string }> }
) {
  const { mediaType, id } = await params
  
  const apiKey = process.env.TMDB_API_KEY
  
  // Obtener el país del perfil actual (si hay sesión activa)
  // Por ahora usamos el país por defecto, pero lo mejoraremos en el frontend
  const url = new URL(request.url)
  const country = url.searchParams.get('country') || process.env.DEFAULT_COUNTRY || 'ES'

  if (!apiKey) {
    return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
  }

  try {
    // Obtener detalles del título
    const detailsRes = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${apiKey}&language=es-ES`,
      { headers: { accept: 'application/json' } }
    )

    if (!detailsRes.ok) {
      throw new Error('Error al obtener detalles')
    }

    const details = await detailsRes.json()

    // Obtener proveedores de streaming para el país específico
    const providersRes = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${apiKey}`,
      { headers: { accept: 'application/json' } }
    )

    let providers: any[] = []
    if (providersRes.ok) {
      const providersData = await providersRes.json()
      // Extraer proveedores del país especificado
      const countryProviders = providersData.results?.[country]
      if (countryProviders) {
        providers = [
          ...(countryProviders.flatrate || []).map((p: any) => ({ ...p, type: 'streaming' })),
          ...(countryProviders.rent || []).map((p: any) => ({ ...p, type: 'rent' })),
          ...(countryProviders.buy || []).map((p: any) => ({ ...p, type: 'buy' })),
        ]
      }
    }

    // Obtener videos (trailers)
    const videosRes = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}/videos?api_key=${apiKey}&language=es-ES`,
      { headers: { accept: 'application/json' } }
    )

    let trailerKey: string | null = null
    if (videosRes.ok) {
      const videosData = await videosRes.json()
      const trailer = videosData.results?.find(
        (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
      )
      if (trailer) {
        trailerKey = trailer.key
      }
    }

    return NextResponse.json({
      ...details,
      mediaType,
      providers,
      trailerKey,
    })
  } catch (error) {
    console.error('Error al obtener detalles:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}