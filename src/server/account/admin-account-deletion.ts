import "server-only";

import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { serviceClient } from "@/server/admin/admin-repository";
import { sendManualEmail } from "@/server/notifications/manual-email";
import { ACCOUNT_DELETION_CONFIRMATION } from "@/lib/account-deletion";
import { AccountDeletionError, deleteAccount } from "./delete-account";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export type AccountDeletionRequestStatus =
  | "RECEIVED"
  | "NEEDS_ACCOUNT_EMAIL"
  | "READY"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type AdminAccountDeletionRequest = {
  id: string;
  source: "ADMIN_EMAIL" | "EMAIL_WEBHOOK" | "SELF_SERVICE";
  requesterEmail: string | null;
  accountEmail: string | null;
  userId: string | null;
  status: AccountDeletionRequestStatus;
  noticeStatus: "PENDING" | "SENT" | "FAILED" | "NOT_APPLICABLE";
  errorCode: string | null;
  deleteAttempts: number;
  requestedAt: string;
  completedAt: string | null;
};
export type AccountDeletionPreview = {
  userId: string;
  email: string;
  createdAt: string;
  applicationCases: number;
  documents: number;
  analyses: number;
  paidOrders: number;
  availableCredits: number;
};

type RequestRow = {
  id: string;
  source: AdminAccountDeletionRequest["source"];
  requester_email: string | null;
  account_email: string | null;
  user_id: string | null;
  status: AccountDeletionRequestStatus;
  notice_status: AdminAccountDeletionRequest["noticeStatus"];
  error_code: string | null;
  delete_attempts: number;
  requested_at: string;
  completed_at: string | null;
};

const REQUEST_FIELDS = "id, source, requester_email, account_email, user_id, status, notice_status, error_code, delete_attempts, requested_at, completed_at";

function toRequest(row: RequestRow): AdminAccountDeletionRequest {
  return {
    id: row.id,
    source: row.source,
    requesterEmail: row.requester_email,
    accountEmail: row.account_email,
    userId: row.user_id,
    status: row.status,
    noticeStatus: row.notice_status,
    errorCode: row.error_code,
    deleteAttempts: row.delete_attempts,
    requestedAt: row.requested_at,
    completedAt: row.completed_at,
  };
}

async function findUserByEmail(email: string): Promise<User | null> {
  const client = serviceClient();
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error) throw new Error(`AUTH_LIST_FAILED:${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1_000) return null;
  }
  throw new Error("AUTH_LIST_LIMIT_EXCEEDED");
}

async function exactCount(table: string, userId: string): Promise<number> {
  const { count, error } = await serviceClient().from(table).select("id", { count: "exact", head: true }).eq("owner_user_id", userId);
  if (error) throw new Error(`COUNT_FAILED:${table}:${error.message}`);
  return count ?? 0;
}

export async function previewAccountDeletion(accountEmail: string): Promise<AccountDeletionPreview | null> {
  const email = emailSchema.parse(accountEmail);
  const user = await findUserByEmail(email);
  if (!user?.email) return null;
  const [applicationCases, documents, analyses, paidOrders, availableCredits] = await Promise.all([
    exactCount("application_cases", user.id),
    exactCount("documents", user.id),
    exactCount("analysis_runs", user.id),
    exactCount("billing_orders", user.id),
    serviceClient().from("reward_credits").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).eq("status", "AVAILABLE")
      .then(({ count, error }) => { if (error) throw new Error(`COUNT_FAILED:reward_credits:${error.message}`); return count ?? 0; }),
  ]);
  return {
    userId: user.id,
    email: user.email,
    createdAt: user.created_at,
    applicationCases,
    documents,
    analyses,
    paidOrders,
    availableCredits,
  };
}

export async function listAccountDeletionRequests(limit = 200): Promise<AdminAccountDeletionRequest[]> {
  const { data, error } = await serviceClient()
    .from("account_deletion_requests")
    .select(REQUEST_FIELDS)
    .order("requested_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`DELETION_REQUEST_LIST_FAILED:${error.message}`);
  return ((data ?? []) as RequestRow[]).map(toRequest);
}

export async function countOpenAccountDeletionRequests(): Promise<number> {
  const { count, error } = await serviceClient()
    .from("account_deletion_requests")
    .select("id", { count: "exact", head: true })
    .in("status", ["RECEIVED", "NEEDS_ACCOUNT_EMAIL", "READY", "PROCESSING", "FAILED"]);
  if (error) throw new Error(`DELETION_REQUEST_COUNT_FAILED:${error.message}`);
  return count ?? 0;
}

export async function createAccountDeletionRequest(input: {
  requesterEmail: string;
  accountEmail?: string;
  source: "ADMIN_EMAIL" | "EMAIL_WEBHOOK";
  sourceMessageId?: string;
}): Promise<AdminAccountDeletionRequest> {
  const requesterEmail = emailSchema.parse(input.requesterEmail);
  const accountEmail = input.accountEmail ? emailSchema.parse(input.accountEmail) : requesterEmail;
  const user = await findUserByEmail(accountEmail);
  const row = {
    source: input.source,
    source_message_id: input.sourceMessageId?.trim() || null,
    requester_email: requesterEmail,
    account_email: user?.email?.toLowerCase() ?? accountEmail,
    user_id: user?.id ?? null,
    status: user ? "READY" : "NEEDS_ACCOUNT_EMAIL",
    updated_at: new Date().toISOString(),
  } as const;
  const query = serviceClient().from("account_deletion_requests").insert(row).select(REQUEST_FIELDS).single();
  const { data, error } = await query;
  if (error?.code === "23505" && input.sourceMessageId) {
    const existing = await serviceClient().from("account_deletion_requests").select(REQUEST_FIELDS).eq("source_message_id", input.sourceMessageId).single();
    if (existing.error || !existing.data) throw new Error(`DELETION_REQUEST_DUPLICATE_READ_FAILED:${existing.error?.message ?? "UNKNOWN"}`);
    return toRequest(existing.data as RequestRow);
  }
  if (error || !data) throw new Error(`DELETION_REQUEST_CREATE_FAILED:${error?.message ?? "UNKNOWN"}`);
  return toRequest(data as RequestRow);
}

export async function linkAccountDeletionRequest(requestId: string, accountEmail: string): Promise<{ request: AdminAccountDeletionRequest; preview: AccountDeletionPreview }> {
  const preview = await previewAccountDeletion(accountEmail);
  if (!preview) throw new Error("ACCOUNT_NOT_FOUND");
  const now = new Date().toISOString();
  const { data, error } = await serviceClient()
    .from("account_deletion_requests")
    .update({ account_email: preview.email.toLowerCase(), user_id: preview.userId, status: "READY", error_code: null, updated_at: now })
    .eq("id", requestId)
    .neq("status", "COMPLETED")
    .select(REQUEST_FIELDS)
    .single();
  if (error || !data) throw new Error(`DELETION_REQUEST_LINK_FAILED:${error?.message ?? "UNKNOWN"}`);
  return { request: toRequest(data as RequestRow), preview };
}

function completionMessage() {
  return {
    subject: "무아레쥬메 계정 삭제가 완료되었습니다",
    body: "안녕하세요. 무아레쥬메입니다.\n\n요청하신 계정과 관련 데이터 삭제가 완료되었습니다.\n감사합니다.",
  };
}

async function sendCompletionNotice(to: string) {
  const message = completionMessage();
  const result = await sendManualEmail({ to: [to], ...message });
  return result.messageIds[to] ?? null;
}

export async function executeAdminAccountDeletion(requestId: string, confirmation: string): Promise<{
  request: AdminAccountDeletionRequest;
  noticeSent: boolean;
  retainedBillingOrders: number;
  retainedInterviewRetryOrders: number;
}> {
  if (confirmation !== ACCOUNT_DELETION_CONFIRMATION) throw new Error("INVALID_CONFIRMATION");
  const client = serviceClient();
  const { data: raw, error: readError } = await client.from("account_deletion_requests").select(REQUEST_FIELDS).eq("id", requestId).single();
  if (readError || !raw) throw new Error("DELETION_REQUEST_NOT_FOUND");
  const request = toRequest(raw as RequestRow);
  if (!request.userId || !request.accountEmail || !["READY", "FAILED"].includes(request.status)) throw new Error("DELETION_REQUEST_NOT_READY");

  const { data: current, error: userError } = await client.auth.admin.getUserById(request.userId);
  if (userError || !current.user?.email || current.user.email.toLowerCase() !== request.accountEmail.toLowerCase()) throw new Error("ACCOUNT_IDENTITY_CHANGED");

  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await client.from("account_deletion_requests").update({
    status: "PROCESSING",
    error_code: null,
    processing_started_at: startedAt,
    updated_at: startedAt,
    delete_attempts: request.deleteAttempts + 1,
  }).eq("id", requestId).eq("status", request.status).select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("DELETION_REQUEST_ALREADY_PROCESSING");

  let retainedBillingOrders = 0;
  let retainedInterviewRetryOrders = 0;
  try {
    const result = await deleteAccount(client, request.userId);
    retainedBillingOrders = result.retainedBillingOrders;
    retainedInterviewRetryOrders = result.retainedInterviewRetryOrders;
  } catch (error) {
    const code = error instanceof AccountDeletionError ? error.code : "UNKNOWN";
    await client.from("account_deletion_requests").update({ status: "FAILED", error_code: code, updated_at: new Date().toISOString() }).eq("id", requestId);
    throw error;
  }

  let noticeProviderId: string | null = null;
  let noticeSent = false;
  try {
    noticeProviderId = await sendCompletionNotice(request.accountEmail);
    noticeSent = true;
  } catch {
    // 계정 삭제는 이미 끝났습니다. 메일 실패를 삭제 실패로 바꾸지 않고 별도 재시도 대상으로 둡니다.
  }

  const completedAt = new Date().toISOString();
  const update = {
    status: "COMPLETED",
    notice_status: noticeSent ? "SENT" : "FAILED",
    notice_provider_id: noticeProviderId,
    completed_at: completedAt,
    updated_at: completedAt,
    user_id: null,
    requester_email: noticeSent ? null : request.requesterEmail,
    account_email: noticeSent ? null : request.accountEmail,
  };
  const { data, error } = await client.from("account_deletion_requests").update(update).eq("id", requestId).select(REQUEST_FIELDS).single();
  if (error || !data) throw new Error(`DELETION_REQUEST_FINALIZE_FAILED:${error?.message ?? "UNKNOWN"}`);
  return { request: toRequest(data as RequestRow), noticeSent, retainedBillingOrders, retainedInterviewRetryOrders };
}

export async function retryAccountDeletionNotice(requestId: string): Promise<AdminAccountDeletionRequest> {
  const client = serviceClient();
  const { data: raw, error: readError } = await client.from("account_deletion_requests").select(REQUEST_FIELDS).eq("id", requestId).single();
  if (readError || !raw) throw new Error("DELETION_REQUEST_NOT_FOUND");
  const request = toRequest(raw as RequestRow);
  if (request.status !== "COMPLETED" || request.noticeStatus !== "FAILED" || !request.accountEmail) throw new Error("NOTICE_NOT_RETRYABLE");
  const providerId = await sendCompletionNotice(request.accountEmail);
  const { data, error } = await client.from("account_deletion_requests").update({
    notice_status: "SENT",
    notice_provider_id: providerId,
    requester_email: null,
    account_email: null,
    updated_at: new Date().toISOString(),
  }).eq("id", requestId).select(REQUEST_FIELDS).single();
  if (error || !data) throw new Error(`NOTICE_FINALIZE_FAILED:${error?.message ?? "UNKNOWN"}`);
  return toRequest(data as RequestRow);
}

export const accountDeletionAdminInput = {
  create: z.object({ action: z.literal("CREATE"), requesterEmail: emailSchema, accountEmail: emailSchema.optional() }),
  link: z.object({ action: z.literal("LINK"), requestId: z.string().uuid(), accountEmail: emailSchema }),
  preview: z.object({ action: z.literal("PREVIEW"), accountEmail: emailSchema }),
  execute: z.object({ action: z.literal("EXECUTE"), requestId: z.string().uuid(), confirmation: z.string() }),
  retryNotice: z.object({ action: z.literal("RETRY_NOTICE"), requestId: z.string().uuid() }),
};
