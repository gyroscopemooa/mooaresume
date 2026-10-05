/**
 * 확실한 오탈자만 원문에 옮깁니다.
 *
 * 문항의 수정안 전체가 검수에서 떨어지면 원문을 그대로 돌려줍니다. 그때
 * 수정안 안에 있던 "무학등 → 무학 등", "도도로 → 도로" 같은 명백한 오류
 * 수정까지 함께 버려져, 결과 화면은 고치라고 말하면서 본문은 안 고친 상태가
 * 됐습니다(2026-10-05 일산병원·도화 사례).
 *
 * 여기서는 수정안과 원문의 글자 단위 차이 중 다음 두 가지만 받아들입니다.
 * - 한 줄 안에서 공백 한 칸을 넣거나 빼는 것(띄어쓰기)
 * - 바로 옆 글자와 같은 한글 한 글자를 지우는 것(겹쳐 쓴 글자)
 * 단어 교체·어순·문장 변경은 하나도 옮기지 않으므로 말투와 취향은 그대로입니다.
 */

/** snippet은 원문에서 그대로 잘라 온 앞뒤 문맥입니다(근거 인용용). */
export type MechanicalFix = { kind: "spacing" | "duplicate"; snippet: string };

const MAX_LENGTH = 4_000;
const HANGUL = /[가-힣]/;

type Op = { type: "same" | "del" | "ins"; char: string };

function diff(a: string, b: string): Op[] | null {
  const n = a.length;
  const m = b.length;
  if (n > MAX_LENGTH || m > MAX_LENGTH) return null;
  // LCS 표. 문항 하나(수백~천 자)라 메모리는 문제되지 않습니다.
  const width = m + 1;
  const table = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] = a[i] === b[j]
        ? table[(i + 1) * width + j + 1] + 1
        : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: "same", char: a[i] }); i++; j++; }
    else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) { ops.push({ type: "del", char: a[i] }); i++; }
    else { ops.push({ type: "ins", char: b[j] }); j++; }
  }
  while (i < n) ops.push({ type: "del", char: a[i++] });
  while (j < m) ops.push({ type: "ins", char: b[j++] });
  return ops;
}

function snippet(text: string, index: number) {
  return text.slice(Math.max(0, index - 6), Math.min(text.length, index + 7)).trim();
}

export function applyMechanicalFixes(original: string, candidate: string): { text: string; fixes: MechanicalFix[] } {
  const ops = diff(original, candidate);
  if (!ops) return { text: original, fixes: [] };

  let text = "";
  let originalIndex = 0;
  const fixes: MechanicalFix[] = [];

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    // 바뀐 덩어리 하나(연속된 del/ins)를 통째로 봅니다.
    if (op.type === "same") { text += op.char; originalIndex++; continue; }
    let end = k;
    while (end < ops.length && ops[end].type !== "same") end++;
    const hunk = ops.slice(k, end);
    const deleted = hunk.filter((o) => o.type === "del").map((o) => o.char).join("");
    const inserted = hunk.filter((o) => o.type === "ins").map((o) => o.char).join("");
    const prev = original[originalIndex - 1] ?? "";
    const next = original[originalIndex + deleted.length] ?? "";

    const spacingInsert = deleted === "" && inserted === " " && prev.trim() !== "" && next.trim() !== "";
    const spacingDelete = deleted === " " && inserted === "" && prev.trim() !== "" && next.trim() !== "";
    const duplicateDelete = inserted === "" && deleted.length === 1 && HANGUL.test(deleted) && (deleted === prev || deleted === next);

    // 앞뒤 4글자가 그대로여야 합니다. 문장을 고쳐 쓴 자리에서는 글자 맞춤이
    // 우연히 공백 한 칸짜리 차이를 만들어 내는데, 그건 띄어쓰기 수정이 아닙니다.
    const isolated = [1, 2, 3, 4].every((d) => !ops[k - d] || ops[k - d].type === "same")
      && [0, 1, 2, 3].every((d) => !ops[end + d] || ops[end + d].type === "same");

    const snippetText = snippet(original, originalIndex);
    if (isolated && spacingInsert) {
      text += " ";
      fixes.push({ kind: "spacing", snippet: snippetText });
    } else if (isolated && (spacingDelete || duplicateDelete)) {
      fixes.push({ kind: spacingDelete ? "spacing" : "duplicate", snippet: snippetText });
    } else {
      text += deleted; // 그 밖의 차이는 원문 그대로 둡니다.
    }
    originalIndex += deleted.length;
    k = end - 1;
  }

  // 띄어쓰기 수정이 다른 수정과 얽혀 너무 많이 나오면 오탈자가 아니라 문장
  // 재작성입니다. 그때는 아무것도 옮기지 않습니다.
  if (fixes.length === 0 || fixes.length > 8) return { text: original, fixes: [] };
  return { text, fixes };
}
