import { AppState,Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Files from 'expo-file-system/legacy';
import { uuid } from 'expo-modules-core';
import { supabase } from './auth';
import { AnalyticsQueue } from '../../../src/lib/analytics/queue';
import { eventSchema,propertiesSchema,type ClientEvent } from '../../../src/domain/analytics';
import appConfig from '../app.json';
const KEY='mooa.analytics.identity.v1',CONSENT='mooa.analytics.consent.v1';
const file=Files.documentDirectory?`${Files.documentDirectory}mooa-analytics-queue.json`:null;
let queue:AnalyticsQueue|null=null,anonymousId='',sessionId='',owner:string|null=null,enabled=false,ready=false;
let writes=Promise.resolve();
async function request(path:string,body:unknown){
  const base=process.env.EXPO_PUBLIC_API_URL;if(!base)return 503;
  if(!base.startsWith('https://')&&!(__DEV__&&base.startsWith('http://')))return 503;
  const {data}=await supabase!.auth.getSession();
  if((data.session?.user.id??null)!==owner)return 401;
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),10000);
  try{return(await fetch(`${base.replace(/\/$/,'')}/api/analytics/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(data.session?{Authorization:`Bearer ${data.session.access_token}`}:{})},body:JSON.stringify(body),signal:abort.signal})).status;}
  finally{clearTimeout(timer);}
}
export function trackNative(eventName:ClientEvent['eventName'],properties:Record<string,unknown>={}){
  if(!enabled||!ready||Platform.OS==='web')return;
  const safe=propertiesSchema.safeParse({...properties,surface:'native',appVersion:appConfig.expo.version});if(!safe.success)return;
  queue?.add({eventId:uuid.v4(),anonymousId,sessionId,eventName,occurredAt:new Date().toISOString(),platform:Platform.OS==='ios'?'ios':'android',properties:safe.data});
  void queue?.flush();
}
export async function nativeAnalyticsConsent(value:boolean){
  if(!ready)throw new Error('ANALYTICS_NOT_READY');
  enabled=value;queue?.clear();await SecureStore.setItemAsync(CONSENT,value?'yes':'no');
  const body={anonymousId:anonymousId||uuid.v4(),enabled:value};
  await SecureStore.setItemAsync('mooa.analytics.pending',JSON.stringify({body,owner}));
  const status=await request('preference',body).catch(()=>503);
  if(status===200)await SecureStore.deleteItemAsync('mooa.analytics.pending');
  anonymousId=uuid.v4();sessionId=uuid.v4();
  await SecureStore.setItemAsync(KEY,JSON.stringify({anonymousId,owner}));
  if(value)trackNative('session_started',{channel:'direct'});
}
export async function startNativeAnalytics(){
  if(Platform.OS==='web'||!supabase||process.env.EXPO_PUBLIC_ANALYTICS_ENABLED!=='true')return()=>{};
  const session=await supabase.auth.getSession();owner=session.data.session?.user.id??null;
  enabled=await SecureStore.getItemAsync(CONSENT)==='yes';anonymousId=uuid.v4();sessionId=uuid.v4();
  let restore=false;
  try{const saved=JSON.parse(await SecureStore.getItemAsync(KEY)??'null');if(saved&&eventSchema.shape.anonymousId.safeParse(saved.anonymousId).success&&(!saved.owner||saved.owner===owner)){anonymousId=saved.anonymousId;restore=true;}}catch{/* invalid local state */}
  queue=new AnalyticsQueue(events=>{const content=JSON.stringify(events);writes=writes.then(async()=>{if(file)await Files.writeAsStringAsync(file,content);}).catch(()=>{});},async events=>enabled?request('events',{events}):400);
  if(restore&&enabled&&file){try{queue.restore(JSON.parse(await Files.readAsStringAsync(file)));}catch{/* first run */}}
  ready=true;await SecureStore.setItemAsync(KEY,JSON.stringify({anonymousId,owner}));
  trackNative('session_started',{channel:'direct'});
  const auth=supabase.auth.onAuthStateChange((_event,next)=>{
    const nextId=next?.user.id??null;if(nextId===owner)return;
    if(owner!==null){queue?.clear();anonymousId=uuid.v4();sessionId=uuid.v4();}
    owner=nextId;void SecureStore.setItemAsync(KEY,JSON.stringify({anonymousId,owner})).catch(()=>{});
    if(nextId)trackNative('signed_in');
  });
  const flush=()=>{
    void SecureStore.getItemAsync('mooa.analytics.pending').then(async pending=>{if(!pending)return;const saved=JSON.parse(pending);if(saved.owner===owner&&await request('preference',saved.body)===200)await SecureStore.deleteItemAsync('mooa.analytics.pending');}).catch(()=>{});
    void queue?.flush();
  };
  const listener=AppState.addEventListener('change',state=>{trackNative(state==='active'?'app_foregrounded':'app_backgrounded');if(state==='active')flush();});
  const timer=setInterval(flush,15000);
  return()=>{ready=false;clearInterval(timer);listener.remove();auth.data.subscription.unsubscribe();queue=null;};
}
