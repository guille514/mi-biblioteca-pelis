require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const JSON_PATH = 'mi-biblioteca-tvtime.json';

async function main() {
  console.log('📖 Leyendo archivo JSON...');
  
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ No se encontró el archivo ${JSON_PATH}`);
    console.log('Asegúrate de haber ejecutado primero "node importar-tvtime.js"');
    return;
  }

  const rawData = fs.readFileSync(JSON_PATH, 'utf8');
  const library = JSON.parse(rawData);
  console.log(`✅ Encontrados ${library.length} títulos para importar.\n`);

  // Obtener los perfiles de la base de datos
  const profiles = await prisma.profile.findMany();
  if (profiles.length === 0) {
    console.error('❌ No hay perfiles en la base de datos. Crea al menos uno desde la web primero.');
    return;
  }

  // Si tienes 2 perfiles, te preguntará a cuál importar. Si hay 1, usa ese.
  let targetProfile = profiles[0];
  if (profiles.length > 1) {
    console.log('Perfiles disponibles:');
    profiles.forEach((p, index) => console.log(`  ${index + 1}. ${p.name}`));
    
    // Por simplicidad, importaremos al primer perfil. 
    // (Puedes cambiar el número aquí si quieres importarlo al otro: profiles[1])
    targetProfile = profiles[0]; 
  }
  
  console.log(`\n👤 Importando al perfil: ${targetProfile.name}`);
  console.log('⏳ Procesando... (esto tardará solo unos segundos)\n');

  let imported = 0;
  let errors = 0;

  for (const item of library) {
    try {
      // 1. Crear o actualizar el título en el catálogo global
      await prisma.title.upsert({
        where: { id: item.tmdbId },
        update: {},
        create: {
          id: item.tmdbId,
          mediaType: item.mediaType,
          name: item.name,
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
          overview: item.overview,
          releaseDate: item.releaseDate,
          voteAverage: item.voteAverage,
          genres: item.genres,
        },
      });

      // 2. Crear o actualizar la entrada en la biblioteca del perfil
      await prisma.watchEntry.upsert({
        where: {
          profileId_titleId: {
            profileId: targetProfile.id,
            titleId: item.tmdbId,
          },
        },
        update: {
          status: item.status,
          currentSeason: item.currentSeason,
          currentEpisode: item.currentEpisode,
          seenTogether: item.seenTogether,
          updatedAt: new Date(),
        },
        create: {
          profileId: targetProfile.id,
          titleId: item.tmdbId,
          status: item.status,
          currentSeason: item.currentSeason,
          currentEpisode: item.currentEpisode,
          seenTogether: item.seenTogether,
          platforms: [],
        },
      });

      imported++;
      if (imported % 20 === 0) {
        console.log(`   ... ${imported} títulos importados`);
      }
    } catch (err) {
      console.error(`   ❌ Error con "${item.name}":`, err.message);
      errors++;
    }
  }

  console.log(`\n🎉 ¡IMPORTACIÓN COMPLETADA CON ÉXITO!`);
  console.log(`   ✅ Importados: ${imported}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`\n🌐 Ahora entra en tu app web (Vercel) y verás todo en la biblioteca de ${targetProfile.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });