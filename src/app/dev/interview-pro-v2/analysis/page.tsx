import { notFound } from "next/navigation";
import { isAdmin } from "@/server/admin/admin-session";
import { InterviewAnalysisWorkbench } from "@/components/interview-prototype/analysis-workbench";

export const dynamic = "force-dynamic";
export default async function InterviewAnalysisPage() {
  if (process.env.NODE_ENV !== "development" || !(await isAdmin())) notFound();
  return <InterviewAnalysisWorkbench />;
}
