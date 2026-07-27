const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.title.updateMany({
    data: {
      airDateUpdatedAt: null,
      nextAirDate: null,
      nextSeasonNumber: null,
    },
  });
  console.log(`✅ Caché de fechas limpiada: ${result.count} títulos actualizados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());