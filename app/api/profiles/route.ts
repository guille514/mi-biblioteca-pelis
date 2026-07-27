import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Intentando conectar con la base de datos...')
    
    const profiles = await prisma.profile.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log('✅ Perfiles obtenidos:', profiles.length)
    return NextResponse.json(profiles)
  } catch (error) {
    console.error('❌ Error al obtener perfiles:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      }, 
      { status: 500 }
    )
  }
}