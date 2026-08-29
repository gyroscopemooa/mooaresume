/**
 * What the 간편 입력 box accepts.
 *
 * Two numbers are shown and the rest are quiet. A screen that lists five limits
 * reads as a warning; the applicant only needs to know when they are near one.
 *
 * Counting files alone defends nothing. Someone merges their letters into a
 * single 80-page PDF — which is a completely reasonable thing to do, and must
 * not be blocked — so the real ceiling is on **content**: pages and characters,
 * checked after extraction. Those live with the pre-check work; what is here is
 * the part the browser can enforce the moment a file is chosen.
 */

/** Shown. Generous for the usual 공고 + 자소서 + 이력서 + 경력기술서 + 증빙 몇 장. */
export const MAX_UPLOAD_FILES = 20;
/** Shown. */
export const MAX_TOTAL_UPLOAD_BYTES = 50 * 1024 * 1024;
/**
 * Not shown, and not ours to choose: extractLocalDocument refuses anything
 * larger, so promising more would be promising a read that throws.
 */
export const MAX_SINGLE_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_UPLOAD_EXTENSIONS = ["pdf", "docx", "txt", "md", "zip"] as const;

/** For the file picker's accept attribute. */
export const ACCEPTED_UPLOAD_ACCEPT = ACCEPTED_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`).join(",");

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

export type UploadCheck = { accepted: File[]; rejected: Array<{ name: string; reason: string }> };

/**
 * Decides what can be read, before anything is read.
 *
 * Rejects by name rather than as a batch: dropping a folder of twenty-five
 * files should add the twenty it can and say which five it could not, not
 * refuse all of them and leave the applicant to guess which one was the
 * problem.
 */
export function checkUploads(incoming: readonly File[], existing: { count: number; bytes: number }): UploadCheck {
  const accepted: File[] = [];
  const rejected: Array<{ name: string; reason: string }> = [];
  let count = existing.count;
  let bytes = existing.bytes;

  for (const file of incoming) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!(ACCEPTED_UPLOAD_EXTENSIONS as readonly string[]).includes(extension)) {
      rejected.push({ name: file.name, reason: "지원하지 않는 형식" });
      continue;
    }
    if (file.size > MAX_SINGLE_UPLOAD_BYTES) {
      rejected.push({ name: file.name, reason: `한 파일 ${formatBytes(MAX_SINGLE_UPLOAD_BYTES)} 초과` });
      continue;
    }
    if (count + 1 > MAX_UPLOAD_FILES) {
      rejected.push({ name: file.name, reason: `${MAX_UPLOAD_FILES}개 초과` });
      continue;
    }
    if (bytes + file.size > MAX_TOTAL_UPLOAD_BYTES) {
      rejected.push({ name: file.name, reason: `총 ${formatBytes(MAX_TOTAL_UPLOAD_BYTES)} 초과` });
      continue;
    }
    accepted.push(file);
    count += 1;
    bytes += file.size;
  }

  return { accepted, rejected };
}

export function describeRejections(rejected: UploadCheck["rejected"]): string {
  if (!rejected.length) return "";
  return rejected.map((item) => `${item.name} (${item.reason})`).join(", ");
}
