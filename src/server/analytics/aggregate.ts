import type { Query, Resource, Snapshot } from "./model";
import { verifiedNames } from "@/lib/analytics/schema";

const day = 86400000;
const latest = (values: (string | null)[]) => values.filter((s): s is string => s !== null).sort().at(-1) ?? null;
const earliest = (values: (string | null)[]) => values.filter((s): s is string => s !== null).sort()[0] ?? null;
const unique = (values: string[]) => new Set(values).size;
const paidProvider = (provider: string) => provider === "POLAR" || provider === "GOOGLE_PLAY";

export function entitlement(s: Snapshot, userId: string, now: number, includeTest = false) {
  const ent = s.entitlements.filter(e => e.owner_user_id === userId && (includeTest || !e.test_grant_id));
  // A consumed reward creates an analysis entitlement: do not count both.
  const rewards = s.rewards.filter(r => r.owner_user_id === userId && r.billing_order_id === null);
  const remaining = ent.filter(e => e.status === "ACTIVE").length + rewards.filter(r => r.status === "AVAILABLE" && (!r.expires_at || Date.parse(r.expires_at) > now)).length;
  const consumed = ent.filter(e => e.status === "CONSUMED").length;
  return { entitlement_type: "uses", unit: "analysis_run", granted: ent.length + rewards.length, consumed, remaining,
    reserved: null, status: remaining ? "available" : "exhausted", starts_at: earliest([...ent, ...rewards].map(e => e.created_at)),
    expires_at: earliest(rewards.filter(r => r.status === "AVAILABLE").map(r => r.expires_at)),
    buckets: ["QUICK", "PRO", "FINAL"].map(product => ({ source: product,
      granted: [...ent, ...rewards].filter(e => e.product === product).length,
      consumed: ent.filter(e => e.product === product && e.status === "CONSUMED").length,
      remaining: ent.filter(e => e.product === product && e.status === "ACTIVE").length + rewards.filter(e => e.product === product && e.status === "AVAILABLE" && (!e.expires_at || Date.parse(e.expires_at) > now)).length })),
    ledgerMismatch: null, latestChangeAt: latest([...ent.flatMap(e => [e.created_at,e.consumed_at,e.revoked_at]), ...rewards.flatMap(e => [e.created_at,e.consumed_at])]),
    lastUsageAt: latest(ent.map(e => e.consumed_at)), source_updated_at: latest([...ent.flatMap(e=>[e.created_at,e.consumed_at,e.revoked_at]),...rewards.flatMap(e=>[e.created_at,e.consumed_at])]),read_at:new Date(now).toISOString(),
    remainingSource: "COUNT of source ACTIVE entitlements + unredeemed, unexpired AVAILABLE rewards; source has no numeric balance",
    reservedReason: "N/A: no reservation ledger", ledgerMismatchReason: "N/A: no independent numeric balance to reconcile",
    additionalEntitlements: s.interviews.filter(i=>i.owner_user_id===userId).map(i=>({
      source:"interview_entitlements",analysisRunId:i.analysis_run_id,entitlement_type:"uses",unit:"interview_session",
      remaining:i.paid_extra_sessions,granted:null,consumed:null,source_updated_at:i.updated_at,
      restartFreeAvailable:!i.restart_free_used,weakRetryFreeAvailable:!i.weak_retry_free_used,
    })) };
}

export function revenue(orders: Snapshot["orders"]) {
  return [...new Set(orders.map(o => o.currency.toUpperCase()))].sort().map(currency => {
    const group = orders.filter(o => o.currency.toUpperCase() === currency);
    const gross = group.reduce((n,o) => n + o.amount,0);
    const refunded = group.filter(o => o.status === "REFUNDED").reduce((n,o) => n + o.amount,0);
    return { currency, gross, discount: 0, net: gross - refunded, refunded,
      discountReason: "N/A: source records charged amount, not list price/discount; gross means charged amount before refunds" };
  });
}

export function aggregate(s: Snapshot, resource: Resource, q: Query, now = Date.now()) {
  const inRange = (date: string) => Date.parse(date) >= Date.parse(q.from) && Date.parse(date) < Date.parse(q.to);
  const accountAllowed = (id: string | null) => {
    const a = s.accounts.find(a => a.user_id === id);
    return (q.includeInternal || !a?.is_internal) && (q.includeTest || !a?.is_test) && (!q.userId || q.userId === id);
  };
  const actor = (e: Snapshot["events"][number]) => e.user_id ?? s.links.find(l => l.environment === q.environment && l.anonymous_id === e.anonymous_id)?.user_id ?? e.anonymous_id;
  // Client evidence is never promoted, even if a corrupt/imported row uses a verified name.
  const events = s.events.filter(e => e.environment === q.environment && inRange(e.occurred_at)
    && (!q.platform || e.client_platform === q.platform) && (q.includeInternal || !e.is_internal)
    && (q.includeTest || !e.is_test) && accountAllowed(actor(e)) && (!q.product || e.properties.product===q.product)
    && e.evidence_type==="client_observed" && e.event_source==="client" && !verifiedNames.has(e.event_name))
    .sort((a,b) => a.occurred_at.localeCompare(b.occurred_at) || a.event_id.localeCompare(b.event_id));
  // Financial source has no platform dimension; do not infer from unrelated activity.
  const orders = s.orders.filter(o => accountAllowed(o.owner_user_id) && inRange(o.paid_at)
    && ["PAID", "REFUNDED"].includes(o.status) && (!q.product || o.product === q.product)
    && (!q.provider || o.provider === q.provider) && (!q.platform) && !q.coupon
    && (q.refunded === undefined || (o.status === "REFUNDED") === q.refunded));
  const purchases = orders.filter(o => paidProvider(o.provider));
  const runs = s.runs.filter(r => accountAllowed(r.owner_user_id) && (q.includeTest || !r.is_test) && (!q.product || r.product === q.product) && !q.platform);
  const completed = runs.filter(r => r.status === "COMPLETED" && r.completed_at && inRange(r.completed_at));
  const saved = completed.filter(r => r.saved_at && inRange(r.saved_at));
  const page = <T,>(data: T[]) => ({ data: data.slice(q.offset, q.offset+q.limit), total: data.length });
  const eventRows = (rows: typeof events) => rows.map(e => ({ ...e, user_id: s.members.some(m => m.id === actor(e)) ? actor(e) : null,
    translation_session_id: null, app_version: null, build_number: null }));
  type Signal={name:string;actor:string;session:string|null;time:string;sourceId?:string};
  const signals:Signal[]=events.map(e=>({name:e.event_name,actor:actor(e),session:e.session_id,time:e.occurred_at}));
  const verifiedSignals:Signal[]=[];
  if(!q.platform) {
    for(const c of s.checkouts.filter(c=>accountAllowed(c.owner_user_id) && inRange(c.created_at))) verifiedSignals.push({name:"checkout_created",actor:c.owner_user_id,session:null,time:c.created_at,sourceId:c.id});
    for(const m of s.members.filter(m=>accountAllowed(m.id) && inRange(m.created_at))) verifiedSignals.push({name:"account_created",actor:m.id,session:null,time:m.created_at,sourceId:m.id});
    for(const run of completed) {
      verifiedSignals.push({name:"result_generated",actor:run.owner_user_id,session:null,time:run.completed_at!,sourceId:run.id});
      if(run.saved_at && inRange(run.saved_at)) verifiedSignals.push({name:"result_saved",actor:run.owner_user_id,session:null,time:run.saved_at,sourceId:run.id});
    }
    for(const order of purchases) {
      verifiedSignals.push({name:"order_paid_verified",actor:order.owner_user_id,session:null,time:order.paid_at,sourceId:order.id});
      const grant=s.entitlements.find(e=>e.billing_order_id===order.id && e.owner_user_id===order.owner_user_id);
      if(grant && inRange(grant.created_at)) verifiedSignals.push({name:"entitlement_granted",actor:order.owner_user_id,session:null,time:grant.created_at,sourceId:grant.id});
    }
  }
  signals.push(...verifiedSignals);
  signals.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  const milestones = ["page_viewed", "account_created", "editor_entered", "analysis_entered", "result_generated", "result_saved"];
  const commerceMilestones=["pricing_viewed","checkout_created","order_paid_verified","entitlement_granted"];
  function steps(sequence:string[],group:string) { return sequence.map((name, index) => {
    const actors = new Set<string>(); const sessions = new Set<string>();
    const priorActor = new Map<string,number>(); const priorSession = new Map<string,number>();
    for (const event of signals) {
      const a = event.actor; const session = `${a}:${event.session}`;
      const ai = priorActor.get(a) ?? 0; const si = priorSession.get(session) ?? 0;
      if (event.name === sequence[ai] && ai <= index) priorActor.set(a,ai+1);
      if (event.session && event.name === sequence[si] && si <= index) priorSession.set(session,si+1);
      if ((priorActor.get(a) ?? 0) > index) actors.add(a);
      if ((priorSession.get(session) ?? 0) > index) sessions.add(session);
    }
    const observed=signals.filter(e=>e.name===name).length;
    return { eventName: name, stageKey: name, ordinal: index+1, label: name,group,
      events: observed, observedEvents: observed, users: actors.size, sessions: sessions.size, conversionBasis: "sequentialActors",
      sessionReason:verifiedNames.has(name) ? "N/A: source ledger has no session attribution; sequential sessions cannot advance" : null };
  }); }
  const funnel=[...steps(milestones,"activation"),...steps(commerceMilestones,"revenue")];
  switch(resource) {
    case "collection-status": { const last = [...events].sort((a,b) => b.received_at.localeCompare(a.received_at))[0];
      return { data: { collectedEvents: events.length,lastReceivedAt: last?.received_at ?? null,lastEventName: last?.event_name ?? null,lastPlatform: last?.client_platform ?? null } }; }
    case "summary": return { data: { events: events.length,users: unique(events.map(actor)), sessions: unique(events.map(e => `${actor(e)}:${e.session_id}`)),
      translationSessions: 0, billingAttempts: verifiedSignals.filter(s=>s.name==="checkout_created").length, verifiedPurchases: purchases.length,
      completedCredits: s.entitlements.filter(e => purchases.some(o => o.id === e.billing_order_id)).length,
      errors: events.filter(e => e.event_name.endsWith("_failed")).length, from: q.from,to: q.to,
      purchasers: unique(purchases.map(o => o.owner_user_id)),unmatchedPurchases: 0,duplicateOrders: 0,
      refunds: purchases.filter(o => o.status === "REFUNDED").length, revenueByCurrency: revenue(purchases),
      analysisRuns: runs.filter(r => inRange(r.created_at)).length, resultGenerated: completed.length, resultSaved: saved.length,
      platformReason: q.platform ? "N/A: financial and run ledgers have no platform attribution" : null } };
    case "funnel": return page(funnel);
    case "bottlenecks": return page(funnel.map((step,i) => {
      const next=funnel[i+1]?.group===step.group ? funnel[i+1] : null;
      return {...step,entered:step.users,continued:next?.users ?? 0,exited:next ? step.users-next.users : 0,
        conversionRate:next && step.users ? next.users/step.users : null};
    }));
    case "events": case "timeline": case "errors": {
      const ledger=verifiedSignals.filter(e=>!q.eventName || e.name===q.eventName).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time) || (a.sourceId ?? "").localeCompare(b.sourceId ?? "") || a.name.localeCompare(b.name));
      return {...page(eventRows(events.filter(e => (!q.eventName || e.event_name === q.eventName)
        && (resource !== "errors" || e.event_name.endsWith("_failed"))).reverse())),
        ledgerEvidence:resource!=="errors" ? ledger.slice(q.offset,q.offset+q.limit) : undefined,
        ledgerEvidenceTotal:resource!=="errors" ? ledger.length : undefined,
        ledgerEvidenceReason:"Verified ledgers have no client platform/session; exposed separately rather than inventing attribution"};
    }
    case "orders": return page(orders.sort((a,b) => b.paid_at.localeCompare(a.paid_at) || a.id.localeCompare(b.id)).map(o => ({
      order_id:o.id, product_code:o.product,provider:o.provider, amount:o.amount,currency:o.currency.toUpperCase(),discount:0,coupon_id:null,
      status:o.status,approved_at:o.paid_at,refunded_at:o.refunded_at,entitlement_type:"uses",entitlement_unit:o.product==="INTERVIEW_RETRY" ? "interview_session" : "analysis_run",entitlement_amount:1,
      entitlement_granted:s.entitlements.some(e => e.billing_order_id === o.id),discountReason:"N/A: not recorded" })));
    case "entitlements": return { data: q.userId && s.members.some(m=>m.id===q.userId) && accountAllowed(q.userId) ? entitlement(s,q.userId,now,q.includeTest) : null };
    case "purchasers": {
      const data = s.members.filter(m => accountAllowed(m.id)).map(m => {
        const owned = purchases.filter(o => o.owner_user_id === m.id); const ent = entitlement(s,m.id,now,q.includeTest);
        const recent = [...owned].sort((a,b) => b.paid_at.localeCompare(a.paid_at))[0];
        return { userId:m.id,emailMasked:null,firstPurchaseAt:earliest(owned.map(o=>o.paid_at)),lastPurchaseAt:latest(owned.map(o=>o.paid_at)),
          purchaseCount:owned.length,repurchased:owned.length>1,latestProduct:recent?.product ?? null,provider:recent?.provider ?? null,
          revenueByCurrency:revenue(owned),discountTotal:0,refundCount:owned.filter(o=>o.status==="REFUNDED").length,
          granted:ent.granted,consumed:ent.consumed,remaining:ent.remaining,entitlementType:"uses",entitlementUnit:"analysis_run",
          lastActivityAt:latest(events.filter(e=>actor(e)===m.id).map(e=>e.occurred_at)),sourceUpdatedAt:latest(owned.map(o=>o.updated_at)) };
      }).filter(m => (q.purchaser === false ? m.purchaseCount===0 : m.purchaseCount>0)
        && (q.repurchased === undefined || m.repurchased===q.repurchased)
        && (!q.remaining || (q.remaining==="positive" ? m.remaining>0 : m.remaining===0))
        && (!q.q || m.userId.includes(q.q))).sort((a,b)=>a.userId.localeCompare(b.userId));
      return page(data);
    }
    case "members": return page(s.members.filter(m=> {
      const own=purchases.filter(o=>o.owner_user_id===m.id);
      const remaining=entitlement(s,m.id,now,q.includeTest).remaining;
      return accountAllowed(m.id) && (!q.q || m.id.includes(q.q)) && inRange(m.created_at)
        && (q.purchaser===undefined || (own.length>0)===q.purchaser)
        && (q.repurchased===undefined || (own.length>1)===q.repurchased)
        && (!q.remaining || (q.remaining==="positive" ? remaining>0 : remaining===0))
        && (!(q.product || q.provider || q.refunded!==undefined) || own.length>0);
    }).map(m=> {
      const activity=events.filter(e=>actor(e)===m.id); const last=activity.at(-1);
      const presence=s.presence.filter(p=>p.environment===q.environment && p.user_id===m.id && (!q.platform || p.platform===q.platform)).sort((a,b)=>b.last_seen_at.localeCompare(a.last_seen_at))[0];
      return { userId:m.id,emailMasked:null,createdAt:m.created_at,lastSignInAt:m.last_sign_in_at,lastEventAt:last?.occurred_at ?? null,
        lastPlatform:last?.client_platform ?? null,internal:s.accounts.some(a=>a.user_id===m.id && a.is_internal),internalLabel:null,
        accountStatus:"unknown",accountStatusReason:"N/A: selected source does not include ban/deactivation state",sessionCount:unique(activity.map(e=>e.session_id)),lastSeenAt:presence?.last_seen_at ?? null,presencePlatform:presence?.platform ?? null,
        purchaseCount:purchases.filter(o=>o.owner_user_id===m.id).length };
    }).sort((a,b)=>a.userId.localeCompare(b.userId)));
    case "activation": {
      const startedRuns=runs.filter(r=>inRange(r.created_at));
      const started=unique(startedRuns.map(r=>r.owner_user_id));
      const first=unique(completed.filter(r=>startedRuns.some(s=>s.id===r.id)).map(r=>r.owner_user_id));
      const second=unique(saved.filter(r=>startedRuns.some(s=>s.id===r.id)).map(r=>r.owner_user_id));
      return { data:{ started,reached30Seconds:0,reached3Minutes:0,rate30Seconds:null,rate3Minutes:null,
        legacyReason:"N/A: MooAResume measures results, not translation duration",milestones:[
          {key:"result_generated",label:"분석 결과 생성",actors:first,rate:started ? first/started : null},
          {key:"result_saved",label:"분석 결과 영속 저장",actors:second,rate:started ? second/started : null}],
        evidence:"analysis_runs COMPLETED + analysis_results row; saving is automatic, not a separate user action" } };
    }
    case "acquisition": return page(["direct","search","social","referral","other","unknown"].map(source=>({source,
      signups:s.members.filter(m=>accountAllowed(m.id) && inRange(m.created_at) && (events.find(e=>actor(e)===m.id && e.event_name==="page_viewed")?.properties.source ?? "unknown")===source).length })));
    case "retention": {
      const cohorts=new Map<string,string[]>();
      for (const m of s.members.filter(m=>accountAllowed(m.id) && inRange(m.created_at))) { const date=m.created_at.slice(0,10); cohorts.set(date,[...(cohorts.get(date)??[]),m.id]); }
      return page([...cohorts].sort(([a],[b])=>a.localeCompare(b)).map(([date,ids])=> {
        const result: Record<string,string|number|null>={cohortDate:date,cohortSize:ids.length};
        for (const n of [1,7,30]) {
          const start=Date.parse(date)+n*day; const mature=Math.min(now,Date.parse(q.to))>=start+day;
          const returned=new Set(events.filter(e=>["editor_entered","analysis_entered"].includes(e.event_name) && ids.includes(actor(e)) && Date.parse(e.occurred_at)>=start && Date.parse(e.occurred_at)<start+day).map(actor));
          result[`d${n}`]=mature ? returned.size : null;result[`d${n}Rate`]=mature ? returned.size/ids.length : null;
          result[`d${n}Reason`]=mature ? null : "N/A: cohort has not completed its UTC return day";
        } return result;
      }));
    }
    case "experiments": return page(["control","treatment"].map(variant=> {
      const assignments=s.assignments.filter(a=>a.environment===q.environment && a.variant===variant && accountAllowed(a.user_id) && inRange(a.assigned_at));
      const exposed=events.filter(e=>e.event_name==="experiment_exposed" && e.properties.experimentKey==="analytics_onboarding_v1" && e.properties.variant===variant
        && assignments.some(a=>a.user_id===actor(e) && a.assigned_at<=e.occurred_at));
      return {experimentKey:"analytics_onboarding_v1",variant,assignments:assignments.length,exposures:unique(exposed.map(actor)),conversions:0,
        conversionRate:null,conversionRateReason:"N/A: observation only; product experiment not enabled",revenueByCurrency:null,
        revenueReason:"N/A: no causal order assignment",d7MeaningfulReturn:null,d7Reason:"N/A: experiment not enabled",sampleSizeWarning:true};
    }));
    case "campaign-safety": return {...page([]),observationOnly:true,availability:"not_applicable",
      reason:"No HQ campaign policy enforcement is wired to checkout/reward logic",enforcement:{maxRedemptions:false,budget:false,perUser:false,killSwitch:false}};
    case "data-quality": return page([
      {key:"purchase_without_entitlement",count:purchases.filter(o=>o.product!=="INTERVIEW_RETRY" && !s.entitlements.some(e=>e.billing_order_id===o.id && e.owner_user_id===o.owner_user_id)).length,sampleIds:[],checkedAt:new Date(now).toISOString()},
      {key:"refund_entitlement_mismatch",count:purchases.filter(o=>o.status==="REFUNDED" && s.entitlements.some(e=>e.billing_order_id===o.id && e.status==="ACTIVE")).length,sampleIds:[],checkedAt:new Date(now).toISOString()},
      {key:"rejected_verified_client_rows",count:s.events.filter(e=>e.environment===q.environment && inRange(e.occurred_at) && accountAllowed(actor(e)) && verifiedNames.has(e.event_name)).length,sampleIds:[],checkedAt:new Date(now).toISOString()},
      {key:"campaign_enforcement",count:null,sampleIds:[],checkedAt:new Date(now).toISOString(),reason:"N/A: no campaign budget/max_redemptions/per-user/kill_switch enforcement connected; analytics does not change rewards"},
      {key:"platform_financial_attribution",count:null,sampleIds:[],checkedAt:new Date(now).toISOString(),reason:"N/A: existing financial ledger has no platform column"},
      {key:"scope",count:null,sampleIds:[],checkedAt:new Date(now).toISOString(),reason:"QUICK/PRO/FINAL + interview retry. Career AI/document-build tables store quoted price/checkout IDs, not immutable captured/refunded payments; no inferred revenue."},
    ]);
  }
}
