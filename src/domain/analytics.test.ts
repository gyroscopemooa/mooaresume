import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { normalizeBatch,routeCategory,summarizeAnalytics,type AnalyticsFact } from './analytics';
const now='2026-10-03T03:00:00.000Z';
const event=()=>({eventId:randomUUID(),anonymousId:randomUUID(),sessionId:randomUUID(),eventName:'page_viewed',occurredAt:now,platform:'ios',properties:{route:'result',email:'secret@example.invalid',resume:'secret',token:'private'}});
describe('analytics boundary',()=>{
  it('strips private keys and never preserves arbitrary routes',()=>{expect(normalizeBatch({events:[event()]},Date.parse(now))[0].properties).toEqual({route:'result'});expect(routeCategory('/result/person@example.invalid?token=secret')).toBe('result');expect(routeCategory('/private/123')).toBe('other');});
  it.each(['userId','environment','source','evidence','serviceId'])('rejects client-owned %s',key=>{expect(()=>normalizeBatch({events:[{...event(),[key]:'forged'}]},Date.parse(now))).toThrow();});
  it('rejects fake revenue, malformed UUID, old timestamps and mixed identities',()=>{for(const patch of [{eventName:'order_paid'},{anonymousId:'invalid'},{occurredAt:'2000-01-01T00:00:00.000Z'}])expect(()=>normalizeBatch({events:[{...event(),...patch}]},Date.parse(now))).toThrow();expect(()=>normalizeBatch({events:[event(),event()]},Date.parse(now))).toThrow();});
});
function fact(name:string,time:string,user='u'):AnalyticsFact{return{event_id:randomUUID(),user_id:user,anonymous_id:null,event_name:name,occurred_at:time,platform:'web',environment:'production',evidence:name==='session_started'?'client_observed':'server_verified',properties:{}};}
describe('sequential funnel and mature KST retention',()=>{
  it('does not count steps out of order or duplicates',()=>{const visit=fact('session_started','2026-09-01T01:00:00.000Z');const data=[visit,visit,fact('account_created','2026-09-01T00:00:00.000Z'),fact('case_saved','2026-09-01T02:00:00.000Z')];expect(summarizeAnalytics(data,'2026-09-01T00:00:00.000Z',now,now).funnel.map(x=>x.count)).toEqual([1,0,0,0,0]);});
  it('uses exact KST dates, waits until the entire target day closes, leaves immature null',()=>{const data=[fact('core_completed','2026-10-01T14:59:00.000Z'),fact('core_completed','2026-10-01T15:01:00.000Z')];const summary=summarizeAnalytics(data,'2026-10-01T00:00:00.000Z',now,now);expect(summary.retention.map(x=>x.rate)).toEqual([1,null,null]);expect(summary.reused).toBe(1);expect(summarizeAnalytics(data,'2026-10-01T00:00:00.000Z',now,'2026-10-02T14:00:00.000Z').retention[0].rate).toBeNull();});
  it('first observed activation is not reset by narrowing report start',()=>{const data=[fact('core_completed','2026-09-01T00:00:00.000Z'),fact('core_completed','2026-10-01T00:00:00.000Z')];expect(summarizeAnalytics(data,'2026-10-01T00:00:00.000Z',now,now).retention[0].eligible).toBe(0);});
});
