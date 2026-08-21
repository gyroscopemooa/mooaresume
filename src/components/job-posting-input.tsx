"use client";

import { useState } from "react";
import { Download, FileText, Image as ImageIcon, Link2, LoaderCircle, Paperclip, X } from "lucide-react";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import { findJobPostingUrl, parseJobPostingInput } from "@/domain/job-posting-source";
import styles from "./job-posting-input.module.css";

type Props = {
  url: string;
  text: string;
  filenames: string[];
  onUrlChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onFilenamesChange: (value: string[]) => void;
};



export function JobPostingInput({
  url,
  text,
  filenames,
  onUrlChange,
  onTextChange,
  onFilenamesChange,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkMessage, setLinkMessage] = useState("");
  const value = text || url;
  const detectedUrl = findJobPostingUrl(value) || url;

  function update(valueNext: string) {
    const parsed = parseJobPostingInput(valueNext);
    onUrlChange(parsed.url);
    onTextChange(parsed.text);
  }

  /**
   * Experimental. Nothing here opens the link during analysis — the fetched
   * text is written straight into the field above so the applicant reads and
   * corrects it before paying. When a posting cannot be read (details drawn by
   * script, or posted as an image) we say so rather than guessing.
   */
  async function loadLink() {
    if (!detectedUrl || loadingLink) return;
    setLoadingLink(true);
    setLinkMessage("");
    try {
      const response = await fetch("/api/job-postings/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: detectedUrl }),
      });
      const result: unknown = await response.json();
      const parsed = result && typeof result === "object" ? result as Record<string, unknown> : {};
      if (parsed.ok === true && typeof parsed.text === "string") {
        onTextChange(`${detectedUrl}

${parsed.text}`);
        setLinkMessage(parsed.truncated === true
          ? "공고 내용을 가져왔어요. 너무 길어 앞부분만 담았으니 확인해 주세요."
          : "공고 내용을 가져왔어요. 내용이 맞는지 확인하고 필요하면 고쳐 주세요.");
        return;
      }
      setLinkMessage("이 링크에서는 공고 내용을 읽지 못했어요. 공고 상세 내용을 복사해 붙여넣어 주세요.");
    } catch {
      setLinkMessage("공고를 가져오지 못했어요. 공고 상세 내용을 복사해 붙여넣어 주세요.");
    } finally {
      setLoadingLink(false);
    }
  }

  function addFiles(fileList: FileList | null) {
    const next = Array.from(fileList ?? []).map((file) => file.name);
    onFilenamesChange(Array.from(new Set([...filenames, ...next])));
  }

  const sourceLabel = detectedUrl
    ? "채용공고 링크로 인식했어요."
    : text.trim()
      ? "채용공고 내용으로 인식했어요."
      : filenames.length
        ? "첨부한 채용공고를 사용합니다."
        : "";

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <div>
          <span>
            채용공고 <b>필수</b>
          </span>
          <h3>채용공고를 한 번에 가져오세요.</h3>
          <p>
            링크를 붙여넣거나, 내용을 직접 입력하거나, 파일을 첨부할 수 있어요.
          </p>
        </div>
        <small>한 가지 방법만 있어도 가능</small>
      </div>
      <div
        className={styles.composer + (dragging ? " " + styles.dragging : "")}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
      >
        {filenames.length > 0 && (
          <div className={styles.files}>
            {filenames.map((filename) => (
              <span key={filename}>
                {/\.(png|jpe?g|webp)$/i.test(filename) ? (
                  <ImageIcon />
                ) : (
                  <FileText />
                )}
                <b>{filename}</b>
                <button
                  type="button"
                  aria-label={`${filename} 제거`}
                  onClick={() =>
                    onFilenamesChange(
                      filenames.filter((item) => item !== filename),
                    )
                  }
                >
                  <X />
                </button>
              </span>
            ))}
          </div>
        )}
        <textarea
          rows={2}
          value={value}
          onChange={(event) => update(event.target.value)}
          placeholder={
            "채용공고 링크를 붙여넣거나 내용을 입력하세요.\n\n파일과 함께 “생산직 직무 위주로 봐주세요”처럼 메모를 남겨도 돼요."
          }
        />
        <footer>
          <label>
            <Paperclip /> 파일 첨부
            <input
              type="file"
              accept="image/*,.pdf,.docx,.txt"
              multiple
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {detectedUrl && (
            <button type="button" className={styles.linkLoad} onClick={() => void loadLink()} disabled={loadingLink}>
              {loadingLink ? <LoaderCircle className={styles.spin} /> : <Download />}
              {loadingLink ? "불러오는 중" : "링크 내용 불러오기"}
              <small>실험적</small>
            </button>
          )}
          <span>
            공백 제외 {countNonWhitespaceCharacters([text]).toLocaleString()} /
            20,000자
          </span>
        </footer>
        <p className={styles.dropHint}>파일을 끌어다 놓거나 첨부 버튼으로 올릴 수 있어요.</p>
        {linkMessage && <p className={styles.linkMessage}>{linkMessage}</p>}
      </div>
      {sourceLabel && (
        <div className={styles.detected}>
          {detectedUrl ? <Link2 /> : <FileText />}
          <span>
            <b>{sourceLabel}</b>
            <small>
              실제 페이지 읽기·문서 추출·AI 분석은 결제 후 한 번만 진행합니다.
            </small>
          </span>
        </div>
      )}
      <p className={styles.privacy}>
        지금은 서버나 AI로 전송하지 않습니다. URL·파일·텍스트 출처는 내부에서
        구분해 해당 지원 건에 저장합니다.
      </p>
    </section>
  );
}
