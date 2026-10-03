export type AnalyticsOrder={id:string;provider:string;amount:number;currency:string;status:string;refunded_at:string|null;metadata:Record<string,unknown>;analysis_entitlements:{id:string;status:string}[]};
/** PostgREST returns an object for a UNIQUE reverse FK and an array otherwise. */
export function normalizeEntitlements(value:unknown):AnalyticsOrder['analysis_entitlements']{
  const items:unknown[]=Array.isArray(value)?value:value?[value]:[];
  return items.flatMap(item=>item&&typeof item==='object'&&'id' in item&&typeof item.id==='string'&&'status' in item&&typeof item.status==='string'?[{id:item.id,status:item.status}]:[]);
}
export function classifyAnalyticsOrder(order:AnalyticsOrder){
  if(order.amount===0||order.provider==='MOOA_CREDIT')return 'free' as const;
  if(order.metadata.polarEnvironment==='sandbox'||order.metadata.testPurchase===true)return 'test' as const;
  if(order.provider==='POLAR'&&order.metadata.polarEnvironment==='production'&&order.analysis_entitlements.length>0)return 'actual' as const;
  return 'unclassified' as const;
}
export function analyticsOrderAmounts(order:AnalyticsOrder){
  if(classifyAnalyticsOrder(order)!=='actual')return {gross:0,refunds:0,net:0};
  const refunds=order.refunded_at||order.status==='REFUNDED'||order.status==='REVIEW_REQUIRED'?order.amount:0;
  return {gross:order.amount,refunds,net:order.amount-refunds};
}
