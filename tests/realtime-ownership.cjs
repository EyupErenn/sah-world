const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const { RealtimeClient } = require('@supabase/realtime-js');

require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
const { ownedRealtimeChannel } = require('../src/lib/ownedRealtimeChannel.ts');

function client() {
  const realtime = new RealtimeClient('wss://example.invalid/realtime/v1', { params: { apikey: 'test-only' } });
  // Real SDK channel registry, on(), subscribe(), unsubscribe(); no network or credentials.
  realtime.connect = () => {};
  return realtime;
}
const filter = { event: '*', schema: 'public', table: 'journal_entries' };

test('reproduces the exact production exception with the installed SDK', async () => {
  const c = client();
  try {
    c.channel('activity-log-user').on('postgres_changes', filter, () => {}).subscribe();
    assert.throws(() => c.channel('activity-log-user').on('postgres_changes', filter, () => {}),
      /cannot add `postgres_changes` callbacks.*after `subscribe\(\)`/);
  } finally { await c.removeAllChannels(); }
});

test('independent subscribers and immediate remounts never reuse a subscribed channel', async () => {
  const c = client();
  try {
    const first = ownedRealtimeChannel(c, 'activity-log-user').on('postgres_changes', filter, () => {}).subscribe();
    const second = ownedRealtimeChannel(c, 'activity-log-user').on('postgres_changes', filter, () => {}).subscribe();
    assert.notEqual(first, second);
    const leaving = c.removeChannel(first);
    const remount = ownedRealtimeChannel(c, 'activity-log-user').on('postgres_changes', filter, () => {}).subscribe();
    assert.notEqual(first.topic, remount.topic);
    await leaving;
    assert.ok(c.getChannels().includes(second));
    assert.ok(c.getChannels().includes(remount));
  } finally { await c.removeAllChannels(); }
  assert.equal(c.getChannels().length, 0);
});

test('actual activity hook: two date ranges, cleanup/remount, per-user filters and refresh delivery', async () => {
  const c = client();
  const effects = [];
  const cleanups = [];
  let userId = 'test-user-a';
  let reads = 0;
  const originalLoad = Module._load;
  const originalWindow = global.window;
  const originalDocument = global.document;
  const callbacks = new Map();
  let nextTimer = 0;
  global.window = {
    setTimeout(fn) { callbacks.set(++nextTimer, fn); return nextTimer; },
    clearTimeout(id) { callbacks.delete(id); },
    setInterval() { return ++nextTimer; }, clearInterval() {},
    addEventListener() {}, removeEventListener() {},
  };
  global.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
  Module._load = function (id, parent, isMain) {
    if (id === 'react') return { useCallback: fn => fn, useEffect: fn => effects.push(fn), useState: value => [value, () => {}] };
    if (id === '@/lib/supabase') return { supabase: {
      channel: c.channel.bind(c), removeChannel: c.removeChannel.bind(c),
      rpc: async () => { reads++; return { data: [], error: null }; },
    } };
    if (id === '@/store/useAuthStore') return { useAuthStore: select => select({ session: { user: { id: userId } } }) };
    if (id === '@/lib/ownedRealtimeChannel') return { ownedRealtimeChannel };
    return originalLoad.call(this, id, parent, isMain);
  };
  try {
    const { useActivityLog } = require('../src/hooks/useActivityLog.ts');
    const mount = (from, to) => {
      useActivityLog(from, to);
      const current = effects.splice(0).map(effect => effect());
      cleanups.push(...current);
      return () => current.forEach(cleanup => cleanup());
    };
    const unmountFirst = mount('2026-09-15', '2026-09-15');
    mount('2026-09-01', '2026-09-15');
    assert.equal(c.getChannels().length, 2);
    for (const channel of c.getChannels()) {
      assert.equal(channel.bindings.postgres_changes.length, 11);
      assert.ok(channel.bindings.postgres_changes.every(binding => binding.filter.filter === 'user_id=eq.test-user-a'));
    }
    callbacks.clear();
    for (const channel of c.getChannels()) channel.bindings.postgres_changes[0].callback({});
    for (const fn of [...callbacks.values()]) await fn();
    assert.equal(reads, 2, 'both independently filtered feeds receive refreshes');
    const oldChannel = c.getChannels()[0];
    unmountFirst();
    mount('2026-09-14', '2026-09-14');
    callbacks.clear();
    oldChannel.bindings.postgres_changes[0].callback({});
    assert.equal(callbacks.size, 0, 'late events after cleanup cannot schedule refreshes');
    userId = 'test-user-b';
    mount();
    const latest = c.getChannels().at(-1);
    assert.ok(latest.bindings.postgres_changes.every(binding => binding.filter.filter === 'user_id=eq.test-user-b'));
  } finally {
    cleanups.forEach(cleanup => cleanup());
    await c.removeAllChannels();
    Module._load = originalLoad;
    global.window = originalWindow;
    global.document = originalDocument;
  }
  assert.equal(c.getChannels().length, 0);
});
