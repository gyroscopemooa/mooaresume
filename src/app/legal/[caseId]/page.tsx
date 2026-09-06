import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalCaseWorkspace } from "@/components/legal-case-workspace";
import { listLegalCaseDocuments, listLegalCaseMaterials, loadLegalCase } from "@/server/legal/legal-case-repository";

/**
 * 사건 작업 화면.
 *
 * 사건 자료가 실린 화면이라 검색에 걸리면 안 됩니다 — `noindex`. 로그인하지
 * 않았으면 목록으로 돌려보냅니다.
 */
export const metadata: Metadata = {
  title: "내 사건",
  robots: { index: false, follow: false },
};

export default async function LegalCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/legal");

  const legalCase = await loadLegalCase(caseId, data.user.id);
  // 남의 사건 id를 넣어도 여기서 끝납니다 — 조회가 owner를 함께 보므로
  // "없음"과 "남의 것"이 같은 답이 됩니다.
  if (!legalCase) notFound();

  const [materials, documents] = await Promise.all([
    listLegalCaseMaterials(caseId, data.user.id),
    listLegalCaseDocuments(caseId, data.user.id),
  ]);

  return <LegalCaseWorkspace initialCase={legalCase} initialMaterials={materials} initialDocuments={documents} />;
}
