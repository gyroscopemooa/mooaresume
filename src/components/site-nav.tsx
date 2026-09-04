"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { HeaderAccount } from "./header-account";
import styles from "./site-nav.module.css";

/**
 * The header menu.
 *
 * The old header put its links straight in the bar, and the phone rule hid
 * every one of them — `nav > a:not(.button) { display: none }` — so 요금 was
 * unreachable on the device most visitors arrive on. Meanwhile the pages kept
 * being added: 커리어 검사, 첨삭 예시, 친구 추천, 팁과 노하우. A row that hides
 * what it cannot fit does not scale; a menu does.
 *
 * One panel, same content on every width. The bar keeps only what earns its
 * place there: the price, the account, and the thing we want pressed.
 */

const SECTIONS = [
  {
    title: "서비스",
    links: [
      { href: "/#plans", label: "요금 안내", hint: "QUICK · PRO · FINAL 한눈에 비교" },
      { href: "/result/sample", label: "첨삭 예시 보기", hint: "완성본이 어떤 모습인지 먼저" },
    ],
  },
  {
    title: "커뮤니티",
    links: [
      { href: "/community", label: "취업·진로 라운지", hint: "익명 고민을 읽고 다음 행동 찾기" },
    ],
  },
  {
    title: "이용 안내",
    links: [
      { href: "/guide", label: "이용 방법 · 자주 묻는 질문", hint: "순서, 요금, 자주 막히는 것" },
      { href: "/new", label: "팁과 노하우", hint: "넣는 법과 상담에서 하는 조언" },
      { href: "/refer", label: "친구 추천", hint: "친구가 결제하면 같은 이용권을" },
    ],
  },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // A menu that stays open after you click past it is a menu you close by
    // reloading. Escape too, because the panel takes keyboard focus.
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <nav aria-label="주요 메뉴" className={styles.nav}>
    {/* Order: CTA, 커리어 검사, account, menu — the button first on the left,
        the menu hard against the right with sign-in beside it. On a phone the
        CTA is hidden, so it reads 커리어 검사 · 로그인 · 메뉴.
        요금 moved into the panel and 커리어 검사 took its bar slot — the one free
        thing on the site earns that place more than a price nobody clicks
        before they have seen the work. */}
    {/* Two labels, one shown at a time. On a 360px phone the full sentence
        pushed the row 18px past the screen, which is the sideways drag people
        were reporting — the header, not the content. */}
    <Link href="/analyze" className={`button button-small ${styles.cta}`}>
      <span className={styles.ctaLong}>무료로 진단하기</span>
      <span className={styles.ctaShort}>무료 진단</span>
    </Link>
    <Link href="/career" className={styles.price}>커리어 검사</Link>
    <HeaderAccount />

    <div className={styles.menuWrap} ref={wrapRef}>
      <button type="button" className={styles.trigger} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((current) => !current)}>
        {open ? <X className={styles.mobileIcon}/> : <Menu className={styles.mobileIcon}/>}
        <span>메뉴</span>
        <ChevronDown className={`${styles.chevron} ${open ? styles.chevronUp : ""}`}/>
      </button>
      {open && <div className={styles.panel}>
        {SECTIONS.map((section) => <div key={section.title} className={styles.section}>
          <small>{section.title}</small>
          {section.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            <b>{link.label}</b>
            <span>{link.hint}</span>
          </Link>)}
        </div>)}
        {/* The phone bar has no CTA any more, so the panel carries it. */}
        <Link href="/analyze" className={styles.panelCta} onClick={() => setOpen(false)}>
          무료로 진단하기 <ArrowRight/>
        </Link>
      </div>}
    </div>
  </nav>;
}
