import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CareerNicepayRepository, careerNicepayOrderSchema, careerNicepayRequestSchema, careerReturnPath, checkCareerNicepayPayment, renderCareerNicepayWindow, type CareerNicepayOrder } from "./career-nicepay";
import { signNicepayConsent } from "./nicepay-consent";
const id="10000000-0000-4000-8000-000000000001", owner="20000000-0000-4000-8000-000000000001", build="30000000-0000-4000-8000-000000000001";
const order: CareerNicepayOrder={id,moid:"mooa"+id.replaceAll("-",""),owner_user_id:owner,build_id:build,scope:"interest",product:"CAREER_AI",merchant_mid:"test00001m",amount:5900,currency:"krw",pricing_version:"career-v1",test_purchase:true,status:"OPEN",method:"EASYPAY",tid:null,expires_at:"2099-01-01T00:00:00Z"};
const consent={version:"2026-11-13" as const,financial:true as const,collection:true as const,sharing:true as const};
function configure(){vi.stubEnv("NICEPAY_MID",order.merchant_mid);vi.stubEnv("NICEPAY_MERCHANT_KEY",Buffer.alloc(64,9).toString("base64"));}
beforeEach(()=>{vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://127.0.0.1:54321");vi.stubEnv("SUPABASE_SECRET_KEY","synthetic-local-test-only");});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it("requires explicit wallet consent and Naver method without accepting client prices",()=>{
 expect(careerNicepayRequestSchema.safeParse({scope:"interest",payment:{method:"EASYPAY",preferredPay:"NAVER",consent}}).success).toBe(false);
 expect(careerNicepayRequestSchema.safeParse({scope:"interest",payment:{method:"CARD",amount:1}}).success).toBe(false);
 expect(careerNicepayRequestSchema.safeParse({scope:"interest",payment:{method:"EASYPAY",preferredPay:"KAKAO"}}).success).toBe(false);
});
it.each(["interest","work_style","work_values","combined"] as const)("keeps %s on the career return path and reuses direct provider authentication",scope=>{
 configure();const scoped={...order,scope};const html=renderCareerNicepayWindow(scoped,"https://mooaresume.com","KAKAO",signNicepayConsent(scoped,"KAKAO",consent));
 expect(html).toContain('/api/career-ai-builds/nicepay/return');expect(html).toContain('DirectEasyPay" value="E016');
 expect(html).toContain(careerReturnPath(scoped).replaceAll("&","&amp;"));expect(html).not.toContain('/analysis/prepare');expect(html).not.toContain('/api/checkouts/nicepay');
 expect(html).toContain("심층해설을 시작합니다.");
});
it("never grants generation from a URL success flag or an unpaid order",async()=>{
 vi.spyOn(CareerNicepayRepository.prototype,"loadById").mockResolvedValue(order);
 expect(await checkCareerNicepayPayment({checkoutId:"nicepay-career:"+id,buildId:build,userId:owner,scope:"interest",price:5900})).toEqual({paid:false,reason:"NOT_PAID"});
});
it("binds paid proof to build, scope and immutable build price",async()=>{
 const load=vi.spyOn(CareerNicepayRepository.prototype,"loadById").mockResolvedValue({...order,status:"PAID"});
 const input={checkoutId:"nicepay-career:"+id,buildId:build,userId:owner,scope:"interest" as const,price:5900};
 expect(await checkCareerNicepayPayment(input)).toEqual({paid:true});
 for(const changed of [{price:1},{scope:"combined" as const},{buildId:id}]) expect((await checkCareerNicepayPayment({...input,...changed})).paid).toBe(false);
 expect(load).toHaveBeenCalledWith(id,owner);
});
it("rejects absent/foreign orders and malformed checkout references",async()=>{
 vi.spyOn(CareerNicepayRepository.prototype,"loadById").mockResolvedValue(null);
 for(const checkoutId of ["nicepay-career:"+id,"nicepay-career:bad","polar:"+id]) expect((await checkCareerNicepayPayment({checkoutId,buildId:build,userId:owner,scope:"interest",price:5900})).paid).toBe(false);
 expect(careerNicepayOrderSchema.safeParse({...order,product:"QUICK"}).success).toBe(false);
});
