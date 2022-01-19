import { supabase } from '../../utils/initSupabase'

export default function handler(req, res) {
  console.log('req', req)
  console.log('req.headers', req.headers)
  console.log('req.cookies', req.cookies)
  res.json({ ok: true })
}
