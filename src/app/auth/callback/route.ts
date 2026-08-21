import { NextResponse } from 'next/server'
import { getSafeNextPath } from '@/lib/auth/safe-next'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = getSafeNextPath(url.searchParams.get('next'))
  const providerError = url.searchParams.get('error')

  if (providerError) {
    return NextResponse.redirect(new URL('/auth/error?reason=provider_cancelled', url.origin))
  }
  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?reason=missing_code', url.origin))
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error('[SAH Auth] OAuth code exchange failed', { errorId, status: error.status })
    return NextResponse.redirect(new URL(`/auth/error?reason=exchange_failed&ref=${errorId}`, url.origin))
  }

  // Dönüş hedefi yalnızca isteğin kendi origin'i + allowlist içindeki relative path'tir.
  // x-forwarded-host kullanmamak, sahte host başlığıyla açık yönlendirmeyi engeller.
  return NextResponse.redirect(new URL(next, url.origin))
}
