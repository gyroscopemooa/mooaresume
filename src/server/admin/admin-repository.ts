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
};

export async function listMailLog(limit = 200): Promise<AdminMailEntry[]> {
  const { data, error } = await serviceClient()
    .from("mail_send_log")
    .select("id, batch_id, recipient, subject, reply_to, status, error_message, sent_at")
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
}) {
  const rows = [
    ...input.sent.map((recipient) => ({ batch_id: input.batchId, recipient, subject: input.subject, reply_to: input.replyTo, status: "SENT", error_message: null })),
    ...input.failed.map((item) => ({ batch_id: input.batchId, recipient: item.to, subject: input.subject, reply_to: input.replyTo, status: "FAILED", error_message: item.error.slice(0, 500) })),
  ];
  if (rows.length === 0) return;
  const { error } = await serviceClient().from("mail_send_log").insert(rows);
  // The mail already went out; a failed log write must not read as a failed
  // send. Record it and move on.
  if (error) console.error("mail_send_log_insert_failed", error.message);
}
