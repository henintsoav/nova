import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missingCreds = !supabaseUrl || supabaseUrl.includes('your-project') ||
                     !supabaseAnonKey || supabaseAnonKey.includes('your-anon')

if (missingCreds) {
  console.warn('[NOVA] Supabase credentials not set. Auth and scrims will be disabled. Fill in .env to enable.')
}

export const supabase = missingCreds
  ? null
  : createClient(supabaseUrl, supabaseAnonKey)

export const supabaseReady = !missingCreds
