import type { AnalyticsEvent } from "./schema";

export interface EventStore {
  list(): Promise<AnalyticsEvent[]>;
  put(event: AnalyticsEvent): Promise<void>;
  remove(ids: string[]): Promise<void>;
}
// Removal targets immutable event keys, never replaces a queue snapshot. Concurrent
// tabs can insert while a request is in flight without losing their new records.
export async function drainQueue(store: EventStore, send: (events: AnalyticsEvent[]) => Promise<number>) {
  const batch = (await store.list()).slice(0, 30);
  async function deliver(events: AnalyticsEvent[]): Promise<void> {
    if (!events.length) return;
    let status: number;
    try { status = await send(events); } catch { return; }
    if (status >= 200 && status < 300) { await store.remove(events.map(e => e.eventId)); return; }
    if (status !== 400) return;
    if (events.length === 1) { await store.remove([events[0].eventId]); return; }
    const middle = Math.ceil(events.length / 2);
    await deliver(events.slice(0, middle));
    await deliver(events.slice(middle));
  }
  await deliver(batch);
}

export function browserStore(): EventStore {
  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("mooa-analytics-v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("events", { keyPath: "eventId" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction("events", mode);
      const request = action(tx.objectStore("events"));
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    });
  }
  return {
    list: () => transaction("readonly", store => store.getAll()),
    put: async event => { await transaction("readwrite", store => {
      // Same transaction bounds disk use even when multiple tabs enqueue.
      const count = store.count();
      count.onsuccess = () => { if (count.result >= 1000) store.openCursor().onsuccess = e => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        cursor?.delete();
      }; };
      return store.put(event);
    }); },
    remove: async ids => { await transaction("readwrite", store => {
      for (const id of ids) store.delete(id);
      return store.count();
    }); },
  };
}
