"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface TitleDetails {
  id: number
  mediaType: string
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
  genres: Array<{ id: number; name: string }>
  providers: Array<{
    provider_id: number
    provider_name: string
    logo_path: string
    type: 'streaming' | 'rent' | 'buy'
  }>
  trailerKey: string | null
  seasons?: Array<{ 
    season_number: number
    episode_count: number
    name: string 
  }>
}

interface WatchEntry {
  id: string
  status: string
  platforms: string[]
  currentSeason: number | null
  currentEpisode: number | null
  seenTogether: boolean
}

const STATUS_OPTIONS = [
  { value: 'want_to_watch', label: '💭 Quiero ver' },
  { value: 'watching', label: '🎬 Viendo' },
  { value: 'completed', label: '✅ Completado' },
  { value: 'paused', label: '⏸️ En pausa' },
  { value: 'abandoned', label: '❌ Abandonado' },
]

export default function TitleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { mediaType, id } = params as { mediaType: string; id: string }

  const [title, setTitle] = useState<TitleDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [watchEntry, setWatchEntry] = useState<WatchEntry | null>(null)
  const [checking, setChecking] = useState(true)
  const [country, setCountry] = useState('ES') // ✅ Estado para el país

  useEffect(() => {
    const profileId = localStorage.getItem('currentProfileId')
    let defaultCountry = 'ES' // País por defecto

    const loadTitle = (countryCode: string) => {
      fetch(`/api/title/${mediaType}/${id}?country=${countryCode}`)
        .then(res => res.json())
        .then(data => {
          setTitle(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error al cargar detalles:', err)
          setLoading(false)
        })
    }

    if (profileId) {
      // 1. Obtener perfiles para saber el país del usuario actual
      fetch('/api/profiles')
        .then(res => res.json())
        .then(profiles => {
          const current = profiles.find((p: any) => p.id === profileId)
          if (current) {
            setCountry(current.countryCode) // ✅ Guardar en el estado
            defaultCountry = current.countryCode
          }
          
          // 2. Cargar título con el país correcto
          loadTitle(defaultCountry)

          // 3. Verificar si ya está en la biblioteca
          return fetch(`/api/library/check?profileId=${profileId}&titleId=${id}`)
        })
        .then(res => res?.json())
        .then(data => {
          if (data && data.exists) {
            setWatchEntry(data.entry)
          }
          setChecking(false)
        })
        .catch(err => {
          console.error('Error:', err)
          setChecking(false)
        })
    } else {
      // Si no hay perfil, usar país por defecto
      loadTitle(defaultCountry)
      setChecking(false)
    }
  }, [mediaType, id])

  const handleAddToLibrary = async () => {
    if (!title) return

    const profileId = localStorage.getItem('currentProfileId')
    if (!profileId) {
      alert('No hay perfil seleccionado')
      return
    }

    setAdding(true)

    try {
      const titleName = title.mediaType === 'movie' ? title.title : title.name
      const releaseDate = title.mediaType === 'movie' ? title.release_date : title.first_air_date

      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          tmdbId: title.id,
          mediaType: title.mediaType,
          name: titleName,
          posterUrl: title.poster_path ? `https://image.tmdb.org/t/p/w500${title.poster_path}` : null,
          backdropUrl: title.backdrop_path ? `https://image.tmdb.org/t/p/original${title.backdrop_path}` : null,
          overview: title.overview,
          releaseDate: releaseDate || null,
          voteAverage: title.vote_average,
          genres: title.genres?.map(g => g.name) || [],
          status: 'want_to_watch',
          platforms: title.providers?.filter(p => p.type === 'streaming').map(p => p.provider_name) || [],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setWatchEntry(data.watchEntry)
      } else {
        alert('Error al añadir a la biblioteca')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al añadir a la biblioteca')
    } finally {
      setAdding(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!watchEntry) return

    try {
      const response = await fetch(`/api/library/entry/${watchEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const data = await response.json()
        setWatchEntry(data.entry)
      } else {
        alert('Error al actualizar estado')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar estado')
    }
  }

  const handleProgressChange = async (season: number, episode: number) => {
    if (!watchEntry) return

    try {
      const response = await fetch(`/api/library/entry/${watchEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentSeason: season, 
          currentEpisode: episode 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setWatchEntry(data.entry)
      }
    } catch (error) {
      console.error('Error al guardar progreso:', error)
    }
  }

  const handleSeenTogetherToggle = async () => {
    if (!watchEntry) return

    try {
      const response = await fetch(`/api/library/entry/${watchEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seenTogether: !watchEntry.seenTogether 
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setWatchEntry(data.entry)
      }
    } catch (error) {
      console.error('Error al actualizar "Visto juntos":', error)
    }
  }

  // ✅ Función para cambiar el país (colocada ANTES del return)
  const handleCountryChange = async (newCountry: string) => {
    setCountry(newCountry)
    setLoading(true)
    
    // Actualizar el país en el perfil (base de datos)
    const profileId = localStorage.getItem('currentProfileId')
    if (profileId) {
      fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: newCountry }),
      }).catch(err => console.error('Error al guardar país:', err))
    }

    // Recargar los detalles del título con el nuevo país
    try {
      const res = await fetch(`/api/title/${mediaType}/${id}?country=${newCountry}`)
      const data = await res.json()
      setTitle(data)
    } catch (err) {
      console.error('Error al recargar título:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Cargando...</p>
      </div>
    )
  }

  if (!title) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Error al cargar los detalles</p>
      </div>
    )
  }

  const titleName = title.mediaType === 'movie' ? title.title : title.name
  const releaseDate = title.mediaType === 'movie' ? title.release_date : title.first_air_date
  const year = releaseDate ? releaseDate.substring(0, 4) : '—'

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Backdrop */}
      {title.backdrop_path && (
        <div className="relative h-96 w-full">
          <img
            src={`https://image.tmdb.org/t/p/original${title.backdrop_path}`}
            alt={titleName || 'Backdrop'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        </div>
      )}

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-4 -mt-32 relative z-10">
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-400 hover:text-blue-300 font-medium"
        >
          ← Volver
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          {title.poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${title.poster_path}`}
              alt={titleName || 'Poster'}
              className="w-full max-w-xs md:max-w-sm h-auto rounded-lg shadow-2xl flex-shrink-0 self-start"
            />
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{titleName}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <span>{year}</span>
              <span>•</span>
              <span>⭐ {title.vote_average ? title.vote_average.toFixed(1) : '—'}</span>
              <span>•</span>
              <span>{title.mediaType === 'movie' ? '🎬 Película' : '📺 Serie'}</span>
            </div>

            {/* Botón de biblioteca con estado y Progreso */}
            <div className="mb-8 space-y-4">
              {watchEntry ? (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <span className="text-green-400 font-medium">✅ En tu biblioteca</span>
                    <select
                      value={watchEntry.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    {/* Checkbox Visto Juntos */}
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={watchEntry.seenTogether || false}
                        onChange={handleSeenTogetherToggle}
                        className="w-4 h-4 rounded border-gray-600 text-pink-600 focus:ring-pink-500 bg-gray-900"
                      />
                      <span className="text-sm font-medium text-pink-400">💑 Visto juntos</span>
                    </label>
                  </div>

                  {/* Selectores de Temporada y Capítulo (Solo para series) */}
                  {title.mediaType === 'tv' && title.seasons && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        📺 Tu progreso actual
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Temporada</label>
                          <select
                            value={watchEntry.currentSeason || 1}
                            onChange={(e) => {
                              const newSeason = parseInt(e.target.value)
                              handleProgressChange(newSeason, 1)
                            }}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {title.seasons
                              .filter((s) => s.season_number > 0)
                              .map((season) => (
                                <option key={season.season_number} value={season.season_number}>
                                  Temporada {season.season_number}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Capítulo</label>
                          <select
                            value={watchEntry.currentEpisode || 1}
                            onChange={(e) => {
                              const newEpisode = parseInt(e.target.value)
                              const currentSeason = watchEntry.currentSeason || 1
                              handleProgressChange(currentSeason, newEpisode)
                            }}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {(() => {
                              const currentSeasonData = title.seasons?.find(
                                (s) => s.season_number === (watchEntry.currentSeason || 1)
                              )
                              const episodeCount = currentSeasonData?.episode_count || 1
                              
                              return Array.from({ length: episodeCount }, (_, i) => i + 1).map((ep) => (
                                <option key={ep} value={ep}>
                                  Capítulo {ep}
                                </option>
                              ))
                            })()}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={handleAddToLibrary}
                  disabled={adding}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    adding
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {adding ? 'Añadiendo...' : '➕ Añadir a mi biblioteca'}
                </button>
              )}
            </div>

            {/* Géneros */}
            {title.genres && title.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {title.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="bg-gray-800 px-3 py-1 rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Sinopsis */}
            {title.overview && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Sinopsis</h2>
                <p className="text-gray-300 leading-relaxed">{title.overview}</p>
              </div>
            )}

            {/* Trailer */}
            {title.trailerKey && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Trailer</h2>
                <div className="aspect-video max-w-2xl rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${title.trailerKey}`}
                    title="Trailer"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Proveedores de streaming con Selector de País */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <h2 className="text-xl font-bold">Disponible en</h2>
                
                {/* Selector de País */}
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  title="Cambiar país para ver proveedores de streaming"
                >
                  <option value="ES">🇪🇸 España</option>
                  <option value="US">🇺🇸 Estados Unidos</option>
                  <option value="GB">🇬🇧 Reino Unido</option>
                  <option value="FR">🇫🇷 Francia</option>
                  <option value="DE">🇩🇪 Alemania</option>
                  <option value="IT">🇮🇹 Italia</option>
                  <option value="PT">🇵🇹 Portugal</option>
                  <option value="MX">🇲🇽 México</option>
                  <option value="AR">🇦🇷 Argentina</option>
                  <option value="JP">🇯🇵 Japón</option>
                </select>
              </div>

              {title.providers && title.providers.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {title.providers.map((provider) => (
                    <div
                      key={`${provider.provider_id}-${provider.type}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                        alt={provider.provider_name}
                        className="w-12 h-12 rounded-lg bg-white p-1"
                        title={`${provider.provider_name} (${provider.type === 'streaming' ? 'Streaming' : provider.type === 'rent' ? 'Alquiler' : 'Compra'})`}
                      />
                      <span className="text-xs text-gray-400 text-center max-w-[80px] truncate">
                        {provider.provider_name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">
                  No hay información de proveedores disponible para {country.toUpperCase()} en este momento.
                </p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}