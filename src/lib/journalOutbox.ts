'use client';

import { DurableOutbox } from '@/lib/durableOutbox';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import type { JournalEntry } from '@/types';

export type JournalWriteStatus = 'saving' | 'saved' | 'pending' | 'local' | 'storage-error';
export const JOURNAL_STATUS_EVENT = 'sah:journal-write-status';
const queues = new Map<string, DurableOutbox<JournalEntry>>();
let writeVersion = 0;
const recentWrites = new Map<string, Map<string, { version: number; entry: JournalEntry }>>();
function rememberWrite(owner: string, entry: JournalEntry) {
  let writes = recentWrites.get(owner);
  if (!writes) { writes = new Map(); recentWrites.set(owner, writes); }
  writes.set(entry.id, { version: ++writeVersion, entry });
}
export function journalWriteVersion(): number { return writeVersion; }
export function journalWritesAfter(owner: string, version: number): JournalEntry[] {
  return [...(recentWrites.get(owner)?.values() ?? [])].filter(write => write.version > version).map(write => write.entry);
}
const validId = (id: string | undefined) => !!id && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
export function journalOwner(): string {
  return useAuthStore.getState().user?.id ?? useAuthStore.getState().session?.user.id ?? 'local';
}
function status(value: JournalWriteStatus, owner: string) {
  window.dispatchEvent(new CustomEvent(JOURNAL_STATUS_EVENT, { detail: { value, owner } }));
}
function queue(owner: string) {
  let instance = queues.get(owner);
  if (!instance) {
    instance = new DurableOutbox<JournalEntry>(window.localStorage, `sah-journal-outbox-v1:${owner}`, async entry => {
      // A previous account's writes must never be sent using the next account's credentials.
      if (journalOwner() !== owner) throw new Error('account_changed');
      const { error } = await supabase.from('journal_entries').upsert({
        id: entry.id, user_id: owner, date: entry.date,
        mood: entry.mood, energy: entry.energy, stress: entry.stress, sleep: entry.sleep ?? null,
        content: entry.content, moments: entry.moments ?? [], self_note: entry.selfNote ?? '',
        ritual_type: entry.ritualType ?? null, entry_mode: entry.entryMode ?? 'full',
        niyet_text: entry.intentionText ?? '', beklenen_zorluk_text: entry.expectedChallengeText ?? '',
        gratitude_text: entry.gratitudeText ?? '', xp_awarded: entry.xpAwarded ?? 0,
        tags: entry.tags ?? [], created_at: entry.createdAt,
      }, { onConflict: 'id' });
      if (error) throw new Error('journal_write_failed');
      rememberWrite(owner, entry);
    });
    queues.set(owner, instance);
  }
  return instance;
}
export function queueJournal(entry: JournalEntry): JournalWriteStatus {
  const owner = journalOwner();
  if (!validId(owner)) return 'local';
  try {
    // Persist BEFORE optimistic state is published or success is displayed.
    queue(owner).enqueue(entry.id, entry);
    rememberWrite(owner, entry);
    status(navigator.onLine ? 'saving' : 'pending', owner);
    void flushJournalOutbox();
    return navigator.onLine ? 'saving' : 'pending';
  } catch {
    status('storage-error', owner);
    return 'storage-error';
  }
}
export async function flushJournalOutbox(): Promise<void> {
  const owner = journalOwner();
  if (!validId(owner)) return;
  try {
    const instance = queue(owner);
    if (!instance.pending().length) return;
    if (!navigator.onLine) { status('pending', owner); return; }
    status('saving', owner);
    await instance.flush();
    status('saved', owner);
    window.dispatchEvent(new Event('sah:activity-changed'));
  } catch {
    // No text, row payload, token, or free-form server error goes to logs.
    status('pending', owner);
  }
}
export function pendingJournalEntries(owner: string): JournalEntry[] {
  if (typeof window === 'undefined' || !validId(owner)) return [];
  try { return queue(owner).pending().map(item => item.payload); }
  catch { status('storage-error', owner); return []; }
}
export function startJournalSync(): () => void {
  const retry = () => { void flushJournalOutbox(); };
  window.addEventListener('online', retry);
  const interval = window.setInterval(retry, 30_000);
  retry();
  return () => { window.removeEventListener('online', retry); window.clearInterval(interval); };
}
