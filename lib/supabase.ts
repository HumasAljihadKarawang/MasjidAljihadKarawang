import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const STORAGE_URL_KEY = 'aljihad_supabase_url_v1'
const STORAGE_ANON_KEY = 'aljihad_supabase_anon_key_v1'

export function getActiveSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  let url = envUrl
  let anonKey = envAnonKey

  if (typeof window !== 'undefined') {
    const savedUrl = window.localStorage.getItem(STORAGE_URL_KEY)
    const savedKey = window.localStorage.getItem(STORAGE_ANON_KEY)
    if (savedUrl && savedKey) {
      url = savedUrl
      anonKey = savedKey
    }
  }

  const valid =
    Boolean(url && anonKey) &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-supabase-anon-key') &&
    url.startsWith('https://')

  return {
    url: valid ? url : 'https://placeholder-project.supabase.co',
    anonKey: valid ? anonKey : 'placeholder-anon-key',
    isConfigured: valid,
  }
}

export function saveRuntimeSupabaseConfig(url: string, anonKey: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_URL_KEY, url.trim())
  window.localStorage.setItem(STORAGE_ANON_KEY, anonKey.trim())
  cachedClient = null
  window.dispatchEvent(new CustomEvent('supabase-config-updated'))
}

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  const cfg = getActiveSupabaseConfig()
  if (!cachedClient) {
    cachedClient = createClient(cfg.url, cfg.anonKey)
  }
  return cachedClient
}

export const isSupabaseConfigured =
  Boolean(envUrl && envAnonKey) &&
  !envUrl.includes('your-project-id') &&
  !envAnonKey.includes('your-supabase-anon-key')

export const supabase = createClient(
  isSupabaseConfigured ? envUrl : 'https://placeholder-project.supabase.co',
  isSupabaseConfigured ? envAnonKey : 'placeholder-anon-key'
)
