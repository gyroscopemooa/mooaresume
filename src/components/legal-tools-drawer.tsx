"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Scale, X } from "lucide-react";
import { DRAWER_OPEN_EVENT } from "./application-docs-drawer";
import {
  LEGAL_DOCUMENT_STAGE_LABEL, LEGAL_DOCUMENT_STAGE_ORDER, legalDocumentDefinitions,
} from "@/domain/legal-case";
import styles from "./legal-tools-drawer.module.css";

/**
 * 나홀로소송 도구 드로어.
 *
 * 입사지원 서류 드로어와 같은 자리(화면 왼쪽 가장자리)를 한 칸 더 아래로 씁니다.
 * 법률 서면은 원래 "사건 하나로 들어가 안에서 고른다"로 설계돼 있습니다
 * (`domain/application-document.ts`의 `legal-case` 항목 주석 참고) — 사건이
 * 여러 문서를 걸쳐 쓰이는 사람에게는 그 편이 맞습니다.
 *
 * 다만 소장 하나만, 내용증명 하나만 필요해서 검색으로 곧장 들어오는 사람도
 * 있습니다. 그 사람에게는 "사건부터 만드세요"가 한 단계 더 있는 벽입니다. 그래서
 * 여기서는 문서 종류를 낱장으로도 먼저 보여 줍니다 — 각 줄은 `/legal`로 가되
 * `?doc=` 하나만 붙입니다. 실제로 문서를 만드는 로직은 이미 사건 화면에
 * 있으므로 여기서 다시 만들지 않습니다.
 */
const DRAWER_ID = "legal-tools";

export function LegalToolsDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOtherDrawerOpen(event: Event) {
      if ((event as CustomEvent<string>).detail !== DRAWER_ID) setOpen(false);
    }
    window.addEventListener(DRAWER_OPEN_EVENT, onOtherDrawerOpen);
    return () => window.removeEventListener(DRAWER_OPEN_EVENT, onOtherDrawerOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function openDrawer() {
    window.dispatchEvent(new CustomEvent<string>(DRAWER_OPEN_EVENT, { detail: DRAWER_ID }));
    setOpen(true);
  }

  if (!open) {
    return <button className={styles.reopen} type="button" onClick={openDrawer} aria-label="나홀로소송 도구 목록 열기">
      <Scale /><span>나홀로<br />소송</span><ChevronLeft />
    </button>;
  }

  return <section className={styles.layer} aria-label="나홀로소송 도구 목록">
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="legal-tools-title">
      <button className={styles.edgeToggle} type="button" onClick={() => setOpen(false)} aria-label="나홀로소송 도구 목록 접기"><ChevronRight /></button>
      <header className={styles.drawerHead}>
        <div><small>CASE-BASED LEGAL DRAFTING</small><b id="legal-tools-title">나홀로 소송 도우미</b></div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setOpen(false)} aria-label="나홀로소송 도구 목록 닫기"><X /></button>
        </div>
      </header>
      <div className={styles.content}>
        <p className={styles.lead}>사건 전체를 이어서 쓰실 거면 첫 줄로, 문서 하나만 필요하시면 그 문서로 바로 들어가세요.</p>

        <div className={styles.list}>
          <Link className={`${styles.item} ${styles.flagship}`} href="/legal" onClick={() => setOpen(false)}>
            <div>
              <span className={styles.head}>
                <b>내 사건 만들기</b>
                <em className={styles.flagshipBadge}>전체 흐름</em>
              </span>
              <p>자료를 한 번 넣으면 쟁점 정리부터 항소이유서까지 이어서 씁니다. 처음이시면 이걸로 시작하세요.</p>
            </div>
            <ArrowRight />
          </Link>
        </div>

        {LEGAL_DOCUMENT_STAGE_ORDER.map((stage) => {
          const items = legalDocumentDefinitions.filter((definition) => definition.stage === stage);
          if (!items.length) return null;
          return <div key={stage} className={styles.group}>
            <h3>{LEGAL_DOCUMENT_STAGE_LABEL[stage]}</h3>
            <div className={styles.list}>
              {items.map((definition) => <Link
                key={definition.type}
                className={styles.item}
                href={`/legal?doc=${definition.type}`}
                onClick={() => setOpen(false)}
              >
                <div><b>{definition.label}</b><p>{definition.summary}</p></div>
                <ArrowRight />
              </Link>)}
            </div>
          </div>;
        })}

        <p className={styles.footNote}>어느 쪽으로 들어오셔도 사건은 하나로 저장됩니다 — 나중에 같은 사건에서 다른 문서를 이어 만들 수 있습니다. 법률 자문이 아닌 제출용 초안이며 승소를 장담하지 않습니다.</p>
      </div>
    </aside>
  </section>;
}
