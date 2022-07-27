import { GoTrueClient } from '@supabase/gotrue-js'

const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const auth = new GoTrueClient({
  url: `${supabaseURL}/auth/v1`,
  headers: {
    accept: 'json',
    apikey: supabaseAnon,
  },
  // cookieOptions: { path: '/', name: 'meowncookie',  }, // Optional
})

export const supabase = { auth }
