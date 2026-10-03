import { describe,it,expect,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AnalyticsQueue } from './queue';
import type { ClientEvent } from '../../domain/analytics';
const event=():ClientEvent=>({eventId:randomUUID(),anonymousId:randomUUID(),sessionId:randomUUID(),eventName:'page_viewed',occurredAt:new Date().toISOString(),platform:'android',properties:{}});
describe('web/native bounded delivery',()=>{
  it('bounds queue to 100 and strips private properties on restore',()=>{const q=new AnalyticsQueue(()=>{},async()=>200);for(let i=0;i<110;i++)q.add(event());expect(q.events).toHaveLength(100);q.restore([{...event(),properties:{email:'private'}}]);expect(q.events[0].properties).toEqual({});});
  it.each([429,503])('retries %s with the same event IDs and bounded backoff',async status=>{const send=vi.fn().mockResolvedValueOnce(status).mockResolvedValue(200);const q=new AnalyticsQueue(()=>{},send);q.add(event());const id=q.events[0].eventId;await q.flush(1000);await q.flush(1001);expect(send).toHaveBeenCalledTimes(1);await q.flush(100000);expect(send.mock.calls[1][0][0].eventId).toBe(id);expect(q.events).toHaveLength(0);});
  it('splits poison batches, delivering valid neighbours',async()=>{const bad=event();const accepted:string[]=[];const q=new AnalyticsQueue(()=>{},async batch=>{if(batch.some(e=>e.eventId===bad.eventId))return 400;accepted.push(...batch.map(e=>e.eventId));return 200;});q.add(event());q.add(bad);q.add(event());await q.flush();expect(accepted).toHaveLength(2);expect(q.events).toHaveLength(0);});
  it('does not remove the new account queue on completion of an old in-flight send',async()=>{let finish:(status:number)=>void=()=>{};const q=new AnalyticsQueue(()=>{},()=>new Promise(resolve=>{finish=resolve;}));q.add(event());const flush=q.flush();q.clear();const next=event();q.add(next);finish(200);await flush;expect(q.events.map(e=>e.eventId)).toEqual([next.eventId]);});
});
