import Link from "next/link";

/**
 * 문서 제작 화면 위에 얹는 머리줄.
 *
 * 이 화면들은 자기 화면만 그리고 끝나서, 들어온 사람이 사이트의 다른 곳으로
 * 갈 길이 없었습니다. 결제까지 생각하는 사람에게 "여기가 어디인지"와 "돌아갈
 * 곳"이 없는 것은 그 자체로 멈추는 이유가 됩니다.
 *
 * 전역 `.site-header` 클래스를 그대로 씁니다 — 좁은 화면에서 로고 글자를 빼는
 * 규칙도 거기 붙어 있어서, 이 화면들이 따로 그 문제를 다시 겪지 않습니다.
 *
 * 목록에 내보내지 않은 서류(미리보기)는 여기서도 링크하지 않습니다. 한 화면을
 * 아는 사람이 다른 화면까지 찾아가는 길을 열어 두면 감춘 뜻이 없습니다.
 */
export function DocumentToolHeader() {
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="MOOA Resume 홈">
      <span className="brand-mark">M</span><span>MOOA <b>Resume</b></span>
    </Link>
    {/* 자소서 첨삭은 단추로 둡니다. 홈의 모바일 규칙(`home-mobile-header`)이
        머리줄의 평범한 링크를 전부 감추는데(`nav>a:not(.button)`), 그 규칙은
        전역이라 이 화면에도 옵니다. 즉 휴대폰에서 평범한 링크는 반드시
        사라집니다 — 남아야 하는 하나를 단추로 만드는 편이, 그 규칙과 특이도
        싸움을 벌이는 것보다 정직합니다. 이력서는 그 아래 순위라 넓은 화면에서만
        보입니다. */}
    <nav aria-label="주요 메뉴">
      <Link href="/resume">이력서</Link>
      <Link href="/analyze" className="button button-small">자기소개서 첨삭</Link>
    </nav>
  </header>;
}
