import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

function readConfiguration() {
  const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter((name) => !process.env[name]?.trim())

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`)
  }

  let parsedUrl
  try {
    parsedUrl = new URL(process.env.SUPABASE_URL)
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL')
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new Error('SUPABASE_URL must use HTTPS')
  }

  return {
    url: parsedUrl.origin,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}

async function pingSupabase() {
  const { url, serviceRoleKey } = readConfiguration()
  const startedAt = Date.now()
  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { 'X-Client-Info': 'sah-world-keepalive/1.0' },
    },
  })

  // `head: true` asks PostgREST for only response metadata. The database still
  // executes a minimal SELECT count, but no profile rows or fields are returned.
  const { error, status } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .limit(1)
    .abortSignal(AbortSignal.timeout(20_000))

  if (error) {
    const reference = error.code || `HTTP ${status}`
    throw new Error(`Supabase read-only query failed (${reference}): ${error.message}`)
  }

  console.log(`[keepalive] Read-only Supabase ping succeeded (HTTP ${status}, ${Date.now() - startedAt} ms).`)
}

pingSupabase().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown keep-alive failure'
  console.error(`[keepalive] FAILED: ${message}`)
  process.exitCode = 1
})
