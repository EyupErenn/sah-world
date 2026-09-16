const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { DurableOutbox } = require('../src/lib/durableOutbox.ts');
const { DebouncedDrafts } = require('../src/lib/debouncedDrafts.ts');
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('failed network write survives a fresh instance and retries the same stable ID', async () => {
  const disk = storage(); const sent = [];
  const first = new DurableOutbox(disk, 'account-A', async () => { throw new Error('offline'); });
  first.enqueue('journal-id', { id: 'journal-id', content: 'private text' });
  await assert.rejects(first.flush());
  const restored = new DurableOutbox(disk, 'account-A', async row => sent.push(row));
  assert.equal(restored.pending().length, 1);
  await restored.flush();
  assert.equal(sent[0].id, 'journal-id'); assert.equal(restored.pending().length, 0);
});
test('an in-flight acknowledgement cannot discard a newer edit', async () => {
  const disk = storage(); const sent = []; let release;
  const queue = new DurableOutbox(disk, 'A', async row => { sent.push(row); if (sent.length === 1) await new Promise(resolve => { release = resolve; }); });
  queue.enqueue('same-id', { content: 'first' });
  const completion = queue.flush();
  queue.enqueue('same-id', { content: 'second' });
  assert.strictEqual(queue.flush(), completion);
  release(); await completion;
  assert.deepEqual(sent.map(row => row.content), ['first', 'second']); assert.equal(queue.pending().length, 0);
});
test('writes are isolated by owner; storage corruption is not silently erased', () => {
  const disk = storage(); const a = new DurableOutbox(disk, 'A', async () => {}); const b = new DurableOutbox(disk, 'B', async () => {});
  a.enqueue('id', { content: 'A only' }); assert.equal(b.pending().length, 0);
  disk.setItem('B', 'broken json'); assert.throws(() => b.pending()); assert.equal(disk.getItem('B'), 'broken json');
});
test('storage quota failure does not report a successful enqueue', () => {
  const queue = new DurableOutbox({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, 'A', async () => {});
  assert.throws(() => queue.enqueue('id', {}));
});
test('drafts debounce disk writes, and leaving flushes the last character', () => {
  const disk = storage(); const cache = new DebouncedDrafts(disk, () => assert.fail('unexpected error'), 60_000);
  cache.stage('A:today:morning', { content: 'first' }); cache.stage('A:today:morning', { content: 'last character!' });
  assert.equal(disk.getItem('A:today:morning'), null); assert.equal(cache.load('A:today:morning').content, 'last character!');
  cache.stage('A:today:evening', { content: 'evening' }); assert.equal(cache.flush(), true);
  const restored = new DebouncedDrafts(disk, () => {}, 60_000);
  assert.equal(restored.load('A:today:morning').content, 'last character!'); assert.equal(restored.load('B:today:morning'), null);
});
test('draft persistence failure is surfaced and staged content remains recoverable', () => {
  let errors = 0; const cache = new DebouncedDrafts({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, () => errors++, 60_000);
  cache.stage('key', { content: 'keep' }); assert.equal(cache.flush(), false); assert.equal(errors, 1); assert.equal(cache.load('key').content, 'keep');
});
