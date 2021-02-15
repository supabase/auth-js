import { GoTrueClient } from '@supabase/gotrue-js'

const gotrue = 'http://localhost:9998' // No email confirmation required
export const auth = new GoTrueClient({
  url: gotrue,
})

