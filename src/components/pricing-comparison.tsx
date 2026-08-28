"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Minus, X } from "lucide-react";
import { isFinalEnabled } from "@/domain/final-availability";
import styles from "./pricing-comparison.module.css";

type Plan = "QUICK" | "PRO" | "FINAL";
type Value = boolean | "기본" | "정밀";
type Feature = { name: string; quick: Value; pro: Value; final: Value };

const plans = [
  { id: "QUICK" as const, price: "5,900원", title: "이미 쓴 것을 빠르게 고쳐요", body: "현재 작성본의 문장·논리·구체성과 최종 수정본에 집중합니다.", href: "/onboarding", cta: "무료로 시작하기" },
  { id: "PRO" as const, price: "12,900원", title: "쓸 것부터 찾아 완성해요", body: "공고와 전체 지원자료를 연결해 처음 작성부터 최종검수까지 진행합니다.", href: "/onboarding", cta: "무료로 시작하기", recommended: true },
  // Reads the same flag as the FINAL routes and the onboarding card. A table
  // that says 준비 중 next to an entry point that works is the kind of
  // disagreement nobody notices until a customer does.
  { id: "FINAL" as const, price: "19,900원", title: "지원서에서 면접 연습까지", body: "PRO 전체에 답변 평가, 동적 꼬리질문과 면접 리포트를 더합니다.", href: "/onboarding", cta: isFinalEnabled() ? "무료로 시작하기" : "FINAL 준비 중", pending: !isFinalEnabled() },
];

const features: Feature[] = [
  { name: "작성한 자기소개서 첨삭", quick: true, pro: true, final: true },
  { name: "맞춤법·문법·표현", quick: true, pro: true, final: true },
  { name: "논리·구체성·설득력 분석", quick: true, pro: true, final: true },
  { name: "핵심 개선점 3개", quick: true, pro: true, final: true },
  { name: "문장별 피드백", quick: true, pro: true, final: true },
  { name: "수정 이유", quick: true, pro: true, final: true },
  { name: "Before → After 비교", quick: true, pro: true, final: true },
  { name: "최종 수정본", quick: true, pro: true, final: true },
  { name: "문항별·전체 복사 및 직접 편집", quick: true, pro: true, final: true },
  { name: "부족한 초안 보완", quick: "기본", pro: "정밀", final: "정밀" },
  { name: "아무것도 없는 상태부터 작성", quick: false, pro: true, final: true },
  { name: "Guided 작성 과정", quick: false, pro: true, final: true },
  { name: "채용공고 분석", quick: false, pro: true, final: true },
  { name: "이력서·경력기술서 분석", quick: false, pro: true, final: true },
  { name: "포트폴리오·추가 경험 활용", quick: false, pro: true, final: true },
  { name: "이력서 사실로 빈 내용 채우기", quick: false, pro: true, final: true },
  { name: "문항별 적합한 소재 추천", quick: false, pro: true, final: true },
  { name: "부족 정보 AI 질문", quick: false, pro: true, final: true },
  { name: "사용자 사실 확인 후 작성", quick: false, pro: true, final: true },
  { name: "문항별 소제목 제안", quick: false, pro: true, final: true },
  { name: "공고 ↔ 경험 매칭", quick: false, pro: true, final: true },
  { name: "공고 ↔ 지원서 적합도", quick: false, pro: true, final: true },
  { name: "누락 역량·근거 탐지", quick: false, pro: true, final: true },
  { name: "더 적합한 경험 추천", quick: false, pro: true, final: true },
  { name: "문항 간 경험 중복 검사", quick: false, pro: true, final: true },
  { name: "지원자료 간 충돌 검사", quick: false, pro: true, final: true },
  { name: "기업명·직무명 오류 확인", quick: false, pro: true, final: true },
  { name: "기간·수치 확인 필요 탐지", quick: false, pro: true, final: true },
  { name: "제출 전 최종검수", quick: "기본", pro: "정밀", final: "정밀" },
  { name: "지원자료 기반 면접 예상질문", quick: false, pro: true, final: true },
  { name: "면접 질문의 근거와 답변 핵심포인트", quick: false, pro: true, final: true },
  { name: "면접 리스크 분석", quick: false, pro: true, final: true },
  { name: "인터랙티브 AI 모의면접", quick: false, pro: false, final: true },
  { name: "사용자 답변 평가", quick: false, pro: false, final: true },
  { name: "동적 꼬리질문", quick: false, pro: false, final: true },
  { name: "취약질문 분석·재훈련", quick: false, pro: false, final: true },
  { name: "최종 면접 리포트", quick: false, pro: false, final: true },
  { name: "수백 가지 세부 기준 다층 분석", quick: true, pro: true, final: true },
  { name: "입력 내용·문항 간 교차검증", quick: true, pro: true, final: true },
  { name: "지원자료·문항 간 교차검증", quick: false, pro: true, final: true },
  { name: "분석 결과 독립 재검수", quick: true, pro: true, final: true },
];

function Mark({ value }: { value: Value }) {
  if (value === true) return <span className={styles.yes}><Check /> 포함</span>;
  if (value === false) return <span className={styles.no}><Minus /> 미포함</span>;
  return <span className={value === "정밀" ? styles.precise : styles.basic}>{value}</span>;
}

export function PricingComparison() {
  const [open, setOpen] = useState(true);
  const [mobilePlan, setMobilePlan] = useState<Plan>("PRO");
  const key = mobilePlan.toLowerCase() as "quick" | "pro" | "final";

  return (
    <section className={styles.section} id="plans">
      <div className="container">
        <div className={styles.intro}>
          <span>PRICING</span><h2>지금 필요한 범위만 선택하세요.</h2>
          <p>이미 쓴 글을 고치는 것부터 지원서 전체와 면접을 준비하는 것까지, 한 지원 건을 기준으로 이용합니다.</p>
        </div>
        <div className={styles.cards}>
          {plans.map((plan) => (
            <article key={plan.id} className={plan.recommended ? styles.recommended : ""}>
              {plan.recommended && <em>가장 많이 선택</em>}
              <small>{plan.id}</small><strong>{plan.price}</strong><h3>{plan.title}</h3><p>{plan.body}</p>
              {plan.pending ? <button disabled>{plan.cta}</button> : <Link href={plan.href}>{plan.cta} <ArrowRight /></Link>}
            </article>
          ))}
        </div>
        <div className={styles.message}><b>QUICK</b>은 이미 쓴 것을 고치고, <b>PRO</b>는 쓸 것부터 찾아 지원서를 완성합니다. <b>FINAL</b>은 PRO에 실제 AI 면접 연습을 더합니다.</div>
        <button className={styles.toggle} onClick={() => setOpen((value) => !value)} aria-expanded={open}>{open ? "전체 기능 비교 닫기" : "전체 기능 비교 보기"}{open ? <X /> : <ChevronDown />}</button>
        {open && (
          <div className={styles.comparison}>
            <div className={styles.desktop}><table>
              <thead><tr><th>기능</th>{plans.map((plan) => <th key={plan.id} className={plan.id === "PRO" ? styles.proColumn : ""}><span>{plan.id === "PRO" && <em>추천</em>}{plan.id}</span><strong>{plan.price}</strong></th>)}</tr></thead>
              <tbody>{features.map((feature) => <tr key={feature.name}><th>{feature.name}</th><td><Mark value={feature.quick}/></td><td className={styles.proColumn}><Mark value={feature.pro}/></td><td><Mark value={feature.final}/></td></tr>)}</tbody>
            </table></div>
            <div className={styles.mobile}>
              <div className={styles.tabs}>{plans.map((plan) => <button key={plan.id} className={mobilePlan === plan.id ? styles.active : ""} onClick={() => setMobilePlan(plan.id)}><b>{plan.id}</b><span>{plan.price}</span></button>)}</div>
              <div className={styles.mobileList}>{features.map((feature) => <div key={feature.name}><span>{feature.name}</span><Mark value={feature[key]}/></div>)}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
