import { handleGooglePlayVerifyRequest } from "@/server/billing/google-play-verify-route";

export const runtime = "nodejs";

export const POST = handleGooglePlayVerifyRequest;
