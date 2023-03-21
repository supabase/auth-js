import { GoTrueClient } from '@supabase/gotrue-js'
import { NextRequest, NextResponse } from 'next/server'
import { parse, serialize } from 'cookie'

export function createBrowserSupabaseClient<
  Database = any,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>() {
  return {
    auth: new GoTrueClient({
      url: 'http://localhost:9999',
      storage: {
        getItem(key: string) {
          const cookies = parse(document?.cookie)
          const session = cookies[key]

          return session ? JSON.stringify(session) : null
        },
        setItem(key: string, _value: string) {
          let session = JSON.parse(_value)
          if (!document) return
          document.cookie = serialize(key, session, {
            path: '/',
            maxAge: 1000 * 60 * 60 * 24 * 365,
            // Allow supabase-js on the client to read the cookie as well
            httpOnly: false,
            sameSite: 'lax',
          })
        },
        removeItem(key: string) {
          if (!document) return
          document.cookie = serialize(key, '', {
            expires: new Date(0),
            httpOnly: false,
            sameSite: 'lax',
          })
        },
      },
    }),
  }
}

export function createMiddlewareSupabaseClient<
  Database = any,
  SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database
>(context: { req: NextRequest; res: NextResponse }) {
  return {
    auth: new GoTrueClient({
      url: 'http://localhost:9999',
      storage: {
        getItem: (name) => {
          console.log('getItem: ', name)
          console.log(context.req.cookies.toString())
          const cookie = context.req.cookies.get(name)?.value ?? ''
          const value = decodeURIComponent(cookie)
          console.log(value)
          return value
        },
        setItem: (name, value) => {
          console.log('setItem: ', name, value)
          context.res.cookies.set({
            name,
            value: encodeURIComponent(value),
            sameSite: 'lax',
            httpOnly: false,
          })
        },
        removeItem: (name) => {
          console.log('removeItem: ', name)
          context.req.cookies.delete(name)
        },
      },
    }),
  }
}
