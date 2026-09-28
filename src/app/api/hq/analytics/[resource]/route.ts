import { readResource } from "@/server/analytics/http";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{resource:string}>}) {
  return readResource(request,(await params).resource);
}
