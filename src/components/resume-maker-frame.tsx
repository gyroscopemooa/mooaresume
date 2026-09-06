"use client";

import dynamic from "next/dynamic";

/**
 * 이력서 메이커를 브라우저에서만 그립니다.
 *
 * 이 화면은 저장된 임시본을 첫 렌더에 바로 채워 넣습니다(resume-maker.tsx의
 * `readSavedDraft`). 서버에서 미리 그리면 서버가 만든 빈 칸과 브라우저가
 * 채운 칸이 달라 hydration 경고가 나고 화면이 한 번 깜빡입니다. 서버 렌더를
 * 포기해서 잃는 것도 거의 없습니다 — 색인에 필요한 제목과 설명은 페이지
 * 메타데이터에 있고, 본문은 빈 입력 칸이라 크롤러에게 줄 것이 없습니다.
 *
 * `ssr: false`는 클라이언트 컴포넌트에서만 쓸 수 있어서, 서버 컴포넌트인
 * page.tsx와 사이에 이 얇은 파일 하나를 둡니다.
 */
const ResumeMaker = dynamic(() => import("./resume-maker").then((module) => module.ResumeMaker), {
  ssr: false,
  loading: () => <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "#8b978f", fontSize: 13 }}>이력서 편집기를 여는 중…</div>,
});

export function ResumeMakerFrame() {
  return <ResumeMaker />;
}
