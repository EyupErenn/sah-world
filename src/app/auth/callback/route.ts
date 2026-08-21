import { NextResponse } from 'next/server'
import { getSafeNextPath } from '@/lib/auth/safe-next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = getSafeNextPath(url.searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?reason=missing_code', url.origin))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[SAH Auth] OAuth code exchange failed:', error.message)
    return NextResponse.redirect(new URL('/auth/error?reason=exchange_failed', url.origin))
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = process.env.NODE_ENV === 'development' || !forwardedHost
    ? url.origin
    : `${forwardedProto}://${forwardedHost}`

  return NextResponse.redirect(`${origin}${next}`)
}
