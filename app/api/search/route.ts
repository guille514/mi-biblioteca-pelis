import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ error: 'Falta el parámetro de búsqueda' }, { status: 400 })
  }

  const apiKey = process.env.TMDB_API_KEY

  if (!apiKey) {
    console.error('❌ ERROR: TMDB_API_KEY no está definida en .env')
    return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 })
  }

  try {
    // Buscar en múltiples categorías (películas y series)
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=es-ES&page=1`
    
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error de TMDB:', response.status, errorText)
      return NextResponse.json({ 
        error: `Error de TMDB: ${response.status}`, 
        details: errorText 
      }, { status: response.status })
    }

    const data = await response.json()

    // Filtrar solo películas y series (ignorar personas)
    const results = data.results.filter(
      (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error('❌ Error al buscar en TMDB:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}