import { hqAuthorized,json } from "@/server/analytics/service";
import { reportResponse } from "@/server/analytics/report";
export async function GET(request:Request){
  if(!hqAuthorized(request))return json({code:"UNAUTHORIZED"},401);
  return reportResponse(request);
}
