import { isAdmin } from "@/server/admin/admin-session";
import { listMentorApplications } from "@/server/mentor-pool/repository";
import { MentorPoolQueue } from "./queue";

export const dynamic = "force-dynamic";
export default async function MentorPoolAdminPage() {
  // Gate at the data boundary as well as layout: parallel RSC rendering must
  // never start a privileged query for an unauthenticated child page.
  if (!await isAdmin()) return null;
  let records;
  try { records = await listMentorApplications(); }
  catch { return <div role="alert">모집 기록을 불러오지 못했습니다. 멘토 모집 마이그레이션과 서버 연결을 확인해 주세요. 신청이 0건이라는 뜻은 아닙니다.</div>; }
  return <MentorPoolQueue records={records} />;
}
