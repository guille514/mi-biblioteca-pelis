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
  notes: string | null
  rating: number | null
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
  const [country, setCountry] = useState('ES')
  const [notesTimeout, setNotesTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const profileId = localStorage.getItem('currentProfileId')
    let defaultCountry = 'ES'

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
      fetch('/api/profiles')
        .then(res => res.json())
        .then(profiles => {
          const current = profiles.find((p: any) => p.id === profileId)
          if (current) {
            setCountry(current.countryCode)
            defaultCountry = current.countryCode
          }
          
          loadTitle(defaultCountry)

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

  const handleNotesChange = (newNotes: string) => {
    if (!watchEntry) return
    setWatchEntry({ ...watchEntry, notes: newNotes })
    if (notesTimeout) clearTimeout(notesTimeout)

    const timeout = setTimeout(async () => {
      try {
        await fetch(`/api/library/entry/${watchEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: newNotes }),
        })
      } catch (error) {
        console.error('Error al guardar notas:', error)
      }
    }, 500)
    setNotesTimeout(timeout)
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
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleProgressChange = async (season: number, episode: number) => {
    if (!watchEntry) return
    try {
      const response = await fetch(`/api/library/entry/${watchEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSeason: season, currentEpisode: episode }),
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
        body: JSON.stringify({ seenTogether: !watchEntry.seenTogether }),
      })
      if (response.ok) {
        const data = await response.json()
        setWatchEntry(data.entry)
      }
    } catch (error) {
      console.error('Error al actualizar "Visto juntos":', error)
    }
  }

  const handleCountryChange = async (newCountry: string) => {
    setCountry(newCountry)
    setLoading(true)
    const profileId = localStorage.getItem('currentProfileId')
    if (profileId) {
      fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countryCode: newCountry }),
      }).catch(err => console.error('Error al guardar país:', err))
    }
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

  // ✅ Separar proveedores por tipo
  const streamingProviders = title.providers?.filter(p => p.type === 'streaming') || []
  const rentProviders = title.providers?.filter(p => p.type === 'rent') || []
  const buyProviders = title.providers?.filter(p => p.type === 'buy') || []

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-12">
      
      {/* Botón Volver Flotante */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 text-white px-3 py-2 rounded-full backdrop-blur-sm transition-colors flex items-center gap-2 text-sm font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver
      </button>

      {/* Backdrop */}
      <div className="relative h-72 md:h-96 w-full">
        {title.backdrop_path ? (
          <img
            src={`https://image.tmdb.org/t/p/original${title.backdrop_path}`}
            alt={titleName || 'Backdrop'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-600 text-4xl"></span>
          </div>
        )}
        {/* Degradado para que el texto de encima sea legible */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
      </div>

      {/* Contenido Principal Superpuesto */}
      <div className="relative z-10 -mt-24 md:-mt-32 px-4 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          
          {/* Poster (Contenedor que fija el tamaño para evitar estiramientos) */}
          <div className="w-40 md:w-56 flex-shrink-0 mx-auto md:mx-0">
            {title.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w500${title.poster_path}`}
                alt={titleName || 'Poster'}
                className="w-full h-auto rounded-lg shadow-2xl border-2 border-gray-800 block"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg shadow-2xl border-2 border-gray-700 flex items-center justify-center">
                <span className="text-gray-500 text-4xl"></span>
              </div>
            )}
          </div>

          {/* Info y Acciones */}
          <div className="flex-1 text-center md:text-left pt-2 md:pt-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{titleName}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-gray-300 mb-4">
              <span>{year}</span>
              <span>•</span>
              <span>⭐ {title.vote_average ? title.vote_average.toFixed(1) : '—'}</span>
              <span>•</span>
              <span>{title.mediaType === 'movie' ? ' Película' : '📺 Serie'}</span>
            </div>

            {/* Sección de Biblioteca */}
            <div className="space-y-4">
              {watchEntry ? (
                <>
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 justify-center md:justify-start">
                    <span className="text-green-400 font-medium text-sm bg-green-900/30 px-3 py-1 rounded-full border border-green-800">
                      ✅ En tu biblioteca
                    </span>
                    <select
                      value={watchEntry.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={watchEntry.seenTogether || false}
                        onChange={handleSeenTogetherToggle}
                        className="w-4 h-4 rounded border-gray-600 text-pink-600 focus:ring-pink-500 bg-gray-900"
                      />
                      <span className="text-sm font-medium text-pink-400">💑 Visto juntos</span>
                    </label>
                  </div>

                  {/* Selector de Valoración */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-w-md mx-auto md:mx-0">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      ⭐ Tu valoración
                    </h3>
                    <select
                      value={watchEntry.rating || ''}
                      onChange={async (e) => {
                        const newRating = e.target.value ? parseInt(e.target.value) : null
                        setWatchEntry({ ...watchEntry, rating: newRating })
                        try {
                          await fetch(`/api/library/entry/${watchEntry.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rating: newRating }),
                          })
                        } catch (error) {
                          console.error('Error al guardar valoración:', error)
                        }
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Sin valorar</option>
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                        <option key={num} value={num}>
                          {num} / 10 {num >= 9 ? '🔥' : num >= 7 ? '👍' : num <= 4 ? '👎' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Área de Notas */}
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-w-md mx-auto md:mx-0">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      📝 Mis notas
                    </h3>
                    <textarea
                      value={watchEntry.notes || ''}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Escribe aquí por qué quieres verla, qué te pareció, o cualquier recuerdo..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
                    />
                  </div>

                  {/* Progreso (Solo series) */}
                  {title.mediaType === 'tv' && title.seasons && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 max-w-md mx-auto md:mx-0">
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
                                <option key={ep} value={ep}>Capítulo {ep}</option>
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
                    adding ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {adding ? 'Añadiendo...' : '➕ Añadir a mi biblioteca'}
                </button>
              )}
            </div>

            {/* Géneros */}
            {title.genres && title.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 justify-center md:justify-start">
                {title.genres.map((genre) => (
                  <span key={genre.id} className="bg-gray-800 px-3 py-1 rounded-full text-sm">
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sinopsis, Trailer y Proveedores */}
        <div className="mt-8 space-y-8">
          {title.overview && (
            <div>
              <h2 className="text-xl font-bold mb-2">Sinopsis</h2>
              <p className="text-gray-300 leading-relaxed max-w-4xl">{title.overview}</p>
            </div>
          )}

          {title.trailerKey && (
            <div>
              <h2 className="text-xl font-bold mb-2">Trailer</h2>
              <div className="aspect-video max-w-3xl rounded-lg overflow-hidden shadow-lg">
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

          {/* ✅ Proveedores separados por tipo */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold">Disponible en</h2>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-fit"
              >
                <option value="ES">🇪🇸 España</option>
                <option value="US">🇺🇸 Estados Unidos</option>
                <option value="GB">🇬🇧 Reino Unido</option>
                <option value="FR">🇫🇷 Francia</option>
                <option value="DE">🇩🇪 Alemania</option>
                <option value="IT">🇮🇹 Italia</option>
                <option value="PT">🇵🇹 Portugal</option>
                <option value="MX">🇽 México</option>
                <option value="AR">🇦🇷 Argentina</option>
                <option value="JP">🇯🇵 Japón</option>
              </select>
            </div>

            {/* Streaming */}
            {streamingProviders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  En Streaming (Incluido en suscripción)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {streamingProviders.map((provider) => (
                    <div key={`${provider.provider_id}-streaming`} className="flex flex-col items-center gap-1">
                      <img
                        src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                        alt={provider.provider_name}
                        className="w-12 h-12 rounded-lg bg-white p-1"
                        title={`${provider.provider_name}`}
                      />
                      <span className="text-xs text-gray-400 text-center max-w-[80px] truncate">
                        {provider.provider_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alquiler y Compra */}
            {(rentProviders.length > 0 || buyProviders.length > 0) && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Alquiler o Compra Digital
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Alquiler */}
                  {rentProviders.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">📥 Alquiler</h4>
                      <div className="flex flex-wrap gap-3">
                        {rentProviders.map((provider) => (
                          <div key={`${provider.provider_id}-rent`} className="flex flex-col items-center gap-1">
                            <img
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="w-10 h-10 rounded-lg bg-white p-1"
                              title={`Alquilar en ${provider.provider_name}`}
                            />
                            <span className="text-xs text-gray-400 text-center max-w-[80px] truncate">
                              {provider.provider_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compra */}
                  {buyProviders.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">💾 Compra (Descarga)</h4>
                      <div className="flex flex-wrap gap-3">
                        {buyProviders.map((provider) => (
                          <div key={`${provider.provider_id}-buy`} className="flex flex-col items-center gap-1">
                            <img
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                              alt={provider.provider_name}
                              className="w-10 h-10 rounded-lg bg-white p-1"
                              title={`Comprar en ${provider.provider_name}`}
                            />
                            <span className="text-xs text-gray-400 text-center max-w-[80px] truncate">
                              {provider.provider_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Si no hay proveedores */}
            {title.providers?.length === 0 && (
              <p className="text-gray-500 text-sm italic">
                No hay información de proveedores disponible para {country.toUpperCase()}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}