import type { ExportSchema } from '@/store/useJourneyStore'
import { VEHICLE_DEFS } from './constants'

type Row = Record<string, unknown>
const row = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const number = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const rows = (value: unknown) => Array.isArray(value) ? value.filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item)).map(row) : []
const timestamp = (value: unknown, fallback = '1970-01-01T00:00:00.000Z') => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : fallback
const base = (item: Row, index: number) => ({
  ...item,
  id: text(item.id, `legacy-${index}`),
  date: text(item.date, timestamp(item.createdAt).slice(0, 10)),
  createdAt: timestamp(item.createdAt, timestamp(item.date)),
})

/** Read-boundary compatibility, not a database migration. Preserve valid content
 * and IDs; missing optional fields must never take down the entire application.
 * Unknown dates stay historical rather than fabricating recent activity/XP. */
export function normalizeJourneyData(value: unknown): ExportSchema {
  const data = row(value)
  const vehicle = row(data.vehicle)
  const vehicleType = text(vehicle.type)
  const streak = row(data.streak)
  const matrix = row(data.eisenhower)
  const tasks = (value: unknown) => rows(value).map((item, index) => ({...base(item,index),text:text(item.text),done:item.done === true,completedAt:typeof item.completedAt === 'string' ? item.completedAt : undefined}))
  return {
    xp: Math.max(0, number(data.xp)),
    vehicle: Object.hasOwn(VEHICLE_DEFS,vehicleType) ? {...VEHICLE_DEFS[vehicleType as keyof typeof VEHICLE_DEFS],name:text(vehicle.name,VEHICLE_DEFS[vehicleType as keyof typeof VEHICLE_DEFS].name),color:text(vehicle.color,VEHICLE_DEFS[vehicleType as keyof typeof VEHICLE_DEFS].color)} : VEHICLE_DEFS.car,
    badges: list(data.badges),
    streak: {current:Math.max(0,number(streak.current)),lastDate:text(streak.lastDate)},
    totalZikir: Math.max(0,number(data.totalZikir)),
    journal: rows(data.journal).map((item,index)=>({...base(item,index),content:text(item.content,text(item.text)),mood:number(item.mood,3),energy:number(item.energy,7),stress:number(item.stress,3),tags:list(item.tags),moments:list(item.moments),selfNote:text(item.selfNote),intentionText:text(item.intentionText),expectedChallengeText:text(item.expectedChallengeText),gratitudeText:text(item.gratitudeText),xpAwarded:number(item.xpAwarded)})),
    quranNotes: rows(data.quranNotes).map((item,index)=>({...base(item,index),sure:text(item.sure),ayet:text(item.ayet),tefsir:text(item.tefsir),ders:text(item.ders)})),
    hadisNotes: rows(data.hadisNotes).map((item,index)=>({...base(item,index),metin:text(item.metin),kaynak:text(item.kaynak),konu:text(item.konu),uygulama:text(item.uygulama)})),
    lessons: rows(data.lessons).map((item,index)=>({...base(item,index),title:text(item.title),wrong:text(item.wrong),learned:text(item.learned),severity:number(item.severity,3)})),
    sukurList: rows(data.sukurList).map((item,index)=>{const nimets=Array.isArray(item.nimets)?item.nimets:[];return {...base(item,index),text:text(item.text),nimets:[text(nimets[0],text(item.nimet1)),text(nimets[1],text(item.nimet2)),text(nimets[2],text(item.nimet3))]}}),
    eisenhower: {q1:tasks(matrix.q1),q2:tasks(matrix.q2),q3:tasks(matrix.q3),q4:tasks(matrix.q4)},
    focusSessions: rows(data.focusSessions).map((item,index)=>({...base(item,index),taskLabel:text(item.taskLabel),timerType:item.timerType==='stopwatch'?'stopwatch':'countdown',plannedDurationSeconds:Math.max(0,number(item.plannedDurationSeconds)),actualDurationSeconds:Math.max(0,number(item.actualDurationSeconds)),startedAt:timestamp(item.startedAt),endedAt:timestamp(item.endedAt),completed:item.completed===true,xpAwarded:number(item.xpAwarded),interruptionCount:number(item.interruptionCount),totalAwaySeconds:number(item.totalAwaySeconds)})),
  }
}

export function journeyPreferences(value: unknown) {
  const data = row(value)
  return { vehicleChosen: data.vehicleChosen === true, currentTespih: Math.max(0, number(data.currentTespih)) }
}
