import { supabase } from '@/lib/supabase';

export async function recordXpEvent(input: { sourceType: string; sourceId: string; label: string; amount: number }) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  const { error } = await supabase.from('xp_events').upsert({
    user_id: userId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    label: input.label,
    xp_amount: input.amount,
  }, { onConflict: 'user_id,source_type,source_id', ignoreDuplicates: true });
  if (error && error.code !== '42P01') console.warn('[SAH XP] Olay kaydedilemedi:', error.message);
  if (!error && typeof window !== 'undefined') window.dispatchEvent(new Event('sah:activity-changed'));
}
