/**
 * 쿠폰 코드 생성 규칙.
 *
 * 사람이 종이에서 읽고 손으로 옮겨 적습니다. 그래서 서버가 쓰기 편한 문자가
 * 아니라 **사람이 헷갈리지 않는 문자**만 씁니다.
 */

/**
 * 0/O, 1/I/L 을 뺀 32자.
 *
 * 이 다섯 글자가 문자 집합에 남아 있으면 "코드가 안 먹혀요" 문의의 대부분이
 * 거기서 나옵니다. 종이에 인쇄된 코드는 글꼴에 따라 O와 0이 거의 같습니다.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 접두어에 쓸 수 있는 형태로 다듬습니다. */
export function normalizeCodePrefix(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function randomSegment(length: number, random: () => number): string {
  let out = "";
  for (let index = 0; index < length; index += 1) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return out;
}

/**
 * 캠페인 코드 N개. 중복 없이 돌려줍니다.
 *
 * 겹치면 데이터베이스의 unique 제약이 통째로 실패시키므로, 만들 때 미리
 * 걸러 냅니다. 시도 횟수에 상한을 두는 이유는 접두어가 길고 개수가 많으면
 * 남은 조합이 모자랄 수 있기 때문입니다 — 무한히 도는 대신 부족하다고
 * 말해야 합니다.
 */
export function generateCouponCodes(
  count: number,
  prefix: string,
  random: () => number = Math.random,
): string[] {
  const clean = normalizeCodePrefix(prefix);
  const codes = new Set<string>();
  const limit = count * 40 + 200;
  let attempts = 0;
  while (codes.size < count && attempts < limit) {
    attempts += 1;
    const body = `${randomSegment(4, random)}-${randomSegment(4, random)}`;
    codes.add(clean ? `${clean}-${body}` : body);
  }
  if (codes.size < count) {
    throw new Error("코드를 충분히 만들지 못했습니다. 접두어를 줄이거나 수량을 낮춰 주세요.");
  }
  return [...codes];
}

/**
 * 협업 기관에 넘길 CSV.
 *
 * 엑셀이 첫 줄을 열 이름으로 읽고, 앞에 BOM이 없으면 한글이 깨집니다. 받는
 * 쪽이 파일을 열자마자 물음표를 보는 것이 이 기능의 가장 흔한 실패입니다.
 */
export function buildCouponCsv(rows: ReadonlyArray<{
  code: string;
  status: string;
  claimedAt: string | null;
  claimedBy?: string | null;
  /** 공유 코드는 한 장에 여러 명이 달립니다. 있으면 한 명당 한 줄로 적습니다. */
  uses?: ReadonlyArray<{ email: string | null; claimedAt: string }>;
}>): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const cells = (code: string, status: string, at: string | null, who: string | null | undefined) =>
    [code, status, at ?? "", who ?? ""].map(escape).join(",");

  const lines = [["쿠폰코드", "상태", "사용일시", "사용자"].map(escape).join(",")];
  for (const row of rows) {
    // 한 명도 안 썼으면 코드 한 줄. 썼으면 **쓴 사람마다 한 줄** — 스무 명이
    // 쓴 공유 코드가 한 줄로 요약되면 기관은 명단을 받지 못합니다.
    if (!row.uses || row.uses.length === 0) {
      lines.push(cells(row.code, row.status, row.claimedAt, row.claimedBy));
      continue;
    }
    for (const use of row.uses) lines.push(cells(row.code, row.status, use.claimedAt, use.email));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
