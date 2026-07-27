"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Release {
  titleId: number
  name: string
  mediaType: string
  posterUrl: string | null
  releaseDate: string
  seasonNumber: number | null
  status: string
}

interface Profile {
  id: string
  name: string
  avatarColor: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    const profileId = localStorage.getItem('currentProfileId')
    if (!profileId) {
      router.push('/')
      return
    }

    fetch('/api/profiles')
      .then(res => res.json())
      .then(profiles => {
        const current = profiles.find((p: Profile) => p.id === profileId)
        if (current) setProfile(current)
      })

    fetch(`/api/calendar?profileId=${profileId}`)
      .then(res => res.json())
      .then(data => {
        setReleases(data.releases || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error al cargar calendario:', err)
        setLoading(false)
      })
  }, [router])

  // Helpers para el calendario
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = domingo
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Obtener estrenos de un día específico (CORREGIDO para zonas horarias)
  const getReleasesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return releases.filter(r => r.releaseDate === dateStr)
  }

  // Todos los días del mes con al menos un estreno
  const daysWithReleases = new Set(
    releases.map(r => {
      const d = new Date(r.releaseDate)
      return d.getDate()
    }).filter(day => {
      const d = new Date(releases[0]?.releaseDate || '')
      return d.getMonth() === month && d.getFullYear() === year
    })
  )

  // CORREGIDO: Parsear fechas respetando zona horaria local
  const selectedDayReleases = selectedDay 
    ? releases.filter(r => {
        const [rYear, rMonth, rDay] = r.releaseDate.split('-').map(Number)
        return rDay === parseInt(selectedDay) && 
               (rMonth - 1) === month && 
               rYear === year
      })
    : []

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Cargando calendario...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">📅 Calendario de Estrenos</h1>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/library')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Ir a biblioteca
            </button>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {profile.name[0]}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{profile.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Controles de navegación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              title="Mes anterior"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold min-w-[200px] text-center">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              title="Mes siguiente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            📍 Hoy
          </button>
        </div>

        {/* Calendario */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Cabecera de días de la semana */}
          <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-700">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-xs font-semibold text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-px bg-gray-700">
            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-800 min-h-[100px] p-2" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayReleases = getReleasesForDay(day)
              const hasReleases = dayReleases.length > 0
              const isToday = 
                new Date().getDate() === day && 
                new Date().getMonth() === month && 
                new Date().getFullYear() === year
              const isSelected = selectedDay === String(day)

              return (
                <button
                  key={day}
                  onClick={() => hasReleases && setSelectedDay(isSelected ? null : String(day))}
                  disabled={!hasReleases}
                  className={`bg-gray-800 min-h-[100px] p-2 text-left transition-colors ${
                    hasReleases ? 'cursor-pointer hover:bg-gray-750' : 'cursor-default'
                  } ${isSelected ? 'ring-2 ring-blue-500 bg-gray-750' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      isToday ? 'bg-blue-600 text-white px-2 py-0.5 rounded-full' : 'text-gray-300'
                    }`}>
                      {day}
                    </span>
                    {hasReleases && (
                      <span className="text-xs bg-pink-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                        {dayReleases.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Mini lista de estrenos del día */}
                  {hasReleases && (
                    <div className="space-y-1">
                      {dayReleases.slice(0, 2).map((release, idx) => (
                        <div
                          key={idx}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${
                            release.mediaType === 'movie' 
                              ? 'bg-purple-600/30 text-purple-200 border-l-2 border-purple-500' 
                              : 'bg-blue-600/30 text-blue-200 border-l-2 border-blue-500'
                          }`}
                        >
                          {release.seasonNumber ? `T${release.seasonNumber} ` : ''}
                          {release.name}
                        </div>
                      ))}
                      {dayReleases.length > 2 && (
                        <div className="text-xs text-gray-400 pl-1">
                          +{dayReleases.length - 2} más
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel de detalle del día seleccionado */}
        {selectedDay && (
          <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                🎬 Estrenos del {selectedDay} de {monthNames[month]}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayReleases.map((release) => (
                <Link
                  key={release.titleId}
                  href={`/title/${release.mediaType}/${release.titleId}`}
                  className="flex items-center gap-4 bg-gray-900 p-3 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700"
                >
                  {release.posterUrl ? (
                    <img
                      src={release.posterUrl}
                      alt={release.name}
                      className="w-12 h-16 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs flex-shrink-0">
                      N/A
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate hover:text-blue-400 transition-colors">
                      {release.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span>
                        {release.mediaType === 'movie' ? '🎬 Película' : '📺 Serie'}
                      </span>
                      {release.seasonNumber && (
                        <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300">
                          Temporada {release.seasonNumber}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                        {release.status === 'watching' ? '🎬 Viendo' : '💭 Quiero ver'}
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600/30 border-l-2 border-blue-500"></div>
            <span>Series</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-600/30 border-l-2 border-purple-500"></div>
            <span>Películas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span>Hoy</span>
          </div>
        </div>

        {releases.length === 0 && !loading && (
          <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed mt-6">
            <p className="text-4xl mb-3">📅</p>
            <h3 className="text-xl font-bold mb-2">No hay estrenos próximos</h3>
            <p className="text-gray-400">
              Añade series o películas con estado "Viendo" o "Quiero ver" para ver sus próximos estrenos aquí.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}