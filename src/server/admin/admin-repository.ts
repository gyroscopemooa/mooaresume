import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * Read side of the admin console.
 *
 * Uses the secret key because every screen here crosses account boundaries —
 * RLS exists precisely so a signed-in user cannot see another applicant's
 * letter, and the operator view is the one legitimate exception. Nothing in
 * this file is reachable without `isAdmin()` passing first.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

function serviceClient() {
  const env = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Addresses live in `auth.users`, which PostgREST does not expose, so they
 * cannot be joined in SQL. One admin listing per page load beats one call per
 * row; at this stage the whole user table fits in a single page.
 */
async function emailsByUserId() {
  const { data, error } = await serviceClient().auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (error) return new Map<string, string>();
  return new Map(data.users.map((user) => [user.id, user.email ?? ""]));
}

type EmbeddedCase = { title?: string; company_name?: string; role_name?: string } | null;

/**
 * Which Polar account an order came from, if it was recorded.
 *
 * Orders written before this was tracked have no marker, and there is nothing
 * in the row to recover it from — sandbox and production ids look alike. They
 * are reported as UNKNOWN rather than folded into either side, because
 * guessing here would put fake money in the revenue figure.
 */
export type OrderEnvironment = "production" | "sandbox" | "unknown";

function readEnvironment(metadata: unknown): OrderEnvironment {
  const value = metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>).polarEnvironment
    : undefined;
  return value === "production" || value === "sandbox" ? value : "unknown";
}

/** Money actually taken: a real account, and an amount above zero. */
export function isRealRevenue(purchase: { status: string; environment: OrderEnvironment; amount: number }) {
  return purchase.status === "PAID" && purchase.environment === "production" && purchase.amount > 0;
}

export type AdminPurchase = {
  id: string;
  orderId: string;
  checkoutId: string | null;
  email: string;
  product: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  refundedAt: string | null;
  caseTitle: string | null;
  companyName: string | null;
  roleName: string | null;
  applicationCaseId: string;
  environment: OrderEnvironment;
};

export async function listPurchases(limit = 100): Promise<AdminPurchase[]> {
  const [{ data, error }, emails] = await Promise.all([
    serviceClient()
      .from("billing_orders")
      .select("id, provider_order_id, provider_checkout_id, owner_user_id, product, amount, currency, status, paid_at, refunded_at, application_case_id, metadata, application_cases(title, company_name, role_name)")
      .order("paid_at", { ascending: false })
      .limit(limit),
    emailsByUserId(),
  ]);
  if (error || !data) return [];
  return data.map((row) => {
    const applicationCase = row.application_cases as unknown as EmbeddedCase;
    return {
      id: row.id as string,
      orderId: row.provider_order_id as string,
      checkoutId: (row.provider_checkout_id as string | null) ?? null,
      email: emails.get(row.owner_user_id as string) ?? "(알 수 없음)",
      product: row.product as string,
      amount: row.amount as number,
      currency: row.currency as string,
      status: row.status as string,
      paidAt: row.paid_at as string,
      refundedAt: (row.refunded_at as string | null) ?? null,
      caseTitle: applicationCase?.title ?? null,
      companyName: applicationCase?.company_name ?? null,
      roleName: applicationCase?.role_name ?? null,
      applicationCaseId: row.application_case_id as string,
      environment: readEnvironment(row.metadata),
    };
  });
}

export type AdminAnalysis = {
  id: string;
  email: string;
  product: string;
  writingMode: string;
  status: string;
  attemptCount: number;
  failureCode: string | null;
  model: string | null;
  promptVersion: string | null;
  totalTokens: number | null;
  createdAt: string;
  completedAt: string | null;
  caseTitle: string | null;
  companyName: string | null;
  hasResult: boolean;
};

export async function listAnalyses(limit = 100): Promise<AdminAnalysis[]> {
  const [{ data, error }, emails] = await Promise.all([
    serviceClient()
      .from("analysis_runs")
      .select("id, owner_user_id, product, writing_mode, status, attempt_count, failure_code, model, prompt_version, total_tokens, created_at, completed_at, application_cases(title, company_name), analysis_results(id)")
      .order("created_at", { ascending: false })
      .limit(limit),
    emailsByUserId(),
  ]);
  if (error || !data) return [];
  return data.map((row) => {
    const applicationCase = row.application_cases as unknown as EmbeddedCase;
    const results = row.analysis_results as unknown as unknown[] | { id: string } | null;
    return {
      id: row.id as string,
      email: emails.get(row.owner_user_id as string) ?? "(알 수 없음)",
      product: row.product as string,
      writingMode: row.writing_mode as string,
      status: row.status as string,
      attemptCount: (row.attempt_count as number) ?? 0,
      failureCode: (row.failure_code as string | null) ?? null,
      model: (row.model as string | null) ?? null,
      promptVersion: (row.prompt_version as string | null) ?? null,
      totalTokens: (row.total_tokens as number | null) ?? null,
      createdAt: row.created_at as string,
      completedAt: (row.completed_at as string | null) ?? null,
      caseTitle: applicationCase?.title ?? null,
      companyName: applicationCase?.company_name ?? null,
      hasResult: Array.isArray(results) ? results.length > 0 : Boolean(results),
    };
  });
}

export type AdminAnalysisDetail = {
  run: AdminAnalysis;
  resultData: unknown | null;
  targetLength: number | null;
  writingStyle: string | null;
};

export async function getAnalysis(analysisRunId: string): Promise<AdminAnalysisDetail | null> {
  const client = serviceClient();
  const [{ data: run, error }, { data: result }, emails] = await Promise.all([
    client
      .from("analysis_runs")
      .select("id, owner_user_id, product, writing_mode, writing_style, target_length, status, attempt_count, failure_code, model, prompt_version, total_tokens, created_at, completed_at, application_cases(title, company_name)")
      .eq("id", analysisRunId)
      .maybeSingle(),
    client.from("analysis_results").select("result_data").eq("analysis_run_id", analysisRunId).maybeSingle(),
    emailsByUserId(),
  ]);
  if (error || !run) return null;
  const applicationCase = run.application_cases as unknown as EmbeddedCase;
  return {
    run: {
      id: run.id as string,
      email: emails.get(run.owner_user_id as string) ?? "(알 수 없음)",
      product: run.product as string,
      writingMode: run.writing_mode as string,
      status: run.status as string,
      attemptCount: (run.attempt_count as number) ?? 0,
      failureCode: (run.failure_code as string | null) ?? null,
      model: (run.model as string | null) ?? null,
      promptVersion: (run.prompt_version as string | null) ?? null,
      totalTokens: (run.total_tokens as number | null) ?? null,
      createdAt: run.created_at as string,
      completedAt: (run.completed_at as string | null) ?? null,
      caseTitle: applicationCase?.title ?? null,
      companyName: applicationCase?.company_name ?? null,
      hasResult: Boolean(result?.result_data),
    },
    resultData: result?.result_data ?? null,
    targetLength: (run.target_length as number | null) ?? null,
    writingStyle: (run.writing_style as string | null) ?? null,
  };
}

export type AdminMailEntry = {
  id: string;
  batchId: string;
  recipient: string;
  subject: string;
  replyTo: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  /** What was actually written. Null on rows saved before the body was kept. */
  body: string | null;
  attachmentNames: string[];
  /** Resend's id for this message. Null on failures and on rows saved before it was kept. */
  providerMessageId: string | null;
  campaignId: string | null;
};

export async function listMailLog(limit = 200): Promise<AdminMailEntry[]> {
  const { data, error } = await serviceClient()
    .from("mail_send_log")
    .select("id, batch_id, recipient, subject, reply_to, status, error_message, sent_at, body, attachment_names, provider_message_id, campaign_id")
    .order("sent_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    batchId: row.batch_id as string,
    recipient: row.recipient as string,
    subject: row.subject as string,
    replyTo: (row.reply_to as string | null) ?? null,
    status: row.status as string,
    errorMessage: (row.error_message as string | null) ?? null,
    sentAt: row.sent_at as string,
    body: (row.body as string | null) ?? null,
    providerMessageId: (row.provider_message_id as string | null) ?? null,
    campaignId: (row.campaign_id as string | null) ?? null,
    attachmentNames: (row.attachment_names as string[] | null) ?? [],
  }));
}

export type AdminInquiry = {
  id: string;
  name: string | null;
  email: string;
  category: string | null;
  message: string;
  status: string;
  adminNote: string | null;
  answeredAt: string | null;
  createdAt: string;
};

export async function listInquiries(limit = 200): Promise<AdminInquiry[]> {
  const { data, error } = await serviceClient()
    .from("contact_inquiries")
    .select("id, name, email, category, message, status, admin_note, answered_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: (row.name as string | null) ?? null,
    email: row.email as string,
    category: (row.category as string | null) ?? null,
    message: row.message as string,
    status: row.status as string,
    adminNote: (row.admin_note as string | null) ?? null,
    answeredAt: (row.answered_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export type AdminWaitlistEntry = { id: string; email: string; source: string; createdAt: string };

export async function listWaitlist(limit = 500): Promise<AdminWaitlistEntry[]> {
  const { data, error } = await serviceClient()
    .from("waitlist_signups")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    source: row.source as string,
    createdAt: row.created_at as string,
  }));
}

export type AdminSummary = {
  paidOrders: number;
  refundedOrders: number;
  revenueKrw: number;
  realOrders: number;
  freeOrders: number;
  sandboxOrders: number;
  unknownOrders: number;
  analysesTotal: number;
  analysesCompleted: number;
  analysesFailed: number;
  analysesInFlight: number;
  waitlist: number;
  newInquiries: number;
  mailSent7d: number;
  mailFailed7d: number;
};

export async function getSummary(): Promise<AdminSummary> {
  const client = serviceClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000).toISOString();
  const countOnly = { count: "exact" as const, head: true };

  const [orders, analyses, waitlist, inquiries, mailSent, mailFailed] = await Promise.all([
    client.from("billing_orders").select("amount, status, metadata"),
    client.from("analysis_runs").select("status"),
    client.from("waitlist_signups").select("id", countOnly),
    client.from("contact_inquiries").select("id", countOnly).eq("status", "NEW"),
    client.from("mail_send_log").select("id", countOnly).eq("status", "SENT").gte("sent_at", since),
    client.from("mail_send_log").select("id", countOnly).eq("status", "FAILED").gte("sent_at", since),
  ]);

  const orderRows = ((orders.data ?? []) as { amount: number; status: string; metadata: unknown }[])
    .map((row) => ({ ...row, environment: readEnvironment(row.metadata) }));
  const runRows = (analyses.data ?? []) as { status: string }[];
  const paid = orderRows.filter((row) => row.status === "PAID");
  const real = paid.filter(isRealRevenue);

  return {
    paidOrders: paid.length,
    refundedOrders: orderRows.filter((row) => row.status === "REFUNDED").length,
    // Only money that was really taken. A refund is not revenue, a 100%-off
    // code brings in nothing, and a sandbox order is not money at all — all
    // three would otherwise flatter this number, and at launch they are most
    // of it.
    revenueKrw: real.reduce((total, row) => total + row.amount, 0),
    realOrders: real.length,
    freeOrders: paid.filter((row) => row.amount === 0).length,
    sandboxOrders: paid.filter((row) => row.environment === "sandbox").length,
    unknownOrders: paid.filter((row) => row.environment === "unknown").length,
    analysesTotal: runRows.length,
    analysesCompleted: runRows.filter((row) => row.status === "COMPLETED").length,
    analysesFailed: runRows.filter((row) => row.status === "FAILED").length,
    analysesInFlight: runRows.filter((row) => row.status === "PENDING" || row.status === "RUNNING").length,
    waitlist: waitlist.count ?? 0,
    newInquiries: inquiries.count ?? 0,
    mailSent7d: mailSent.count ?? 0,
    mailFailed7d: mailFailed.count ?? 0,
  };
}

export async function recordMailSends(input: {
  batchId: string;
  subject: string;
  replyTo: string | null;
  sent: string[];
  failed: { to: string; error: string }[];
  /** Trimmed to the column's ceiling so an oversized body cannot fail the whole insert. */
  body?: string;
  attachmentNames?: string[];
  /** 제공자 식별자. 배달 확인은 이 값으로만 이어집니다. */
  providerMessageIds?: Record<string, string>;
  /** 협업 기관 메일이면 어느 캠페인이었는지. */
  campaignId?: string | null;
}) {
  const shared = {
    batch_id: input.batchId,
    subject: input.subject,
    reply_to: input.replyTo,
    body: input.body?.slice(0, 50_000) ?? null,
    attachment_names: input.attachmentNames?.length ? input.attachmentNames : null,
    campaign_id: input.campaignId ?? null,
  };
  const rows = [
    ...input.sent.map((recipient) => ({ ...shared, recipient, status: "SENT", error_message: null, provider_message_id: input.providerMessageIds?.[recipient] ?? null })),
    ...input.failed.map((item) => ({ ...shared, recipient: item.to, status: "FAILED", error_message: item.error.slice(0, 500), provider_message_id: null })),
  ];
  if (rows.length === 0) return;
  const { error } = await serviceClient().from("mail_send_log").insert(rows);
  // The mail already went out; a failed log write must not read as a failed
  // send. Record it and move on.
  if (error) console.error("mail_send_log_insert_failed", error.message);
}

export type AdminRewardCredit = {
  id: string;
  product: string;
  reason: string;
  note: string | null;
  recipientEmail: string;
  status: string;
  claimToken: string;
  expiresAt: string | null;
  createdAt: string;
  claimedAt: string | null;
  consumedAt: string | null;
};

export async function listRewardCredits(limit = 200): Promise<AdminRewardCredit[]> {
  const { data, error } = await serviceClient()
    .from("reward_credits")
    .select("id, product, reason, note, recipient_email, status, claim_token, expires_at, created_at, claimed_at, consumed_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    product: row.product as string,
    reason: row.reason as string,
    note: (row.note as string | null) ?? null,
    recipientEmail: row.recipient_email as string,
    status: row.status as string,
    claimToken: row.claim_token as string,
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: row.created_at as string,
    claimedAt: (row.claimed_at as string | null) ?? null,
    consumedAt: (row.consumed_at as string | null) ?? null,
  }));
}

/**
 * Issues credits for a list of addresses.
 *
 * Inserted in one statement so a partial issue cannot happen: with twenty
 * addresses and a failure at the twelfth, an operator has no way to tell who
 * already has one, and re-running would double up on the first eleven.
 */
export async function issueRewardCredits(input: {
  emails: string[];
  product: string;
  reason: string;
  note: string | null;
  allowedCharacters: number;
  expiresAt: string | null;
  tokens: string[];
}): Promise<{ issued: AdminRewardCredit[]; error: string | null }> {
  const rows = input.emails.map((email, index) => ({
    product: input.product,
    reason: input.reason,
    note: input.note,
    recipient_email: email,
    claim_token: input.tokens[index],
    allowed_characters: input.allowedCharacters,
    expires_at: input.expiresAt,
  }));
  const { data, error } = await serviceClient()
    .from("reward_credits")
    .insert(rows)
    .select("id, product, reason, note, recipient_email, status, claim_token, expires_at, created_at, claimed_at, consumed_at");
  if (error || !data) return { issued: [], error: error?.message ?? "UNKNOWN_ERROR" };
  return {
    issued: data.map((row) => ({
      id: row.id as string,
      product: row.product as string,
      reason: row.reason as string,
      note: (row.note as string | null) ?? null,
      recipientEmail: row.recipient_email as string,
      status: row.status as string,
      claimToken: row.claim_token as string,
      expiresAt: (row.expires_at as string | null) ?? null,
      createdAt: row.created_at as string,
      claimedAt: (row.claimed_at as string | null) ?? null,
      consumedAt: (row.consumed_at as string | null) ?? null,
    })),
    error: null,
  };
}

export type ResearchCorpusRow = {
  id: string;
  product: string;
  writingMode: string;
  editingStance: string;
  targetCompany: string | null;
  targetRole: string | null;
  readinessScore: number | null;
  findings: Array<{ kind: string; category?: string; severity?: string; note: string }>;
  outcomeStatus: string | null;
  createdAt: string;
};

/**
 * Everything kept for research, with the outcome joined on.
 *
 * Read whole rather than aggregated in SQL: the corpus is small for a long
 * while yet, and every grouping question is still changing shape weekly. When
 * it stops changing — and stops fitting in memory — the counting moves into a
 * view. Not before.
 */
export async function listResearchCorpus(limit = 1000): Promise<ResearchCorpusRow[]> {
  const { data, error } = await serviceClient()
    .from("research_corpus")
    .select("id, product, writing_mode, editing_stance, target_company, target_role, readiness_score, findings, outcome_status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    product: row.product as string,
    writingMode: row.writing_mode as string,
    editingStance: row.editing_stance as string,
    targetCompany: (row.target_company as string | null) ?? null,
    targetRole: (row.target_role as string | null) ?? null,
    readinessScore: (row.readiness_score as number | null) ?? null,
    findings: (row.findings as ResearchCorpusRow["findings"] | null) ?? [],
    outcomeStatus: (row.outcome_status as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export type AdminCouponCode = {
  id: string;
  campaignId: string | null;
  code: string;
  label: string;
  partnerName: string;
  product: string;
  allowedCharacters: number;
  totalCount: number;
  claimedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  subtitleText: string;
  benefitText: string;
  audienceText: string;
  usageText: string;
  footnoteText: string;
  revokedAt: string | null;
  createdAt: string;
};

const COUPON_FIELDS =
  "id, campaign_id, code, label, partner_name, product, allowed_characters, total_count, claimed_count, starts_at, expires_at, subtitle_text, benefit_text, audience_text, usage_text, footnote_text, revoked_at, created_at";

function toCouponCode(row: Record<string, unknown>): AdminCouponCode {
  return {
    id: row.id as string,
    campaignId: (row.campaign_id as string | null) ?? null,
    code: row.code as string,
    label: row.label as string,
    partnerName: row.partner_name as string,
    product: row.product as string,
    allowedCharacters: row.allowed_characters as number,
    totalCount: row.total_count as number,
    claimedCount: row.claimed_count as number,
    startsAt: (row.starts_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    subtitleText: row.subtitle_text as string,
    benefitText: row.benefit_text as string,
    audienceText: row.audience_text as string,
    usageText: row.usage_text as string,
    footnoteText: row.footnote_text as string,
    revokedAt: (row.revoked_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listCouponCodes(limit = 100): Promise<AdminCouponCode[]> {
  const { data, error } = await serviceClient()
    .from("coupon_codes")
    .select(COUPON_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => toCouponCode(row as Record<string, unknown>));
}

/**
 * 협업 배포용 코드 하나를 만듭니다.
 *
 * The pamphlet strings are stored with the code rather than typed again at
 * print time. A leaflet that says something the code does not do is worse than
 * no leaflet, and the only way to keep them in step is to keep them together.
 */
export async function createCouponCode(input: {
  code: string;
  label: string;
  partnerName: string;
  product: string;
  allowedCharacters: number;
  totalCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  subtitleText: string;
  benefitText: string;
  audienceText: string;
  usageText: string;
  footnoteText: string;
}): Promise<{ coupon: AdminCouponCode | null; error: string | null }> {
  const { data, error } = await serviceClient()
    .from("coupon_codes")
    .insert({
      code: input.code.trim().toUpperCase(),
      label: input.label,
      partner_name: input.partnerName,
      product: input.product,
      allowed_characters: input.allowedCharacters,
      total_count: input.totalCount,
      subtitle_text: input.subtitleText,
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
      benefit_text: input.benefitText,
      audience_text: input.audienceText,
      usage_text: input.usageText,
      footnote_text: input.footnoteText,
    })
    .select(COUPON_FIELDS)
    .single();
  // 23505 is the unique violation on `code`. Naming it beats "저장하지
  // 못했습니다" — the operator only has to pick a different word.
  if (error) return { coupon: null, error: error.code === "23505" ? "이미 있는 코드입니다. 다른 코드로 만들어 주세요." : `${error.code ?? "UNKNOWN"} · ${error.message}` };
  return { coupon: toCouponCode(data as Record<string, unknown>), error: null };
}

/** 배포를 멈춥니다. 이미 등록한 사람의 이용권은 그대로 둡니다. */
export async function revokeCouponCode(id: string): Promise<string | null> {
  const { error } = await serviceClient()
    .from("coupon_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  return error ? `${error.code ?? "UNKNOWN"} · ${error.message}` : null;
}

export type AdminCampaign = {
  id: string;
  partnerName: string;
  name: string;
  product: string;
  benefitType: string;
  benefitAmount: number | null;
  allowedCharacters: number;
  perUserLimit: number;
  startsAt: string | null;
  expiresAt: string | null;
  description: string | null;
  notice: string | null;
  subtitleText: string;
  benefitText: string;
  audienceText: string;
  usageText: string;
  footnoteText: string;
  archivedAt: string | null;
  createdAt: string;
  /** 코드 현황. 목록 화면이 캠페인마다 한 번 더 물어보지 않게 함께 담습니다. */
  totalCodes: number;
  usedCodes: number;
  expiredCodes: number;
};

const CAMPAIGN_FIELDS =
  "id, partner_name, name, product, benefit_type, benefit_amount, allowed_characters, per_user_limit, starts_at, expires_at, description, notice, subtitle_text, benefit_text, audience_text, usage_text, footnote_text, archived_at, created_at";

function toCampaign(row: Record<string, unknown>, counts: { total: number; used: number; expired: number }): AdminCampaign {
  return {
    id: row.id as string,
    partnerName: row.partner_name as string,
    name: row.name as string,
    product: row.product as string,
    benefitType: row.benefit_type as string,
    benefitAmount: (row.benefit_amount as number | null) ?? null,
    allowedCharacters: row.allowed_characters as number,
    perUserLimit: row.per_user_limit as number,
    startsAt: (row.starts_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    notice: (row.notice as string | null) ?? null,
    subtitleText: row.subtitle_text as string,
    benefitText: row.benefit_text as string,
    audienceText: row.audience_text as string,
    usageText: row.usage_text as string,
    footnoteText: row.footnote_text as string,
    archivedAt: (row.archived_at as string | null) ?? null,
    createdAt: row.created_at as string,
    totalCodes: counts.total,
    usedCodes: counts.used,
    expiredCodes: counts.expired,
  };
}

export async function listCampaigns(limit = 100): Promise<AdminCampaign[]> {
  const client = serviceClient();
  const { data, error } = await client
    .from("coupon_campaigns")
    .select(CAMPAIGN_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  // 코드 현황을 한 번에 읽어 캠페인마다 붙입니다. 캠페인 수만큼 질의하면
  // 목록 한 장에 스무 번을 묻게 됩니다.
  const ids = data.map((row) => row.id as string);
  const { data: codes } = await client
    .from("coupon_codes")
    .select("campaign_id, claimed_count, max_uses, expires_at")
    .in("campaign_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const now = Date.now();
  const tally = new Map<string, { total: number; used: number; expired: number }>();
  for (const code of codes ?? []) {
    const key = code.campaign_id as string;
    const entry = tally.get(key) ?? { total: 0, used: 0, expired: 0 };
    entry.total += 1;
    if ((code.claimed_count as number) >= (code.max_uses as number)) entry.used += 1;
    else if (code.expires_at && new Date(code.expires_at as string).getTime() < now) entry.expired += 1;
    tally.set(key, entry);
  }
  return data.map((row) => toCampaign(row as Record<string, unknown>, tally.get(row.id as string) ?? { total: 0, used: 0, expired: 0 }));
}

export async function getCampaignCodes(campaignId: string): Promise<AdminCouponCode[]> {
  const { data, error } = await serviceClient()
    .from("coupon_codes")
    .select(COUPON_FIELDS)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => toCouponCode(row as Record<string, unknown>));
}

/**
 * 캠페인 하나와 그 아래 고유 코드 N장을 만듭니다.
 *
 * 코드는 한 번에 insert합니다. 스무 장 중 열두 번째에서 실패하면 어디까지
 * 나갔는지 알 수 없고, 다시 돌리면 앞의 열한 장이 중복됩니다.
 */
export async function createCampaign(input: {
  partnerName: string;
  name: string;
  product: string;
  benefitType: string;
  benefitAmount: number | null;
  allowedCharacters: number;
  perUserLimit: number;
  totalCount: number;
  codePrefix: string;
  startsAt: string | null;
  expiresAt: string | null;
  description: string | null;
  notice: string | null;
  subtitleText: string;
  benefitText: string;
  audienceText: string;
  usageText: string;
  footnoteText: string;
  codes: string[];
}): Promise<{ campaign: AdminCampaign | null; error: string | null }> {
  const client = serviceClient();
  const { data, error } = await client
    .from("coupon_campaigns")
    .insert({
      partner_name: input.partnerName,
      name: input.name,
      product: input.product,
      benefit_type: input.benefitType,
      benefit_amount: input.benefitAmount,
      allowed_characters: input.allowedCharacters,
      per_user_limit: input.perUserLimit,
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
      description: input.description,
      notice: input.notice,
      subtitle_text: input.subtitleText,
      benefit_text: input.benefitText,
      audience_text: input.audienceText,
      usage_text: input.usageText,
      footnote_text: input.footnoteText,
    })
    .select(CAMPAIGN_FIELDS)
    .single();
  if (error || !data) return { campaign: null, error: `${error?.code ?? "UNKNOWN"} · ${error?.message ?? "캠페인을 만들지 못했습니다."}` };

  const campaignId = data.id as string;
  const rows = input.codes.map((code) => ({
    campaign_id: campaignId,
    code,
    label: input.name,
    partner_name: input.partnerName,
    product: input.product,
    allowed_characters: input.allowedCharacters,
    // 고유 코드는 1회용입니다. total_count는 기존 제약이 요구하는 값이라 맞춰 둡니다.
    total_count: 1,
    max_uses: 1,
    starts_at: input.startsAt,
    expires_at: input.expiresAt,
    subtitle_text: input.subtitleText,
    benefit_text: input.benefitText,
    audience_text: input.audienceText,
    usage_text: input.usageText,
    footnote_text: input.footnoteText,
  }));
  const { error: codeError } = await client.from("coupon_codes").insert(rows);
  if (codeError) {
    // 코드 없는 캠페인은 쓸모가 없고, 남겨 두면 다음에 같은 이름으로 다시
    // 만들 때 헷갈립니다.
    await client.from("coupon_campaigns").delete().eq("id", campaignId);
    return { campaign: null, error: codeError.code === "23505" ? "코드가 겹쳤습니다. 다시 시도해 주세요." : `${codeError.code ?? "UNKNOWN"} · ${codeError.message}` };
  }
  return { campaign: toCampaign(data as Record<string, unknown>, { total: rows.length, used: 0, expired: 0 }), error: null };
}

export async function archiveCampaign(id: string): Promise<string | null> {
  const { error } = await serviceClient()
    .from("coupon_campaigns")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  return error ? `${error.code ?? "UNKNOWN"} · ${error.message}` : null;
}
