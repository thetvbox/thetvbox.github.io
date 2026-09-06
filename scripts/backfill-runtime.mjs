#!/usr/bin/env node
/** One-off backfill of episode_watched.runtime_minutes for pre-existing rows. Run manually: node --env-file=.env.local scripts/backfill-runtime.mjs */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TMDB_API_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_TMDB_API_KEY.')
  console.error('Run with: node --env-file=.env.local scripts/backfill-runtime.mjs')
  process.exit(1)
}

const REST_URL = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchRowsMissingRuntime() {
  const url = `${REST_URL}/episode_watched?select=id,show_id,season_number,episode_number&runtime_minutes=is.null`
  const res = await fetch(url, { headers: SUPABASE_HEADERS })
  if (!res.ok) throw new Error(`Supabase select failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function updateRuntime(id, runtimeMinutes) {
  const url = `${REST_URL}/episode_watched?id=eq.${id}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...SUPABASE_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ runtime_minutes: runtimeMinutes }),
  })
  if (!res.ok) throw new Error(`Supabase update failed (${res.status}): ${await res.text()}`)
}

async function tmdbEpisodeRuntimes(showId, seasonNumber) {
  const url = `https://api.themoviedb.org/3/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB ${res.status} for show ${showId} season ${seasonNumber}`)
  const data = await res.json()
  const byEpisode = new Map()
  for (const ep of data.episodes ?? []) {
    byEpisode.set(ep.episode_number, ep.runtime ?? null)
  }
  return byEpisode
}

async function main() {
  const rows = await fetchRowsMissingRuntime()
  if (!rows || rows.length === 0) {
    console.log('Nothing to backfill -- every row already has a runtime.')
    return
  }

  console.log(`${rows.length} row(s) missing runtime_minutes.`)

  const bySeason = new Map()
  for (const row of rows) {
    const key = `${row.show_id}:${row.season_number}`
    if (!bySeason.has(key)) bySeason.set(key, [])
    bySeason.get(key).push(row)
  }

  let updated = 0
  let skipped = 0
  for (const [key, seasonRows] of bySeason) {
    const [showId, seasonNumber] = key.split(':').map(Number)
    let runtimes
    try {
      runtimes = await tmdbEpisodeRuntimes(showId, seasonNumber)
    } catch (err) {
      console.warn(`Skipping show ${showId} season ${seasonNumber}: ${err.message}`)
      skipped += seasonRows.length
      continue
    }
    for (const row of seasonRows) {
      const runtime = runtimes.get(row.episode_number)
      if (runtime == null) {
        skipped++
        continue
      }
      try {
        await updateRuntime(row.id, runtime)
        updated++
      } catch (err) {
        console.warn(`Failed to update row ${row.id}: ${err.message}`)
        skipped++
      }
    }
  }

  console.log(`Done. Updated ${updated}, skipped ${skipped} (no TMDB runtime available).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
