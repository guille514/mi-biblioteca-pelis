"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  name: string
  avatarColor: string
}

export default function Home() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState<string | null>(null)

  useEffect(() => {
    // Cargar perfiles desde la API
    fetch('/api/profiles')
      .then(res => res.json())
      .then(data => {
        setProfiles(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error al cargar perfiles:', err)
        setLoading(false)
      })
  }, [])

  const handleSelect = (profileId: string) => {
    // Guardar el perfil seleccionado en localStorage
    localStorage.setItem('currentProfileId', profileId)
    // Redirigir a la biblioteca
    router.push('/library')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Cargando perfiles...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center">¿Quién está viendo?</h1>
      
      <div className="flex gap-8 md:gap-12 flex-wrap justify-center">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile.id)}
            onMouseEnter={() => setIsHovered(profile.id)}
            onMouseLeave={() => setIsHovered(null)}
            className="group flex flex-col items-center gap-4 transition-all duration-200"
          >
            <div 
              className="w-24 h-24 md:w-32 md:h-32 rounded-md flex items-center justify-center text-4xl md:text-5xl font-bold shadow-lg transition-all duration-200"
              style={{ 
                backgroundColor: profile.avatarColor,
                transform: isHovered === profile.id ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isHovered === profile.id ? '0 0 0 4px white' : 'none'
              }}
            >
              {profile.name[0]}
            </div>
            <span className={`text-lg md:text-xl font-medium transition-colors ${
              isHovered === profile.id ? 'text-white' : 'text-gray-400'
            }`}>
              {profile.name}
            </span>
          </button>
        ))}
      </div>
    </main>
  )
}