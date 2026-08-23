import styles from "./admin.module.css";
import { STATUS_LABEL } from "./format";

const TONE: Record<string, string> = {
  COMPLETED: styles.pillOk,
  PAID: styles.pillOk,
  SENT: styles.pillOk,
  ANSWERED: styles.pillOk,
  FAILED: styles.pillBad,
  REFUNDED: styles.pillBad,
  NEW: styles.pillBad,
  RUNNING: styles.pillWarn,
  PENDING: styles.pillWarn,
  REVIEW_REQUIRED: styles.pillWarn,
  IN_PROGRESS: styles.pillWarn,
};

export function Pill({ status }: { status: string }) {
  return <span className={`${styles.pill} ${TONE[status] ?? styles.pillMuted}`}>{STATUS_LABEL[status] ?? status}</span>;
}
