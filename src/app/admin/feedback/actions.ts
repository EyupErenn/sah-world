'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(['received', 'reviewing', 'planned', 'completed', 'closed']),
  response: z.string().trim().max(4000),
  archive: z.enum(['true', 'false']).default('false'),
})

export async function updateFeedbackAction(formData: FormData) {
  const parsed = schema.safeParse({ id: formData.get('id'), status: formData.get('status'), response: formData.get('response') || '', archive: formData.get('archive') || 'false' })
  if (!parsed.success) throw new Error('Geçersiz yönetim isteği.')

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') throw new Error('Bu işlem için yönetici yetkisi gerekiyor.')

  const { error } = await supabase.rpc('admin_update_feedback', {
    target_id: parsed.data.id,
    next_status: parsed.data.status,
    response_text: parsed.data.response || null,
    archive_item: parsed.data.archive === 'true',
  })
  if (error) throw new Error('Geri bildirim güncellenemedi.')
  revalidatePath('/admin/feedback')
  revalidatePath('/feedback')
}
