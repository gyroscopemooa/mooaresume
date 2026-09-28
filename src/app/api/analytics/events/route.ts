import { collect } from "@/server/analytics/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) { return collect(request,"events"); }
