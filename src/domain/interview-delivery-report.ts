import { z } from "zod";
import type { InterviewAudioAnalysis } from "./interview-audio-analysis";
import { summarizeCamera } from "./interview-training";
import type { VisionAnalysisResult } from "@/lib/interview-media/vision-geometry";

const observation = z.string().min(1).max(400);
const evidenceEvent = z.object({
  source: z.enum(["audio", "video"]),
  startSeconds: z.number().min(0).max(180),
  endSeconds: z.number().min(0).max(180),
  title: observation,
  observation,
  practice: observation,
}).strict();
export const interviewDeliveryReportSchema = z.object({
  strengths: z.array(observation).max(4).default([]),
  voice: z.array(observation).max(5),
  visual: z.array(observation).max(5),
  actions: z.array(observation).max(5),
  evidenceEvents: z.array(evidenceEvent).max(8).default([]),
  holds: z.array(observation).max(4).default([]),
  caveats: z.array(observation).max(5),
}).strict();
export type InterviewDeliveryReport = z.infer<typeof interviewDeliveryReportSchema>;
export type DeliveryTranscriptEvidence = {
  text: string;
  segments: readonly { start: number; end: number; text: string }[];
  durationSeconds: number;
};
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
const percentile = (values: number[], fraction: number) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)))]; };
const fillerPattern = /(?:^|[\s,.!?])((?:어|음|그)(?:[,.!?])?)(?=[\s,.!?]|$)/gu;

export function buildInterviewDeliveryReport(audio: InterviewAudioAnalysis | null, vision: VisionAnalysisResult | null, expectedDurationSeconds: number | null = null, transcript: DeliveryTranscriptEvidence | null = null): InterviewDeliveryReport | null {
  if (!audio && !vision) return null;
  const voice: string[] = [];
  const visual: string[] = [];
  const actions: string[] = [];
  const strengths: string[] = [];
  const evidenceEvents: z.infer<typeof evidenceEvent>[] = [];
  const holds: string[] = [];
  const caveats: string[] = [];
  if (audio) {
    const durationMismatch = expectedDurationSeconds !== null && expectedDurationSeconds >= 3 && audio.durationSeconds < expectedDurationSeconds * .7;
    if (durationMismatch) {
      voice.push("원본 답변 길이보다 음성 분석 구간이 지나치게 짧아 목소리 피드백을 만들지 않았습니다.");
      actions.push("원본 재생 길이를 확인한 뒤 음성 분석을 다시 실행해 주세요.");
      holds.push("원본과 분석 구간 길이가 일치하지 않아 모든 음성 평가는 보류했습니다.");
    } else if (audio.durationSeconds < 10) {
      voice.push("분석 가능한 발화가 너무 짧아 목소리 크기와 말투에 대한 피드백을 만들기 어렵습니다.");
      actions.push("실제 면접 답변처럼 최소 10초 이상 말한 뒤 다시 확인해 보세요.");
      holds.push("음성 표본이 10초 미만이라 답변의 앞부분과 마지막 부분을 비교하는 전달 평가는 보류했습니다.");
    } else {
      const speechFrames = audio.speechActivity
        ? audio.frames.filter(frame => audio.speechActivity!.speechIntervals.some(interval => frame.startSeconds < interval.endSeconds && frame.endSeconds > interval.startSeconds))
        : audio.frames.filter(frame => frame.pitchHz !== null && frame.rmsDbfs > -45);
      const voiced = speechFrames.filter(frame => frame.pitchHz !== null);
      if (speechFrames.length < 20) holds.push("발화로 구분할 수 있는 구간이 충분하지 않아 목소리 전달 평가는 보류했습니다.");
      else {
        const part = Math.max(5, Math.floor(speechFrames.length * .2));
        const opening = median(speechFrames.slice(0, part).map(frame => frame.rmsDbfs));
        const closingFrames = speechFrames.slice(-part);
        const closing = median(closingFrames.map(frame => frame.rmsDbfs));
        if (closing <= opening - 6) {
          const start = closingFrames[0].startSeconds;
          const end = closingFrames.at(-1)!.endSeconds;
          voice.push("답변 마지막 부분의 목소리가 앞부분보다 작아져 결론이 상대적으로 약하게 들릴 수 있습니다.");
          actions.push("마지막 결론 문장을 다시 말하면서 끝 단어의 의미가 또렷하게 남도록 마무리해 보세요.");
          evidenceEvents.push({ source: "audio", startSeconds: start, endSeconds: end, title: "답변 마지막 부분의 전달력", observation: "실제 발화 구간을 비교했을 때 마지막 부분의 목소리가 답변 앞부분보다 작아졌습니다.", practice: "처음부터 크게 말하기보다 마지막 결론 문장을 한 문장으로 줄이고 끝 단어까지 분명하게 마무리해 보세요." });
        } else {
          voice.push("답변 앞부분과 마지막 부분의 음성 크기 차이가 크지 않아 결론까지 비교적 일정하게 전달됐습니다.");
          strengths.push("답변 마지막 부분의 음성 신호가 앞부분보다 급격히 작아지는 현상은 확인되지 않았습니다.");
        }
        if (voiced.length >= 20) {
          const semitones = voiced.map(frame => 12 * Math.log2(frame.pitchHz! / 100));
          const pitchSpread = percentile(semitones, .9) - percentile(semitones, .1);
          if (pitchSpread < 2) {
            voice.push("답변 전반에서 목소리 높낮이 변화가 작게 관찰돼 핵심 문장이 비슷한 무게로 들릴 수 있습니다.");
            actions.push("가장 강조하고 싶은 문장 하나를 정해, 그 문장 앞에서 짧게 쉬고 핵심 단어를 평소보다 분명하게 말해 보세요.");
          } else {
            strengths.push("답변 중 목소리 높낮이 변화가 관찰돼 모든 문장을 같은 억양으로 이어 가는 형태는 아니었습니다.");
          }
        } else holds.push("기본주파수를 안정적으로 확인한 발화가 부족해 억양 변화 평가는 보류했습니다.");

        const longPauses = audio.speechActivity?.pauseIntervals.filter(interval => interval.endSeconds - interval.startSeconds >= 1.5) ?? [];
        if (longPauses.length) {
          voice.push("답변 중간에 말이 1.5초 이상 끊긴 구간이 있어 생각의 흐름이 잠시 멈춘 듯 들릴 수 있습니다.");
          actions.push("긴 멈춤이 나온 문장에서는 완성된 문장을 찾기보다 다음 핵심어부터 짧게 이어 말해 보세요.");
          for (const interval of longPauses.slice(0, 2)) evidenceEvents.push({ source: "audio", startSeconds: interval.startSeconds, endSeconds: interval.endSeconds, title: "답변 중간의 긴 멈춤", observation: "로컬 발화 감지 모델에서 앞뒤 발화 사이가 1.5초 이상 분리됐습니다.", practice: "멈춤 직전 문장을 짧게 끝내고 다음 핵심어부터 새 문장으로 이어 말해 보세요." });
        }
      }
    }
    caveats.push("발화 구간은 기기 내 Silero VAD, 운율·앞뒤 전달은 실제 원음에서 계산합니다. 잡음·동시 발화·자동 증폭의 영향을 받을 수 있으며 감정·성격·자신감을 확정하거나 점수화하지 않습니다.");
  }
  if (transcript && transcript.segments.length) {
    const segments = transcript.segments.filter(segment => segment.start >= 0 && segment.end > segment.start && segment.end <= transcript.durationSeconds && segment.text.trim());
    const paced = segments.map(segment => ({ ...segment, rate: [...segment.text.replace(/\s/gu, "")].length / (segment.end - segment.start) })).filter(segment => segment.end - segment.start >= .8 && Number.isFinite(segment.rate));
    if (paced.length >= 3) {
      const typical = median(paced.map(segment => segment.rate));
      const changed = paced.find(segment => segment.rate >= typical * 1.75 || segment.rate <= typical * .55);
      if (changed) {
        const faster = changed.rate > typical;
        voice.push(faster ? "일부 구간에서 말하는 속도가 답변의 다른 부분보다 갑자기 빨라졌습니다." : "일부 구간에서 말하는 속도가 답변의 다른 부분보다 크게 느려졌습니다.");
        actions.push(faster ? "해당 문장을 둘로 나누고 핵심 내용 뒤에 짧게 쉬어 전달해 보세요." : "해당 구간에서 표현을 찾느라 멈춘 것인지 원음으로 확인하고, 핵심어 세 개만 정해 다시 말해 보세요.");
        evidenceEvents.push({ source: "audio", startSeconds: changed.start, endSeconds: changed.end, title: faster ? "속도가 빨라진 구간" : "속도가 느려진 구간", observation: `받아쓰기 모델이 추정한 이 구간의 발화 속도가 같은 답변의 다른 구간과 달랐습니다.`, practice: faster ? "문장을 둘로 나누고 핵심 내용 뒤에서 한 번 쉬어 보세요." : "문장을 외우기보다 핵심어 세 개를 기준으로 짧게 다시 말해 보세요." });
      } else strengths.push("받아쓰기 시간 구간에서는 답변 속도가 갑자기 크게 달라지는 부분이 확인되지 않았습니다.");
    } else holds.push("구간별 시간이 있는 전사가 충분하지 않아 답변 중 속도 급변 평가는 보류했습니다.");

    const fillerSegments = segments.flatMap(segment => [...segment.text.matchAll(fillerPattern)].length ? [segment] : []);
    if (fillerSegments.length >= 2) {
      voice.push("전사에 ‘어·음·그’와 같은 머뭇거림 표현이 반복해서 남았습니다.");
      actions.push("머뭇거림을 다른 말로 채우기보다 문장 사이를 잠깐 비우고 다음 핵심어부터 이어가 보세요.");
      for (const segment of fillerSegments.slice(0, 2)) evidenceEvents.push({ source: "audio", startSeconds: segment.start, endSeconds: segment.end, title: "머뭇거림 표현 확인", observation: "이 구간의 전사에 머뭇거림 표현이 남았습니다. STT가 추가하거나 생략할 수 있으므로 원음으로 확인해야 합니다.", practice: "같은 표현을 반복하는 대신 잠깐 쉬고 다음 핵심어부터 말해 보세요." });
    }
    caveats.push("속도와 머뭇거림은 원음의 구간 시각과 전사를 함께 사용합니다. 받아쓰기 오류가 있을 수 있어 해당 원음 구간을 근거로 함께 제공합니다.");
  } else if (audio) {
    holds.push("구간별 시간이 있는 전사가 없어 속도 급변·머뭇거림 평가는 보류했습니다.");
  }
  if (audio) holds.push("한국어 발음 정확도와 실제 청취 명료도는 검증된 발음 평가 모델이 연결되지 않아 판정하지 않았습니다.");
  const camera = summarizeCamera(vision);
  if (camera && vision) {
    if (vision.durationSeconds < 15) holds.push("영상이 15초 미만이라 반복되는 자세·표정 습관에 대한 전체 평가는 보류했습니다.");
    if (camera.missingSamples > 0) {
      visual.push("일부 장면에서 얼굴을 확인하기 어려웠습니다. 실제 화면 이탈·가림인지 해당 구간에서 확인해 보세요.");
      actions.push("미검출 주요 장면을 열어 얼굴이 화면 밖으로 벗어났거나 조명·가림 문제가 있었는지 확인하세요.");
    }
    for (const frame of vision.frames.filter(item => item.status === "no_face").slice(0, 3)) evidenceEvents.push({ source: "video", startSeconds: frame.timeSeconds, endSeconds: Math.min(vision.durationSeconds, frame.timeSeconds + 1), title: "얼굴 확인이 어려운 장면", observation: "이 표본에서는 얼굴 기준점을 확인하지 못했습니다. 화면 이탈·가림·조명 또는 검출 실패일 수 있습니다.", practice: "해당 장면을 재생해 실제 화면 이탈인지 확인하고, 맞다면 답변 중 정면 구도를 유지해 보세요." });
    if (camera.largeMoves > 0) {
      visual.push("일부 구간에서 얼굴 위치가 크게 바뀌어 답변보다 움직임에 시선이 갈 수 있습니다.");
      actions.push("해당 시점을 재생해 답변을 방해할 정도의 상체 이동이었는지 직접 확인하세요.");
    }
    const validFrames = vision.frames.filter(frame => frame.status === "single_face" && frame.bounds);
    if (vision.durationSeconds >= 15 && validFrames.length >= 24) {
      const areas = validFrames.map(frame => frame.bounds!.width * frame.bounds!.height);
      const typicalArea = median(areas);
      const edgeFrames = validFrames.filter(frame => frame.bounds!.x < .015 || frame.bounds!.y < .015 || frame.bounds!.x + frame.bounds!.width > .985 || frame.bounds!.y + frame.bounds!.height > .985);
      if (typicalArea < .045) {
        visual.push("얼굴이 화면에서 작게 보이는 장면이 이어져 표정과 말하는 모습이 덜 선명하게 전달될 수 있습니다.");
        actions.push("얼굴과 어깨가 자연스럽게 보이도록 카메라를 조금 가까이 두고 같은 답변을 다시 녹화해 보세요.");
      } else if (typicalArea > .32 || edgeFrames.length >= validFrames.length * .4) {
        visual.push("얼굴이 화면에 너무 가깝거나 화면 가장자리에 닿는 장면이 이어져 답답한 구도로 보일 수 있습니다.");
        actions.push("머리 위 여백과 어깨가 함께 보이도록 카메라 거리를 조정한 뒤 다시 답변해 보세요.");
      } else {
        strengths.push("분석한 장면에서는 얼굴 크기와 화면 여백이 크게 무너지지 않았습니다.");
      }

      const luminanceFrames = validFrames.flatMap(frame => frame.frameLuminance === null || frame.frameLuminance === undefined ? [] : [frame.frameLuminance]);
      if (luminanceFrames.length >= 24) {
        const typicalLuminance = median(luminanceFrames);
        if (typicalLuminance < 52) {
          visual.push("영상 전체가 어두운 장면이 이어져 얼굴 표정과 입 모양이 덜 선명하게 보일 수 있습니다.");
          actions.push("얼굴 앞쪽에 부드러운 조명을 두고 화면에서 눈·입 주변이 구분되는지 확인한 뒤 다시 녹화해 보세요.");
        } else if (typicalLuminance > 225) {
          visual.push("영상 전체가 지나치게 밝은 장면이 이어져 얼굴 윤곽이 흐려 보일 수 있습니다.");
          actions.push("창문이나 강한 조명을 정면으로 받지 않도록 밝기를 낮춘 뒤 다시 녹화해 보세요.");
        } else strengths.push("분석한 장면의 전체 밝기는 지속적으로 너무 어둡거나 밝은 범위에 머물지 않았습니다.");
      }
    }
    for (let index = 1; index < validFrames.length && evidenceEvents.filter(event => event.source === "video").length < 5; index++) {
      const before = validFrames[index - 1], after = validFrames[index];
      if (after.timeSeconds - before.timeSeconds > 1.1) continue;
      const a = before.bounds!, b = after.bounds!;
      if (Math.hypot(b.x + b.width / 2 - a.x - a.width / 2, b.y + b.height / 2 - a.y - a.height / 2) > .12) evidenceEvents.push({ source: "video", startSeconds: before.timeSeconds, endSeconds: after.timeSeconds, title: "얼굴 위치가 크게 바뀐 구간", observation: "연속한 0.5초 표본 사이에서 얼굴의 화면 위치가 크게 달라졌습니다. 더 짧은 제스처나 카메라 흔들림은 표본 사이에서 빠질 수 있습니다.", practice: "해당 구간을 재생해 답변을 방해할 정도의 움직임인지 확인하고, 핵심 문장에서는 상체 중심을 유지해 보세요." });
    }
    const directional = validFrames.flatMap(frame => frame.faceTurnRatio === null || frame.faceTurnRatio === undefined ? [] : [{ frame, side: frame.faceTurnRatio < -.14 ? -1 : frame.faceTurnRatio > .14 ? 1 : 0 }]);
    const directionChanges = directional.flatMap((item, index) => index > 0 && item.side !== 0 && directional[index - 1].side !== 0 && item.side !== directional[index - 1].side ? [{ before: directional[index - 1].frame, after: item.frame }] : []);
    const directionSpan = directionChanges.length ? directionChanges.at(-1)!.after.timeSeconds - directionChanges[0].before.timeSeconds : 0;
    if (vision.durationSeconds >= 15 && validFrames.length >= 24 && directionChanges.length >= 3 && directionSpan >= 6) {
      visual.push("답변 중 얼굴 방향이 좌우로 반복해서 바뀌는 장면이 관찰돼 면접관 입장에서는 시선이 분산되어 보일 수 있습니다.");
      actions.push("핵심 문장을 말할 때는 정면 구도를 기준으로 두고, 생각하는 동안의 고개 움직임을 한 번 줄여 보세요.");
      for (const change of directionChanges.slice(0, 2)) evidenceEvents.push({ source: "video", startSeconds: change.before.timeSeconds, endSeconds: change.after.timeSeconds, title: "얼굴 방향이 바뀐 구간", observation: "연속 표본에서 얼굴 내부의 코 위치가 좌우 반대 방향으로 바뀌었습니다. 이는 눈 시선이 아니라 얼굴 방향의 화면상 근사치입니다.", practice: "해당 구간을 보며 생각할 때 고개가 반복해서 움직였는지 확인하고, 핵심 문장에서는 정면 구도를 유지해 보세요." });
    }
    if (vision.durationSeconds >= 15 && validFrames.length >= 24 && vision.summary.medianAbsoluteRollDegrees !== null && vision.summary.medianAbsoluteRollDegrees >= 8) {
      visual.push("여러 장면에서 고개가 한쪽으로 기울어진 자세가 이어져 답변보다 자세에 시선이 갈 수 있습니다.");
      actions.push("핵심 문장을 말할 때 턱과 어깨에 힘을 빼고 고개 중심을 세워 보세요.");
    }
    const poseFrames = vision.frames.filter(frame => frame.poseStatus === "single_person" && frame.torsoTiltDegrees !== null && frame.torsoTiltDegrees !== undefined);
    if (vision.durationSeconds >= 15 && poseFrames.length >= 24) {
      const torsoMedian = median(poseFrames.map(frame => Math.abs(frame.torsoTiltDegrees!)));
      if (torsoMedian >= 8) {
        visual.push("답변의 여러 장면에서 상체 중심이 한쪽으로 기울어진 자세가 이어졌습니다.");
        actions.push("어깨에 힘을 주기보다 골반 위에 상체 중심을 두고 같은 답변을 다시 말해 보세요.");
        const frame = poseFrames.find(item => Math.abs(item.torsoTiltDegrees!) >= torsoMedian) ?? poseFrames[0];
        evidenceEvents.push({ source: "video", startSeconds: frame.timeSeconds, endSeconds: Math.min(vision.durationSeconds, frame.timeSeconds + .5), title: "상체 기울기가 이어진 장면", observation: "어깨와 골반 기준점으로 본 상체 중심선이 여러 장면에서 한쪽으로 기울어졌습니다.", practice: "골반 위에 상체 중심을 두고 어깨 힘을 뺀 채 같은 답변을 다시 말해 보세요." });
      } else strengths.push("분석 가능한 상체 표본에서는 한쪽으로 계속 기울어진 자세가 확인되지 않았습니다.");
    } else if (vision.durationSeconds >= 15) holds.push("상체 기준점이 충분히 검출되지 않아 지속 자세 평가는 보류했습니다.");
    const handFrames = vision.frames.filter(frame => frame.handNearFace !== null && frame.handNearFace !== undefined);
    const handNearFaceFrames = handFrames.filter(frame => frame.handNearFace);
    if (vision.durationSeconds >= 15 && handFrames.length >= 24 && handNearFaceFrames.length >= 6) {
      visual.push("손이 얼굴 주변에 머무는 장면이 반복돼 표정이나 입 모양을 가릴 수 있습니다.");
      actions.push("손을 책상이나 무릎 위에 편하게 두고, 강조할 때만 가슴 아래에서 짧게 움직여 보세요.");
      const frame = handNearFaceFrames[0];
      evidenceEvents.push({ source: "video", startSeconds: frame.timeSeconds, endSeconds: Math.min(vision.durationSeconds, frame.timeSeconds + .5), title: "손이 얼굴 주변에 보인 장면", observation: "손목 기준점이 얼굴 주변 범위 안에서 반복해서 검출됐습니다. 실제 가림 여부는 해당 장면에서 확인할 수 있습니다.", practice: "얼굴 주변으로 손이 올라오는 습관이 맞다면 손을 아래에 편하게 둔 채 같은 문장을 다시 말해 보세요." });
    }
    const lowerFrames = vision.frames.filter(frame => frame.lowerBodyCenter);
    let largeLowerMoves = 0;
    for (let index = 1; index < lowerFrames.length; index++) {
      const before = lowerFrames[index - 1], after = lowerFrames[index];
      if (after.timeSeconds - before.timeSeconds <= 1.1 && Math.hypot(after.lowerBodyCenter!.x - before.lowerBodyCenter!.x, after.lowerBodyCenter!.y - before.lowerBodyCenter!.y) >= .075) largeLowerMoves++;
    }
    if (vision.durationSeconds >= 15 && lowerFrames.length >= 24 && largeLowerMoves >= 4) {
      visual.push("화면에 보이는 하체 위치가 여러 구간에서 크게 바뀌어 자세가 불안정해 보일 수 있습니다.");
      actions.push("발바닥을 바닥에 두고 의자 중심에 앉은 뒤, 상체를 세운 상태로 다시 답변해 보세요.");
    }
    if (vision.durationSeconds >= 15 && camera.validSamples >= 24 && camera.missingSamples === 0 && camera.largeMoves === 0) {
      visual.push("분석한 장면에서는 얼굴 이탈이나 답변을 방해할 정도의 큰 위치 변화가 확인되지 않았습니다.");
      strengths.push("분석한 영상 표본에서는 얼굴 이탈이나 큰 화면상 이동이 확인되지 않았습니다.");
    }
    caveats.push("얼굴 방향·구도·손·상하체 자세는 0.5초 표본의 화면상 기준점이며 밝기는 프레임 전체 평균입니다. 정확한 눈 시선·미소·감정·인성·외모·복장·헤어·채용 가능성을 판단하지 않습니다.");
  }
  return interviewDeliveryReportSchema.parse({ strengths: [...new Set(strengths)].slice(0, 4), voice: [...new Set(voice)].slice(0, 5), visual: [...new Set(visual)].slice(0, 5), actions: [...new Set(actions)].slice(0, 5), evidenceEvents: evidenceEvents.slice(0, 8), holds: [...new Set(holds)].slice(0, 4), caveats: [...new Set(caveats)].slice(0, 5) });
}
