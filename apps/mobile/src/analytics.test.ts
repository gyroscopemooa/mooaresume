import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({store:new Map<string,string>(),owner:'10000000-0000-4000-8000-000000000001',auth:null as null|((event:string,session:{user:{id:string}}|null)=>void),state:null as null|((state:string)=>void),platform:{OS:'android'},files:vi.fn()}));
vi.mock('react-native',()=>({Platform:mock.platform,AppState:{addEventListener:(_name:string,callback:(state:string)=>void)=>{mock.state=callback;return{remove:vi.fn()};}}}));
vi.mock('expo-secure-store',()=>({getItemAsync:async(key:string)=>mock.store.get(key)??null,setItemAsync:async(key:string,value:string)=>{mock.store.set(key,value);},deleteItemAsync:async(key:string)=>{mock.store.delete(key);}}));
vi.mock('expo-file-system/legacy',()=>({documentDirectory:'test://',writeAsStringAsync:mock.files,readAsStringAsync:async()=> '[]'}));
vi.mock('expo-modules-core',()=>({uuid:{v4:()=>crypto.randomUUID()}}));
vi.mock('./auth',()=>({supabase:{auth:{getSession:async()=>({data:{session:mock.owner?{user:{id:mock.owner},access_token:'synthetic'}:null}}),onAuthStateChange:(callback:typeof mock.auth)=>{mock.auth=callback;return{data:{subscription:{unsubscribe:vi.fn()}}};}}}}));
let stop=()=>{};
beforeEach(()=>{vi.resetModules();vi.useFakeTimers();mock.store.clear();mock.store.set('mooa.analytics.consent.v1','yes');mock.owner='10000000-0000-4000-8000-000000000001';mock.platform.OS='android';vi.stubEnv('EXPO_PUBLIC_API_URL','https://example.invalid');vi.stubEnv('EXPO_PUBLIC_ANALYTICS_ENABLED','true');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({status:200}));});
afterEach(()=>{stop();vi.useRealTimers();vi.unstubAllGlobals();});
it.each(['android','ios'])('uses existing %s lifecycle and keeps private properties out of native disk queue',async platform=>{
  mock.platform.OS=platform;const api=await import('./analytics');stop=await api.startNativeAnalytics();await vi.advanceTimersByTimeAsync(1);
  api.trackNative('page_viewed',{route:'resume',email:'must-not-store',resume:'private'});mock.state?.('background');mock.state?.('active');await vi.advanceTimersByTimeAsync(15000);
  const sent=vi.mocked(fetch).mock.calls.map(([,init])=>JSON.parse(String(init?.body))).flatMap(x=>x.events??[]);
  expect(sent.some(e=>e.eventName==='app_foregrounded'&&e.platform===platform)).toBe(true);expect(JSON.stringify(mock.files.mock.calls)).not.toContain('must-not-store');
});
it('rotates anonymous identity on account switch and does not replay previous-owner withdrawal',async()=>{
  const api=await import('./analytics');stop=await api.startNativeAnalytics();await vi.advanceTimersByTimeAsync(1);
  const first=JSON.parse(mock.store.get('mooa.analytics.identity.v1')!).anonymousId;
  mock.store.set('mooa.analytics.pending',JSON.stringify({owner:mock.owner,body:{anonymousId:first,enabled:false}}));
  mock.owner='10000000-0000-4000-8000-000000000002';mock.auth?.('SIGNED_IN',{user:{id:mock.owner}});await vi.advanceTimersByTimeAsync(15000);
  expect(JSON.parse(mock.store.get('mooa.analytics.identity.v1')!).anonymousId).not.toBe(first);
  expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).endsWith('/preference'))).toBe(false);
});
