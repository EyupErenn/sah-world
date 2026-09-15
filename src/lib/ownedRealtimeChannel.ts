import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Supabase reuses channels with identical topics, including subscribed/leaving
 * channels. Every effect setup must own a fresh channel: multiple consumers and
 * rapid cleanup/remount must never attach handlers to another subscription.
 * Topic names do not grant access; existing filters and server RLS still apply.
 */
export function ownedRealtimeChannel(
  client: { channel(topic: string): RealtimeChannel },
  topic: string,
): RealtimeChannel {
  // getRandomValues also works on HTTP LAN development origins where
  // randomUUID is unavailable (production remains HTTPS).
  const nonce = crypto.getRandomValues(new Uint32Array(4)).join('-')
  return client.channel(`${topic}:${nonce}`)
}
