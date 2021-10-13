import { auth } from '../../utils/initSupabase'
import Router from 'next/router'

export default function handler(req, res) {
  try {
    console.log('req', req)

    auth.api.setAuthCookie(req, res)
    Router.push('/profile') // redirect to profile page
  } catch (error) {
    console.log('error', error.message)
  }
}
