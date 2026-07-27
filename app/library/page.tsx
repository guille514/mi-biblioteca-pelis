"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Title {
  id: number
  mediaType: string
  name: string
  posterUrl: string | null
  releaseDate: string | null
  voteAverage: number | null
}

interface WatchEntry {
  id: string
  status: string
  seenTogether: boolean
  title: Title
}

interface Profile {
  id: string
  name: string
  avatarColor: string
}

interface SearchResult {
  id: number
  media_type: 'movie' | 'tv'
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  vote_average: number
}

const STATUS_FILTERS = [
  { value: 'all', label: '📚 Todas' },
  { value: 'watching', label: '🎬 Viendo' },
  { value: 'completed', label: '✅ Completado' },
  { value: 'want_to_watch', label: '💭 Quiero ver' },
  { value: 'paused', label: '⏸️ En pausa' },
  { value: 'abandoned', label: '❌ Abandonado' },
]

export default function LibraryPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [library, setLibrary] = useState<WatchEntry[]>([])
  const [filteredLibrary, setFilteredLibrary] = useState<WatchEntry[]>([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showOnlyTogether, setShowOnlyTogether] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all')

  // Dos buscadores separados
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<SearchResult[]>([])
  const [searchingTmdb, setSearchingTmdb] = useState(false)
  
  const [libraryFilter, setLibraryFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const profileId = localStorage.getItem('currentProfileId')
    if (!profileId) {
      router.push('/')
      return
    }

    // Cargar perfil
    fetch('/api/profiles')
      .then(res => res.json())
      .then(profiles => {
        const current = profiles.find((p: Profile) => p.id === profileId)
        if (current) setProfile(current)
      })

    // Cargar biblioteca del perfil
    fetch(`/api/library/profile/${profileId}`)
      .then(res => res.json())
      .then((entries: WatchEntry[]) => {
        setLibrary(entries)
        setFilteredLibrary(entries)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error al cargar biblioteca:', err)
        setLoading(false)
      })
  }, [router])

  // Filtrar biblioteca combinando: Tipo + Estado + Visto Juntos + Búsqueda
  useEffect(() => {
    let result = library

    // 1. Filtrar por tipo (Película / Serie)
    if (typeFilter !== 'all') {
      result = result.filter(entry => entry.title.mediaType === typeFilter)
    }

    // 2. Filtrar por estado
    if (activeFilter !== 'all') {
      result = result.filter(entry => entry.status === activeFilter)
    }

    // 3. Filtrar por "Visto juntos"
    if (showOnlyTogether) {
      result = result.filter(entry => entry.seenTogether === true)
    }

    // 4. Filtrar por texto
    if (libraryFilter.trim()) {
      result = result.filter(entry => 
        entry.title.name.toLowerCase().includes(libraryFilter.toLowerCase())
      )
    }

    setFilteredLibrary(result)
  }, [activeFilter, showOnlyTogether, libraryFilter, typeFilter, library])

  // Buscar en TMDB con debounce
  useEffect(() => {
    if (!tmdbQuery.trim()) {
      setTmdbResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingTmdb(true)
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(tmdbQuery)}`)
        const data = await res.json()
        setTmdbResults(data)
      } catch (err) {
        console.error('Error al buscar en TMDB:', err)
      } finally {
        setSearchingTmdb(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [tmdbQuery])

  const handleLogout = () => {
    localStorage.removeItem('currentProfileId')
    router.push('/')
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Cargando tu biblioteca...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">🎬 Mi Biblioteca</h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {profile.name[0]}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{profile.name}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cambiar perfil
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Buscador de TMDB (para añadir nuevos títulos) */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 text-gray-300">🔍 Buscar y añadir nuevos títulos</h2>
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={tmdbQuery}
              onChange={(e) => setTmdbQuery(e.target.value)}
              placeholder="Buscar películas o series en TMDB..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="w-5 h-5 text-gray-500 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Resultados de TMDB */}
          {tmdbQuery && (
            <div className="mt-6">
              <h3 className="text-xl font-bold mb-4">
                {searchingTmdb ? 'Buscando...' : `Resultados de TMDB para "${tmdbQuery}"`}
              </h3>
              
              {!searchingTmdb && tmdbResults.length === 0 && (
                <p className="text-gray-400">No se encontraron resultados</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tmdbResults.map((result) => {
                  const title = result.media_type === 'movie' ? result.title : result.name
                  const date = result.media_type === 'movie' ? result.release_date : result.first_air_date
                  const year = date ? date.substring(0, 4) : '—'
                  
                  return (
                    <Link 
                      key={`${result.media_type}-${result.id}`}
                      href={`/title/${result.media_type}/${result.id}`}
                      className="group"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                        {result.poster_path ? (
                          <img 
                            src={`https://image.tmdb.org/t/p/w500${result.poster_path}`}
                            alt={title || 'Sin título'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm p-4 text-center">
                            Sin imagen
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                          {result.media_type === 'movie' ? '🎬 Película' : '📺 Serie'}
                        </div>
                      </div>
                      <div className="mt-2">
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span>{year}</span>
                          <span>•</span>
                          <span>⭐ {result.vote_average.toFixed(1)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Separador visual */}
        {library.length > 0 && (
          <div className="border-t border-gray-700 my-8"></div>
        )}

        {/* Sección de tu biblioteca */}
        {library.length > 0 && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
              <h2 className="text-2xl font-bold">📚 Tu biblioteca</h2>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Buscador interno de la biblioteca */}
                <div className="relative flex-1 sm:flex-initial">
                  <input
                    type="text"
                    value={libraryFilter}
                    onChange={(e) => setLibraryFilter(e.target.value)}
                    placeholder="Filtrar tu biblioteca..."
                    className="w-full sm:w-64 bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="w-5 h-5 text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Toggle Vista */}
                <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    title="Modo Estante"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
                    title="Modo Lista"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Controles de filtro */}
            <div className="flex flex-col gap-4 mb-6">
              
              {/* Fila 1: Interruptor Visto Juntos + Filtro de Tipo */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                
                {/* Interruptor Visto Juntos */}
                <label className="flex items-center gap-2 cursor-pointer select-none bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 hover:bg-gray-750 transition-colors w-fit">
                  <input
                    type="checkbox"
                    checked={showOnlyTogether}
                    onChange={(e) => setShowOnlyTogether(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-pink-600 focus:ring-pink-500 bg-gray-900 cursor-pointer"
                  />
                  <span className={`text-sm font-medium ${showOnlyTogether ? 'text-pink-400' : 'text-gray-400'}`}>
                    💑 Solo visto juntos
                  </span>
                </label>

                {/* Separador */}
                <div className="hidden sm:block w-px bg-gray-700 h-8"></div>

                {/* Filtro de Tipo: Películas / Series */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      typeFilter === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🎞️ Todo
                  </button>
                  <button
                    onClick={() => setTypeFilter('movie')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      typeFilter === 'movie'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    🎬 Películas
                  </button>
                  <button
                    onClick={() => setTypeFilter('tv')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      typeFilter === 'tv'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    📺 Series
                  </button>
                </div>
              </div>

              {/* Fila 2: Filtros de estado */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {STATUS_FILTERS.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeFilter === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido de la biblioteca */}
            {filteredLibrary.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                <p className="text-4xl mb-3">🍿</p>
                <h3 className="text-xl font-bold mb-2">
                  {activeFilter === 'all' 
                    ? 'No hay títulos que coincidan' 
                    : `No tienes títulos en "${STATUS_FILTERS.find(f => f.value === activeFilter)?.label}"`}
                </h3>
                <p className="text-gray-400">Usa el buscador de arriba para añadir películas y series</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" 
                : "flex flex-col gap-3"
              }>
                {filteredLibrary.map((entry) => {
                  const year = entry.title.releaseDate ? entry.title.releaseDate.substring(0, 4) : '—'
                  
                  if (viewMode === 'grid') {
                    return (
                      <Link 
                        key={entry.id}
                        href={`/title/${entry.title.mediaType}/${entry.title.id}`}
                        className="group relative"
                      >
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg">
                          {entry.title.posterUrl ? (
                            <img 
                              src={entry.title.posterUrl}
                              alt={entry.title.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm p-4 text-center">
                              Sin imagen
                            </div>
                          )}
                          
                          {/* Badge Visto juntos */}
                          {entry.seenTogether && (
                            <div className="absolute top-2 left-2 bg-pink-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                              💑
                            </div>
                          )}
                          
                          {/* Badge Tipo */}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {entry.title.mediaType === 'movie' ? '🎬' : '📺'}
                          </div>
                        </div>
                        <div className="mt-2">
                          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                            {entry.title.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>{year}</span>
                            {entry.title.voteAverage && (
                              <>
                                <span>•</span>
                                <span>⭐ {entry.title.voteAverage.toFixed(1)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  }

                  // Modo Lista
                  return (
                    <Link 
                      key={entry.id}
                      href={`/title/${entry.title.mediaType}/${entry.title.id}`}
                      className="group flex items-center gap-4 bg-gray-800 p-3 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600"
                    >
                      <div className="w-12 h-16 flex-shrink-0 rounded bg-gray-700 overflow-hidden">
                        {entry.title.posterUrl ? (
                          <img src={entry.title.posterUrl} alt={entry.title.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">N/A</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate group-hover:text-blue-400 transition-colors">
                            {entry.title.name}
                          </h3>
                          {entry.seenTogether && <span className="text-sm" title="Visto juntos">💑</span>}
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {entry.title.mediaType === 'movie' ? '🎬 Película' : '📺 Serie'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>{year}</span>
                          {entry.title.voteAverage && <span>⭐ {entry.title.voteAverage.toFixed(1)}</span>}
                          <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                            {STATUS_FILTERS.find(f => f.value === entry.status)?.label || entry.status}
                          </span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}