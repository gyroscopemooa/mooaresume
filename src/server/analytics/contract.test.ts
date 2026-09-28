import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {z} from "zod";
import {describe,it,expect} from "vitest";
import {aggregate} from "./aggregate";
import {parseQuery,resources,snapshotSchema} from "./model";

// Exercise the actual handed-off HQ Zod schemas, without importing its server
// env/registry dependencies or changing the read-only HQ checkout.
const contract=process.env.ANALYTICS_HQ_CLIENT;
describe.skipIf(!contract)("HQ 2026-09-27.v1 wire compatibility",()=>{
  const context:{z:typeof z;schemas?:Record<string,z.ZodType>}={z};
  if(contract) {
    const source=readFileSync(contract,"utf8");
    const begin=source.indexOf("const nullableText");
    const end=source.indexOf("type ResourceData");
    if(begin<0 || end<0) throw new Error("HQ_SCHEMA_MARKERS_CHANGED");
    const code=ts.transpileModule(`${source.slice(begin,end)}\nglobalThis.schemas=schemas;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
    vm.runInNewContext(code,context,{timeout:1000});
  }
  it.each(resources)("validates %s and exact list total",resource=>{
    const s=snapshotSchema.parse({events:[],links:[],accounts:[],members:[],orders:[],entitlements:[],rewards:[],runs:[],presence:[],assignments:[]});
    const query=parseQuery(new URL("https://example.test/?userId=00000000-0000-4000-8000-000000000001"),"staging");
    const id=query.userId!,time=new Date(Date.now()-86400000).toISOString();
    s.members.push({id,created_at:time,last_sign_in_at:null});
    s.events.push({event_id:id,event_name:"analysis_failed",occurred_at:time,received_at:time,anonymous_id:id,session_id:id,user_id:id,
      auth_attempt_id:null,billing_attempt_id:null,analysis_run_id:null,client_platform:"web",surface:"browser",environment:"staging",event_source:"client",evidence_type:"client_observed",is_internal:false,is_test:false,properties:{outcome:"failed"}});
    s.orders.push({id,owner_user_id:id,provider:"POLAR",product:"PRO",amount:100,currency:"KRW",status:"PAID",paid_at:time,refunded_at:null,updated_at:time});
    s.entitlements.push({id,owner_user_id:id,product:"PRO",status:"ACTIVE",created_at:time,billing_order_id:id,test_grant_id:null,consumed_at:null,revoked_at:null});
    const result=aggregate(s,resource,query);
    const schema=context.schemas?.[resource];
    expect(schema,`missing HQ ${resource} schema`).toBeDefined();
    expect(schema!.safeParse(result.data).success).toBe(true);
    if(Array.isArray(result.data)) {
      expect("total" in result).toBe(true);
      if("total" in result) expect(result.total).toBeGreaterThanOrEqual(result.data.length);
    }
  });
});
