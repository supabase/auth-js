import { GoTrueClient } from '@supabase/gotrue-js'

const GOTRUE_URL_AUTOCONFIRM = 'http://localhost:8000/autoconfirm'

export const auth = new GoTrueClient({
  url: GOTRUE_URL_AUTOCONFIRM,
  autoRefreshToken: false,
  persistSession: false, // Do not save to LocalStorage
})

