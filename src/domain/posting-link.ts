/**
 * 붙여넣은 글 안에서 채용공고 링크를 찾습니다.
 *
 * 간편입력은 칸이 하나입니다. 자기소개서를 붙여넣는 자리인데, 사람들은 거기에
 * 공고 주소도 함께 붙여넣습니다 — 칸이 하나뿐이니 당연한 일이고, 지금까지는
 * 그 줄이 자기소개서 본문으로 읽혔습니다.
 *
 * **줄 하나가 통째로 주소일 때만** 찾습니다. 자기소개서 문장 안에 섞여 있는
 * 주소까지 집어 오면, 회사 홈페이지를 언급한 문장이 공고로 둔갑합니다. 혼자
 * 서 있는 줄은 "이걸 읽어 달라"는 뜻이지만 문장 속의 주소는 그냥 이야기의
 * 일부입니다.
 */

const LINE_URL = /^(https?:\/\/|www\.)[^\s]+$/i;

/** 주소만 남기고 흔한 껍데기(따옴표·괄호·꼬리 문장부호)를 벗깁니다. */
function tidy(line: string): string {
  return line.trim().replace(/^[<("'\[]+/, "").replace(/[>)"'\].,]+$/, "");
}

export function findPostingUrl(draft: string): string | null {
  for (const raw of draft.split("\n")) {
    const line = tidy(raw);
    if (!LINE_URL.test(line)) continue;
    // 사람들은 `www.`부터 붙여넣습니다. 서버는 스킴이 있어야 열 수 있습니다.
    return line.startsWith("www.") ? `https://${line}` : line;
  }
  return null;
}

/**
 * 불러오기가 끝난 뒤 그 줄을 본문에서 뺍니다.
 *
 * 남겨 두면 주소가 자기소개서 첫 문장으로 분석에 들어갑니다. 문항을 나누는
 * 쪽에서 그 줄을 제목으로 읽는 일까지 있었습니다.
 */
export function removePostingUrlLine(draft: string, url: string): string {
  const target = url.replace(/^https:\/\/(www\.)/i, "$1");
  return draft
    .split("\n")
    .filter((raw) => {
      const line = tidy(raw);
      if (!LINE_URL.test(line)) return true;
      return line !== url && line !== target;
    })
    .join("\n")
    .replace(/^\n+/, "");
}
