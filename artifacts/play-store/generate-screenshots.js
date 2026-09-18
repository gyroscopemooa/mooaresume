/**
 * Play 스토어 휴대전화 스크린샷 6장 (1080x1920, 9:16).
 * 화면 구조와 문구는 실제 구현에서 가져옴:
 *   - src/components/simple-intake.tsx (간편 입력)
 *   - src/components/app-start-wizard.tsx (작성 단계 3종)
 *   - src/components/result-workspace-complete.tsx (결과 탭)
 *   - src/fixtures/result-document.ts (샘플 분석 결과)
 * 기업명은 상표 문제를 피해 중립 표기로 바꿔 씀.
 */
const sharp = require('C:/6.mooaresume/node_modules/sharp');
const fs = require('fs');

const W = 1080, H = 1920;
const GREEN = '#176b4a', INK = '#17221d', MUTED = '#68756f', LINE = '#dfe6e2', PAPER = '#f7f9f7';
const MINT = '#eaf5ef', WARN = '#ac7816', BAD = '#a14f4f', CREAM = '#fffdf5';
const F = 'Malgun Gothic';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 한글은 전각, 라틴은 약 0.52배로 폭을 어림한다. */
function textWidth(s, size) {
  let t = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    const wide = c > 0x1100 && ((c >= 0xac00 && c <= 0xd7a3) || (c >= 0x3130 && c <= 0x318f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xff00 && c <= 0xff60));
    t += wide ? size : size * 0.52;
  }
  return t;
}
function wrap(s, size, max) {
  const words = s.split(' ');
  const out = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, size) > max && line) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

const P = [];
const push = (s) => P.push(s);
const text = (x, y, s, o = {}) => {
  const { size = 24, fill = INK, weight = 400, anchor = 'start', ls = 0, opacity = 1 } = o;
  push(`<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${opacity}">${esc(s)}</text>`);
};
/** 줄바꿈까지 해서 그리고, 다음 줄이 시작될 y를 돌려준다. */
const para = (x, y, s, o = {}) => {
  const { size = 23, lh = size * 1.55, max = 760 } = o;
  const lines = wrap(s, size, max);
  lines.forEach((line, i) => text(x, y + i * lh, line, o));
  return y + lines.length * lh;
};
const rect = (x, y, w, h, o = {}) => {
  const { r = 0, fill = '#fff', stroke = null, sw = 2, opacity = 1 } = o;
  push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" opacity="${opacity}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`);
};
const line = (x1, y1, x2, y2, c = LINE, sw = 2) => push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${sw}"/>`);
const check = (cx, cy, r, c) => push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><path d="M ${cx - r * 0.42} ${cy + r * 0.02} l ${r * 0.3} ${r * 0.32} l ${r * 0.56} ${-r * 0.6}" fill="none" stroke="#fff" stroke-width="${r * 0.28}" stroke-linecap="round" stroke-linejoin="round"/>`);
const bang = (cx, cy, r, c) => push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><path d="M ${cx} ${cy - r * 0.45} v ${r * 0.55}" stroke="#fff" stroke-width="${r * 0.26}" stroke-linecap="round"/><circle cx="${cx}" cy="${cy + r * 0.45}" r="${r * 0.13}" fill="#fff"/>`);
const lock = (x, y, c) => push(`<g stroke="${c}" stroke-width="2.4" fill="none" stroke-linejoin="round"><rect x="${x}" y="${y + 7}" width="18" height="13" rx="3"/><path d="M ${x + 4} ${y + 7} v -3 a 5 5 0 0 1 10 0 v 3"/></g>`);

/** 공통 배경 + 헤드라인. 카드가 시작될 y를 돌려준다. */
function frame({ eyebrow, head, sub, cardTop = 520 }) {
  P.length = 0;
  push(`<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#0b4b32"/><stop offset="55%" stop-color="#176b4a"/><stop offset="100%" stop-color="#0d5237"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2dd68a" stop-opacity="0.38"/><stop offset="100%" stop-color="#2dd68a" stop-opacity="0"/>
    </radialGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="26" flood-color="#04281b" flood-opacity="0.32"/>
    </filter>
    <clipPath id="cardClip"><rect x="100" y="${cardTop}" width="880" height="${H - cardTop + 60}" rx="44"/></clipPath>
  </defs>`);
  rect(0, 0, W, H, { fill: 'url(#bg)' });
  push(`<ellipse cx="180" cy="120" rx="520" ry="420" fill="url(#glow)"/>`);
  push(`<ellipse cx="960" cy="${cardTop + 40}" rx="420" ry="360" fill="url(#glow)" opacity="0.65"/>`);
  text(84, 150, eyebrow, { size: 26, fill: '#8fe7bd', weight: 700, ls: 2 });
  head.forEach((l, i) => text(84, 252 + i * 92, l, { size: 76, fill: '#fff', weight: 700, ls: -2 }));
  const subY = 252 + head.length * 92 - 6;
  wrap(sub, 29, 900).forEach((l, i) => text(84, subY + i * 44, l, { size: 29, fill: '#b9dfcc' }));
  push(`<g filter="url(#lift)">`);
  rect(100, cardTop, 880, H - cardTop + 60, { r: 44, fill: '#fff' });
  push(`</g>`);
  push(`<g clip-path="url(#cardClip)">`);
  return cardTop;
}
const closeCard = () => push(`</g>`);

const CARD_X = 100, CARD_W = 880, PAD = 34, IX = CARD_X + PAD, IW = CARD_W - PAD * 2;
const TAB_TOP = 1768;

/** 앱 하단 탭바 — 실제 앱(app-tab-bar.tsx)의 5개 메뉴. */
function tabBar() {
  const tbw = CARD_W / 5;
  rect(CARD_X, TAB_TOP, CARD_W, H - TAB_TOP + 60, { fill: '#fff' });
  line(CARD_X, TAB_TOP, CARD_X + CARD_W, TAB_TOP);
  const icon = (kind, cx, cy, c) => {
    const s = 2.6;
    if (kind === 'list') return `<g stroke="${c}" stroke-width="${s}" stroke-linecap="round" fill="none"><line x1="${cx - 12}" y1="${cy - 11}" x2="${cx + 14}" y2="${cy - 11}"/><line x1="${cx - 12}" y1="${cy}" x2="${cx + 14}" y2="${cy}"/><line x1="${cx - 12}" y1="${cy + 11}" x2="${cx + 14}" y2="${cy + 11}"/></g>`;
    if (kind === 'doc') return `<g stroke="${c}" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M ${cx - 12} ${cy - 16} h 16 l 9 9 v 23 a 3 3 0 0 1 -3 3 h -22 a 3 3 0 0 1 -3 -3 v -29 a 3 3 0 0 1 3 -3 z"/><line x1="${cx - 6}" y1="${cy + 3}" x2="${cx + 7}" y2="${cy + 3}"/><line x1="${cx - 6}" y1="${cy + 11}" x2="${cx + 7}" y2="${cy + 11}"/></g>`;
    if (kind === 'pen') return `<g stroke="${c}" stroke-width="${s}" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M ${cx - 3} ${cy + 18} h -11 a 3 3 0 0 1 -3 -3 v -29 a 3 3 0 0 1 3 -3 h 16 l 9 9 v 6"/><path d="M ${cx + 16} ${cy - 1} l 6 6 l -15 15 h -6 v -6 z"/></g>`;
    if (kind === 'compass') return `<g stroke="${c}" stroke-width="${s}" stroke-linejoin="round" fill="none"><circle cx="${cx}" cy="${cy}" r="17"/><path d="M ${cx + 8} ${cy - 8} l -5 13 l -13 5 l 5 -13 z" fill="${c}" stroke="none"/></g>`;
    return `<g stroke="${c}" stroke-width="${s}" stroke-linecap="round" fill="none"><circle cx="${cx}" cy="${cy - 6}" r="8"/><path d="M ${cx - 14} ${cy + 18} a 14 14 0 0 1 28 0"/></g>`;
  };
  [['list', '시작'], ['doc', '이력서'], ['pen', '첨삭'], ['compass', '커리어'], ['person', '내 정보']].forEach(([k, label], i) => {
    const on = k === 'pen';
    const c = on ? GREEN : '#93a09a';
    const cx = CARD_X + tbw * i + tbw / 2;
    push(icon(k, cx, TAB_TOP + 52, c));
    text(cx, TAB_TOP + 100, label, { size: 21, fill: c, weight: on ? 700 : 400, anchor: 'middle' });
  });
}

/** 결과 화면 상단(브랜드 + 탭). 본문이 시작될 y를 돌려준다. */
function resultHead(top, activeTab, caption) {
  text(IX, top + 52, 'MOOA', { size: 28, fill: GREEN, weight: 700 });
  text(IX + 106, top + 52, 'Resume', { size: 28, fill: INK });
  text(CARD_X + CARD_W - PAD, top + 50, caption, { size: 22, fill: MUTED, anchor: 'end' });
  const tabs = ['한눈에 보기', '문항별 첨삭', '공고·경험 분석', '면접 준비', '최종 첨삭본'];
  let x = IX, y = top + 84;
  tabs.forEach((t) => {
    const w = textWidth(t, 23) + 34;
    const on = t === activeTab;
    rect(x, y, w, 54, { r: 27, fill: on ? GREEN : '#fff', stroke: on ? GREEN : '#dce5e0' });
    text(x + w / 2, y + 36, t, { size: 23, fill: on ? '#fff' : '#66736c', weight: on ? 700 : 400, anchor: 'middle' });
    x += w + 10;
  });
  const bodyTop = y + 78;
  rect(CARD_X, bodyTop, CARD_W, H - bodyTop + 60, { fill: PAPER });
  line(CARD_X, bodyTop, CARD_X + CARD_W, bodyTop);
  return bodyTop;
}

function save(name) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${P.join('\n')}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`${__dirname}/${name}.png`)
    .then((i) => console.log(name, i.width + 'x' + i.height, Math.round(i.size / 1024) + 'KB'));
}

// ── 1. 간편 입력 ─────────────────────────────────────────────────
function shot1() {
  const top = frame({
    eyebrow: 'AI 자소서 첨삭 · 무아레쥬메',
    head: ['쓴 게 없어도,', '다 썼어도'],
    sub: '처음부터 · 내용 보완 · 최종 첨삭 — 어느 쪽이든 됩니다',
    cardTop: 500,
  });
  text(IX, top + 52, 'MOOA', { size: 28, fill: GREEN, weight: 700 });
  text(IX + 106, top + 52, 'Resume', { size: 28, fill: INK });
  text(CARD_X + CARD_W - PAD, top + 50, 'PRO · 12,900원', { size: 22, fill: MUTED, anchor: 'end' });

  // 작성 유형 3종 — 전부 고를 수 있다는 것이 이 장의 메시지
  const modes = [
    { t: '처음부터', d: '아직 아무것도\n못 썼어요' },
    { t: '내용 보완', d: '썼는데 내용이\n부족해요' },
    { t: '최종 첨삭', d: '제출 전\n확인만 할래요' },
  ];
  const mw = (IW - 24) / 3;
  modes.forEach((m, i) => {
    const x = IX + i * (mw + 12), y = top + 80, on = i === 2;
    rect(x, y, mw, 128, { r: 18, fill: on ? MINT : '#fff', stroke: on ? GREEN : '#dce5e0', sw: on ? 3 : 2 });
    if (on) check(x + mw - 26, y + 24, 13, GREEN);
    text(x + 20, y + 44, m.t, { size: 25, weight: 700, fill: on ? GREEN : '#44544b' });
    m.d.split('\n').forEach((l, k) => text(x + 20, y + 78 + k * 30, l, { size: 21, fill: on ? '#2d7d58' : '#8a968f' }));
  });
  text(IX, top + 250, '셋 중 무엇을 골라도 입력 화면은 하나입니다.', { size: 23, fill: MUTED });

  // 간편 입력 박스
  const by = top + 278;
  rect(CARD_X, by, CARD_W, H - by + 60, { fill: PAPER });
  line(CARD_X, by, CARD_X + CARD_W, by);
  let y = by + 28;
  rect(IX, y, IW, 340, { r: 22, fill: '#fff', stroke: GREEN, sw: 3 });
  text(IX + 26, y + 48, '자료를 한 번에 넣어주세요', { size: 27, weight: 700, fill: INK });
  rect(IX + 26, y + 70, IW - 52, 190, { r: 14, fill: '#fbfcfb', stroke: '#e7ecea' });
  [
    '자기소개서 전체를 그대로 붙여넣어 주세요.',
    '채용공고 주소를 한 줄로 붙여넣으면 공고를 불러옵니다.',
    '',
    '1. 지원 동기',
    '작성한 답변...',
  ].forEach((l, i) => text(IX + 48, y + 112 + i * 34, l, { size: 22, fill: i < 2 ? '#98a29c' : '#5d6b64' }));
  text(IX + 26, y + 302, '공백 제외 1,240 / 8,000자 · 파일 3개 2.1MB', { size: 21, fill: MUTED });
  rect(IX + IW - 176, y + 276, 150, 44, { r: 12, fill: MINT });
  text(IX + IW - 101, y + 305, '파일 추가', { size: 21, fill: GREEN, weight: 700, anchor: 'middle' });

  // 자동 분류 결과
  y += 366;
  rect(IX, y, IW, 268, { r: 22, fill: '#fff', stroke: LINE });
  check(IX + 40, y + 40, 14, GREEN);
  text(IX + 66, y + 49, '자료를 정리했습니다.', { size: 25, weight: 700, fill: INK });
  text(IX + IW - 26, y + 48, '넣기만 하면 자동 분류', { size: 20, fill: MUTED, anchor: 'end' });
  [
    ['00기업_채용공고.pdf', '채용공고'],
    ['이력서_2026.docx', '이력서'],
    ['품질경영기사.pdf', '자격·증명서'],
  ].forEach(([file, kind], i) => {
    const ry = y + 76 + i * 60;
    line(IX + 26, ry, IX + IW - 26, ry, '#eef2f0');
    text(IX + 26, ry + 40, file, { size: 23, fill: INK });
    const cw = textWidth(kind, 21) + 32;
    rect(IX + IW - 26 - cw, ry + 14, cw, 38, { r: 10, fill: MINT });
    text(IX + IW - 26 - cw / 2, ry + 41, kind, { size: 21, fill: GREEN, weight: 700, anchor: 'middle' });
  });

  // 프라이버시 + CTA
  y += 292;
  rect(IX, y, IW, 78, { r: 16, fill: CREAM, stroke: '#e7d8af' });
  lock(IX + 26, y + 28, '#a3761d');
  text(IX + 64, y + 48, '결제 전에는 서버 전송·저장·AI 호출을 하지 않습니다.', { size: 21, fill: '#756c57' });
  y += 100;
  rect(IX, y, IW, 96, { r: 20, fill: GREEN });
  text(IX + IW / 2, y + 60, '입력 내용·결제금액 확인', { size: 29, weight: 700, fill: '#fff', anchor: 'middle' });
  tabBar();
  closeCard();
  return save('screenshot-01-intake');
}

// ── 2. 결과 한눈에 보기 ───────────────────────────────────────────
function shot2() {
  const top = frame({
    eyebrow: '분석 결과 · 한눈에 보기',
    head: ['무엇부터', '고쳐야 하는지'],
    sub: '지원서 준비도와 핵심 개선점 3가지를 먼저 보여드립니다',
  });
  const by = resultHead(top, '한눈에 보기', '생산관리 신입 · PRO');
  let y = by + 28;

  rect(IX, y, IW, 172, { r: 22, fill: '#fff', stroke: LINE });
  text(IX + 28, y + 46, '지원서 준비도', { size: 22, fill: MUTED });
  text(IX + 28, y + 108, '82', { size: 62, weight: 700, fill: GREEN });
  text(IX + 104, y + 108, '/100', { size: 26, fill: '#9aa49f' });
  const badge = textWidth('제출 전 보완 권장', 22) + 32;
  rect(IX + 186, y + 74, badge, 42, { r: 12, fill: MINT });
  text(IX + 186 + badge / 2, y + 102, '제출 전 보완 권장', { size: 22, fill: GREEN, weight: 700, anchor: 'middle' });
  rect(IX + 28, y + 132, IW - 56, 12, { r: 6, fill: '#e8eeeb' });
  rect(IX + 28, y + 132, (IW - 56) * 0.82, 12, { r: 6, fill: GREEN });

  y += 196;
  const items = [
    ['기업 선택 이유가 약합니다.', '지원동기를 공고의 데이터 기반 개선 요구와 직접 연결하세요.'],
    ['결과를 판단할 근거가 부족합니다.', '수치를 만들지 말고 확인 가능한 변화나 주변 피드백을 보완하세요.'],
    ['문항 간 경험이 겹칩니다.', '문항마다 서로 다른 역할과 행동이 드러나도록 재배치하세요.'],
  ];
  const itemH = items.map(([, desc]) => 56 + wrap(desc, 22, IW - 120).length * 32 + 26);
  const panelH = 124 + itemH.reduce((a, b) => a + b, 0);
  rect(IX, y, IW, panelH, { r: 22, fill: '#fff', stroke: LINE });
  text(IX + 28, y + 44, '가장 먼저 확인하세요', { size: 21, fill: GREEN, weight: 700, ls: 1 });
  text(IX + 28, y + 88, '핵심 개선점 3가지', { size: 30, weight: 700, fill: INK });
  let iy = y + 118;
  items.forEach(([title, desc], i) => {
    if (i) line(IX + 28, iy, IX + IW - 28, iy, '#eef2f0');
    text(IX + 30, iy + 44, `0${i + 1}`, { size: 22, weight: 700, fill: '#a4afa9' });
    text(IX + 82, iy + 44, title, { size: 25, weight: 700, fill: INK });
    para(IX + 82, iy + 82, desc, { size: 22, fill: MUTED, max: IW - 120, lh: 32 });
    iy += itemH[i];
  });

  y += panelH + 20;
  rect(IX, y, IW, 118, { r: 22, fill: '#fff', stroke: LINE });
  text(IX + 28, y + 42, '분석한 원본', { size: 21, fill: GREEN, weight: 700, ls: 1 });
  text(IX + 28, y + 84, '자기소개서.hwp', { size: 24, weight: 700, fill: INK });
  text(IX + 230, y + 84, 'HWP · 184KB · 3개 문항', { size: 21, fill: MUTED });
  text(IX + IW - 28, y + 84, '읽기 완료', { size: 21, fill: GREEN, weight: 700, anchor: 'end' });

  y += 138;
  rect(IX, y, IW, 130, { r: 22, fill: CREAM, stroke: '#e7d8af' });
  bang(IX + 44, y + 44, 15, '#a3761d');
  text(IX + 72, y + 52, '확인이 필요한 사실', { size: 24, weight: 700, fill: INK });
  para(IX + 30, y + 92, '점검 순서를 바꾼 뒤 불량 건수가 실제로 달라졌나요? 확인되지 않은 성과는 만들지 않았습니다.', { size: 21, fill: '#756c57', max: IW - 60, lh: 30 });
  tabBar();
  closeCard();
  return save('screenshot-02-overview');
}

// ── 3. 문항별 첨삭 ───────────────────────────────────────────────
function shot3() {
  const top = frame({
    eyebrow: '문항별 첨삭 · BEFORE → AFTER',
    head: ['고친 문장과', '고친 이유를 같이'],
    sub: '무엇이 어떻게 바뀌었는지, 왜 바꿨는지까지 문항마다 보여드립니다',
  });
  const by = resultHead(top, '문항별 첨삭', '문항 1 · 지원동기');
  let y = by + 26;

  rect(IX, y, IW, 210, { r: 22, fill: '#fff', stroke: LINE });
  text(IX + 26, y + 44, '첨삭 전', { size: 21, fill: '#9aa49f', weight: 700 });
  para(IX + 26, y + 88, '생산 과정에서 발생한 문제를 해결한 경험을 바탕으로 생산 경쟁력 향상에 기여하고 싶습니다. 현장에서 문제를 발견하고 팀원들과 해결해 나가겠습니다.', { size: 22, fill: '#7b8781', max: IW - 52, lh: 34 });
  text(IX + IW - 26, y + 44, '공백 제외 82자', { size: 20, fill: '#b0b9b4', anchor: 'end' });

  y += 226;
  push(`<path d="M ${CARD_X + CARD_W / 2 - 15} ${y - 22} h 30 l -15 20 z" fill="${GREEN}"/>`);

  y += 8;
  rect(IX, y, IW, 330, { r: 22, fill: '#fff', stroke: GREEN, sw: 3 });
  text(IX + 26, y + 46, '첨삭 후', { size: 21, fill: GREEN, weight: 700 });
  text(IX + IW - 26, y + 46, '공백 제외 498 / 500자', { size: 20, fill: GREEN, anchor: 'end' });
  rect(IX + 24, y + 104, IW - 48, 34, { r: 6, fill: '#e6f4ec' });
  para(IX + 26, y + 92, '생산 현장에서 문제를 발견하고 기준과 데이터를 바탕으로 개선을 실행하는 생산관리자가 되고 싶어 지원했습니다. 현장실습 당시 반복되는 조립 불량을 확인하고, 검사 기준서와 실제 작업 순서를 단계별로 대조했습니다. 확인한 내용을 작업자와 팀장에게 공유하고 점검 순서를 통일해 시험했습니다.', { size: 22, fill: INK, max: IW - 52, lh: 38 });

  y += 350;
  rect(IX, y, IW, 244, { r: 22, fill: MINT });
  text(IX + 28, y + 48, '왜 바뀌었나요?', { size: 25, weight: 700, fill: '#14503a' });
  ['막연한 기여 의지를 실제 행동으로 전환', '채용공고의 데이터 기반 개선 요구와 연결', '지원 직무에서 실행할 행동을 구체화'].forEach((r, i) => {
    const ry = y + 92 + i * 46;
    push(`<circle cx="${IX + 38}" cy="${ry - 8}" r="5" fill="${GREEN}"/>`);
    text(IX + 58, ry, r, { size: 22, fill: '#2b4d3d' });
  });

  y += 268;
  const buttons = [['직접 수정', false], ['이 문항 복사', true]];
  let bx = IX;
  buttons.forEach(([label, on]) => {
    const w = textWidth(label, 23) + 56;
    rect(bx, y, w, 68, { r: 16, fill: on ? GREEN : '#fff', stroke: on ? GREEN : '#dce5e0' });
    text(bx + w / 2, y + 43, label, { size: 23, weight: 700, fill: on ? '#fff' : '#54645b', anchor: 'middle' });
    bx += w + 12;
  });

  y += 84;
  rect(IX, y, IW, 100, { r: 22, fill: CREAM, stroke: '#e7d8af' });
  bang(IX + 44, y + 40, 15, '#a3761d');
  text(IX + 72, y + 48, '없는 경험과 수치는 넣지 않았습니다', { size: 23, weight: 700, fill: INK });
  text(IX + 30, y + 82, '확인되는 변화가 생기면 그때 더할 수 있습니다.', { size: 21, fill: '#756c57' });
  tabBar();
  closeCard();
  return save('screenshot-03-revision');
}

// ── 4. 공고·경험 분석 ────────────────────────────────────────────
function shot4() {
  const top = frame({
    eyebrow: '공고·경험 분석 · PRO',
    head: ['공고가 원한 걸', '내가 갖췄는지'],
    sub: '자소서만 보지 않습니다. 공고 요구 하나하나에 근거가 있는지 대조합니다',
  });
  const by = resultHead(top, '공고·경험 분석', '요구사항 4개 대조');
  let y = by + 26;

  const rows = [
    ['데이터 기반 공정 개선', '근거 있음', GREEN, MINT, '검사 기준과 실제 작업 순서를 대조하고 차이를 기록한 경험'],
    ['유관부서 및 현장 협업', '보완 필요', WARN, '#fdf6e7', '팀장과 작업자에게 관찰 내용을 공유한 경험 — 상대 의견을 어떻게 반영했는지 한 문장 보완하면 좋습니다.'],
    ['품질 관련 자격 또는 교육', '근거 없음', BAD, '#fbeeee', '이력서와 자소서 어디에서도 확인되지 않음. 우대사항이라 없어도 지원은 가능합니다.'],
    ['개선 결과 관리', '근거 없음', BAD, '#fbeeee', '개선 이후 결과를 판단할 확인 자료가 없음. 수치를 추정하지 말고 실제 변화를 확인하세요.'],
  ];
  rows.forEach(([req, status, color, bg, detail]) => {
    const lines = wrap(detail, 21, IW - 76).length;
    const h = 108 + lines * 31;
    rect(IX, y, IW, h, { r: 22, fill: '#fff', stroke: LINE });
    rect(IX, y, 8, h, { r: 4, fill: color });
    text(IX + 30, y + 50, req, { size: 25, weight: 700, fill: INK });
    const cw = textWidth(status, 20) + 28;
    rect(IX + IW - 26 - cw, y + 24, cw, 38, { r: 10, fill: bg });
    text(IX + IW - 26 - cw / 2, y + 51, status, { size: 20, fill: color, weight: 700, anchor: 'middle' });
    para(IX + 30, y + 90, detail, { size: 21, fill: MUTED, max: IW - 76, lh: 31 });
    y += h + 16;
  });

  rect(IX, y, IW, 128, { r: 22, fill: MINT });
  text(IX + 28, y + 44, '이 판단이 나온 공고 문장', { size: 21, fill: GREEN, weight: 700 });
  para(IX + 28, y + 84, '“유관부서와 협업하여 품질 문제를 개선하고 개선안을 현장에 적용”', { size: 22, fill: '#2b4d3d', max: IW - 56, lh: 32 });

  y += 148;
  rect(IX, y, IW, 118, { r: 22, fill: '#fff', stroke: LINE });
  lock(IX + 30, y + 36, GREEN);
  text(IX + 68, y + 56, '지원자료에 있는 사실만 사용합니다', { size: 23, weight: 700, fill: INK });
  para(IX + 30, y + 96, '근거가 없는 역량은 문장으로 만들지 않고 확인 필요로 남깁니다.', { size: 21, fill: MUTED, max: IW - 60, lh: 30 });
  tabBar();
  closeCard();
  return save('screenshot-04-jobfit');
}

// ── 5. 면접 준비 ─────────────────────────────────────────────────
function shot5() {
  const top = frame({
    eyebrow: '면접 준비 · PRO',
    head: ['이 지원서로', '받게 될 질문까지'],
    sub: '제출한 내용에서 실제로 이어질 질문과, 흔들릴 지점을 미리 짚습니다',
  });
  const by = resultHead(top, '면접 준비', '예상질문 3개');
  let y = by + 26;

  const qs = [
    ['Q1', '검사 기준과 실제 작업 순서의 차이를 어떻게 발견했나요?', '강조한 문제 발견 과정이 본인의 실제 행동인지 확인하는 질문입니다.', ['처음 발견한 이상 징후', '확인한 자료와 관찰 과정', '본인이 직접 판단한 부분']],
    ['Q2', '작업자가 기존 방식 변경에 동의하지 않았다면 어떻게 설득했을까요?', '현장 협업과 이해관계 조정 역량을 확인하는 질문입니다.', ['상대가 우려할 지점', '공유할 근거', '작게 시험할 방법']],
  ];
  qs.forEach(([no, q, why, guides]) => {
    const qLines = wrap(q, 25, IW - 126);
    const whyLines = wrap(why, 21, IW - 126);
    // 칩을 미리 줄로 나눠 카드 높이를 정확히 잡는다.
    const rows = [[]];
    let rowW = 0;
    guides.forEach((g) => {
      const w = textWidth(g, 20) + 30;
      if (rowW + w > IW - 56 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push([g, w]);
      rowW += w + 10;
    });
    const h = 54 + qLines.length * 38 + whyLines.length * 30 + 44 + rows.length * 54 + 16;
    rect(IX, y, IW, h, { r: 22, fill: '#fff', stroke: LINE });
    rect(IX + 26, y + 26, 58, 44, { r: 12, fill: GREEN });
    text(IX + 55, y + 57, no, { size: 24, weight: 700, fill: '#fff', anchor: 'middle' });
    qLines.forEach((l, i) => text(IX + 100, y + 58 + i * 38, l, { size: 25, weight: 700, fill: INK }));
    let wy = y + 54 + qLines.length * 38;
    whyLines.forEach((l, i) => text(IX + 30, wy + i * 30, l, { size: 21, fill: MUTED }));
    const gy = wy + whyLines.length * 30 + 22;
    text(IX + 30, gy, '답변에 포함할 내용', { size: 20, fill: GREEN, weight: 700 });
    rows.forEach((row, ri) => {
      let gx = IX + 30;
      row.forEach(([g, w]) => {
        rect(gx, gy + 18 + ri * 54, w, 44, { r: 12, fill: PAPER, stroke: '#e3eae6' });
        text(gx + w / 2, gy + 47 + ri * 54, g, { size: 20, fill: '#4a5a52', anchor: 'middle' });
        gx += w + 10;
      });
    });
    y += h + 18;
  });

  rect(IX, y, IW, 268, { r: 22, fill: CREAM, stroke: '#e7d8af' });
  bang(IX + 44, y + 46, 15, '#a3761d');
  text(IX + 72, y + 54, '면접에서 압박이 들어올 지점', { size: 25, weight: 700, fill: INK });
  text(IX + 30, y + 104, '개선 효과의 근거', { size: 23, weight: 700, fill: '#6b5f42' });
  let ey = para(IX + 30, y + 142, '시험했다는 서술 뒤에 결과가 없어, 효과를 묻는 질문에 체감으로만 답하게 됩니다.', { size: 21, fill: '#756c57', max: IW - 60, lh: 31 });
  text(IX + 30, ey + 14, '면접 전 준비', { size: 20, fill: '#a3761d', weight: 700 });
  para(IX + 30, ey + 48, '확인되지 않으면 수치는 모른다고 먼저 밝히고 관찰한 변화만 말하세요.', { size: 21, fill: '#756c57', max: IW - 60, lh: 31 });
  tabBar();
  closeCard();
  return save('screenshot-05-interview');
}

// ── 6. 최종 첨삭본 + 가격 ────────────────────────────────────────
function shot6() {
  const top = frame({
    eyebrow: '최종 첨삭본 · 복사와 저장',
    head: ['정답을 만들기보다', '떨어질 이유를 줄입니다'],
    sub: '그대로 붙여넣을 최종 문장과 DOCX 저장까지',
  });
  const by = resultHead(top, '최종 첨삭본', '3개 문항 완료');
  let y = by + 26;

  const actions = [['전체 복사', true], ['DOCX 저장', false], ['TXT 저장', false]];
  let ax = IX;
  actions.forEach(([label, on]) => {
    const w = textWidth(label, 22) + 52;
    rect(ax, y, w, 62, { r: 16, fill: on ? GREEN : '#fff', stroke: on ? GREEN : '#dce5e0' });
    text(ax + w / 2, y + 40, label, { size: 22, weight: 700, fill: on ? '#fff' : '#54645b', anchor: 'middle' });
    ax += w + 12;
  });

  y += 82;
  rect(IX, y, IW, 336, { r: 22, fill: '#fff', stroke: LINE });
  text(IX + 28, y + 50, '01', { size: 22, weight: 700, fill: '#a4afa9' });
  text(IX + 74, y + 50, '지원동기', { size: 26, weight: 700, fill: INK });
  text(IX + IW - 28, y + 50, '이 문항 복사', { size: 21, fill: GREEN, weight: 700, anchor: 'end' });
  para(IX + 28, y + 96, '생산 현장에서 문제를 발견하고 기준과 데이터를 바탕으로 개선을 실행하는 생산관리자가 되고 싶어 지원했습니다. 현장실습 당시 반복되는 조립 불량을 확인했을 때 원인을 추측하기보다 검사 기준서와 실제 작업 순서를 단계별로 대조했습니다. 확인한 내용을 작업자와 팀장에게 먼저 공유하고, 기존 작업을 방해하지 않는 범위에서 점검 순서를 통일해 시험했습니다.', { size: 22, fill: '#2f3d36', max: IW - 56, lh: 36 });
  text(IX + 28, y + 308, '공백 제외 498 / 500자', { size: 21, fill: MUTED });

  y += 356;
  rect(IX, y, IW, 108, { r: 22, fill: MINT });
  check(IX + 44, y + 42, 14, GREEN);
  text(IX + 70, y + 50, '이 화면의 문장이 복붙용 최종본입니다', { size: 23, weight: 700, fill: '#14503a' });
  text(IX + 30, y + 88, 'DOCX는 한글(HWP)에서도 바로 열립니다.', { size: 21, fill: '#2b4d3d' });

  y += 130;
  const tiers = [['QUICK', '5,900원', '쓴 글을 빠르게 첨삭'], ['PRO', '12,900원', '공고·이력서까지 분석']];
  const tw = (IW - 16) / 2;
  tiers.forEach(([name, price, desc], i) => {
    const x = IX + i * (tw + 16), on = i === 1;
    rect(x, y, tw, 150, { r: 20, fill: on ? '#edf7f1' : '#fff', stroke: on ? GREEN : '#dce5e0', sw: on ? 3 : 2 });
    text(x + 24, y + 46, name, { size: 25, weight: 700, fill: on ? GREEN : '#54645b' });
    text(x + 24, y + 92, price, { size: 30, weight: 700, fill: INK });
    text(x + 24, y + 126, desc, { size: 20, fill: MUTED });
  });

  y += 174;
  rect(IX, y, IW, 82, { r: 16, fill: '#fff', stroke: LINE });
  lock(IX + 28, y + 30, GREEN);
  text(IX + 66, y + 50, '결제 전에는 서버 전송·저장·AI 호출을 하지 않습니다', { size: 21, fill: MUTED });
  tabBar();
  closeCard();
  return save('screenshot-06-final');
}

(async () => {
  await shot1(); await shot2(); await shot3(); await shot4(); await shot5(); await shot6();
})().catch((e) => console.error('ERR', e));
