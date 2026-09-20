import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import styles from "./career-ai-cta-bar.module.css";

/** 결과·캐릭터·예시 화면 어디서든 스크롤과 상관없이 심층해설로 갈 수 있는 상단 고정 버튼. */
export function CareerAiCtaBar({ scope, top = 0 }: { scope: "interest" | "work_values" | "work_style"; top?: number }) {
  return <div className={styles.bar} style={{ top }}><Link href={`/career/ai?scope=${scope}`}><Sparkles />심층해설 받기<ArrowRight /></Link></div>;
}
