import { auth } from '../../utils/initSupabase'

export default function handler(req, res) {
  auth.api.setAuthCookie(req, res)
}
