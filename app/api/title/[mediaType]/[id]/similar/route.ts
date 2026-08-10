import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaType: string; id: string }> }
) {
  try {
    const { mediaType, id } = await params

    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB_API_KEY no configurada' }, { status: 500 })
    }

    // ✅ Usamos /recommendations en lugar de /similar (mejores resultados)
    const res = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${id}/recommendations?api_key=${apiKey}&language=es-ES&page=1`,
      { headers: { accept: 'application/json' } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al obtener recomendaciones' }, { status: res.status })
    }

    const data = await res.json()

    // ✅ Filtrar y ordenar por calidad
    const results = (data.results || [])
      // Solo incluir los que tengan póster
      .filter((item: any) => item.poster_path)
      // Solo los que tengan valoración > 0
      .filter((item: any) => item.vote_average > 0)
      // Ordenar por valoración (mayor a menor)
      .sort((a: any, b: any) => b.vote_average - a.vote_average)
      // Limitar a 15 resultados
      .slice(0, 15)
      // Añadir el media_type para el link
      .map((item: any) => ({
        ...item,
        media_type: mediaType,
      }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}