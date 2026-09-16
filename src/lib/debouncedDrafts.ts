import type { OutboxStorage } from './durableOutbox';

/** Flush on navigation/pagehide; debounce disk writes while typing. No network or logging. */
export class DebouncedDrafts<T> {
  private staged = new Map<string, T>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private storage: OutboxStorage, private onError: () => void, private delay = 600) {}
  load(key: string): T | null {
    if (this.staged.has(key)) return this.staged.get(key)!;
    const raw = this.storage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  }
  stage(key: string, value: T) {
    this.staged.set(key, value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.delay);
  }
  flush(): boolean {
    clearTimeout(this.timer);
    try {
      for (const [key, value] of this.staged) {
        this.storage.setItem(key, JSON.stringify(value));
        this.staged.delete(key);
      }
      return true;
    } catch { this.onError(); return false; }
  }
}
