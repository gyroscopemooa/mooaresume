"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Award, BriefcaseBusiness, CircleHelp, Eye, FileText, GraduationCap, ImagePlus, Mail, MapPin, Phone,
  Plus, Printer, RotateCcw, Trash2, UserRound, Wrench, X,
} from "lucide-react";
import {
  emptyCareer, emptyCertificate, emptyEducation, emptyExtra, emptyResumeDraft, hasContent,
  isResumeWorthCarrying, parseResumeDraft, resumeDraftToText, splitSkills,
  RESUME_DRAFT_STORAGE_KEY, RESUME_PHOTO_MAX_WIDTH,
  type ResumeCareer, type ResumeCertificate, type ResumeDraft, type ResumeEducation, type ResumeExtra,
} from "@/domain/resume-draft";
import { GUEST_CANDIDATE_MATERIALS_KEY, mergeResumeIntoMaterials } from "@/domain/resume-handoff";
import { applyResumeBuildOutput, type ResumeBuildOutput } from "@/domain/resume-build";
import styles from "./resume-maker.module.css";

/**
 * 고른 사진을 폭 240px JPEG로 다시 굽습니다.
 *
 * 요즘 휴대폰 사진은 3~8MB인데 localStorage는 5MB 남짓입니다. 원본을 그대로
 * 넣으면 저장이 통째로 실패하고, 그러면 사진뿐 아니라 이력서 전체가 사라집니다.
 * 이력서에 실리는 크기가 3×4cm이므로 240px이면 인쇄에도 충분합니다.
 */
function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("DECODE_FAILED"));
      image.onload = () => {
        const scale = Math.min(1, RESUME_PHOTO_MAX_WIDTH / (image.width || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) { reject(new Error("CANVAS_UNAVAILABLE")); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 저장본은 첫 렌더 **전에** 읽습니다.
 *
 * 마운트 뒤에 읽어 setState하면 두 가지가 걸립니다. 서버가 그린 빈 칸과
 * 클라이언트가 채운 칸이 어긋나 hydration 경고가 나고, 이어서 화면이 한 번
 * 깜빡입니다. 그래서 이 컴포넌트는 서버에서 렌더하지 않고(resume-maker-frame.tsx의
 * `ssr: false`), 대신 여기서 곧바로 저장본을 읽습니다.
 */
function readSavedDraft(): ResumeDraft {
  try {
    return parseResumeDraft(window.localStorage.getItem(RESUME_DRAFT_STORAGE_KEY)) ?? emptyResumeDraft();
  } catch {
    // 시크릿 창이거나 저장이 막힌 브라우저입니다. 빈 이력서로 시작하면 됩니다.
    return emptyResumeDraft();
  }
}

/**
 * 이력서 메이커 (무료).
 *
 * AI를 부르지 않습니다. 이력서는 사실의 목록이라 문장을 지어낼 자리가 거의
 * 없고, 사람들이 실제로 막히는 곳은 "무엇을 어느 칸에 적어야 하는지"입니다.
 * 칸과 미리보기와 인쇄만 있으면 그 문제는 풀립니다. 토큰을 쓰지 않으니
 * 로그인도 결제도 없이 열어 둘 수 있습니다.
 *
 * 값은 서버로 보내지 않고 이 브라우저에만 둡니다(resume-draft.ts). 이름과
 * 연락처가 들어오는 자리라, 보관하지 않는 편이 지키기 쉽습니다.
 *
 * 내려받기는 브라우저 인쇄에 맡깁니다. "PDF로 저장"이 이미 모든 브라우저에
 * 있고, PDF 생성 라이브러리를 새로 들이면 한글 폰트를 통째로 안고 가야 해서
 * 번들이 몇 배로 커집니다.
 */
export function ResumeMaker() {
  const router = useRouter();
  const [draft, setDraft] = useState<ResumeDraft>(readSavedDraft);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(RESUME_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 저장에 실패해도 작성은 계속됩니다. 막을 이유가 없습니다.
    }
  }, [draft]);

  /**
   * 아래 유료 칸(AI 이력서 제작)이 결과를 보내옵니다.
   *
   * 그쪽이 이력서 상태를 직접 들고 있지 않은 이유는, 같은 값을 두 곳에서
   * 고치면 어느 한쪽이 반드시 옛 값을 덮어쓰기 때문입니다. 얹는 규칙은
   * `applyResumeBuildOutput` 하나에만 있습니다 — 사람이 적은 것을 이기지
   * 않습니다.
   */
  useEffect(() => {
    const onFilled = (event: Event) => {
      const output = (event as CustomEvent<ResumeBuildOutput>).detail;
      if (!output) return;
      setDraft((current) => applyResumeBuildOutput(current, output));
      setTab("edit");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("mooa:resume-build-filled", onFilled);
    return () => window.removeEventListener("mooa:resume-build-filled", onFilled);
  }, []);

  const skills = useMemo(() => splitSkills(draft.skills), [draft.skills]);
  const filledEducations = draft.educations.filter((item) => hasContent([item.school, item.major, item.period, item.note]));
  const filledCareers = draft.careers.filter((item) => hasContent([item.company, item.role, item.period, item.duties]));
  const filledCertificates = draft.certificates.filter((item) => hasContent([item.name, item.issuer, item.date]));
  const filledExtras = draft.extras.filter((item) => hasContent([item.title, item.period, item.detail]));
  // 이름만 적힌 이력서를 넘겨도 자소서와 대조할 것이 없습니다.
  const canCarry = isResumeWorthCarrying(draft);
  const isEmpty = !draft.contact.name.trim()
    && !filledEducations.length && !filledCareers.length && !filledCertificates.length && !filledExtras.length && !skills.length;

  function setContact<K extends keyof ResumeDraft["contact"]>(key: K, value: string) {
    setDraft((current) => ({ ...current, contact: { ...current.contact, [key]: value } }));
  }

  function patchList<K extends "educations" | "careers" | "certificates" | "extras">(
    key: K, id: string, patch: Partial<ResumeDraft[K][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: (current[key] as { id: string }[]).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }) as ResumeDraft);
  }

  function removeFromList(key: "educations" | "careers" | "certificates" | "extras", id: string) {
    setDraft((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }) as ResumeDraft);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    try {
      const dataUrl = await resizePhoto(file);
      setDraft((current) => ({ ...current, photo: { enabled: true, dataUrl } }));
    } catch {
      setPhotoError("이 사진을 읽지 못했습니다. 다른 파일로 해보세요(JPG·PNG).");
    }
  }

  /**
   * 자소서 첨삭으로 이어갑니다.
   *
   * 이력서를 글로 만들어 게스트 지원자료에 `RESUME`로 얹고 첫 화면으로
   * 보냅니다. 이렇게 넘겨야 첨삭이 이력서를 근거로 삼고, 자소서와 어긋나는
   * 곳을 짚을 수 있습니다(resume-handoff.ts).
   */
  function carryToCoverLetter() {
    try {
      const merged = mergeResumeIntoMaterials(window.sessionStorage.getItem(GUEST_CANDIDATE_MATERIALS_KEY), resumeDraftToText(draft));
      window.sessionStorage.setItem(GUEST_CANDIDATE_MATERIALS_KEY, JSON.stringify(merged));
    } catch {
      // 저장하지 못하면 이력서가 넘어가지 않습니다. 그냥 넘어가면 손님은
      // 이력서를 들고 간 줄 알고 첨삭을 받게 됩니다.
      window.alert("이 브라우저에 자료를 담지 못했습니다. 시크릿 창이라면 일반 창에서 다시 시도해 주세요.");
      return;
    }
    router.push("/onboarding?from=resume");
  }

  function resetAll() {
    // 되돌릴 수 없으므로 한 번 묻습니다. 몇 시간 적은 것이 한 번의 오클릭으로
    // 사라지면 이 도구를 다시 열 이유가 없어집니다.
    if (!window.confirm("적은 내용을 모두 지우고 처음부터 시작할까요? 되돌릴 수 없습니다.")) return;
    setDraft(emptyResumeDraft());
    setTab("edit");
  }

  return <div className={styles.shell}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/" aria-label="MOOA Resume 홈"><span>M</span><b>MOOA</b> Resume</Link>
      <span className={styles.topbarTitle}>이력서 만들기</span>
      <span className={styles.spacer} />
      <span className={styles.savedNote}>이 브라우저에 자동 저장됩니다</span>
      <a className={styles.ghostButton} href="#resume-guide"><CircleHelp /><span className={styles.buttonLabel}>소개</span></a>
      {/* 아래 유료 칸으로 내려보냅니다. 그 칸은 화면 아래에 있어서, 자료를
          던지면 채워 준다는 것을 스크롤하지 않으면 아무도 모릅니다. */}
      <a className={styles.aiButton} href="#resume-ai-build">
        {/* 아이콘 없이 글자만 둡니다. 좁은 화면에서 글자를 감추는 다른 단추와
            달리 이것만 짧은 글자로 바꿉니다 — 반짝이 아이콘 하나만 남으면
            무엇을 하는 단추인지 아무도 모릅니다. */}
        <span className={styles.buttonLabel}>AI로 제작</span><span className={styles.buttonShort}>AI</span>
      </a>
      {/* 아래쪽 카드와 같은 일을 합니다. 카드는 다 적고 난 자리에 있어서
          스크롤을 끝까지 내리지 않으면 있는 줄도 모릅니다. 조건을 못 채웠을
          때 감추지 않고 비활성으로 두는 이유는 아래 카드와 같습니다. */}
      <button
        type="button" className={styles.ghostButton} onClick={carryToCoverLetter} disabled={!canCarry}
        title={canCarry ? undefined : "경력·학력·자격·활동 중 하나라도 적으면 넘길 수 있습니다."}
      ><ArrowRight /><span className={styles.buttonLabel}>자소서로 이어가기</span></button>
      <button type="button" className={styles.ghostButton} onClick={resetAll}><RotateCcw /><span className={styles.buttonLabel}>처음부터</span></button>
      <button type="button" className={styles.printButton} onClick={() => window.print()}><Printer />인쇄 · PDF 저장</button>
    </header>

    <div className={styles.tabs}>
      <button type="button" className={tab === "edit" ? styles.tabOn : ""} onClick={() => setTab("edit")}>입력</button>
      <button type="button" className={tab === "preview" ? styles.tabOn : ""} onClick={() => setTab("preview")}>미리보기</button>
    </div>

    <div className={styles.body}>
      <div className={`${styles.editor} ${tab === "preview" ? styles.hiddenOnPhone : ""}`}>
        <div className={styles.intro}>
          <b>적는 대로 오른쪽 종이에 그려집니다.</b>
          비워 둔 칸은 종이에 나오지 않습니다. 다 적었으면 <b>인쇄 · PDF 저장</b>을 눌러 &quot;PDF로 저장&quot;을 고르세요.
          작성한 내용은 서버로 보내지 않고 이 브라우저에만 남습니다.
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHead}><UserRound /><h2>기본 정보</h2><small>이름만 있어도 시작됩니다</small></div>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="resume-name">이름</label>
              <input id="resume-name" value={draft.contact.name} onChange={(event) => setContact("name", event.target.value)} placeholder="홍길동" />
            </div>
            <div className={styles.field}>
              <label htmlFor="resume-birth">생년월일</label>
              <input id="resume-birth" value={draft.contact.birth} onChange={(event) => setContact("birth", event.target.value)} placeholder="1995.03.14" />
            </div>
            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="resume-headline">한 줄 소개</label>
              <input id="resume-headline" value={draft.contact.headline} onChange={(event) => setContact("headline", event.target.value)} placeholder="반도체 공정 품질관리 3년 · 설비 데이터 분석" />
              <small>이름 바로 아래에 들어갑니다. 직무와 연차를 한 줄로 적으면 읽는 사람이 5초 안에 무엇을 하는 사람인지 압니다.</small>
            </div>
            <div className={styles.field}>
              <label htmlFor="resume-phone">연락처</label>
              <input id="resume-phone" value={draft.contact.phone} onChange={(event) => setContact("phone", event.target.value)} placeholder="010-0000-0000" />
            </div>
            <div className={styles.field}>
              <label htmlFor="resume-email">이메일</label>
              <input id="resume-email" value={draft.contact.email} onChange={(event) => setContact("email", event.target.value)} placeholder="name@example.com" />
            </div>
            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="resume-address">주소</label>
              <input id="resume-address" value={draft.contact.address} onChange={(event) => setContact("address", event.target.value)} placeholder="경기도 화성시 (동 단위까지만 적어도 됩니다)" />
            </div>
          </div>

          {/* 증명사진은 켜고 끕니다. 붙이는 곳이 여전히 많지만 블라인드 채용은
              아예 받지 않아, 어느 한쪽으로 정해 두면 절반은 지워야 합니다. */}
          <div className={styles.photoBlock}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={draft.photo.enabled} onChange={(event) => setDraft((current) => ({ ...current, photo: { ...current.photo, enabled: event.target.checked } }))} />
              <span>증명사진 넣기</span>
              <small>블라인드 채용에 낼 이력서라면 꺼 두세요.</small>
            </label>

            {draft.photo.enabled ? <div className={styles.photoRow}>
              {draft.photo.dataUrl
                ? <>
                    {/* next/image는 원격 주소를 전제로 최적화합니다. 이 사진은
                        브라우저 안에서 만든 data URL이라 최적화할 것이 없고,
                        크기도 이미 240px로 줄여 두었습니다. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.photoThumb} src={draft.photo.dataUrl} alt="증명사진 미리보기" />
                    <button type="button" className={styles.removeButton} onClick={() => setDraft((current) => ({ ...current, photo: { ...current.photo, dataUrl: "" } }))}><X />사진 지우기</button>
                  </>
                : <label className={styles.photoPicker}>
                    <ImagePlus />
                    <span>사진 고르기</span>
                    <input type="file" accept="image/*" onChange={(event) => { void pickPhoto(event.target.files?.[0]); event.target.value = ""; }} />
                  </label>}
              <small className={styles.photoNote}>사진은 이 브라우저에만 저장됩니다. 폭 240px로 줄여 담습니다.</small>
            </div> : null}
            {photoError ? <p className={styles.photoError}>{photoError}</p> : null}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><BriefcaseBusiness /><h2>경력</h2><small>최근 것부터</small></div>
          {draft.careers.length ? draft.careers.map((career, index) => (
            <CareerFields
              key={career.id} career={career} index={index}
              onChange={(patch) => patchList("careers", career.id, patch)}
              onRemove={() => removeFromList("careers", career.id)}
            />
          )) : <p className={styles.emptyHint}>신입이라면 비워 두어도 됩니다. 아래 &quot;그 밖의 활동&quot;에 인턴·아르바이트·프로젝트를 적으세요.</p>}
          <button type="button" className={styles.addButton} onClick={() => setDraft((current) => ({ ...current, careers: [...current.careers, emptyCareer()] }))}><Plus />경력 추가</button>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><GraduationCap /><h2>학력</h2><small>최종 학력부터</small></div>
          {draft.educations.map((education, index) => (
            <EducationFields
              key={education.id} education={education} index={index}
              onChange={(patch) => patchList("educations", education.id, patch)}
              onRemove={() => removeFromList("educations", education.id)}
            />
          ))}
          <button type="button" className={styles.addButton} onClick={() => setDraft((current) => ({ ...current, educations: [...current.educations, emptyEducation()] }))}><Plus />학력 추가</button>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><Award /><h2>자격 · 어학</h2><small>선택</small></div>
          {draft.certificates.length ? draft.certificates.map((certificate) => (
            <CertificateFields
              key={certificate.id} certificate={certificate}
              onChange={(patch) => patchList("certificates", certificate.id, patch)}
              onRemove={() => removeFromList("certificates", certificate.id)}
            />
          )) : <p className={styles.emptyHint}>자격증, 어학 점수, 수료한 교육 과정을 적습니다.</p>}
          <button type="button" className={styles.addButton} onClick={() => setDraft((current) => ({ ...current, certificates: [...current.certificates, emptyCertificate()] }))}><Plus />자격 추가</button>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><Wrench /><h2>기술 · 역량</h2><small>선택</small></div>
          <div className={styles.field}>
            <label htmlFor="resume-skills">쉼표로 나눠 적으세요</label>
            <textarea id="resume-skills" value={draft.skills} onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value }))} placeholder="SPC 관리, MES, Excel(피벗·VLOOKUP), 사출 공정, 지게차 운전" />
            <small>다룰 줄 아는 장비·프로그램·공정을 적습니다. 공고에 적힌 말과 같은 표현을 쓰면 걸러지지 않습니다.</small>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><FileText /><h2>그 밖의 활동</h2><small>선택 · 수상, 교육, 대외활동, 프로젝트</small></div>
          {draft.extras.length ? draft.extras.map((extra) => (
            <ExtraFields
              key={extra.id} extra={extra}
              onChange={(patch) => patchList("extras", extra.id, patch)}
              onRemove={() => removeFromList("extras", extra.id)}
            />
          )) : <p className={styles.emptyHint}>경력이 짧을수록 이 칸이 중요합니다. 무엇을 했고 무엇이 달라졌는지 한 줄로 적으세요.</p>}
          <button type="button" className={styles.addButton} onClick={() => setDraft((current) => ({ ...current, extras: [...current.extras, emptyExtra()] }))}><Plus />활동 추가</button>
        </section>

        {/* 이력서를 다 적은 사람은 대개 자소서가 다음 순서입니다. 여기서
            끊기면 같은 내용을 자소서 화면에서 처음부터 다시 올려야 합니다.
            한때는 넘길 내용이 없으면 이 카드를 아예 감췄는데, 그러면 왜 없는지
            알 방법이 없었습니다. 자리는 지키고 이유를 적습니다. */}
        <section className={`${styles.section} ${styles.carryCard} ${canCarry ? "" : styles.carryIdle}`}>
          <div>
            <b>이 이력서로 자소서까지 이어서</b>
            <p>{canCarry
              ? "지금 적은 경력·학력·자격을 자소서 첨삭의 지원자료로 그대로 넘깁니다. 첨삭은 이 이력서와 자소서가 어긋나는 곳을 짚어 줍니다."
              : "경력·학력·자격·활동 중 하나라도 적으면 넘길 수 있습니다. 이름만 넘기면 자소서와 대조할 것이 없습니다."}</p>
          </div>
          <button type="button" onClick={carryToCoverLetter} disabled={!canCarry}>자소서 첨삭으로 이어가기 <ArrowRight /></button>
        </section>
      </div>

      <div className={`${styles.preview} ${tab === "edit" ? styles.hiddenOnPhone : ""}`}>
        <div className={styles.previewInner}>
          <div className={styles.previewHead}><Eye />미리보기 — 인쇄하면 이 모습 그대로 나옵니다</div>
          <article className={styles.paper}>
            {isEmpty ? <div className={styles.paperEmpty}><FileText /><p>왼쪽에 적으면 여기에 이력서가 그려집니다.</p></div> : <>
              <div className={styles.paperHead}>
                <div>
                  <h1 className={styles.paperName}>{draft.contact.name || "이름"}</h1>
                  {draft.contact.headline.trim() ? <p className={styles.paperHeadline}>{draft.contact.headline}</p> : null}
                  {hasContent([draft.contact.phone, draft.contact.email, draft.contact.address, draft.contact.birth]) ? (
                    <p className={styles.paperContact}>
                      {draft.contact.birth.trim() ? <span><UserRound />{draft.contact.birth}</span> : null}
                      {draft.contact.phone.trim() ? <span><Phone />{draft.contact.phone}</span> : null}
                      {draft.contact.email.trim() ? <span><Mail />{draft.contact.email}</span> : null}
                      {draft.contact.address.trim() ? <span><MapPin />{draft.contact.address}</span> : null}
                    </p>
                  ) : null}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {draft.photo.enabled && draft.photo.dataUrl ? <img className={styles.paperPhoto} src={draft.photo.dataUrl} alt="" /> : null}
              </div>
              <div className={styles.paperRule} />

              {filledCareers.length ? <section className={styles.paperSection}>
                <h3>경력</h3>
                {filledCareers.map((career) => <div key={career.id} className={styles.row}>
                  <div className={styles.rowMain}><b>{career.company}</b>{career.role.trim() ? <span>{career.role}</span> : null}</div>
                  <div className={styles.rowPeriod}>{career.period}</div>
                  {career.duties.trim() ? <p className={styles.rowDetail}>{career.duties}</p> : null}
                </div>)}
              </section> : null}

              {filledEducations.length ? <section className={styles.paperSection}>
                <h3>학력</h3>
                {filledEducations.map((education) => <div key={education.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <b>{education.school}</b>
                    {education.major.trim() ? <span>{education.major}{education.status.trim() ? ` · ${education.status}` : ""}</span> : education.status.trim() ? <span>{education.status}</span> : null}
                  </div>
                  <div className={styles.rowPeriod}>{education.period}</div>
                  {education.note.trim() ? <p className={styles.rowDetail}>{education.note}</p> : null}
                </div>)}
              </section> : null}

              {filledCertificates.length ? <section className={styles.paperSection}>
                <h3>자격 · 어학</h3>
                {filledCertificates.map((certificate) => <div key={certificate.id} className={styles.row}>
                  <div className={styles.rowMain}><b>{certificate.name}</b>{certificate.issuer.trim() ? <span>{certificate.issuer}</span> : null}</div>
                  <div className={styles.rowPeriod}>{certificate.date}</div>
                </div>)}
              </section> : null}

              {skills.length ? <section className={styles.paperSection}>
                <h3>기술 · 역량</h3>
                <div className={styles.skillList}>{skills.map((skill) => <em key={skill}>{skill}</em>)}</div>
              </section> : null}

              {filledExtras.length ? <section className={styles.paperSection}>
                <h3>그 밖의 활동</h3>
                {filledExtras.map((extra) => <div key={extra.id} className={styles.row}>
                  <div className={styles.rowMain}><b>{extra.title}</b></div>
                  <div className={styles.rowPeriod}>{extra.period}</div>
                  {extra.detail.trim() ? <p className={styles.rowDetail}>{extra.detail}</p> : null}
                </div>)}
              </section> : null}
            </>}
          </article>
        </div>
      </div>
    </div>
  </div>;
}

function EntryShell({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return <div className={styles.entry}>
    <div className={styles.entryHead}>
      <b>{title}</b>
      <button type="button" className={styles.removeButton} onClick={onRemove}><Trash2 />삭제</button>
    </div>
    <div className={styles.grid}>{children}</div>
  </div>;
}

function CareerFields({ career, index, onChange, onRemove }: { career: ResumeCareer; index: number; onChange: (patch: Partial<ResumeCareer>) => void; onRemove: () => void }) {
  return <EntryShell title={`경력 ${index + 1}`} onRemove={onRemove}>
    <div className={styles.field}>
      <label htmlFor={`career-company-${career.id}`}>회사명</label>
      <input id={`career-company-${career.id}`} value={career.company} onChange={(event) => onChange({ company: event.target.value })} placeholder="○○정밀" />
    </div>
    <div className={styles.field}>
      <label htmlFor={`career-period-${career.id}`}>재직 기간</label>
      <input id={`career-period-${career.id}`} value={career.period} onChange={(event) => onChange({ period: event.target.value })} placeholder="2021.03 ~ 2024.07" />
    </div>
    <div className={`${styles.field} ${styles.wide}`}>
      <label htmlFor={`career-role-${career.id}`}>부서 · 직위</label>
      <input id={`career-role-${career.id}`} value={career.role} onChange={(event) => onChange({ role: event.target.value })} placeholder="품질관리팀 · 주임" />
    </div>
    <div className={`${styles.field} ${styles.wide}`}>
      <label htmlFor={`career-duties-${career.id}`}>한 일</label>
      <textarea id={`career-duties-${career.id}`} value={career.duties} onChange={(event) => onChange({ duties: event.target.value })} placeholder={"한 줄에 하나씩 적으세요.\n- 사출 공정 불량률 주간 집계, 원인 분석 보고\n- 신규 검사 기준서 작성 후 팀 교육"} />
      <small>맡은 일보다 <b>실제로 한 일</b>을 적습니다. 숫자가 있으면 함께 적으세요 — 없는 숫자를 지어내지는 마세요.</small>
    </div>
  </EntryShell>;
}

function EducationFields({ education, index, onChange, onRemove }: { education: ResumeEducation; index: number; onChange: (patch: Partial<ResumeEducation>) => void; onRemove: () => void }) {
  return <EntryShell title={`학력 ${index + 1}`} onRemove={onRemove}>
    <div className={styles.field}>
      <label htmlFor={`edu-school-${education.id}`}>학교명</label>
      <input id={`edu-school-${education.id}`} value={education.school} onChange={(event) => onChange({ school: event.target.value })} placeholder="○○대학교" />
    </div>
    <div className={styles.field}>
      <label htmlFor={`edu-period-${education.id}`}>기간</label>
      <input id={`edu-period-${education.id}`} value={education.period} onChange={(event) => onChange({ period: event.target.value })} placeholder="2014.03 ~ 2020.02" />
    </div>
    <div className={styles.field}>
      <label htmlFor={`edu-major-${education.id}`}>전공 · 과정</label>
      <input id={`edu-major-${education.id}`} value={education.major} onChange={(event) => onChange({ major: event.target.value })} placeholder="기계공학과" />
    </div>
    <div className={styles.field}>
      <label htmlFor={`edu-status-${education.id}`}>상태</label>
      <select id={`edu-status-${education.id}`} value={education.status} onChange={(event) => onChange({ status: event.target.value })}>
        <option>졸업</option><option>재학</option><option>휴학</option><option>수료</option><option>중퇴</option><option>졸업예정</option>
      </select>
    </div>
    <div className={`${styles.field} ${styles.wide}`}>
      <label htmlFor={`edu-note-${education.id}`}>덧붙일 것</label>
      <input id={`edu-note-${education.id}`} value={education.note} onChange={(event) => onChange({ note: event.target.value })} placeholder="학점 3.8/4.5, 졸업작품 ○○ (선택)" />
    </div>
  </EntryShell>;
}

function CertificateFields({ certificate, onChange, onRemove }: { certificate: ResumeCertificate; onChange: (patch: Partial<ResumeCertificate>) => void; onRemove: () => void }) {
  return <EntryShell title="자격 · 어학" onRemove={onRemove}>
    <div className={styles.field}>
      <label htmlFor={`cert-name-${certificate.id}`}>이름</label>
      <input id={`cert-name-${certificate.id}`} value={certificate.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="지게차운전기능사" />
    </div>
    <div className={styles.field}>
      <label htmlFor={`cert-date-${certificate.id}`}>취득일</label>
      <input id={`cert-date-${certificate.id}`} value={certificate.date} onChange={(event) => onChange({ date: event.target.value })} placeholder="2023.08" />
    </div>
    <div className={`${styles.field} ${styles.wide}`}>
      <label htmlFor={`cert-issuer-${certificate.id}`}>발급 기관 · 점수</label>
      <input id={`cert-issuer-${certificate.id}`} value={certificate.issuer} onChange={(event) => onChange({ issuer: event.target.value })} placeholder="한국산업인력공단 / TOEIC 820점" />
    </div>
  </EntryShell>;
}

function ExtraFields({ extra, onChange, onRemove }: { extra: ResumeExtra; onChange: (patch: Partial<ResumeExtra>) => void; onRemove: () => void }) {
  return <EntryShell title="활동" onRemove={onRemove}>
    <div className={styles.field}>
      <label htmlFor={`extra-title-${extra.id}`}>제목</label>
      <input id={`extra-title-${extra.id}`} value={extra.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="○○ 공모전 장려상 / 스마트팩토리 교육 수료" />
    </div>
    <div className={styles.field}>
      <label htmlFor={`extra-period-${extra.id}`}>시기</label>
      <input id={`extra-period-${extra.id}`} value={extra.period} onChange={(event) => onChange({ period: event.target.value })} placeholder="2023.11" />
    </div>
    <div className={`${styles.field} ${styles.wide}`}>
      <label htmlFor={`extra-detail-${extra.id}`}>내용</label>
      <textarea id={`extra-detail-${extra.id}`} value={extra.detail} onChange={(event) => onChange({ detail: event.target.value })} placeholder="무엇을 했고 무엇이 달라졌는지 한두 줄로" />
    </div>
  </EntryShell>;
}
