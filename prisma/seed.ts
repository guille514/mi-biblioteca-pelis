import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando perfiles...')

  // Crear perfil de Guille
  const guille = await prisma.profile.upsert({
    where: { name: 'Guille' },
    update: {},
    create: {
      name: 'Guille',
      avatarColor: '#3b82f6', // Azul
      countryCode: 'ES',
    },
  })

  // Crear perfil de Nuria
  const nuria = await prisma.profile.upsert({
    where: { name: 'Nuria' },
    update: {},
    create: {
      name: 'Nuria',
      avatarColor: '#ec4899', // Rosa
      countryCode: 'ES',
    },
  })

  console.log('✅ Perfiles creados:', { guille, nuria })
}

main()
  .catch((e) => {
    console.error('❌ Error al crear perfiles:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })