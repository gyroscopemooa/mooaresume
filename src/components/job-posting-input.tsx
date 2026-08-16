"use client";

import { useState } from "react";
import { FileText, Image as ImageIcon, Link2, Paperclip, X } from "lucide-react";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import styles from "./job-posting-input.module.css";

type Props = {
  url: string;
  text: string;
  filenames: string[];
  onUrlChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onFilenamesChange: (value: string[]) => void;
};

const urlPattern = /https?:\/\/[^\s]+/i;

export function JobPostingInput({
  url,
  text,
  filenames,
  onUrlChange,
  onTextChange,
  onFilenamesChange,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const value = text || url;
  const detectedUrl = value.match(urlPattern)?.[0] ?? url;

  function update(valueNext: string) {
    const trimmed = valueNext.trim();
    const matchedUrl = valueNext.match(urlPattern)?.[0] ?? "";
    onUrlChange(matchedUrl);
    onTextChange(/^https?:\/\/\S+$/i.test(trimmed) ? "" : valueNext);
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
          <span>
            공백 제외 {countNonWhitespaceCharacters([text]).toLocaleString()} /
            20,000자
          </span>
        </footer>
        <p className={styles.dropHint}>파일을 끌어다 놓거나 첨부 버튼으로 올릴 수 있어요.</p>
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
