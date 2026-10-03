"use client";
import { useEffect,useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { consentSnapshot,subscribeConsent,setAnalyticsConsent,startWebAnalytics,trackWeb } from "@/lib/analytics/web";
import { routeCategory } from "@/domain/analytics";
export function AnalyticsTracker(){
  const path=usePathname();const consent=useSyncExternalStore(subscribeConsent,consentSnapshot,()=>"unset");
  useEffect(()=>startWebAnalytics(),[]);
  useEffect(()=>{trackWeb('page_viewed',{route:routeCategory(path)});},[path]);
  if(/^\/(meensoo|dev|MAIL)(\/|$)/.test(path))return null;
  return <aside aria-label="이용 통계 설정" style={{padding:'12px 20px',fontSize:12,textAlign:'center'}}>
    {consent==='unset'?<><span>선택: 문서 내용 없이 방문·결과 이용 흐름을 90일간 분석합니다. 거부해도 모든 기능을 이용할 수 있습니다. </span><button onClick={()=>void setAnalyticsConsent(true)}>동의</button>{' '}<button onClick={()=>void setAnalyticsConsent(false)}>거부</button></>:<button onClick={()=>void setAnalyticsConsent(consent!=='yes')}>{consent==='yes'?'이용 통계 동의 철회·기록 삭제':'이용 통계 수집 동의'}</button>}
  </aside>;
}
