import type { Metadata } from "next";
import { RedeemClient } from "./redeem-client";

/**
 * Never indexed. The path contains the claim token, and a search engine that
 * crawls it publishes the one secret that lets anyone take the credit.
 */
export const metadata: Metadata = {
  title: "무료 이용권 받기",
  robots: { index: false, follow: false },
};

export default async function RedeemPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RedeemClient token={token} />;
}
