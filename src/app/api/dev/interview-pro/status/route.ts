import { getInterviewStatus, interviewErrorResponse, interviewJson } from "@/server/ai/interview-pro/access";

export async function GET(request: Request) {
  try { return interviewJson(getInterviewStatus(request)); }
  catch (error) { return interviewErrorResponse(error); }
}
