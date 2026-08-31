"use client";

/**
 * 수령 링크 한 칸.
 *
 * 이 칸만 클라이언트여야 합니다. 부모는 서버 컴포넌트인데 `onFocus`가 붙어
 * 있어서 페이지 전체가 렌더 중에 죽었습니다 — 관리자가 "무료 이용권" 메뉴에
 * 들어갈 수 없던 원인이 이것입니다. 표 한 줄을 위해 페이지를 통째로
 * 클라이언트로 내리는 대신, 링크 칸만 떼어 냅니다.
 *
 * 눌러서 고르는 동작을 남기는 이유: 링크가 길어 손으로 끌어 잡기 어렵고,
 * 관리자가 하는 일의 대부분이 이 값을 복사해 메일에 붙이는 것입니다.
 */
export function ClaimLinkCell({ url, className }: { url: string; className?: string }) {
  return (
    <input
      className={className}
      readOnly
      value={url}
      onFocus={(event) => event.currentTarget.select()}
      onClick={(event) => event.currentTarget.select()}
      aria-label="수령 링크"
    />
  );
}
