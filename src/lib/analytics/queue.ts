import { eventSchema, type ClientEvent } from "../../domain/analytics";

/** Platform-neutral queue; never persists tokens, user IDs or arbitrary properties. */
export class AnalyticsQueue {
  events: ClientEvent[] = [];
  private busy = false;
  private epoch = 0;
  private failures = 0;
  private nextAttempt = 0;
  constructor(private persist: (events: ClientEvent[]) => void, private send: (events: ClientEvent[]) => Promise<number>) {}
  restore(raw: unknown) {
    if (!Array.isArray(raw)) return;
    this.events = raw.slice(-100).flatMap(item => { const parsed = eventSchema.safeParse(item); return parsed.success ? [parsed.data] : []; });
  }
  add(event: ClientEvent) { this.events = [...this.events, eventSchema.parse(event)].slice(-100); this.persist(this.events); }
  clear() { this.epoch++; this.events = []; this.failures = 0; this.nextAttempt = 0; this.persist([]); }
  async flush(now = Date.now()) {
    if (this.busy || now < this.nextAttempt) return;
    this.busy = true; const epoch = this.epoch;
    try {
      this.events = this.events.filter(e => now - Date.parse(e.occurredAt) < 7 * 86400000);
      let batch = this.events.slice(0, 30);
      while (batch.length && epoch === this.epoch) {
        const status = await this.send(batch);
        if (epoch !== this.epoch) return;
        if (status === 400 && batch.length > 1) { batch = batch.slice(0, Math.ceil(batch.length / 2)); continue; }
        if (status >= 200 && status < 300 || status === 400) {
          const ids = new Set(batch.map(e => e.eventId)); this.events = this.events.filter(e => !ids.has(e.eventId));
          this.persist(this.events); this.failures = 0; batch = this.events.slice(0, 30);
        } else { this.defer(now); return; }
      }
    } catch { this.defer(now); }
    finally { this.busy = false; }
  }
  private defer(now: number) { this.nextAttempt = now + Math.min(60000, 1000 * 2 ** Math.min(++this.failures, 6)); }
}
