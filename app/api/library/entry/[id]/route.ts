import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const { status, platforms, currentSeason, currentEpisode, seenTogether, notes } = body

    const entry = await prisma.watchEntry.update({
      where: { id },
      data: {
        status,
        platforms,
        currentSeason: currentSeason !== undefined ? currentSeason : undefined,
        currentEpisode: currentEpisode !== undefined ? currentEpisode : undefined,
        seenTogether: seenTogether !== undefined ? seenTogether : undefined,
        notes: notes !== undefined ? notes : undefined, // ✅ Guardar notas
        updatedAt: new Date(),
      },
    })

    // Si se cambió seenTogether, sincronizar con el otro perfil (lógica existente)
    if (seenTogether !== undefined) {
      const currentEntry = await prisma.watchEntry.findUnique({
        where: { id },
        include: { profile: true },
      })

      if (currentEntry) {
        const otherProfile = await prisma.profile.findFirst({
          where: { id: { not: currentEntry.profileId } },
        })

        if (otherProfile) {
          if (seenTogether) {
            await prisma.watchEntry.upsert({
              where: { profileId_titleId: { profileId: otherProfile.id, titleId: currentEntry.titleId } },
              update: { seenTogether: true, status: currentEntry.status, platforms: currentEntry.platforms, updatedAt: new Date() },
              create: { profileId: otherProfile.id, titleId: currentEntry.titleId, seenTogether: true, status: currentEntry.status, platforms: currentEntry.platforms },
            })
          } else {
            await prisma.watchEntry.updateMany({
              where: { profileId: otherProfile.id, titleId: currentEntry.titleId },
              data: { seenTogether: false, updatedAt: new Date() },
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('Error al actualizar:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ✅ NUEVO: Endpoint para eliminar de la biblioteca
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Obtener datos antes de borrar para sincronizar el "visto juntos" si es necesario
    const entry = await prisma.watchEntry.findUnique({
      where: { id },
      include: { profile: true },
    })

    if (entry?.seenTogether) {
      const otherProfile = await prisma.profile.findFirst({
        where: { id: { not: entry.profileId } },
      })
      if (otherProfile) {
        await prisma.watchEntry.updateMany({
          where: { profileId: otherProfile.id, titleId: entry.titleId },
          data: { seenTogether: false, updatedAt: new Date() },
        })
      }
    }

    await prisma.watchEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}