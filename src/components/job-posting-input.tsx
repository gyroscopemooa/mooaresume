"use client";

import { useState } from "react";
import { Download, FileText, Image as ImageIcon, Link2, LoaderCircle, Paperclip, X } from "lucide-react";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import { findJobPostingUrl, hasJobPostingText, parseJobPostingInput } from "@/domain/job-posting-source";
import { usePostingLink } from "@/lib/use-posting-link";
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
  const value = text || url;
  const detectedUrl = findJobPostingUrl(value) || url;

  function update(valueNext: string) {
    const parsed = parseJobPostingInput(valueNext);
    onUrlChange(parsed.url);
    onTextChange(parsed.text);
  }

  const { loading: loadingLink, message: linkMessage, retry: loadLink } = usePostingLink(hasJobPostingText(text) ? null : detectedUrl || null, (body, sourceUrl) => {
    onUrlChange(sourceUrl);
    onTextChange(`${sourceUrl}\n\n${body}`);
  });

  function addFiles(fileList: FileList | null) {
    const next = Array.from(fileList ?? []).map((file) => file.name);
    onFilenamesChange(Array.from(new Set([...filenames, ...next])));
  }

  const sourceLabel = hasJobPostingText(text) ? "공고 본문이 입력됐어요. 지원 직무가 포함됐는지 확인해 주세요." : detectedUrl
    ? "채용공고 링크로 인식했어요."
    : text.trim()
      ? "채용공고 내용으로 인식했어요."
      : filenames.length
        ? "파일명만 등록됐습니다. 분석할 공고 본문을 직접 붙여넣어 주세요."
        : "";

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <div>
          <span>
            채용공고 <b>공고 대조에 필요</b>
          </span>
          <h3>채용공고를 한 번에 가져오세요.</h3>
          <p>
            링크를 붙여넣거나, 내용을 직접 입력하거나, 파일을 첨부할 수 있어요.
          </p>
        </div>
        <small>본문이 준비돼야 공고 대조 가능</small>
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
            <button type="button" className={styles.linkLoad} onClick={() => void loadLink()} disabled={loadingLink || hasJobPostingText(text)}>
              {loadingLink ? <LoaderCircle className={styles.spin} /> : <Download />}
              {loadingLink ? "본문을 자동으로 읽는 중" : hasJobPostingText(text) ? "공고 본문 입력됨" : "링크 다시 읽기"}
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
              {hasJobPostingText(text) ? "공고 본문이 입력 자료에 있습니다. 지원할 직무와 모집 조건이 포함됐는지 확인해 주세요." : "공고 본문은 아직 준비되지 않았습니다. 주소나 파일 이름만으로는 공고 대조를 할 수 없습니다."}
            </small>
          </span>
        </div>
      )}
      <p className={styles.privacy}>
        링크를 넣으면 주소만 서버로 보내 공고 본문을 자동으로 읽습니다. AI 분석은 시작하지 않습니다.
        읽힌 본문이 있어야 공고 대조에 사용됩니다. 이미지형 공고는 본문을 텍스트로 붙여넣어 주세요.
      </p>
    </section>
  );
}
