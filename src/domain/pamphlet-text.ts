/**
 * 홍보물의 한 줄을 폭에 맞춰 나눕니다.
 *
 * SVG `<text>`는 줄바꿈을 하지 않습니다. 폭을 넘긴 글자는 잘리는 것이 아니라
 * **계속 오른쪽으로 뻗어** 옆 그림 뒤로 들어가 버립니다. 홍보물에서 부제가
 * 삽화 뒤로 사라지던 것이 정확히 그 모양이었습니다 — 글을 길게 쓴 사람은
 * 자기 글이 지워진 줄 알게 됩니다.
 */

/**
 * 글자 폭의 어림값.
 *
 * 캔버스 없이 재야 하므로(서버에서도 계산합니다) 정확한 폰트 계측 대신
 * 한글·한자·가나는 한 칸, 그 밖은 절반으로 잡습니다. 실제 렌더보다 조금
 * 넉넉하게 잡히므로 넘치기보다 일찍 접습니다 — 잘리는 것보다 낫습니다.
 */
function widthOf(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const wide =
      (code >= 0x1100 && code <= 0x11ff) || // 한글 자모
      (code >= 0x3000 && code <= 0x30ff) || // 문장부호·가나
      (code >= 0x3400 && code <= 0x9fff) || // 한자
      (code >= 0xac00 && code <= 0xd7a3) || // 한글 음절
      (code >= 0xff00 && code <= 0xff60);   // 전각
    units += wide ? 1 : 0.55;
  }
  return units * fontSize;
}

/**
 * `maxLines`줄까지 나누고, 그래도 넘치면 마지막 줄 끝을 …으로 줄입니다.
 *
 * 넘친 만큼을 그냥 버리지 않고 …을 남기는 이유는, 받는 사람이 "여기서 잘렸다"를
 * 알아야 기관에 물어볼 수 있기 때문입니다.
 */
export function wrapPamphletText(
  text: string,
  { fontSize, maxWidth, maxLines = 2 }: { fontSize: number; maxWidth: number; maxLines?: number },
): string[] {
  const source = text.trim();
  if (!source) return [];
  if (widthOf(source, fontSize) <= maxWidth) return [source];

  const lines: string[] = [];
  let current = "";

  // 띄어쓰기를 우선 경계로 삼되, 한 낱말이 한 줄보다 길면 글자 단위로 끊습니다
  // — 한국어에는 띄어쓰기 없이 긴 낱말이 흔합니다.
  for (const word of source.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
      if (lines.length === maxLines) break;
    }
    let piece = "";
    for (const char of word) {
      if (widthOf(piece + char, fontSize) > maxWidth) {
        lines.push(piece);
        piece = "";
        if (lines.length === maxLines) break;
      }
      piece += char;
    }
    if (lines.length === maxLines) break;
    current = piece;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length < maxLines) return lines;

  // 마지막 줄에 남은 글이 있으면 … 을 붙입니다. 붙일 자리는 만들어야 하므로
  // 들어가던 글자를 하나씩 물러 줍니다.
  const used = lines.join(" ");
  const rest = source.slice(used.length).trim();
  if (!rest) return lines;

  let last = lines[maxLines - 1];
  while (last && widthOf(`${last}…`, fontSize) > maxWidth) last = last.slice(0, -1);
  lines[maxLines - 1] = `${last}…`;
  return lines;
}

/**
 * 기관명을 두 번 적지 않습니다.
 *
 * 홍보물은 부제 앞에 기관명을 자동으로 붙입니다. 그것을 모르고 부제에 기관명을
 * 한 번 더 쓰면 "울산전기학원 울산전기학원 수강생…"이 됩니다. 이미 앞에 있으면
 * 붙이지 않습니다.
 */
export function joinPartnerSubtitle(partnerName: string, subtitle: string): string {
  const name = partnerName.trim();
  const text = subtitle.trim();
  if (!name) return text;
  if (!text) return name;
  return text.startsWith(name) ? text : `${name} ${text}`;
}
