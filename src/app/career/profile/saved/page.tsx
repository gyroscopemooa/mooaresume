import type { Metadata } from "next";
import { SavedCareerProfile } from "@/components/saved-career-profile";

export const metadata: Metadata = { title: "저장된 커리어 프로필 | MOOA Resume", robots: { index: false, follow: false } };

export default function SavedCareerProfilePage() { return <SavedCareerProfile />; }
