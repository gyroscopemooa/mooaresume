import { listAccountDeletionRequests } from "@/server/account/admin-account-deletion";
import { AccountDeletionQueue } from "./account-deletion-queue";

export const dynamic = "force-dynamic";

export default async function AccountDeletionsPage() {
  let requests = [] as Awaited<ReturnType<typeof listAccountDeletionRequests>>;
  let loadError = "";
  try {
    requests = await listAccountDeletionRequests(200);
  } catch {
    loadError = "요청 목록을 읽지 못했습니다. 계정 삭제 관리 마이그레이션 적용 여부를 확인해 주세요.";
  }
  return <AccountDeletionQueue initialRequests={requests} loadError={loadError} />;
}
