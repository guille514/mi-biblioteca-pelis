import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { status, platforms, currentSeason, currentEpisode, seenTogether } = body

    // Actualizar la entrada actual
    const entry = await prisma.watchEntry.update({
      where: { id },
      data: {
        status,
        platforms,
        currentSeason: currentSeason !== undefined ? currentSeason : undefined,
        currentEpisode: currentEpisode !== undefined ? currentEpisode : undefined,
        seenTogether: seenTogether !== undefined ? seenTogether : undefined,
        updatedAt: new Date(),
      },
    })

    // Si se cambió seenTogether, sincronizar con el otro perfil
    if (seenTogether !== undefined) {
      // Obtener el título y el perfil actual
      const currentEntry = await prisma.watchEntry.findUnique({
        where: { id },
        include: {
          title: true,
          profile: true,
        },
      })

      if (currentEntry) {
        // Buscar el otro perfil (asumimos que solo hay 2 perfiles)
        const otherProfile = await prisma.profile.findFirst({
          where: {
            id: { not: currentEntry.profileId },
          },
        })

        if (otherProfile) {
          if (seenTogether) {
            // Si se marca como "Visto juntos", crear/actualizar entrada en el otro perfil
            await prisma.watchEntry.upsert({
              where: {
                profileId_titleId: {
                  profileId: otherProfile.id,
                  titleId: currentEntry.titleId,
                },
              },
              update: {
                seenTogether: true,
                status: currentEntry.status, // Mismo estado
                platforms: currentEntry.platforms,
                updatedAt: new Date(),
              },
              create: {
                profileId: otherProfile.id,
                titleId: currentEntry.titleId,
                seenTogether: true,
                status: currentEntry.status,
                platforms: currentEntry.platforms,
              },
            })
          } else {
            // Si se desmarca, quitar el flag del otro perfil también
            await prisma.watchEntry.updateMany({
              where: {
                profileId: otherProfile.id,
                titleId: currentEntry.titleId,
              },
              data: {
                seenTogether: false,
                updatedAt: new Date(),
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Error al actualizar biblioteca:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}