import { describe, expect, it, vi } from "vitest";
import { AccountDeletionError, deleteAccount, type AccountDeletionClient } from "./delete-account";

const USER = "11111111-1111-1111-1111-111111111111";

function fakeClient(options: { files?: Record<string, string[]>; listError?: string; removeError?: string; rpcError?: string; rpcData?: unknown } = {}) {
  const files = new Map(Object.entries(options.files ?? {}).map(([bucket, names]) => [bucket, [...names]]));
  const calls: string[] = [];
  const client: AccountDeletionClient = {
    storage: {
      from(bucket) {
        return {
          async list() {
            calls.push(`list:${bucket}`);
            if (options.listError) return { data: null, error: { message: options.listError } };
            return { data: (files.get(bucket) ?? []).map((name) => ({ name })), error: null };
          },
          async remove(paths) {
            calls.push(`remove:${bucket}:${paths.join(",")}`);
            if (options.removeError) return { data: null, error: { message: options.removeError } };
            const names = new Set(paths.map((path) => path.slice(USER.length + 1)));
            files.set(bucket, (files.get(bucket) ?? []).filter((name) => !names.has(name)));
            return { data: null, error: null };
          },
        };
      },
    },
    async rpc(fn, args) {
      calls.push(`rpc:${fn}:${args.p_user_id}`);
      if (options.rpcError) return { data: null, error: { message: options.rpcError } };
      return { data: options.rpcData ?? { retainedBillingOrders: 2, retainedInterviewRetryOrders: 1 }, error: null };
    },
  };
  return { client, calls };
}

describe("deleteAccount", () => {
  it("removes the user's files under their own folder, then runs the database deletion", async () => {
    const { client, calls } = fakeClient({ files: { "community-attachments": ["a.png", "b.pdf"] } });
    const result = await deleteAccount(client, USER);
    expect(calls).toContain(`remove:community-attachments:${USER}/a.png,${USER}/b.pdf`);
    expect(calls[calls.length - 1]).toBe(`rpc:delete_account_preserving_billing:${USER}`);
    expect(result).toEqual({ retainedBillingOrders: 2, retainedInterviewRetryOrders: 1 });
  });

  it("does not touch the database when file cleanup fails, so the request can be retried", async () => {
    const { client, calls } = fakeClient({ files: { "community-attachments": ["a.png"] }, removeError: "boom" });
    await expect(deleteAccount(client, USER)).rejects.toMatchObject({ code: "STORAGE_CLEANUP_FAILED" });
    expect(calls.some((call) => call.startsWith("rpc:"))).toBe(false);
  });

  it("does not touch the database when listing files fails", async () => {
    const { client, calls } = fakeClient({ listError: "denied" });
    await expect(deleteAccount(client, USER)).rejects.toMatchObject({ code: "STORAGE_CLEANUP_FAILED" });
    expect(calls.some((call) => call.startsWith("rpc:"))).toBe(false);
  });

  it("surfaces a database failure as DATABASE_DELETION_FAILED", async () => {
    const { client } = fakeClient({ rpcError: "violates foreign key" });
    await expect(deleteAccount(client, USER)).rejects.toMatchObject({ code: "DATABASE_DELETION_FAILED" });
  });

  it("refuses an empty user id before doing anything", async () => {
    const { client, calls } = fakeClient();
    const attempt = deleteAccount(client, "");
    await expect(attempt).rejects.toBeInstanceOf(AccountDeletionError);
    expect(calls).toEqual([]);
  });

  it("stops looping if files never disappear", async () => {
    const list = vi.fn(async () => ({ data: [{ name: "stuck.png" }], error: null }));
    const client: AccountDeletionClient = {
      storage: { from: () => ({ list, remove: async () => ({ data: null, error: null }) }) },
      rpc: async () => ({ data: {}, error: null }),
    };
    await expect(deleteAccount(client, USER)).rejects.toMatchObject({ code: "STORAGE_CLEANUP_FAILED" });
    expect(list.mock.calls.length).toBeLessThanOrEqual(50);
  });
});
