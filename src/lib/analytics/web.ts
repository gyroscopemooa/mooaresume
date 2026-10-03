"use client";
import { createClient } from "@/lib/supabase/client";
import { isInstalledAppContext } from "@/lib/app-context";
import { eventSchema,propertiesSchema, routeCategory, type ClientEvent } from "@/domain/analytics";
import { AnalyticsQueue } from "./queue";
const KEY="mooa.analytics.v1", CONSENT="mooa.analytics.consent.v1";
let queue:AnalyticsQueue|null=null, anonymousId="", sessionId="", owner:string|null=null, ready=false;
const read=(key:string)=>{try{return localStorage.getItem(key);}catch{return null;}};
const write=(key:string,value:string)=>{try{localStorage.setItem(key,value);}catch{/* memory only */}};
async function sendPreference(body:{anonymousId:string;enabled:boolean},expectedOwner:string|null){
  const {data}=await createClient().auth.getSession();
  if((data.session?.user.id??null)!==expectedOwner)return false;
  const response=await fetch('/api/analytics/preference',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',...(data.session?{Authorization:`Bearer ${data.session.access_token}`}:{})},body:JSON.stringify(body)});
  return response.ok;
}
export function consentSnapshot(){return read(CONSENT)??"unset";}
export function subscribeConsent(callback:()=>void){window.addEventListener("storage",callback);window.addEventListener("mooa-analytics-consent",callback);return()=>{window.removeEventListener("storage",callback);window.removeEventListener("mooa-analytics-consent",callback);};}
export async function setAnalyticsConsent(enabled:boolean){
  write(CONSENT,enabled?"yes":"no");window.dispatchEvent(new Event("mooa-analytics-consent"));
  queue?.clear();
  const oldId=anonymousId||crypto.randomUUID();
  const current=await createClient().auth.getSession();const preferenceOwner=current.data.session?.user.id??null;
  try{
    if(!await sendPreference({anonymousId:oldId,enabled},preferenceOwner))throw new Error('PREFERENCE_FAILED');
    write("mooa.analytics.pending-preference","");
  }catch{write("mooa.analytics.pending-preference",JSON.stringify({body:{anonymousId:oldId,enabled},owner:preferenceOwner}));}
  anonymousId=crypto.randomUUID();sessionId=crypto.randomUUID();write(KEY,"");
  if(enabled&&ready){trackWeb('session_started',{channel:channel()});trackWeb('page_viewed',{route:routeCategory(location.pathname)});}
}
function channel(){
  if(!document.referrer)return 'direct';
  try{const host=new URL(document.referrer).hostname;if(/(^|\.)(google\.[a-z.]+|naver\.com|bing\.com)$/.test(host))return 'search';if(/(^|\.)(instagram\.com|facebook\.com|youtube\.com)$/.test(host))return 'social';if(host===location.hostname)return 'direct';return 'referral';}catch{return 'other';}
}
export function trackWeb(eventName:ClientEvent['eventName'],properties:Record<string,unknown>={}){
  if(!ready||consentSnapshot()!=='yes'||navigator.doNotTrack==='1'||/^\/(meensoo|api|dev|MAIL)(\/|$)/.test(location.pathname))return;
  // Another tab may have changed account. Never submit that tab's queued identity.
  try{const saved=JSON.parse(read(KEY)??'null') as {owner?:string|null}|null;if(saved?.owner!==undefined&&saved.owner!==owner)return;}catch{/* empty state */}
  const installed=isInstalledAppContext();
  const safe=propertiesSchema.safeParse({...properties,surface:installed?'twa':'browser'});if(!safe.success)return;
  queue?.add({eventId:crypto.randomUUID(),anonymousId,sessionId,eventName,occurredAt:new Date().toISOString(),platform:installed?'android':'web',properties:safe.data});
  void queue?.flush();
}
export function startWebAnalytics(){
  if(queue)return()=>{};
  const client=createClient();let disposed=false;
  anonymousId=crypto.randomUUID();sessionId=crypto.randomUUID();
  queue=new AnalyticsQueue(events=>write(KEY,JSON.stringify({anonymousId,sessionId,owner,events})),async events=>{
    if(consentSnapshot()!=='yes')return 400;
    const {data}=await client.auth.getSession();if((data.session?.user.id??null)!==owner)return 401;
    return (await fetch('/api/analytics/events',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',...(data.session?{Authorization:`Bearer ${data.session.access_token}`}:{})},body:JSON.stringify({events}),keepalive:true,signal:AbortSignal.timeout(10000)})).status;
  });
  const auth=client.auth.onAuthStateChange((_event,session)=>{
    if(disposed)return;const next=session?.user.id??null;
    if(!ready){
      try{const saved=JSON.parse(read(KEY)??'null');if(saved&&eventSchema.shape.anonymousId.safeParse(saved.anonymousId).success&&(!saved.owner||saved.owner===next)){anonymousId=saved.anonymousId;queue?.restore(saved.events);} }catch{/* corrupt storage */}
    }else if(owner!==next&&owner!==null){queue?.clear();anonymousId=crypto.randomUUID();sessionId=crypto.randomUUID();}
    const initial=!ready;const changed=owner!==next;owner=next;ready=true;
    write(KEY,JSON.stringify({anonymousId,sessionId,owner,events:queue?.events??[]}));
    if(changed&&next)trackWeb('signed_in');
    if(initial||changed){trackWeb('session_started',{channel:channel()});trackWeb('page_viewed',{route:routeCategory(location.pathname)});}
  });
  const flush=()=>{const pending=read('mooa.analytics.pending-preference');if(pending){try{const saved=JSON.parse(pending);void sendPreference(saved.body,saved.owner).then(ok=>{if(ok)write('mooa.analytics.pending-preference','');}).catch(()=>{});}catch{/* invalid stored preference */}}void queue?.flush();};
  const timer=setInterval(flush,15000);window.addEventListener('online',flush);window.addEventListener('focus',flush);window.addEventListener('pagehide',flush);
  return()=>{disposed=true;ready=false;clearInterval(timer);auth.data.subscription.unsubscribe();window.removeEventListener('online',flush);window.removeEventListener('focus',flush);window.removeEventListener('pagehide',flush);queue=null;};
}
