"use client";
import { useEffect, useRef, useState } from "react";
import { contextEnhancementSchema, type ContextEnhancement } from "@/domain/context-enhancement";
import styles from "./context-enhancement-option.module.css";

export function ContextEnhancementOption({ disabled, draftKey = "", defaultCompany = "", defaultRole = "", onChange }: { disabled: boolean; draftKey?: string; /** 이미 입력받은 회사·직무. 있으면 스위치만 켜면 되도록 미리 채웁니다. */ defaultCompany?: string; defaultRole?: string; onChange: (value: ContextEnhancement | undefined, invalid: boolean) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [company, setCompany] = useState(defaultCompany.slice(0, 80));
  const [role, setRole] = useState(defaultRole.slice(0, 80));
  const prefilled = Boolean(defaultCompany.trim() && defaultRole.trim());
  const [editingNames, setEditingNames] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem("mooa:context-enhancement:v1") || "null");
        if (!saved || saved.draftKey !== draftKey) return;
        const company = typeof saved.company === "string" ? saved.company.slice(0, 80) : "";
        const role = typeof saved.role === "string" ? saved.role.slice(0, 80) : "";
        const active = saved.enabled === true;
        setCompany(company); setRole(role); setEnabled(active);
        const parsed = contextEnhancementSchema.safeParse({ company, role });
        onChangeRef.current(active && parsed.success ? parsed.data : undefined, active && !parsed.success);
      } catch { /* Unavailable storage must not enable paid research. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey]);
  const update = (active: boolean, company: string, role: string) => {
    try { sessionStorage.setItem("mooa:context-enhancement:v1", JSON.stringify({ draftKey, enabled: active, company, role })); } catch { /* Optional draft storage. */ }
    const parsed = contextEnhancementSchema.safeParse({ company, role });
    onChange(active && parsed.success ? parsed.data : undefined, active && !parsed.success);
  };
  return <fieldset className={styles.option} disabled={disabled}>
    <label className={styles.heading}><span>기업·산업·직무 분석 강화</span>
      <input type="checkbox" role="switch" aria-label="기업·산업·직무 분석 강화" checked={enabled} onChange={event => { setEnabled(event.target.checked); update(event.target.checked, company, role); }} />
    </label>
    <p>공개 기업·산업 자료를 참고해 직무 관점의 코칭을 보강합니다. 추가 결제 없이 선택할 수 있습니다.</p>
    {enabled && <>
      {prefilled && !editingNames && contextEnhancementSchema.safeParse({ company, role }).success
        ? <p>분석 대상: <b>{company}</b> · <b>{role}</b> <button type="button" onClick={() => setEditingNames(true)}>수정</button></p>
        : <div className={styles.fields}>
        <label>지원 회사<input value={company} maxLength={80} placeholder="정확한 회사명" onChange={event => { setCompany(event.target.value); update(true, event.target.value, role); }} /></label>
        <label>지원 직무<input value={role} maxLength={80} placeholder="예: 토목 설계" onChange={event => { setRole(event.target.value); update(true, company, event.target.value); }} /></label>
      </div>}
      <p>회사·직무명만 외부 조회에 사용합니다. 이름·연락처·자소서 내용은 이 칸에 넣지 마세요. 동명 회사 혼동을 줄이도록 정확히 입력해 주세요.</p>
      <p>외부 자료는 부정확하거나 오래됐을 수 있어 제출 공고를 우선합니다. 자료를 확보하지 못하면 기존 자료만으로 첨삭하며 결과에 안내합니다. 처리 시간이 추가될 수 있습니다.</p>
      {!contextEnhancementSchema.safeParse({ company, role }).success && <p role="status">회사·직무명을 모두 입력해 주세요. 이메일·전화번호·문서 내용은 사용할 수 없습니다.</p>}
    </>}
    {!enabled && <p>현재 OFF · 제출한 자료만으로 첨삭합니다.</p>}
  </fieldset>;
}
