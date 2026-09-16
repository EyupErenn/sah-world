const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const result = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)(name => { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name]; }, result);
  return result;
}
const activity = load('src/lib/activity.ts');
const { getWeeklyNextStep } = load('src/lib/weeklyInsights.ts', { '@/lib/activity': activity });
const now = new Date('2026-09-16T18:00:00');
const entry = date => ({ id: 'synthetic', date, mood: 3, content: '', createdAt: `${date}T10:00:00` });
const focus = createdAt => ({ category: 'focus', createdAt });
test('empty and old/future journal data invite one small entry', () => {
  for (const journal of [[], [entry('2026-09-01')], [entry('2026-09-17')]]) assert.equal(getWeeklyNextStep(journal, [], now).view, 'journal');
});
test('recent journal without valid recent focus recommends one concrete focus output', () => {
  for (const events of [[], [focus('2026-09-01T10:00:00')], [focus('2026-09-17T10:00:00')]]) assert.equal(getWeeklyNextStep([entry('2026-09-16')], events, now).view, 'focus');
});
test('completed focus invites missing daily reflection, then a planned next output', () => {
  const events = [focus('2026-09-16T10:00:00')];
  assert.equal(getWeeklyNextStep([entry('2026-09-15')], events, now).view, 'journal');
  assert.equal(getWeeklyNextStep([entry('2026-09-16')], events, now).action, 'Sonraki oturumu planla');
});
