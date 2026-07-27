"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportPage() {
  const router = useRouter()
  const [jsonFile, setJsonFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number } | null>(null)

  const handleImport = async () => {
    if (!jsonFile) {
      alert('Por favor sube el archivo mi-biblioteca-tvtime.json')
      return
    }

    const profileId = localStorage.getItem('currentProfileId')
    if (!profileId) {
      alert('No hay perfil seleccionado')
      return
    }

    setImporting(true)

    try {
      // Leer el JSON
      const text = await jsonFile.text()
      const library = JSON.parse(text)

      // Llamar a la API
      const response = await fetch('/api/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          library,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult({ imported: data.imported })
      } else {
        alert('Error al importar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar el archivo')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-400 hover:text-blue-300 font-medium"
        >
          ← Volver
        </button>

        <h1 className="text-4xl font-bold mb-8">📥 Importar desde TV Time</h1>

        {!result ? (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4">Sube tu archivo JSON</h2>
              <p className="text-gray-400 mb-6">
                Sube el archivo <code className="bg-gray-900 px-2 py-1 rounded">mi-biblioteca-tvtime.json</code> que generaste con el script.
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">
                  mi-biblioteca-tvtime.json
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={importing || !jsonFile}
                className={`mt-6 w-full py-3 rounded-lg font-medium transition-colors ${
                  importing || !jsonFile
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {importing ? 'Importando...' : '🚀 Importar biblioteca'}
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="font-bold mb-2">ℹ️ ¿Qué se importará?</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>✓ Todas las series y películas de tu exportación de TV Time</li>
                <li>✓ Tu progreso actual (temporada y capítulo para series)</li>
                <li>✓ Estado: "Viendo" si la seguías, "Completado" si no</li>
                <li>✓ Posters, sinopsis y toda la información de TMDB</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">✅ Importación completada</h2>
            
            <div className="bg-green-600/20 border border-green-600 rounded-lg p-6 text-center mb-6">
              <p className="text-5xl font-bold text-green-400 mb-2">{result.imported}</p>
              <p className="text-gray-400">títulos importados a tu biblioteca</p>
            </div>

            <button
              onClick={() => router.push('/library')}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium transition-colors"
            >
              Ir a mi biblioteca
            </button>
          </div>
        )}
      </div>
    </div>
  )
}