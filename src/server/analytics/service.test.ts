import { beforeEach,describe,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn(),mobile:vi.fn()}));
vi.mock('@/server/admin/admin-repository',()=>({serviceClient:()=>({rpc:mocks.rpc})}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock('@/server/mobile/auth',async importOriginal=>({...await importOriginal<typeof import('@/server/mobile/auth')>(),authenticateMobile:mocks.mobile}));
import { collect,readBody,hqAuthorized } from './service';
import { GET } from '@/app/api/admin/analytics/route';
import { randomUUID } from 'node:crypto';
const body=()=>({events:[{eventId:randomUUID(),anonymousId:randomUUID(),sessionId:randomUUID(),eventName:'page_viewed',occurredAt:new Date().toISOString(),platform:'web',properties:{email:'private'}}]});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ANALYTICS_ENABLED','true');vi.stubEnv('ANALYTICS_ENV','staging');vi.stubEnv('SUPABASE_SECRET_KEY','test-secret');vi.stubEnv('MAIL_ADMIN_SECRET','test-admin');mocks.rpc.mockResolvedValue({data:true,error:null});mocks.getUser.mockResolvedValue({data:{user:{id:'verified'}},error:null});});
describe('collection authority',()=>{
 it('assigns verified user and server environment, strips PII',async()=>{const r=await collect(new Request('https://example.invalid/api/analytics/events',{method:'POST',body:JSON.stringify(body())}));expect(r.status).toBe(200);expect(mocks.rpc.mock.calls[1][1]).toMatchObject({p_user_id:'verified',p_environment:'staging',p_events:[{properties:{}}]});});
 it('rejects foreign origin and forged evidence before DB insertion',async()=>{expect((await collect(new Request('https://example.invalid/api/analytics/events',{method:'POST',headers:{origin:'https://evil.invalid'},body:'{}'}))).status).toBe(403);const b=body();Object.assign(b.events[0],{evidence:'server_verified'});expect((await collect(new Request('https://example.invalid/api/analytics/events',{method:'POST',body:JSON.stringify(b)}))).status).toBe(400);});
 it('enforces actual body bytes without content-length',async()=>{await expect(readBody(new Request('https://example.invalid',{method:'POST',body:'x'.repeat(65537)}))).rejects.toMatchObject({status:413});});
 it('requires existing admin gate and dedicated HQ secret',async()=>{expect((await GET(new Request('https://example.invalid/api/admin/analytics'))).status).toBe(401);vi.stubEnv('MOOA_ANALYTICS_HQ_SECRET','hq-only');expect(hqAuthorized(new Request('https://example.invalid',{headers:{authorization:'Bearer wrong'}}))).toBe(false);expect(hqAuthorized(new Request('https://example.invalid',{headers:{authorization:'Bearer hq-only'}}))).toBe(true);});
 it('fails closed on DB limiter outage',async()=>{mocks.rpc.mockResolvedValue({error:{message:'offline'}});expect((await collect(new Request('https://example.invalid',{method:'POST',body:JSON.stringify(body())}))).status).toBe(503);});
});
