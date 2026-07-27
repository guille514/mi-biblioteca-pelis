const fs = require('fs');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const fetch = require('node-fetch');
const { Readable } = require('stream');

// ⚠️ IMPORTANTE: Pon aquí tu API Key REAL de TMDB
const TMDB_API_KEY = '0be7234e01586fc5ad90a9731c6c0968'; // ← CAMBIA ESTO
const ZIP_PATH = 'C:/Users/guill/Downloads/gdpr-data.zip';
const OUTPUT_PATH = 'mi-biblioteca-tvtime.json';

function parseCSV(buffer) {
  return new Promise((resolve) => {
    const rows = [];
    const readable = new Readable();
    // Eliminar BOM si existe (problema común en CSVs de Windows)
    let content = buffer.toString('utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    readable.push(Buffer.from(content));
    readable.push(null);
    readable
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve(rows));
  });
}

async function buscarEnTMDB(nombre, mediaType) {
  const url = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(nombre)}&language=es-ES`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // 🔍 DIAGNÓSTICO: Mostrar qué devuelve TMDB
    if (data.success === false) {
      console.log(`    ❌ TMDB devolvió error:`, data.status_message);
      return null;
    }
    
    if (!data.results || data.results.length === 0) {
      console.log(`    ⚠️  TMDB no encontró resultados para: "${nombre}"`);
      return null;
    }
    
    return data.results[0];
  } catch (err) {
    console.error(`    ❌ Error de red:`, err.message);
  }
  return null;
}

async function main() {
  // 🔍 DIAGNÓSTICO: Verificar API Key
  if (TMDB_API_KEY === 'TU_API_KEY_AQUI' || !TMDB_API_KEY) {
    console.error('❌ ERROR: No has puesto tu API Key de TMDB en el script.');
    console.error('   Abre importar-tvtime.js y cambia la línea:');
    console.error('   const TMDB_API_KEY = \'TU_API_KEY_AQUI\';');
    console.error('   por tu clave real de TMDB.');
    return;
  }
  
  console.log('📦 Extrayendo ZIP...\n');
  const zip = new AdmZip(ZIP_PATH);
  const library = [];
  const seenTitles = new Set();

  // ==========================================
  // 1. SERIES desde tracking-prod-records-v2.csv
  // ==========================================
  const v2Buffer = zip.getEntry('tracking-prod-records-v2.csv')?.getData();
  if (v2Buffer) {
    const seriesRows = await parseCSV(v2Buffer);
    console.log(`📺 Encontradas ${seriesRows.length} filas de series.\n`);
    
    // 🔍 DIAGNÓSTICO: Mostrar las primeras 5 series que vamos a procesar
    const primerasSeries = seriesRows
      .filter(r => r.series_name && r.series_name.trim())
      .slice(0, 5);
    console.log('🔎 Primeras series a procesar:');
    primerasSeries.forEach(r => console.log(`   - "${r.series_name}"`));
    console.log('');

    for (const row of seriesRows) {
      const nombre = (row.series_name || '').trim();
      if (!nombre || seenTitles.has(nombre)) continue;
      seenTitles.add(nombre);

      const isFollowed = row.is_followed === '1' || row.is_followed === 'true';
      const season = parseInt(row.season_number || row.s_no) || null;
      const episode = parseInt(row.episode_number || row.ep_no) || null;

      console.log(`  🔍 Serie: "${nombre}" (T${season || '?'}E${episode || '?'})`);

      const match = await buscarEnTMDB(nombre, 'tv');
      if (match) {
        library.push({
          tmdbId: match.id,
          mediaType: 'tv',
          name: match.name,
          posterUrl: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
          backdropUrl: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null,
          overview: match.overview,
          releaseDate: match.first_air_date,
          voteAverage: match.vote_average,
          genres: match.genre_ids ? match.genre_ids.map(String) : [],
          status: isFollowed ? 'watching' : 'completed',
          currentSeason: season,
          currentEpisode: episode,
          seenTogether: false,
        });
        console.log(`    ✅ ${match.name} (ID: ${match.id})`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ==========================================
  // 2. PELÍCULAS desde tracking-prod-records.csv
  // ==========================================
  const v1Buffer = zip.getEntry('tracking-prod-records.csv')?.getData();
  if (v1Buffer) {
    const movieRows = await parseCSV(v1Buffer);
    console.log(`\n🎬 Encontradas ${movieRows.length} filas de películas.\n`);

    for (const row of movieRows) {
      const nombre = (row.movie_name || '').trim();
      if (!nombre || seenTitles.has(nombre)) continue;
      seenTitles.add(nombre);

      console.log(`  🔍 Película: "${nombre}"`);

      const match = await buscarEnTMDB(nombre, 'movie');
      if (match) {
        library.push({
          tmdbId: match.id,
          mediaType: 'movie',
          name: match.title,
          posterUrl: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null,
          backdropUrl: match.backdrop_path ? `https://image.tmdb.org/t/p/original${match.backdrop_path}` : null,
          overview: match.overview,
          releaseDate: match.release_date,
          voteAverage: match.vote_average,
          genres: match.genre_ids ? match.genre_ids.map(String) : [],
          status: 'completed',
          currentSeason: null,
          currentEpisode: null,
          seenTogether: false,
        });
        console.log(`    ✅ ${match.title} (ID: ${match.id})`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ==========================================
  // 3. GUARDAR
  // ==========================================
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(library, null, 2));
  console.log(`\n🎉 Total: ${library.length} títulos guardados en ${OUTPUT_PATH}`);
  console.log(`   📺 Series: ${library.filter((t) => t.mediaType === 'tv').length}`);
  console.log(`   🎬 Películas: ${library.filter((t) => t.mediaType === 'movie').length}`);
}

main();