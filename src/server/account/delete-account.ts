type StorageError = { message: string } | null;

export type AccountDeletionClient = {
  storage: {
    from(bucket: string): {
      list(path: string, options?: { limit?: number }): PromiseLike<{ data: Array<{ name: string }> | null; error: StorageError }>;
      remove(paths: string[]): PromiseLike<{ data: unknown; error: StorageError }>;
    };
  };
  rpc(fn: "delete_account_preserving_billing", args: { p_user_id: string }): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type AccountDeletionErrorCode = "USER_REQUIRED" | "STORAGE_CLEANUP_FAILED" | "DATABASE_DELETION_FAILED";

export class AccountDeletionError extends Error {
  constructor(readonly code: AccountDeletionErrorCode, message: string) {
    super(message);
    this.name = "AccountDeletionError";
  }
}

// 사용자가 올린 파일이 들어가는 버킷. 파일은 `<user id>/...` 아래에 저장됩니다.
const USER_FILE_BUCKETS = ["community-attachments", "application-documents"] as const;
const LIST_PAGE_SIZE = 100;
const MAX_CLEANUP_ROUNDS = 50;

async function removeUserFiles(client: AccountDeletionClient, userId: string): Promise<void> {
  for (const bucket of USER_FILE_BUCKETS) {
    const files = client.storage.from(bucket);
    for (let round = 0; round < MAX_CLEANUP_ROUNDS; round += 1) {
      const listed = await files.list(userId, { limit: LIST_PAGE_SIZE });
      if (listed.error) throw new AccountDeletionError("STORAGE_CLEANUP_FAILED", `${bucket}: ${listed.error.message}`);
      const names = (listed.data ?? []).map((file) => file.name).filter(Boolean);
      if (names.length === 0) break;
      const removed = await files.remove(names.map((name) => `${userId}/${name}`));
      if (removed.error) throw new AccountDeletionError("STORAGE_CLEANUP_FAILED", `${bucket}: ${removed.error.message}`);
      if (round === MAX_CLEANUP_ROUNDS - 1) throw new AccountDeletionError("STORAGE_CLEANUP_FAILED", `${bucket}: files remain after cleanup`);
    }
  }
}

/**
 * 파일을 먼저 지우고, 그다음 DB를 한 트랜잭션으로 지웁니다.
 *
 * 순서의 이유: DB 쪽은 실패하면 전부 되돌아가지만 Storage는 되돌릴 수 없습니다.
 * 그래서 파일이 먼저이고, 파일 정리가 실패하면 DB는 손대지 않습니다 — 그러면
 * 재시도할 수 있습니다. 반대 순서라면 계정이 사라진 뒤 파일만 남는 주인 없는
 * 개인정보가 생깁니다. 파일을 지운 뒤 DB가 실패하면 계정은 그대로 남고 파일만
 * 없어지는데, 다시 시도하면 되므로 이쪽이 안전한 실패입니다.
 */
export async function deleteAccount(client: AccountDeletionClient, userId: string): Promise<{ retainedBillingOrders: number; retainedInterviewRetryOrders: number }> {
  if (!userId) throw new AccountDeletionError("USER_REQUIRED", "user id is required");

  await removeUserFiles(client, userId);

  const { data, error } = await client.rpc("delete_account_preserving_billing", { p_user_id: userId });
  if (error) throw new AccountDeletionError("DATABASE_DELETION_FAILED", error.message);

  const counts = (data ?? {}) as { retainedBillingOrders?: unknown; retainedInterviewRetryOrders?: unknown };
  return {
    retainedBillingOrders: typeof counts.retainedBillingOrders === "number" ? counts.retainedBillingOrders : 0,
    retainedInterviewRetryOrders: typeof counts.retainedInterviewRetryOrders === "number" ? counts.retainedInterviewRetryOrders : 0,
  };
}
