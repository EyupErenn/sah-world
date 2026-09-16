import { CATEGORY_META, dayKey, type ActivityEvent } from '@/lib/activity'
import type { JournalEntry } from '@/types'

const DAY_NAMES=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']

/** A practical invitation, not a clinical interpretation or a mandatory routine. */
export function getWeeklyNextStep(journal: JournalEntry[], events: ActivityEvent[], now = new Date()): { title: string; detail: string; action: string; view: 'journal' | 'focus' } {
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6)
  const recent = journal.filter(entry => entry.date >= dayKey(start) && entry.date <= dayKey(now))
  const hasFocus = events.some(event => event.category === 'focus' && new Date(event.createdAt) >= start && new Date(event.createdAt) <= now)
  if (!recent.length) return { title: 'Bugünden tek bir cümle sakla.', detail: 'Nasıl hissettiğini veya bugün önem verdiğin bir şeyi yaz. Uzun bir kayıt gerekmiyor.', action: 'Günlüğümü aç', view: 'journal' }
  if (!hasFocus) return { title: 'Bir görevi tek bir odak oturumuna bağla.', detail: 'Yapacağın işi adlandır; oturum sonunda ortaya çıkan somut sonucu bir cümleyle not et.', action: 'Odak oturumu aç', view: 'focus' }
  if (!recent.some(entry => entry.date === dayKey(now))) return { title: 'Bugünün küçük çıktısını günlüğüne taşı.', detail: 'Bugün yaptığın bir şeyi ve yarına bırakacağın tek adımı yaz. Hızlı kayıt da yeterli.', action: 'Bugünü kaydet', view: 'journal' }
  return { title: 'Bir sonraki işin için tek bir çıktı seç.', detail: 'Başlamadan önce “Bu oturum bitince ne ortaya çıkacak?” sorusunu görev etiketiyle yanıtla.', action: 'Sonraki oturumu planla', view: 'focus' }
}

export function buildWeeklyInsights(journal:JournalEntry[],events:ActivityEvent[],now=new Date()):string[]{
  const currentStart=new Date(now);currentStart.setHours(0,0,0,0);currentStart.setDate(currentStart.getDate()-6)
  const previousStart=new Date(currentStart);previousStart.setDate(previousStart.getDate()-7)
  const current=journal.filter(entry=>{const date=new Date(`${entry.date}T12:00:00`);return date>=currentStart&&date<=now})
  const previous=journal.filter(entry=>{const date=new Date(`${entry.date}T12:00:00`);return date>=previousStart&&date<currentStart})
  const morning=current.filter(entry=>entry.ritualType==='sabah').length
  const evening=current.filter(entry=>entry.ritualType==='aksam'||!entry.ritualType).length
  const quick=current.filter(entry=>entry.entryMode==='quick').length
  if(current.length<3)return[
    current.length?`Son yedi günde ${current.length} günlük kaydı oluşturdun. Birkaç kayıt daha biriktiğinde ruh hâli ve enerji örüntülerini güvenle yorumlayabileceğiz.`:'Son yedi günde henüz günlük kaydı oluşmadı; tek bir cümle bile ritmini görünür kılmak için yeterli.',
    current.length?`${morning} sabah niyeti, ${evening} akşam muhasebesi tamamlandı; hızlı kayıtların sayısı ${quick}.`:'Sabah niyetini veya akşam muhasebeni kaydettiğinde bu özet yalnızca gerçek verilerinden oluşacak.',
  ]
  const lines=[`Son yedi günde ${current.length} günlük kaydı oluşturdun: ${morning} sabah niyeti, ${evening} akşam muhasebesi${quick?` ve ${quick} hızlı kayıt.`:'.'}`]
  const moods=new Map<string,number[]>();current.forEach(entry=>moods.set(entry.date,[...(moods.get(entry.date)??[]),entry.mood]))
  const ranked=[...moods].map(([date,values])=>({date,avg:values.reduce((a,b)=>a+b,0)/values.length})).sort((a,b)=>b.avg-a.avg)
  if(ranked.length){const best=ranked[0],worst=ranked.at(-1)!;lines.push(`Ruh hâlin en yüksek ${DAY_NAMES[new Date(`${best.date}T12:00:00`).getDay()]} günüydü (${best.avg.toFixed(1)}/5)${best.date!==worst.date?`; en düşük ortalama ${DAY_NAMES[new Date(`${worst.date}T12:00:00`).getDay()]} günüydü (${worst.avg.toFixed(1)}/5).`:'.'}`)}
  if(previous.length>=2){const avg=(items:JournalEntry[])=>items.reduce((sum,item)=>sum+item.mood,0)/items.length;const a=avg(current),b=avg(previous);lines.push(a>b+.25?`Ortalama ruh hâlin önceki yedi güne göre yükseldi (${b.toFixed(1)} → ${a.toFixed(1)}).`:a<b-.25?`Ortalama ruh hâlin önceki yedi güne göre geriledi (${b.toFixed(1)} → ${a.toFixed(1)}); bunu bir yargı değil, kendine yaklaşmak için bir işaret olarak görebilirsin.`:`Ortalama ruh hâlin önceki yedi güne yakın ve dengeli kaldı (${a.toFixed(1)}/5).`)}
  const currentEvents=events.filter(event=>new Date(event.createdAt)>=currentStart&&new Date(event.createdAt)<=now)
  if(currentEvents.length&&lines.length<4){const counts=new Map<string,number>();currentEvents.forEach(event=>counts.set(event.category,(counts.get(event.category)??0)+1));const [category,count]=[...counts].sort((a,b)=>b[1]-a[1])[0];lines.push(`En çok ${CATEGORY_META[category as keyof typeof CATEGORY_META].label} alanında hareket ettin (${count} kayıt); ${new Set(currentEvents.map(event=>dayKey(event.createdAt))).size} farklı gün aktiftin.`)}
  return lines.slice(0,4)
}
