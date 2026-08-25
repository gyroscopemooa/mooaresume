import { notFound } from "next/navigation";
import { ProInputPage } from "@/components/pro-input-page";
import { isFinalEnabled } from "@/domain/final-availability";

/**
 * FINAL's input screen, open only where the flag is on.
 *
 * Same page PRO uses — the inputs are identical and a second copy would drift.
 * What differs is the product the saved draft carries, which decides the prompt
 * and the result screen's tabs.
 */
export default function FinalCreatePage() {
  if (!isFinalEnabled()) notFound();
  return <ProInputPage mode="CREATE" product="FINAL" />;
}
