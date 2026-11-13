import "server-only";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { nicepayPaymentRequestSchema, renderNicepayPurchaseWindow } from "./nicepay-checkout";
import { nicepayOrderSchema, createNicepayServiceClient, type NicepayOrderRepository } from "./nicepay-order-repository";
import { getNicepayPaymentConfig, nicepayAvailableFor, recoverNicepayOrder } from "./nicepay-payment-service";
import { NicepayGateway } from "./nicepay-protocol";
import { signNicepayConsent, verifyNicepayConsent } from "./nicepay-consent";
import { nicepayBrandSchema } from "@/domain/nicepay-method";
import { CAREER_AI_SINGLE_PRICE_KRW, CAREER_AI_COMBINED_PRICE_KRW } from "@/domain/builder-pricing";

export const careerScopeSchema = z.enum(["interest", "work_style", "work_values", "combined"]);
export type CareerScope = z.infer<typeof careerScopeSchema>;
export const careerNicepayRequestSchema = z.object({ scope: careerScopeSchema,
  payment: nicepayPaymentRequestSchema });
export const careerNicepayOrderSchema = nicepayOrderSchema.omit({ application_case_id: true, analysis_run_id: true, product: true, quote_snapshot: true, billing_order_id: true })
  .extend({ build_id: z.string().uuid(), scope: careerScopeSchema, product: z.literal("CAREER_AI") });
export type CareerNicepayOrder = z.infer<typeof careerNicepayOrderSchema>;
export const careerPrice = (scope: CareerScope) => scope === "combined" ? CAREER_AI_COMBINED_PRICE_KRW : CAREER_AI_SINGLE_PRICE_KRW;
export const careerCheckoutRef = (id: string) => `nicepay-career:${id}`;
export const careerReturnPath = (order: Pick<CareerNicepayOrder, "scope" | "build_id">, success = false) =>
  `/career/ai?scope=${order.scope}&career_ai_build=${order.build_id}${success ? "&checkout=success" : "&checkout=cancelled"}`;

export class CareerNicepayRepository implements NicepayOrderRepository<CareerNicepayOrder> {
  constructor(private readonly client = createNicepayServiceClient()) {}
  private async action(action: string, id: string, tid = "", proof = "") {
    const { data, error } = await this.client.rpc("career_nicepay_transition", { p_action: action, p_id: id, p_tid: tid, p_proof: proof });
    if (error) throw new Error("CAREER_NICEPAY_STATE_FAILED");
    return data;
  }
  async loadByMoid(moid: string) {
    const { data, error } = await this.client.from("career_nicepay_orders").select("*").eq("moid", moid).maybeSingle();
    if (error) throw new Error("CAREER_NICEPAY_READ_FAILED");
    return data ? careerNicepayOrderSchema.parse(data) : null;
  }
  async loadById(id: string, owner: string) {
    const { data, error } = await this.client.from("career_nicepay_orders").select("*").eq("id", id).eq("owner_user_id", owner).maybeSingle();
    if (error) throw new Error("CAREER_NICEPAY_READ_FAILED");
    return data ? careerNicepayOrderSchema.parse(data) : null;
  }
  async create(build: string, owner: string, scope: CareerScope, method: "CARD" | "EASYPAY") {
    if (!nicepayAvailableFor(owner)) throw new Error("NICEPAY_NOT_ENABLED");
    const id = randomUUID();
    const { data, error } = await this.client.rpc("create_career_nicepay_order", { p_id: id, p_build: build, p_owner: owner,
      p_scope: scope, p_amount: careerPrice(scope), p_mid: getNicepayPaymentConfig().mid, p_method: method,
      p_test: process.env.NICEPAY_PUBLIC_ENABLED !== "true" });
    if (error) throw new Error("CAREER_NICEPAY_CREATE_FAILED");
    return careerNicepayOrderSchema.parse(data);
  }
  async claimApproval(id: string, tid: string, hash: string) { return z.string().parse(await this.action("claim", id, tid, hash)); }
  async grant(id: string, tid: string, hash: string) { return z.enum(["GRANTED", "ALREADY_PAID", "CANCEL_REQUIRED"]).parse(await this.action("grant", id, tid, hash)); }
  async mark(id: string, status: "FAILED" | "REVIEW_REQUIRED", code: string) { await this.action(status, id, "", code); }
  async completeCancel(id: string, reference: string, hash: string) { return z.number().parse(await this.action("cancel", id, reference, hash)); }
  async claimRecovery(id: string) { return (await this.action("recover", id)) === true; }
}

export async function createCareerNicepayCheckout(build: string, owner: string, raw: unknown, origin: string) {
  const input = careerNicepayRequestSchema.parse(raw);
  const order = await new CareerNicepayRepository().create(build, owner, input.scope, input.payment.method);
  const { preferredPay, consent } = input.payment;
  const receipt = preferredPay && consent ? signNicepayConsent(order, preferredPay, consent) : undefined;
  return { checkoutId: careerCheckoutRef(order.id), checkoutUrl: `${new URL(origin).origin}/api/career-ai-builds/nicepay/window?id=${order.id}${preferredPay ? `&pay=${preferredPay}` : ""}${receipt ? `&consent=${encodeURIComponent(receipt)}` : ""}` };
}

export function renderCareerNicepayWindow(order: CareerNicepayOrder, origin: string, pay: string | null, receipt: string | null) {
  const preferred = nicepayBrandSchema.safeParse(pay);
  const consent = preferred.success ? verifyNicepayConsent(receipt, order, preferred.data) : undefined;
  // Reuse the exact provider form/controller and mandatory agreement handling.
  // Only our own route paths and product copy vary; provider UI remains untouched.
  return renderNicepayPurchaseWindow(order, origin, preferred.success ? preferred.data : undefined, consent)
    .replaceAll("/api/checkouts/nicepay", "/api/career-ai-builds/nicepay")
    .replaceAll("/analysis/prepare", careerReturnPath(order).replaceAll("&", "&amp;"))
    .replaceAll("더 나은 자기소개서로.", "나의 커리어를 더 깊이.")
    .replaceAll("자동으로 분석을 시작하고<br>자기소개서 첨삭을 진행합니다.", "자동으로 검사 결과의<br>심층해설을 시작합니다.")
    .replaceAll("분석을 자동으로 시작합니다.", "심층해설을 자동으로 시작합니다.")
    .replaceAll("CAREER_AI", "커리어 심층해설");
}

export async function checkCareerNicepayPayment(input: { checkoutId: string; buildId: string; userId: string; scope: CareerScope; price: number }) {
  const id = z.string().uuid().safeParse(input.checkoutId.slice("nicepay-career:".length));
  if (!input.checkoutId.startsWith("nicepay-career:") || !id.success) return { paid: false as const, reason: "NOT_PAID" as const };
  const repo = new CareerNicepayRepository();
  let order = await repo.loadById(id.data, input.userId);
  if (!order || order.build_id !== input.buildId || order.scope !== input.scope || order.amount !== input.price) return { paid: false as const, reason: "BUILD_MISMATCH" as const };
  if (order.status === "AUTHORIZING" || order.status === "REVIEW_REQUIRED") {
    await recoverNicepayOrder(order, repo, new NicepayGateway(getNicepayPaymentConfig()));
    order = await repo.loadById(id.data, input.userId);
  }
  return order?.status === "PAID" ? { paid: true as const } : { paid: false as const, reason: "NOT_PAID" as const };
}
