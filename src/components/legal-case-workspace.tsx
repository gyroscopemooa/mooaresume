"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, ArrowRight, CheckCircle2, Download, FileText, Loader2, Save, Scale, Trash2, UploadCloud,
} from "lucide-react";
import { ARCHIVE_DOCUMENT_ACCEPT, extractLocalDocuments } from "@/lib/local-document";
import { checkUploads, describeRejections, formatBytes } from "@/domain/upload-limits";
import {
  countLegalCaseSourceCharacters, findLegalDocumentDefinition, hasEnoughLegalCaseSource, orderLegalDocuments,
  LEGAL_CASE_MAX_MATERIALS, LEGAL_CASE_MIN_SOURCE_CHARS, LEGAL_CASE_TYPE_LABEL, LEGAL_DISCLAIMER,
  LEGAL_DOCUMENT_BUILD_PRICE_KRW, LEGAL_DOCUMENT_STAGE_LABEL, LEGAL_DOCUMENT_STAGE_ORDER,
  LEGAL_MATERIAL_KIND_LABEL, LEGAL_MATERIAL_KIND_ORDER, LEGAL_PARTY_ROLE_LABEL,
  legalCaseTypeSchema, legalPartyRoleSchema,
  type LegalCase, type LegalCaseDocument, type LegalCaseMaterial, type LegalDocumentOutput, type LegalDocumentType,
  type LegalMaterialKind,
} from "@/domain/legal-case";
import { buildDocx, DOCX_MIME_TYPE, type DocxBlock } from "@/lib/docx";
import styles from "./document-build-tool.module.css";

/**
 * 사건 작업 화면.
 *
 * 다른 제작 도구와 화면 구성은 같습니다(왼쪽 입력, 오른쪽 결과). 다른 점은
 * **한 번 쓰고 끝나지 않는다**는 것입니다. 왼쪽에 쌓인 자료가 사건에 저장되고,
 * 오른쪽에서 문서를 하나씩 만들어 갑니다 — 소장을 쓸 때 넣은 계약서가 석 달
 * 뒤 준비서면에도 그대로 쓰입니다.
 *
 * 그래서 여기서는 "서버에 저장하지 않습니다"라고 말하지 않습니다. 저장이 곧
 * 기능이므로, 대신 저장된다는 사실과 지우는 방법을 화면에서 말합니다.
 */

type Phase = "idle" | "creating" | "running";

function outputToDocxBlocks(output: LegalDocumentOutput): DocxBlock[] {
  const blocks: DocxBlock[] = [{ text: output.title || "서면", style: "title" }];
  if (output.headline) blocks.push({ text: output.headline, style: "body" });

  for (const section of output.sections) {
    if (section.heading) blocks.push({ text: section.heading, style: "heading" });
    if (section.body) blocks.push({ text: section.body, style: "body" });
    for (const bullet of section.bullets) blocks.push({ text: `- ${bullet}`, style: "body" });
  }

  if (output.issues.length) {
    blocks.push({ text: "쟁점", style: "heading" });
    for (const issue of output.issues) {
      blocks.push({ text: issue.label, style: "body" });
      if (issue.myPosition) blocks.push({ text: `  내 주장: ${issue.myPosition}`, style: "body" });
      if (issue.theirPosition) blocks.push({ text: `  상대 주장: ${issue.theirPosition}`, style: "body" });
      if (issue.evidence) blocks.push({ text: `  증거: ${issue.evidence}`, style: "body" });
      if (issue.needed) blocks.push({ text: `  더 필요한 것: ${issue.needed}`, style: "body" });
    }
  }

  if (output.evidenceItems.length) {
    blocks.push({ text: "입증방법", style: "heading" });
    for (const item of output.evidenceItems) {
      blocks.push({ text: `${item.marker ? `${item.marker} ` : ""}${item.name}${item.purpose ? ` — ${item.purpose}` : ""}`, style: "body" });
    }
  }

  if (output.deadlines.length) {
    blocks.push({ text: "기한 안내", style: "heading" });
    for (const deadline of output.deadlines) blocks.push({ text: `${deadline.label}: ${deadline.detail}`, style: "body" });
  }

  if (output.notes.length) {
    blocks.push({ text: "확인이 필요합니다", style: "heading" });
    for (const note of output.notes) blocks.push({ text: `- ${note}`, style: "body" });
  }

  return blocks;
}

function DocumentPreview({ output }: { output: LegalDocumentOutput }) {
  return <>
    {output.headline && <p className={styles.previewHeadline}>{output.headline}</p>}
    <div className={styles.entries}>
      {output.sections.map((section, index) => <div key={index} className={styles.entry}>
        <div className={styles.entryHead}><b>{section.heading}</b></div>
        {section.body && <p className={styles.entrySub}>{section.body}</p>}
        {section.bullets.length > 0 && <ul>{section.bullets.map((bullet, order) => <li key={order}>{bullet}</li>)}</ul>}
        {section.evidence && <p className={styles.evidence}>근거: {section.evidence}</p>}
      </div>)}
    </div>

    {output.issues.length > 0 && <>
      <p className={styles.supportTitle}>쟁점</p>
      <ul className={styles.support}>
        {output.issues.map((issue, index) => <li key={index}>
          <b>{issue.label}</b>
          {issue.myPosition && <div><span>내 주장 · {issue.myPosition}</span></div>}
          {issue.theirPosition && <div><span>상대 주장 · {issue.theirPosition}</span></div>}
          {issue.evidence && <div><span>증거 · {issue.evidence}</span></div>}
          {issue.needed && <div><span>더 필요한 것 · {issue.needed}</span></div>}
        </li>)}
      </ul>
    </>}

    {output.evidenceItems.length > 0 && <>
      <p className={styles.supportTitle}>입증방법</p>
      <ul className={styles.support}>
        {output.evidenceItems.map((item, index) => <li key={index}>
          <b>{item.marker ? `${item.marker} ` : ""}{item.name}</b>
          {item.purpose && <div><span>{item.purpose}</span></div>}
        </li>)}
      </ul>
    </>}

    {output.deadlines.length > 0 && <div className={styles.notes}>
      <b>기한 안내</b>
      <ul>{output.deadlines.map((deadline, index) => <li key={index}>{deadline.label}: {deadline.detail}</li>)}</ul>
    </div>}

    {output.notes.length > 0 && <div className={styles.notes}>
      <b>확인이 필요합니다</b>
      <ul>{output.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </div>}
  </>;
}

export function LegalCaseWorkspace({ initialCase, initialMaterials, initialDocuments }: {
  initialCase: LegalCase;
  initialMaterials: LegalCaseMaterial[];
  initialDocuments: LegalCaseDocument[];
}) {
  const [legalCase, setLegalCase] = useState(initialCase);
  const [materials, setMaterials] = useState(initialMaterials);
  const [documents, setDocuments] = useState(initialDocuments);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(initialDocuments[0]?.id ?? null);
  const [selectedType, setSelectedType] = useState<LegalDocumentType>("CASE_ANALYSIS");
  const [phase, setPhase] = useState<Phase>("idle");
  const [savingCase, setSavingCase] = useState(false);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadKind, setUploadKind] = useState<LegalMaterialKind>("CONTRACT");
  const restored = useRef(false);

  const characters = countLegalCaseSourceCharacters({ summary: legalCase.summary, materials });
  const enough = hasEnoughLegalCaseSource({ summary: legalCase.summary, materials });
  const activeDocument = documents.find((document) => document.id === activeDocumentId) ?? null;
  const ordered = orderLegalDocuments(legalCase.myRole);

  const runBuild = useCallback(async (buildId: string) => {
    setPhase("running");
    setMessage("");
    try {
      const response = await fetch(`/api/legal-cases/${initialCase.id}/builds/${buildId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setPhase("idle");
        setMessage(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "문서를 만들지 못했습니다.");
        return;
      }
      const created = (body as { document?: LegalCaseDocument }).document;
      if (!created) {
        setPhase("idle");
        setMessage("결과를 읽지 못했습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
        return;
      }
      setDocuments((current) => [created, ...current]);
      setActiveDocumentId(created.id);
      setPhase("idle");
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setPhase("idle");
      setMessage("연결이 끊겼습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
    }
  }, [initialCase.id]);

  /** 결제를 마치고 돌아온 길이면 바로 만듭니다. 여기서 단추를 한 번 더 누르게 하면 절반은 그 단추를 못 찾습니다. */
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const params = new URLSearchParams(window.location.search);
    const buildId = params.get("legal_build");
    if (!buildId || params.get("checkout") !== "success") return;
    void (async () => {
      // 사건 화면을 한 번 그린 뒤에 시작합니다. 효과 본문에서 곧바로 상태를
      // 바꾸면 그리기가 겹치고, 결제하고 돌아온 사람은 자기 사건을 보기도 전에
      // 로딩만 마주합니다.
      await Promise.resolve();
      await runBuild(buildId);
    })();
  }, [runBuild]);

  async function saveCase(): Promise<boolean> {
    setSavingCase(true);
    setMessage("");
    try {
      const response = await fetch(`/api/legal-cases/${legalCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: legalCase.title, caseType: legalCase.caseType, myRole: legalCase.myRole, summary: legalCase.summary }),
      });
      setSavingCase(false);
      if (!response.ok) { setMessage("사건 정보를 저장하지 못했습니다."); return false; }
      return true;
    } catch {
      setSavingCase(false);
      setMessage("사건 정보를 저장하지 못했습니다.");
      return false;
    }
  }

  async function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    setMessage("");
    const bytes = materials.reduce((total, material) => total + material.sizeBytes, 0);
    const { accepted, rejected } = checkUploads(incoming, { count: materials.length, bytes });
    if (rejected.length) setMessage(describeRejections(rejected));
    if (!accepted.length) return;

    setReading(true);
    const payload: Array<{ kind: LegalMaterialKind; filename: string; text: string; sizeBytes: number }> = [];
    for (const file of accepted) {
      try {
        const batch = await extractLocalDocuments(file);
        for (const document of batch.documents) {
          if (document.unreadable || !document.text.trim()) {
            setMessage(`${document.filename}은(는) 글자가 없는 스캔본이라 읽지 못했습니다. 그 내용을 사건 경위에 직접 적어 주세요.`);
            continue;
          }
          payload.push({ kind: uploadKind, filename: document.filename, text: document.text, sizeBytes: document.sizeBytes });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : `${file.name}을(를) 읽지 못했습니다.`);
      }
    }
    setReading(false);
    if (!payload.length) return;

    try {
      const response = await fetch(`/api/legal-cases/${legalCase.id}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materials: payload }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setMessage(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "자료를 저장하지 못했습니다.");
        return;
      }
      const created = (body as { materials?: LegalCaseMaterial[] }).materials ?? [];
      setMaterials((current) => [...current, ...created]);
    } catch {
      setMessage("자료를 저장하지 못했습니다.");
    }
  }

  async function removeMaterial(materialId: string) {
    setMaterials((current) => current.filter((material) => material.id !== materialId));
    try {
      await fetch(`/api/legal-cases/${legalCase.id}/materials`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });
    } catch {
      setMessage("자료를 지우지 못했습니다. 새로고침하면 다시 보일 수 있습니다.");
    }
  }

  async function startCheckout() {
    // 결제로 나가기 전에 사건 정보를 먼저 저장합니다.
    //
    // 문서를 만드는 쪽은 브라우저가 보낸 값이 아니라 **저장된 사건**을 읽습니다.
    // 그래서 사건 경위를 길게 적어 놓고 저장을 누르지 않은 채 결제하면, 결제는
    // 됐는데 "자료가 너무 적다"며 막히는 일이 생깁니다. 돈이 오간 다음에
    // 알게 되는 것이 최악이라 여기서 먼저 맞춥니다.
    if (!(await saveCase())) return;
    setPhase("creating");
    setMessage("");
    try {
      const response = await fetch(`/api/legal-cases/${legalCase.id}/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: selectedType }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !body || typeof body !== "object" || !("checkoutUrl" in body) || typeof body.checkoutUrl !== "string") {
        setPhase("idle");
        setMessage(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "결제 페이지로 연결하지 못했습니다.");
        return;
      }
      window.location.assign(body.checkoutUrl);
    } catch {
      setPhase("idle");
      setMessage("결제 페이지로 연결하지 못했습니다. 아무것도 청구되지 않았습니다.");
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function downloadDocx() {
    if (!activeDocument) return;
    const blob = new Blob([buildDocx(outputToDocxBlocks(activeDocument.output))], { type: DOCX_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeDocument.title || "서면"}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const busy = phase !== "idle";
  const selected = findLegalDocumentDefinition(selectedType);

  return <section className={styles.page} aria-labelledby="legal-case-title">
    <div className={styles.head}>
      <h1 id="legal-case-title">{legalCase.title}</h1>
      <p>자료를 한 번 넣어 두면 이 사건에서 만드는 모든 문서가 같은 자료를 씁니다. 문서를 만들 때마다 다시 올리지 않으셔도 됩니다.</p>
      <div className={styles.priceRow}>
        <span className={styles.priceTag}><b>{LEGAL_DOCUMENT_BUILD_PRICE_KRW.toLocaleString()}원</b><small>&nbsp;· 문서 1건 · 부가세 포함</small></span>
      </div>
    </div>

    <div className={styles.layout}>
      <div className={styles.card}>
        <p className={styles.sectionLabel}><Scale />사건 정보</p>

        <div className={styles.field}>
          <label htmlFor="legal-title">사건 이름</label>
          <input id="legal-title" type="text" value={legalCase.title} maxLength={120} onChange={(event) => setLegalCase((current) => ({ ...current, title: event.target.value }))} />
        </div>

        <div className={styles.field}>
          <label htmlFor="legal-type">사건 종류</label>
          <select
            id="legal-type"
            value={legalCase.caseType}
            onChange={(event) => setLegalCase((current) => ({ ...current, caseType: legalCaseTypeSchema.parse(event.target.value) }))}
          >
            {legalCaseTypeSchema.options.map((option) => <option key={option} value={option}>{LEGAL_CASE_TYPE_LABEL[option]}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="legal-role">내 지위</label>
          <select
            id="legal-role"
            value={legalCase.myRole}
            onChange={(event) => setLegalCase((current) => ({ ...current, myRole: legalPartyRoleSchema.parse(event.target.value) }))}
          >
            {legalPartyRoleSchema.options.map((option) => <option key={option} value={option}>{LEGAL_PARTY_ROLE_LABEL[option]}</option>)}
          </select>
          <small>이 값에 따라 먼저 보여 줄 문서가 달라집니다. 소장을 받으셨다면 답변서가 앞으로 옵니다.</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="legal-summary">사건 경위</label>
          <textarea
            id="legal-summary"
            value={legalCase.summary}
            maxLength={4_000}
            rows={7}
            onChange={(event) => setLegalCase((current) => ({ ...current, summary: event.target.value }))}
            placeholder={"언제 무슨 일이 있었는지 시간 순서대로 적어 주세요.\n예) 2024년 3월 1일 상대방에게 500만원을 빌려주었고, 차용증을 썼습니다. 2024년 9월까지 갚기로 했는데 지금까지 갚지 않았습니다."}
          />
          <small>{legalCase.summary.length.toLocaleString()} / 4,000자 · 파일을 올려도 이 칸에 더 적을 수 있습니다.</small>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => void saveCase()} disabled={savingCase}>
            {savingCase ? <Loader2 className={styles.spin} /> : <Save style={{ width: 14, verticalAlign: "-2px" }} />} 사건 정보 저장
          </button>
        </div>

        <div className={styles.field} style={{ marginTop: 18 }}>
          <span className={styles.fieldLabel}>자료 올리기 <small>최대 {LEGAL_CASE_MAX_MATERIALS}개</small></span>
          <select
            aria-label="올릴 자료의 종류"
            value={uploadKind}
            onChange={(event) => setUploadKind(event.target.value as LegalMaterialKind)}
          >
            {LEGAL_MATERIAL_KIND_ORDER.map((kind) => <option key={kind} value={kind}>{LEGAL_MATERIAL_KIND_LABEL[kind]}</option>)}
          </select>
          <label
            className={`${styles.dropzone} ${dragging ? styles.dropzoneOn : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {reading ? <Loader2 className={styles.spin} /> : <UploadCloud />}
            <b>{reading ? "파일을 읽고 있습니다" : "여기로 끌어다 놓거나 눌러서 고르세요"}</b>
            <small>위에서 고른 종류로 저장됩니다 · 계약서 · 문자 · 녹취록 · 판결문 · 상대 서면 (PDF · DOCX · TXT · ZIP)</small>
            <input type="file" multiple accept={ARCHIVE_DOCUMENT_ACCEPT} onChange={onPick} disabled={busy} />
          </label>

          {materials.length > 0 && <ul className={styles.fileList}>
            {materials.map((material) => <li key={material.id}>
              <FileText />
              <div>
                <b>{material.filename}</b>
                <small>{LEGAL_MATERIAL_KIND_LABEL[material.kind]} · {formatBytes(material.sizeBytes)} · {material.text.trim().length.toLocaleString()}자</small>
              </div>
              <span />
              <button type="button" aria-label={`${material.filename} 지우기`} onClick={() => void removeMaterial(material.id)}><Trash2 /></button>
            </li>)}
          </ul>}
        </div>

        {message && <p className={styles.message}><AlertCircle />{message}</p>}

        <p className={styles.disclaimer}>
          <b>이 사건의 자료는 저장됩니다.</b> 다음에 다시 오셔도 이어서 쓸 수 있게 하기 위해서입니다. 본인만 볼 수 있고, 사건을 지우면 자료와 문서도 함께 지워집니다. {LEGAL_DISCLAIMER}
        </p>
      </div>

      <div className={`${styles.card} ${styles.previewCard}`}>
        <div className={styles.previewHead}>
          <p className={styles.sectionLabel}><FileText />문서 만들기</p>
          <span className={styles.sampleBadge}>{characters.toLocaleString()}자</span>
        </div>

        {LEGAL_DOCUMENT_STAGE_ORDER.map((stage) => {
          const items = ordered.filter((definition) => definition.stage === stage);
          if (!items.length) return null;
          return <div key={stage}>
            <p className={styles.stageLabel}>{LEGAL_DOCUMENT_STAGE_LABEL[stage]}</p>
            <div className={styles.docGrid}>
              {items.map((definition) => {
                const made = documents.some((document) => document.docType === definition.type);
                return <button
                  key={definition.type}
                  type="button"
                  className={styles.docTile}
                  aria-pressed={selectedType === definition.type}
                  onClick={() => setSelectedType(definition.type)}
                >
                  <b>{definition.label}</b>
                  <small>{definition.summary}</small>
                  {made && <span className={styles.docTileDone}><CheckCircle2 />만든 적 있음</span>}
                </button>;
              })}
            </div>
          </div>;
        })}

        <div className={styles.notes} style={{ marginTop: 16 }}>
          <b>{selected.label}</b>
          <ul><li>{selected.whenToUse}</li></ul>
        </div>

        <footer className={styles.footer}>
          <div className={styles.summary}>
            <b>{selected.label}</b>
            <small>{enough ? "지금 자료로 만들 수 있습니다." : `사건 경위나 자료가 조금 더 필요합니다(최소 ${LEGAL_CASE_MIN_SOURCE_CHARS}자).`}</small>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.buy}
              disabled={busy || !enough}
              title={enough ? undefined : "사건 경위를 조금 더 적어 주세요."}
              onClick={() => void startCheckout()}
            >
              {busy ? <><Loader2 className={styles.spin} />{phase === "running" ? "문서를 만드는 중" : "결제 페이지로 이동 중"}</> : <>{LEGAL_DOCUMENT_BUILD_PRICE_KRW.toLocaleString()}원 · 이 문서 만들기<ArrowRight /></>}
            </button>
          </div>
          <p className={styles.terms}>문서 1건 정액 {LEGAL_DOCUMENT_BUILD_PRICE_KRW.toLocaleString()}원(부가세 포함). 사건을 만들고 자료를 올리는 것은 무료입니다. 결과가 나오지 않으면 결제한 건이 그대로 남아 다시 시도할 수 있고, 그래도 실패하면 환불해 드립니다.</p>
        </footer>

        {documents.length > 0 && <>
          <p className={styles.stageLabel}>만든 문서</p>
          <div className={styles.docGrid}>
            {documents.map((document) => <button
              key={document.id}
              type="button"
              className={styles.docTile}
              aria-pressed={activeDocumentId === document.id}
              onClick={() => setActiveDocumentId(document.id)}
            >
              <b>{document.title || findLegalDocumentDefinition(document.docType).label}</b>
              <small>{new Date(document.createdAt).toLocaleDateString("ko-KR")}</small>
            </button>)}
          </div>
        </>}

        {phase === "running" && <div className={styles.emptyState}>
          <Loader2 className={styles.spin} />
          <p>사건 자료를 읽고 문서를 만들고 있습니다. 최대 3분 정도 걸립니다.</p>
        </div>}

        {activeDocument && phase !== "running" && <div style={{ marginTop: 18 }}>
          <div className={styles.previewHead}>
            <p className={styles.sectionLabel}>{activeDocument.title}</p>
            <span className={styles.doneBadge}><CheckCircle2 />내 결과</span>
          </div>
          <DocumentPreview output={activeDocument.output} />
          <div className={styles.downloadRow}>
            <button type="button" className={styles.download} onClick={downloadDocx}><Download />DOCX로 저장</button>
          </div>
        </div>}

        {!activeDocument && phase !== "running" && <div className={styles.emptyState}>
          <FileText />
          <p>아직 만든 문서가 없습니다. 위에서 문서를 고르고 만들어 보세요.<br />무엇부터 할지 모르시겠다면 <b>사건 분석 · 주요쟁점 정리</b>부터 권합니다.</p>
        </div>}
      </div>
    </div>
  </section>;
}
