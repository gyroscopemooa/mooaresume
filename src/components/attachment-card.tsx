import { CheckCircle2, FileText, X } from "lucide-react";
import styles from "./attachment-card.module.css";

export function AttachmentCard({
  filename,
  extension,
  sizeBytes,
  onRemove,
}: {
  filename: string;
  extension?: string;
  sizeBytes?: number;
  onRemove?: () => void;
}) {
  const sizeLabel = sizeBytes === undefined
    ? null
    : sizeBytes >= 1024 * 1024
      ? (sizeBytes / 1024 / 1024).toFixed(1) + "MB"
      : Math.max(1, Math.round(sizeBytes / 1024)) + "KB";

  return <div className={styles.card}>
    <FileText />
    <div><b>{filename}</b><span>{[extension?.toUpperCase(), sizeLabel].filter(Boolean).join(" · ")}</span></div>
    <em><CheckCircle2 /> 내용 추출 완료</em>
    {onRemove && <button type="button" onClick={onRemove} aria-label="첨부파일 제거"><X /></button>}
  </div>;
}
