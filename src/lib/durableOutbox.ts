/** Account-scoped, local-first writes. Never acknowledge an older revision of a newer edit. */
export interface OutboxStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface PendingWrite<T> { id: string; revision: number; payload: T }

export class DurableOutbox<T> {
  private running: Promise<void> | null = null;
  constructor(private storage: OutboxStorage, private key: string, private send: (payload: T) => Promise<void>) {}

  pending(): PendingWrite<T>[] {
    const raw = this.storage.getItem(this.key);
    if (!raw) return [];
    // Corrupted storage must surface as an error, not silently delete unsent data.
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== 'string' || !Number.isSafeInteger(item.revision) || !('payload' in item))) {
      throw new Error('outbox_invalid');
    }
    return parsed as PendingWrite<T>[];
  }

  enqueue(id: string, payload: T): void {
    const writes = this.pending();
    const previous = writes.find(item => item.id === id);
    const next = { id, revision: (previous?.revision ?? 0) + 1, payload };
    this.storage.setItem(this.key, JSON.stringify([...writes.filter(item => item.id !== id), next]));
  }

  flush(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }

  private async drain(): Promise<void> {
    while (true) {
      const write = this.pending()[0];
      if (!write) return;
      await this.send(write.payload);
      const latest = this.pending();
      this.storage.setItem(this.key, JSON.stringify(latest.filter(item => item.id !== write.id || item.revision !== write.revision)));
    }
  }
}
