import { Suspense } from "react";
import { CompleteSocialProfile } from "@/components/complete-social-profile";

export default function CompleteProfilePage() {
  return <Suspense fallback={<main><p>로그인 정보를 확인하고 있어요.</p></main>}><CompleteSocialProfile /></Suspense>;
}
