import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PaymentActionsPreview } from "./preview";
export default async function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const host = (await headers()).get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) notFound();
  return <PaymentActionsPreview/>;
}
