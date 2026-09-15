// Run with: node --test tests/growth-scene.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
// Compile the pure TypeScript model without adding a test runtime dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  })
  module._compile(source.outputText, filename)
}
const { buildGrowthSceneData, getVitality } = require('../src/lib/growthScene.ts')
const event = (id, category, date) => ({ id, category, createdAt: date.toISOString(), label: '', detail: '', xp: 20 })

test('seven local calendar days sum to each habitat count; old and future records are excluded', () => {
  const now = new Date(2026, 8, 14, 12)
  const data = buildGrowthSceneData(808, [
    event('old', 'journal', new Date(2026, 8, 7, 23, 59)),
    event('first', 'journal', new Date(2026, 8, 8, 0)),
    event('today', 'journal', new Date(2026, 8, 14, 10)),
    event('future', 'journal', new Date(2026, 8, 14, 13)),
    event('gratitude', 'sukur', new Date(2026, 8, 13, 22)),
  ], now.getTime())
  assert.equal(data.xh, 808)
  assert.equal(data.xhToNext, 192)
  assert.equal(data.level, 3)
  assert.equal(data.weeklyActions, 3)
  assert.equal(data.fedAreas, 2)
  assert.deepEqual(data.habitats.find(h => h.id === 'journal').daily, [1, 0, 0, 0, 0, 0, 1])
  for (const habitat of data.habitats) assert.equal(habitat.daily.reduce((a, b) => a + b, 0), habitat.count7d)
})
test('adding entries in two categories changes those habitats and scene vitality only', () => {
  const now = new Date()
  const empty = buildGrowthSceneData(808, [], +now)
  const active = buildGrowthSceneData(808, [event('1', 'journal', now), event('2', 'sukur', now)], +now)
  assert.equal(getVitality(empty.vitalityScore), 'dormant')
  assert.equal(active.fedAreas, 2)
  assert.ok(active.vitalityScore > empty.vitalityScore)
  assert.deepEqual(active.habitats.filter(h => h.count7d).map(h => h.id).sort(), ['journal', 'sukur'])
})
test('vitality boundaries and level interpolation remain bounded', () => {
  assert.deepEqual([0, 1, 24, 25, 74, 75, 100].map(getVitality), ['dormant', 'sprouting', 'sprouting', 'flourishing', 'flourishing', 'radiant', 'radiant'])
  const stages = [0, 199, 200, 499, 500, 999, 1000, 999999].map(xh => buildGrowthSceneData(xh, [], 0).stage)
  assert.deepEqual([...stages].sort((a, b) => a - b), stages)
  assert.ok(stages.every(stage => stage >= 0 && stage <= 10))
})
