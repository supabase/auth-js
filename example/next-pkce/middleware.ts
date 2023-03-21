import { createMiddlewareSupabaseClient } from './utils/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  try {
    // We need to create a response and hand it to the supabase client to be able to modify the response headers.
    const res = NextResponse.next()
    // Create authenticated Supabase Client
    const supabase = createMiddlewareSupabaseClient({ req, res })

    // Check for Oauth redirect return code.
    const code = req.nextUrl.searchParams.get('code')
    if (code) {
      console.log('code', code)
      if (code) {
        const { data, error } = await supabase.auth.exchangeAuthCode(code)
        console.log({ data, error })
        if (error) throw error
        return res
      }
    }

    // Check if we have a session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    console.log({ session })

    // Check auth condition
    if (session?.user.email?.endsWith('@gmail.com')) {
      // Authentication successful, forward request to protected route.
      return res
    }
  } catch (error) {
    // Auth condition not met, redirect to home page.
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }
}

export const config = {
  matcher: ['/profile', '/middleware-protected'],
}
