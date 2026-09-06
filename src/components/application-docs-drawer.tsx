"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, FileStack, LockKeyhole, X } from "lucide-react";
import { APPLICATION_DOCUMENT_GROUP_LABEL, listedApplicationDocuments, type ApplicationDocumentGroup } from "@/domain/application-document";
import styles from "./application-docs-drawer.module.css";

/**
 * 서류 목록 드로어.
 *
 * 커리어 검사 드로어와 같은 자리(화면 왼쪽 가장자리)를 씁니다. 둘이 동시에
 * 펼쳐지면 앞의 것이 뒤의 것을 덮으므로, 하나가 열릴 때 다른 하나가 접히도록
 * 창 전체에 한 번 알립니다. 서로를 import하면 두 컴포넌트가 한 몸이 되고,
 * 나중에 세 번째 드로어가 생기면 셋이 서로를 알아야 합니다.
 */
export const DRAWER_OPEN_EVENT = "mooa:drawer-open";
const DRAWER_ID = "application-docs";

export function ApplicationDocsDrawer() {
  // 접힌 채로 시작합니다. 홈에 들어오면 커리어 드로어가 이미 펼쳐져 있어서,
  // 둘 다 열린 채로 시작하면 첫 화면이 패널 두 장으로 덮입니다.
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
    return <button className={styles.reopen} type="button" onClick={openDrawer} aria-label="서류 목록 열기">
      <FileStack /><span>서류<br />첨삭</span><ChevronLeft />
    </button>;
  }

  return <section className={styles.layer} aria-label="서류 목록">
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="application-docs-title">
      <button className={styles.edgeToggle} type="button" onClick={() => setOpen(false)} aria-label="서류 목록 접기"><ChevronRight /></button>
      <header className={styles.drawerHead}>
        <div><small>DOCUMENTS</small><b id="application-docs-title">서류 만들기 · 첨삭</b></div>
        <div className={styles.actions}>
          <button type="button" onClick={() => setOpen(false)} aria-label="서류 목록 닫기"><X /></button>
        </div>
      </header>
      <div className={styles.content}>
        <p className={styles.lead}>쓰려는 서류를 고르세요. 이력서는 로그인 없이 무료로 쓸 수 있습니다.</p>
        {(["application", "other"] as ApplicationDocumentGroup[]).map((group) => {
          const items = listedApplicationDocuments().filter((document) => document.group === group);
          if (!items.length) return null;
          return <div key={group} className={styles.group}>
            <h3>{APPLICATION_DOCUMENT_GROUP_LABEL[group]}</h3>
            <div className={styles.list}>
              {items.map((document) => {
                // 꼬리표의 생김새는 꼬리표가 정합니다. 한때 `id === "resume"`로
                // 무료를 골랐는데, 무료 서류가 하나뿐이라는 가정이 그 줄에
                // 숨어 있었습니다. 유료 서류가 셋이 되면서 그 가정이 깨졌습니다.
                const badgeClass = document.status === "coming-soon" ? styles.soon
                  : document.badge === "무료" ? styles.free
                  : document.badge === "유료" ? styles.paid
                  : styles.inUse;
                const body = <>
                  <div>
                    <span className={styles.head}>
                      <b>{document.label}</b>
                      <em className={`${styles.badge} ${badgeClass}`}>{document.badge}</em>
                    </span>
                    <p>{document.summary}</p>
                  </div>
                  {document.href ? <ArrowRight /> : <LockKeyhole />}
                </>;

                return document.href
                  ? <Link key={document.id} className={styles.item} href={document.href} onClick={() => setOpen(false)}>{body}</Link>
                  : <div key={document.id} className={`${styles.item} ${styles.locked}`}>{body}</div>;
              })}
            </div>
          </div>;
        })}
        <p className={styles.footNote}>준비 중인 서류는 순서대로 엽니다. 그 밖의 서류는 사실관계를 지어내지 않는 범위(구조·근거 연결·읽히는 문장)에서만 손봅니다.</p>
      </div>
    </aside>
  </section>;
}
