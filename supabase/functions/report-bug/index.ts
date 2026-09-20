// Supabase Edge Function: files a GitHub issue from the app's bug-report form, using a server-side token. See README.md next to this file for setup and design notes.

const GITHUB_OWNER = 'thetvbox'
const GITHUB_REPO = 'thetvbox.github.io'
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 4000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReportBugPayload {
  title: string
  description: string
  username?: string
  page?: string
  appVersion?: string
  userAgent?: string
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let payload: ReportBugPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!payload || typeof payload !== 'object') {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof payload.title !== 'string' || typeof payload.description !== 'string') {
    return jsonResponse({ error: 'title and description are required' }, 400)
  }

  const title = payload.title.trim().slice(0, MAX_TITLE_LENGTH)
  const description = payload.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
  if (!title || !description) {
    return jsonResponse({ error: 'title and description are required' }, 400)
  }

  const token = Deno.env.get('GITHUB_TOKEN')
  if (!token) {
    return jsonResponse({ error: 'Bug reporting isn’t configured on the server yet.' }, 501)
  }

  const metadata = [
    payload.username ? `Reported by: @${payload.username}` : null,
    payload.page ? `Page: ${payload.page}` : null,
    payload.appVersion ? `App version: v${payload.appVersion}` : null,
    payload.userAgent ? `User agent: ${payload.userAgent}` : null,
  ].filter(Boolean)

  const body = [
    description,
    metadata.length > 0 ? '\n---\n' + metadata.join('\n') : null,
    '\n_Filed automatically from the TV Box app’s in-app bug report form._',
  ]
    .filter(Boolean)
    .join('\n')

  const ghResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'tv-box-report-bug-function',
      },
      body: JSON.stringify({ title, body, labels: ['bug', 'from-app'] }),
    },
  )

  if (!ghResponse.ok) {
    console.error('GitHub issue creation failed', ghResponse.status, await ghResponse.text())
    return jsonResponse({ error: 'Failed to file the issue on GitHub. Try again later.' }, 502)
  }

  const issue = await ghResponse.json()
  return jsonResponse({ url: issue.html_url, number: issue.number }, 200)
})
