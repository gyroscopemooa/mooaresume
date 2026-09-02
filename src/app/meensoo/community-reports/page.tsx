import { listCommunityReports } from "@/server/admin/admin-repository";
import { CommunityReportQueue } from "./report-queue";
export const dynamic = "force-dynamic";
export default async function CommunityReportsPage() { return <CommunityReportQueue initialReports={await listCommunityReports()} />; }