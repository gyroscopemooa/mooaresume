/**
 * Opt-in, paid synthetic evaluation: at most one draft and one verification.
 * Bundle with esbuild; server-only is a build-time marker. No customer data/DB/mail.
 * Persist response IDs so polling does not buy another generation.
 */
import fs from "node:fs";
import { AutomaticReviewGateway } from "../src/server/second-review/automatic-gateway";
import { draftSchema, verificationSchema, validateDraft, validateVerification, type ReviewContext } from "../src/server/second-review/automatic-contract";

const titles = ["지원 계기","하고 싶은 일","경험 ①","강점과 일하는 방식","입사 후 목표"];
const texts = [
  "지역 문화행사에서 새로운 창작자를 만나는 경험이 좋아 문화사업 운영 인턴에 지원하려 한다. 공연에 관객으로 참여하며 좋은 작품과 관객이 만날 기회의 중요성을 느꼈다. 직접 행사를 운영한 경험은 없다.",
  "자료 정리와 일정 지원을 배우고 싶다. A매장에서 상품 정보 입력과 재고 확인을 했고, B식당에서는 주문을 메모하고 동료에게 확인했다. 장기적으로는 콘텐츠 기획에 관심이 있다.",
  "A매장에서 상품 정보 입력과 재고 확인을 담당했다. 정확한 근무기간은 확인이 필요하다. 내가 한 행동: 상품 정보를 입력하고 재고를 확인했다. 결과와 배운 점: 상품 정보를 입력하고 재고를 확인했다. 운영에는 정확한 기본 업무가 중요하다고 배웠다.",
  "모르는 일을 넘기지 않고 확인하는 것이 강점이다. B식당에서 주문을 이해하지 못하면 다시 말해 달라고 요청하고 메모한 뒤 동료에게 확인했다. 이 경험으로 낯선 환경에서 확인하며 적응하는 방식을 배웠다.",
  "입사 후에는 주어진 자료와 일정 관리 업무를 정확하게 수행하고 싶다. 특정 사업을 담당한다고 확정하지 않고 배정받은 업무부터 배우고 싶다. 장기적으로 창작자와 관객을 연결하는 콘텐츠 기획에 참여하고 싶다.",
];
const context: ReviewContext = {
  units: titles.map((title,index)=>({order:index+1,sourceQuestionOrder:1,title,sourceText:texts[index],firstAnswer:texts[index]})),
  source: { questions: titles.map((title,index)=>({title,originalAnswer:texts[index],revisedAnswer:texts[index]})),
    verificationQuestions:["A매장의 정확한 근무기간을 확인해 주세요."], priorities:["행동과 결과의 중복을 줄여 주세요.","제출용 문체를 정리해 주세요."] },
  documents:[{kind:"COVER_LETTER",text:titles.map((title,i)=>`[${title}]\n${texts[i]}`).join("\n\n")}],
  writingMode:"CREATE",writingStyle:"BALANCED",targetLength:700,
};
const stateFile = ".wrangler/automatic-review-eval.json";
type State = { draftId?:string; verifyId?:string; draft?:unknown; verification?:unknown; draftExecution?:unknown; verifyExecution?:unknown; draftAttempted?:boolean; verifyAttempted?:boolean };
async function main() {
  if(process.env.ALLOW_PAID_SECOND_REVIEW_EVAL!=="true") throw new Error("Explicit paid-eval approval required");
  const apiKey=process.env.OPENAI_API_KEY, model=process.env.OPENAI_SECOND_REVIEW_MODEL || process.env.OPENAI_MODEL;
  if(!apiKey||!model)throw new Error("Missing configuration");
  const gateway=new AutomaticReviewGateway(apiKey,model);
  const state:State=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,"utf8")):{};
  const save=()=>fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
  const action=process.argv[2];
  if(action==="draft-start"){
    if(state.draftAttempted)throw new Error("Draft already attempted; inspect/poll instead");
    state.draftAttempted=true;save();
    state.draftId=await gateway.start("draft",context);save();console.log("Draft started.");
  }else if(action==="verify-start"){
    if(state.verifyAttempted)throw new Error("Verification already attempted");
    const draft=draftSchema.parse(state.draft);validateDraft(context,draft);
    state.verifyAttempted=true;save();
    state.verifyId=await gateway.start("verify",{context,candidate:draft});save();console.log("Verification started.");
  }else if(action==="draft-poll"||action==="verify-poll"){
    const id=action==="draft-poll"?state.draftId:state.verifyId;
    if(!id)throw new Error("No response to poll");
    const result=await gateway.poll(id);
    if(result.status!=="completed"){console.log(result.status);return;}
    if(action==="draft-poll"){
      const draft=draftSchema.parse(result.output);validateDraft(context,draft);
      state.draft=draft;state.draftExecution=result.execution;
      console.log(JSON.stringify({items:draft.answers.length,dispositions:draft.answers.map(a=>a.disposition),lengths:draft.answers.map(a=>a.revisedAnswer.length),execution:result.execution}));
    }else{
      const verification=verificationSchema.parse(result.output);
      state.verification=verification;state.verifyExecution=result.execution;save();
      validateVerification(context,verification);
      console.log(JSON.stringify({approved:verification.approved,items:verification.answers.length,execution:result.execution}));
    }
    save();
  }else throw new Error("Unknown action");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Evaluation failed");process.exitCode=1;});
