'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { FeedbackType } from '@/types/database'

const schema = z.object({
  type: z.enum(['suggestion', 'bug', 'usability', 'content', 'performance', 'other']),
  title: z.string().trim().min(5, 'Başlık en az 5 karakter olmalı.').max(120, 'Başlık en fazla 120 karakter olabilir.'),
  message: z.string().trim().min(20, 'Mesajını biraz daha ayrıntılı anlatır mısın? (en az 20 karakter)').max(4000, 'Mesaj en fazla 4000 karakter olabilir.'),
  rating: z.preprocess((value) => value === '' ? null : Number(value), z.number().int().min(1).max(5).nullable()),
  pagePath: z.string().max(200).regex(/^\/(?!\/)[^?#]*$/, 'Sayfa yolu geçersiz.'),
})

export type FeedbackActionState = { status: 'idle' | 'success' | 'error'; message?: string; fieldErrors?: Record<string, string[]> }
export const initialFeedbackState: FeedbackActionState = { status: 'idle' }

export async function submitFeedbackAction(_previous: FeedbackActionState, formData: FormData): Promise<FeedbackActionState> {
  const parsed = schema.safeParse({
    type: formData.get('type'), title: formData.get('title'), message: formData.get('message'),
    rating: formData.get('rating') || '', pagePath: formData.get('pagePath') || '/feedback',
  })
  if (!parsed.success) return { status: 'error', message: 'Lütfen işaretli alanları kontrol et.', fieldErrors: parsed.error.flatten().fieldErrors }

  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { status: 'error', message: 'Oturumun sona ermiş. Lütfen yeniden giriş yap.' }

  const { error } = await supabase.rpc('submit_feedback', {
    feedback_type: parsed.data.type as FeedbackType,
    feedback_title: parsed.data.title,
    feedback_message: parsed.data.message,
    feedback_rating: parsed.data.rating,
    feedback_page_path: parsed.data.pagePath,
  })

  if (error) {
    const message = error.message.includes('RATE_LIMITED')
      ? 'Çok hızlı gönderim yapıldı. Lütfen kısa bir süre bekleyip yeniden dene.'
      : 'Görüşün kaydedilemedi. Bilgilerin korunuyor; lütfen yeniden dene.'
    return { status: 'error', message }
  }

  revalidatePath('/feedback')
  revalidatePath('/admin/feedback')
  return { status: 'success', message: 'Teşekkürler. Görüşün güvenle alındı ve takip listene eklendi.' }
}
