/**
 * Play 스토어 그래픽 이미지(feature graphic) 1024x500.
 * 추천 배치에서 잘리거나 위에 아이콘·제목이 얹힐 수 있어, 글자는 크게 쓰고
 * 가장자리 60px 안쪽으로만 둔다.
 */
const sharp = require('C:/6.mooaresume/node_modules/sharp');
const fs = require('fs');

const W = 1024, H = 500;
const GREEN = '#176b4a', INK = '#17221d', MUTED = '#68756f', MINT = '#eaf5ef';
const F = 'Malgun Gothic';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const P = [];
const push = (s) => P.push(s);
const text = (x, y, s, o = {}) => {
  const { size = 24, fill = INK, weight = 400, anchor = 'start', ls = 0 } = o;
  push(`<text x="${x}" y="${y}" font-family="${F}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}">${esc(s)}</text>`);
};
const rect = (x, y, w, h, o = {}) => {
  const { r = 0, fill = '#fff', stroke = null, sw = 2, opacity = 1 } = o;
  push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" opacity="${opacity}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`);
};
const check = (cx, cy, r, c) => push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/><path d="M ${cx - r * 0.42} ${cy + r * 0.02} l ${r * 0.3} ${r * 0.32} l ${r * 0.56} ${-r * 0.6}" fill="none" stroke="#fff" stroke-width="${r * 0.28}" stroke-linecap="round" stroke-linejoin="round"/>`);

push(`<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.8" y2="1">
    <stop offset="0%" stop-color="#0b4b32"/><stop offset="55%" stop-color="#176b4a"/><stop offset="100%" stop-color="#0d5237"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#2dd68a" stop-opacity="0.4"/><stop offset="100%" stop-color="#2dd68a" stop-opacity="0"/>
  </radialGradient>
  <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#04281b" flood-opacity="0.34"/>
  </filter>
</defs>`);
rect(0, 0, W, H, { fill: 'url(#bg)' });
push(`<ellipse cx="120" cy="60" rx="380" ry="300" fill="url(#glow)"/>`);
push(`<ellipse cx="820" cy="430" rx="360" ry="280" fill="url(#glow)" opacity="0.75"/>`);

// ── 왼쪽: 브랜드 + 한 줄 약속 ────────────────────────────────────
rect(70, 78, 52, 52, { r: 15, fill: '#fff' });
text(96, 116, 'M', { size: 34, weight: 700, fill: GREEN, anchor: 'middle' });
text(136, 116, 'MOOA', { size: 31, weight: 700, fill: '#fff', ls: -0.5 });
text(238, 116, 'Resume', { size: 31, fill: '#bfe4d2', ls: -0.5 });

text(70, 224, '자료만 넣으면', { size: 62, weight: 700, fill: '#fff', ls: -2 });
text(70, 300, '초안부터 첨삭까지', { size: 62, weight: 700, fill: '#fff', ls: -2 });
text(70, 360, '공고·이력서까지 함께 읽는 AI 자소서 첨삭', { size: 24, fill: '#b9dfcc' });

// 작성 단계 3종 — "어느 쪽이든 된다"를 한 줄로
let px = 70;
[['처음부터', false], ['내용 보완', false], ['최종 첨삭', true]].forEach(([label, on]) => {
  const w = label.length * 25 + 46;
  rect(px, 398, w, 54, { r: 27, fill: on ? '#fff' : 'transparent', stroke: on ? '#fff' : '#6aad8e', sw: 2 });
  text(px + w / 2, 433, label, { size: 24, weight: 700, fill: on ? GREEN : '#cfe9db', anchor: 'middle' });
  px += w + 12;
});

// ── 오른쪽: 결과 카드 ────────────────────────────────────────────
const CX = 660, CY = 96, CW = 300, CH = 312;
push(`<g filter="url(#lift)">`);
rect(CX, CY, CW, CH, { r: 26, fill: '#fff' });
push(`</g>`);
text(CX + 26, CY + 48, '지원서 준비도', { size: 19, fill: MUTED });
text(CX + 26, CY + 98, '82', { size: 52, weight: 700, fill: GREEN });
text(CX + 90, CY + 98, '/100', { size: 22, fill: '#9aa49f' });
rect(CX + 26, CY + 116, CW - 52, 10, { r: 5, fill: '#e8eeeb' });
rect(CX + 26, CY + 116, (CW - 52) * 0.82, 10, { r: 5, fill: GREEN });

rect(CX + 26, CY + 146, CW - 52, 138, { r: 16, fill: MINT });
text(CX + 44, CY + 180, '핵심 개선점 3가지', { size: 21, weight: 700, fill: '#14503a' });
['기업 선택 이유', '결과의 근거', '문항 간 중복'].forEach((t, i) => {
  check(CX + 52, CY + 206 + i * 28, 9, GREEN);
  text(CX + 70, CY + 213 + i * 28, t, { size: 19, fill: '#2b4d3d' });
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${P.join('\n')}</svg>`;
fs.writeFileSync(__dirname + '/feature.svg', svg);
sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(__dirname + '/feature-graphic.png')
  .then((i) => console.log('ok', i.width + 'x' + i.height, Math.round(i.size / 1024) + 'KB'))
  .catch((e) => console.error('ERR', e.message));
