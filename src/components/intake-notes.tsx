"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./intake-notes.module.css";

/**
 * 간편 입력에서 "서류에 없는 것"을 받는 자리.
 *
 * ------------------------------------------------------------------
 * 왜 빈 칸 하나가 아닌가
 * ------------------------------------------------------------------
 * "AI에게 하고 싶은 말"이라고만 적힌 빈 칸은 작은 챗봇입니다. 그리고 빈 칸은
 * **무엇을 말해야 하는지 이미 아는 사람**에게만 쓸모가 있습니다. 긴 대화 끝에
 * 스스로 알아낸 사람은 잘 쓰고, 처음 온 사람은 아무것도 못 씁니다.
 *
 * 우리는 자기소개서도 공고도 이미 읽었으므로 무엇을 물어야 하는지 압니다.
 * 그래서 빈 칸이 아니라 **묻는 칸**입니다 — 단추를 누르면 예시가 아니라 채워
 * 넣을 **틀**이 들어갑니다. 빈 종이 앞에서 멈추는 일이 없어집니다.
 *
 * ------------------------------------------------------------------
 * 왜 두 칸인가
 * ------------------------------------------------------------------
 * 위 칸은 **사실**이고 아래 칸은 **지시**입니다. 검증기는 근거로 인용된 문구가
 * 지원자가 낸 자료에 실제로 있는지 봅니다. "에이텍 빼주세요"가 근거로 인용되면
 * 그것이 바로 이 검사가 막으려는 지어낸 근거이고, 반대로 "정보처리기사 2024"는
 * 근거로 쓰여야 하는 사실입니다. 한 칸에 섞어 받으면 둘 중 하나는 반드시
 * 잘못 처리됩니다.
 */

type Chip = { label: string; template: string };

const FACT_CHIPS: readonly Chip[] = [
  { label: "수료·교육", template: "수료·교육: (과정명) — (기관) (연도)" },
  { label: "자격증", template: "자격증: (이름) — (취득 연월)" },
  { label: "만든 것·운영한 것", template: "만든 것: (이름) — (무엇을 하는 것) / (어디에 냈는지)" },
  { label: "수상·수치", template: "수상·성과: (무엇을) — (숫자나 등수)" },
  { label: "공백기", template: "공백기: (기간) — (그동안 한 일)" },
];

const DIRECTION_CHIPS: readonly Chip[] = [
  { label: "이걸 강조", template: "강조해 주세요: " },
  { label: "이건 빼줘", template: "빼 주세요: " },
  { label: "담백하게", template: "담백한 톤으로 써 주세요." },
  { label: "적극적으로", template: "적극적인 톤으로 써 주세요." },
];

/** 커서를 옮길 수 없으므로 줄 끝에 붙입니다. 빈 칸이면 그대로, 아니면 새 줄에. */
function appendLine(current: string, template: string) {
  const body = current.replace(/\s+$/, "");
  return body ? `${body}\n${template}` : template;
}

type Props = {
  facts: string;
  onFactsChange: (value: string) => void;
  direction: string;
  onDirectionChange: (value: string) => void;
};

export function IntakeNotes({ facts, onFactsChange, direction, onDirectionChange }: Props) {
  // 기본은 접힘입니다. 선택 항목이 펼쳐진 채로 있으면 필수처럼 보이고, 간편
  // 입력을 고른 사람은 칸이 적어서 고른 것입니다.
  const [open, setOpen] = useState(false);
  const factsId = useId();
  const directionId = useId();
  const filled = [facts.trim() && "사실", direction.trim() && "요청"].filter(Boolean).join(" · ");

  return (
    <section className={styles.notes}>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span><b>더 정확하게 써드릴게요</b><small>{filled ? `${filled} 입력함` : "안 쓰셔도 됩니다"}</small></span>
        <ChevronDown className={open ? styles.chevronOpen : undefined} />
      </button>

      {open && <div className={styles.body}>
        <div className={styles.field}>
          <label htmlFor={factsId}>서류에 없는 사실을 알려주세요</label>
          {/* 가로 스크롤입니다. 좁은 화면에서 줄바꿈시키면 단추만 세 줄이 됩니다. */}
          <div className={styles.chips}>
            {FACT_CHIPS.map((chip) => (
              <button type="button" key={chip.label} onClick={() => onFactsChange(appendLine(facts, chip.template))}>{chip.label}</button>
            ))}
          </div>
          <textarea
            id={factsId}
            rows={3}
            value={facts}
            maxLength={4000}
            onChange={(event) => onFactsChange(event.target.value)}
            placeholder={"자격증: 정보처리기사 — 2024.05\n만든 것: 헬띠루틴 — 건강관리 앱 / Google Play 출시"}
          />
          <small className={styles.factsNote}>여기 적은 것은 결과에서 <b>근거로 인용</b>됩니다. 없는 사실은 만들지 않고, 알려주신 것만 씁니다.</small>
        </div>

        <div className={styles.field}>
          <label htmlFor={directionId}>이렇게 써주세요</label>
          <div className={styles.chips}>
            {DIRECTION_CHIPS.map((chip) => (
              <button type="button" key={chip.label} onClick={() => onDirectionChange(appendLine(direction, chip.template))}>{chip.label}</button>
            ))}
          </div>
          <textarea
            id={directionId}
            rows={2}
            value={direction}
            maxLength={2000}
            onChange={(event) => onDirectionChange(event.target.value)}
            placeholder={"강조해 주세요: 직접 서비스를 만들어 운영한 경험"}
          />
          <small>방향으로만 씁니다. 이 칸의 문장은 <b>결과에 인용되지 않습니다.</b></small>
        </div>
      </div>}
    </section>
  );
}
