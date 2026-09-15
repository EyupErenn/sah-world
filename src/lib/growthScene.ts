import { getLevelForXP } from './constants'
import { buildGrowthInputs, type GrowthInputKey } from './growthDiagram'
import type { ActivityEvent } from './activity'

export type GrowthHabitat = {
  id: GrowthInputKey
  name: string
  icon: string
  count7d: number
  /** Oldest local calendar day first; today is index 6. */
  daily: number[]
  status: 'sessiz' | 'filizleniyor' | 'güçlü'
  target: string
  description: string
  intensity: number
}
export type GrowthSceneData = {
  /** Continuous botanical stage 0–10; the current level's progress interpolates it. */
  stage: number
  level: number
  xh: number
  xhToNext: number
  weeklyActions: number
  fedAreas: number
  vitalityScore: number
  habitats: GrowthHabitat[]
}
export type Vitality = 'dormant' | 'sprouting' | 'flourishing' | 'radiant'
export function getVitality(score: number): Vitality {
  return score <= 0 ? 'dormant' : score < 25 ? 'sprouting' : score < 75 ? 'flourishing' : 'radiant'
}
export function buildGrowthSceneData(xh: number, events: ActivityEvent[], now = Date.now()): GrowthSceneData {
  const { level, nextLevel, index } = getLevelForXP(xh)
  const inputs = buildGrowthInputs(events, now)
  const weeklyActions = inputs.reduce((sum, input) => sum + input.count, 0)
  const fedAreas = inputs.filter((input) => input.count > 0).length
  const activeDays = inputs[0].daily.reduce((sum, _, day) => sum + Number(inputs.some((input) => input.daily[day] > 0)), 0)
  const progress = nextLevel ? Math.max(0, Math.min(1, (xh - level.xp) / (nextLevel.xp - level.xp))) : 1
  return {
    stage: index + progress, level: index + 1, xh, xhToNext: Math.max(0, (nextLevel?.xp ?? xh) - xh),
    weeklyActions, fedAreas,
    vitalityScore: Math.min(100, Math.round(fedAreas / 7 * 40 + activeDays / 7 * 35 + Math.min(weeklyActions, 21) / 21 * 25)),
    habitats: inputs.map((input) => ({ id: input.id, name: input.id === 'quran' ? "Kur'an Kerim Kardeşim" : input.label, icon: input.icon, count7d: input.count, daily: input.daily, status: input.status, target: input.target, description: input.metaphor, intensity: input.intensity })),
  }
}
