"use client";
import {useEffect,useState} from "react";
import { classifyDocument, CLASSIFIED_KIND_LABEL, type ClassifiedKind } from "@/domain/document-classify";
import { mapSimpleIntake, describeSimpleIntakeGap, planQuestionLengths, describeLengthLoss, type SimpleIntakeSource } from "@/domain/simple-intake-mapping";
import { decideWritingMode, type WritingMode } from "@/domain/writing-mode";
import { resolveEditingStance, type EditingStance } from "@/domain/editing-stance";
import type { WritingStyle } from "@/domain/writing-style";
import type { ProductTier } from "@/domain/usage-entitlement";
import { hasJobPostingText } from "@/domain/job-posting-source";
import styles from "./external-orders.module.css";

type Row={id:string;analysisRunId:string;product:ProductTier;salesChannel:string;orderNumber:string;customerName:string;customerEmail:string;paidAmountKrw:number|null;company:string;role:string;status:string;failureCode:string|null;emailStatus:string;createdAt:string;expiresAt:string|null;revoked:boolean;resultUrl:string|null};
type Upload=SimpleIntakeSource & {id:string};
const API="/api/meensoo/external-orders";
const errorMessages:Record<string,string>={
  EXTERNAL_ORDER_NOT_CONFIGURED:"운영 설정 또는 서명 키가 아직 준비되지 않았습니다.",
  EXTERNAL_DUPLICATE_ORDER:"같은 판매처·상품주문번호가 이미 등록되어 있습니다. 아래 접수 이력을 확인하세요.",
  EXTERNAL_PRIMARY_LENGTH:"자기소개서 분량이 상품 기본 제공 범위를 벗어났습니다.",
  POSTING_BODY_NOT_READY:"공고 본문을 입력하거나 공고 없이 진행하는 옵션을 선택하세요.",
  EXTERNAL_ORDER_CREATE_FAILED:"접수를 저장하지 못했습니다. 같은 요청으로 다시 시도해 주세요.",
  EXTERNAL_ORDER_ACTION_FAILED:"요청을 처리하지 못했습니다. 결과 상태와 열람 기간을 확인하세요.",
  EXTERNAL_ORDER_LIST_FAILED:"접수 이력을 불러오지 못했습니다.",
  INVALID_REQUEST:"입력 내용 또는 파일 분량을 확인하세요.",
};
const statusLabel:Record<string,string>={PENDING:"접수·대기",RUNNING:"분석 중",COMPLETED:"완료",FAILED:"실패·확인 필요",UNKNOWN:"확인 필요"};
const emailLabel:Record<string,string>={PENDING:"발송 대기",SENDING:"발송 중",SENT:"발송 요청 성공",FAILED:"발송 실패",SKIPPED:"미발송"};
const money=(n:number)=>n.toLocaleString("ko-KR")+"원";
const date=(value:string)=>new Date(value).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",dateStyle:"short",timeStyle:"short"});
const choices=Object.keys(CLASSIFIED_KIND_LABEL) as ClassifiedKind[];
function errorFor(data:{error?:string;issues?:{path:string;message:string}[]}){return (errorMessages[data.error??""]??"요청에 실패했습니다.")+(data.issues?.length?" "+data.issues.map(issue=>issue.path+": "+issue.message).join(" / "):"");}
export function ExternalOrderConsole({enabled}:{enabled:boolean}){
  const [product,setProduct]=useState<ProductTier>("PRO");
  const [customerName,setCustomerName]=useState("");
  const [customerEmail,setCustomerEmail]=useState("");
  const [salesChannel,setSalesChannel]=useState("네이버 스마트스토어");
  const [orderNumber,setOrderNumber]=useState("");
  const [amount,setAmount]=useState("");
  const [company,setCompany]=useState("");
  const [role,setRole]=useState("");
  const [letter,setLetter]=useState("");
  const [postingUrl,setPostingUrl]=useState("");
  const [postingText,setPostingText]=useState("");
  const [notes,setNotes]=useState("");
  const [files,setFiles]=useState<Upload[]>([]);
  const [target,setTarget]=useState("700");
  const [mode,setMode]=useState<WritingMode|"AUTO">("AUTO");
  const [style,setStyle]=useState<WritingStyle>("BALANCED");
  const [stance,setStance]=useState<EditingStance>("BALANCED");
  const [allowMissing,setAllowMissing]=useState(false);
  const [autoEmail,setAutoEmail]=useState(true);
  const [confirmed,setConfirmed]=useState(false);
  const [rows,setRows]=useState<Row[]>([]);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [fetching,setFetching]=useState(false);
  const [requestId,setRequestId]=useState("");
  const [historyError,setHistoryError]=useState("");
  const [questionLimits,setQuestionLimits]=useState<Record<number,number>>({});
  const targetNumber=Number(target);
  const mapping=mapSimpleIntake(letter,files,Number.isInteger(targetNumber)&&targetNumber>=100&&targetNumber<=3000?targetNumber:null,questionLimits);
  const lengths=planQuestionLengths(mapping);
  const loss=describeLengthLoss(lengths);
  const actualPosting=[postingText.trim(),mapping.posting].filter(Boolean).join("\n\n");
  const resolvedMode=mode==="AUTO"?decideWritingMode({draft: mapping.questions.map(q=>q.answer).join("\n"),targetLength:targetNumber,hasJobPosting:hasJobPostingText(actualPosting)}).mode:mode;
  useEffect(()=>{
    if(!enabled)return;
    let active=true;
    async function load(){
      try {const response=await fetch(API,{cache:"no-store"});const data=await response.json();if(!active)return;if(response.ok){setRows(data.orders??[]);setHistoryError("");}else setHistoryError(errorFor(data));}
      catch{if(active)setHistoryError("접수 이력을 불러오지 못했습니다.");}
    }
    void load();const timer=window.setInterval(()=>void load(),15000);
    return()=>{active=false;window.clearInterval(timer);};
  },[enabled]);
  async function refresh(){const response=await fetch(API,{cache:"no-store"});const data=await response.json();if(response.ok){setRows(data.orders??[]);setHistoryError("");}else setHistoryError(errorFor(data));}
  async function upload(incoming:FileList|null){
    if(!incoming?.length||uploading)return;
    setUploading(true);setError("");
    try{
      const {extractLocalDocuments}=await import("@/lib/local-document");
      const {checkUploads,describeRejections}=await import("@/domain/upload-limits");
      const check=checkUploads(Array.from(incoming),{count:files.length,bytes:files.reduce((sum,file)=>sum+file.sizeBytes,0)});
      const added:Upload[]=[];const rejected:string[]=[];
      if(check.rejected.length)rejected.push(describeRejections(check.rejected));
      for(const file of check.accepted){
        try{
          const batch=await extractLocalDocuments(file);
          rejected.push(...batch.skipped.map(name=>name+" (읽기 실패)"));
          for(const doc of batch.documents){
            if(doc.unreadable||!doc.text.trim()){rejected.push(doc.filename+" (텍스트 없음: 직접 입력 필요)");continue;}
            if(files.length+added.length>=20||files.reduce((sum,item)=>sum+item.sizeBytes,0)+added.reduce((sum,item)=>sum+item.sizeBytes,0)+doc.sizeBytes>50*1024*1024){rejected.push(doc.filename+" (첨부 한도 초과)");continue;}
            if(doc.text.length>50000){rejected.push(doc.filename+" (텍스트 50,000자 초과)");continue;}
            const guess=classifyDocument({filename:doc.filename,text:doc.text});
            added.push({id:crypto.randomUUID(),filename:doc.filename,text:doc.text,extension:doc.extension,sizeBytes:doc.sizeBytes,kind:guess.kind});
          }
        }catch(caught){rejected.push(file.name+" ("+(caught instanceof Error?caught.message:"읽기 실패")+")");}
      }
      setFiles(current=>[...current,...added]);setQuestionLimits({});
      if(rejected.length)setError(rejected.join(" / "));
    }finally{setUploading(false);}
  }
  async function readPosting(){
    if(!postingUrl.trim())return;
    setFetching(true);setError("");
    try{
      const response=await fetch("/api/job-postings/fetch",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:postingUrl.trim()})});
      const data=await response.json();
      if(!response.ok||!data.ok||typeof data.text!=="string")throw new Error("공고 본문을 읽을 수 없습니다. 공고 내용을 직접 붙여넣어 주세요.");
      setPostingText(data.text);if(data.truncated)setMessage("긴 공고의 일부가 생략되었습니다. 본문을 확인하세요.");
    }catch(caught){setError(caught instanceof Error?caught.message:"공고를 불러오지 못했습니다.");}finally{setFetching(false);}
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||uploading||fetching||!enabled)return;
    setMessage("");setError("");
    if(!confirmed){setError("외부 결제 또는 제공 권한을 확인해 주세요.");return;}
    if(files.some(file=>file.kind==="UNSET")){setError("분류하지 않은 첨부 서류의 종류를 선택하세요.");return;}
    if(mapping.droppedFilenames.length){setError("첨부 한도를 넘었습니다: "+mapping.droppedFilenames.join(", "));return;}
    if(letter.trim()&&files.some(file=>file.kind==="COVER_LETTER")){setError("자기소개서 직접 입력과 자소서 첨부가 동시에 있습니다. 분석할 원문 하나만 남겨 주세요.");return;}
    const gap=describeSimpleIntakeGap(mapping);
    if(gap){setError(gap);return;}
    if(actualPosting.length>20000){setError("채용공고 본문은 20,000자 이하로 정리해 주세요.");return;}
    if(product!=="QUICK"&&!hasJobPostingText(actualPosting)&&!allowMissing){setError(errorMessages.POSTING_BODY_NOT_READY);return;}
    const id=requestId||crypto.randomUUID();setRequestId(id);setBusy(true);
    try{
      const response=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        id,customerName,customerEmail,salesChannel,orderNumber,paidAmountKrw:amount===""?undefined:Number(amount),autoEmail,
        intake:{title:company?company+" "+role:"외부 주문 자기소개서",companyName:company,roleName:role,product,
          writingMode:resolvedMode,writingStyle:style,editingStance:resolveEditingStance(product,stance),targetLength:targetNumber,
          questions:mapping.questions,sourceFilename:mapping.sourceFile?.filename,allowMissingPosting:allowMissing,
          jobPosting:{url:postingUrl.trim(),text:actualPosting,filenames:mapping.postingFilenames},
          candidateMaterials:{schemaVersion:"1.0",freeformNotes:notes,experiences:[],profileEntries:[],freeformAttachments:mapping.freeformAttachments,materialAttachments:mapping.materialAttachments}}
      })});
      const data=await response.json();
      if(!response.ok){setError(errorFor(data));return;}
      setMessage("접수 완료. 기존 분석 스케줄러가 분석을 실행하며, 완료 후 설정한 이메일로 결과가 발송됩니다.");
      setRequestId("");setCustomerName("");setCustomerEmail("");setOrderNumber("");setAmount("");setCompany("");setRole("");setLetter("");setPostingUrl("");setPostingText("");setNotes("");setFiles([]);setQuestionLimits({});setConfirmed(false);setAllowMissing(false);
      await refresh();
    }catch{setError("연결이 끊겼습니다. 중복 접수 방지를 위해 이 화면에서 같은 요청으로 다시 시도하세요.");}finally{setBusy(false);}
  }
  async function act(row:Row,action:"resend"|"revoke"){
    if(!window.confirm(action==="revoke"?"고객의 열람 링크를 회수할까요?":"이 고객에게 분석 결과 메일을 다시 보낼까요?"))return;
    setBusy(true);setError("");
    try{const response=await fetch(API,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,action})});const data=await response.json();if(!response.ok)setError(errorFor(data));else setMessage(action==="revoke"?"링크 회수 완료":emailLabel[data.status]??"발송 요청 처리");await refresh();}
    catch{setError("처리 상태를 확인하지 못했습니다. 이력을 새로고침하세요.");}finally{setBusy(false);}
  }
  const preview=[["구매처",salesChannel],["상품주문번호",orderNumber],["구매 상품",product+" 자기소개서 분석"],["결제 금액",amount===""?"":money(Number(amount))],["지원 기업",company],["지원 직무",role]].filter(row=>row[1]);
  return <main className={styles.page}>
    <header><h1>외부 주문 분석</h1><p>스마트스토어·크몽 등에서 받은 자료를 한 번에 접수합니다. 별도 PG 결제 없이 기존 분석 엔진을 사용합니다.</p></header>
    {!enabled&&<div className={styles.warning}>외부 주문 기능이 비활성 상태입니다. DB 마이그레이션과 운영 환경 설정을 확인하세요.</div>}
    <form onSubmit={submit} className={styles.form}>
      <fieldset disabled={busy||!enabled} className={styles.section}>
        <legend>1. 상품 및 자료</legend>
        <div className={styles.products}>{(["QUICK","PRO","FINAL"] as const).map(item=><label key={item} data-active={product===item}><input type="radio" name="product" checked={product===item} onChange={()=>setProduct(item)}/><b>{item}</b><small>{item==="QUICK"?"기본 첨삭 · 8천자":item==="PRO"?"정밀 첨삭 · 3만자":"심층 첨삭 · 3만자"}</small></label>)}</div>
        {product==="FINAL"&&<p className={styles.warning}>비회원 결과는 첨삭 결과 열람·다운로드용입니다. 계정이 필요한 FINAL 모의면접·면접 준비팩은 제공 범위를 확인한 후 판매하세요.</p>}
        <label>자기소개서 한 번에 붙여넣기<textarea rows={7} value={letter} maxLength={120000} onChange={event=>{setLetter(event.target.value);setQuestionLimits({});}} placeholder="문항 번호·질문·글자수·답변을 그대로 붙여넣으세요."/></label>
        <label className={styles.drop} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void upload(event.dataTransfer.files);}}>
          <b>{uploading?"파일 읽는 중…":"자소서·이력서·공고·기타 서류 한 번에 첨부"}</b><small>PDF, DOCX, TXT, MD, ZIP · 파일별 10MB, 최대 20개</small>
          <input type="file" multiple accept=".pdf,.docx,.txt,.md,.zip" disabled={uploading} onChange={event=>{void upload(event.target.files);event.target.value="";}}/>
        </label>
        {files.map(file=><div className={styles.file} key={file.id}><span>{file.filename} · {file.text.length.toLocaleString()}자</span><select aria-label={file.filename+" 분류"} value={file.kind} onChange={event=>{setFiles(current=>current.map(item=>item.id===file.id?{...item,kind:event.target.value as ClassifiedKind}:item));setQuestionLimits({});}}>{choices.map(choice=><option key={choice} value={choice}>{CLASSIFIED_KIND_LABEL[choice]}</option>)}</select><button type="button" onClick={()=>{setFiles(current=>current.filter(item=>item.id!==file.id));setQuestionLimits({});}}>제거</button></div>)}
        <div className={styles.two}><label>지원 기업<input value={company} maxLength={120} onChange={event=>setCompany(event.target.value)} placeholder="선택"/></label><label>지원 직무<input value={role} maxLength={120} onChange={event=>setRole(event.target.value)} placeholder="선택"/></label></div>
        <label>채용공고 링크<div className={styles.inline}><input type="url" value={postingUrl} onChange={event=>setPostingUrl(event.target.value)} placeholder="https://"/><button type="button" onClick={()=>void readPosting()} disabled={fetching||!postingUrl}>{fetching?"읽는 중…":"공고 불러오기"}</button></div></label>
        <label>채용공고 상세<textarea rows={4} value={postingText} maxLength={20000} onChange={event=>setPostingText(event.target.value)} placeholder="공고 본문 직접 입력 또는 자동 불러오기"/></label>
        <label>추가 요청 및 자료에 없는 사실<textarea rows={3} value={notes} maxLength={12000} onChange={event=>setNotes(event.target.value)} placeholder="고객 요청, 참고할 사실 등"/></label>
        <div className={styles.two}><label>기본 목표 글자 수<input type="number" min={100} max={3000} value={target} onChange={event=>setTarget(event.target.value)}/></label><label>첨삭 단계<select value={mode} onChange={event=>setMode(event.target.value as WritingMode|"AUTO")}><option value="AUTO">자동 판단</option><option value="POLISH">최종 첨삭</option><option value="BUILD">내용 보완</option><option value="CREATE">초안 작성</option></select></label></div>
        {lengths.length>0&&<div className={styles.questionList}><b>문항별 분량 확인</b>{lengths.map(q=><label key={q.index}>{q.label} ({q.current}자)<input aria-label={q.label+" 목표 글자수"} type="number" min={100} max={3000} value={questionLimits[q.index]??q.target??""} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>=100&&value<=3000)setQuestionLimits(current=>({...current,[q.index]:value}));}}/></label>)}{loss&&<p className={styles.warning}>{loss}</p>}</div>}
        <div className={styles.two}><label>작성 스타일<select value={style} onChange={event=>setStyle(event.target.value as WritingStyle)}><option value="BALANCED">균형 있게</option><option value="CONCISE">담백하게</option><option value="STRENGTH_FOCUSED">강점 살리기</option></select></label><label>첨삭 방향<select value={stance} disabled={product==="QUICK"} onChange={event=>setStance(event.target.value as EditingStance)}><option value="BALANCED">균형형</option><option value="SAFE">합격 안정형</option><option value="CONVICTION">소신 강조형</option></select></label></div>
        {product!=="QUICK"&&!hasJobPostingText(actualPosting)&&<label className={styles.check}><input type="checkbox" checked={allowMissing} onChange={event=>setAllowMissing(event.target.checked)}/>공고 본문 없이 분석 (공고 대조 제외)</label>}
      </fieldset>
      <fieldset disabled={busy||!enabled} className={styles.section}>
        <legend>2. 외부 주문·이메일 (선택)</legend>
        <div className={styles.two}><label>판매처<input value={salesChannel} maxLength={100} onChange={event=>setSalesChannel(event.target.value)} placeholder="스마트스토어 / 크몽 / 기타"/></label><label>상품주문번호<input value={orderNumber} maxLength={150} onChange={event=>setOrderNumber(event.target.value)} placeholder="주문번호"/></label><label>고객 이름<input value={customerName} maxLength={120} onChange={event=>setCustomerName(event.target.value)} placeholder="선택"/></label><label>고객 이메일<input type="email" maxLength={254} value={customerEmail} onChange={event=>setCustomerEmail(event.target.value)} placeholder="선택"/></label><label>실제 외부 결제 금액 (원)<input type="number" min={0} max={100000000} value={amount} onChange={event=>setAmount(event.target.value)} placeholder="선택"/></label></div>
        <label className={styles.check}><input type="checkbox" checked={autoEmail} onChange={event=>setAutoEmail(event.target.checked)}/>분석 완료 시 고객 이메일 자동 발송</label>
        <details className={styles.preview}><summary>고객에게 발송될 메일 미리보기</summary><p>제목: [무아레쥬메] {product} 자기소개서 분석이 완료되었습니다.</p><div><h3>MOOA RESUME</h3><b>{customerName?customerName+" 고객님, 안녕하세요.":"안녕하세요, 무아레쥬메입니다."}</b><p>신청하신 자기소개서 분석 및 첨삭이 완료되었습니다.</p>{preview.map(([label,value])=><div className={styles.previewRow} key={label}><span>{label}</span><b>{value}</b></div>)}<p>분석 완료일: 실제 완료 시각</p><p className={styles.mockButton}>자기소개서 분석 결과 확인하기</p><small>회원가입 및 추가 결제 없이 고객 전용 링크로 열람합니다. 열람 기간은 완료일로부터 30일입니다.</small><p>분석 후기 남기기</p></div></details>
        <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>외부 결제 또는 서비스 제공 권한 및 고객 자료 처리 권한을 확인했습니다.</label>
        <button className={styles.primary} type="submit" disabled={busy||uploading||fetching||!enabled}>{busy?"접수 중…":"결제 없이 분석 접수"}</button>
      </fieldset>
    </form>
    {error&&<p role="alert" className={styles.warning}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}
    <section className={styles.history}><div className={styles.inline}><h2>외부 주문 접수 이력</h2><button type="button" disabled={!enabled||busy} onClick={()=>void refresh().catch(()=>setHistoryError("이력 조회 실패"))}>새로고침</button></div>
      {historyError&&<p role="alert">{historyError}</p>}{!rows.length&&!historyError&&<p>접수 이력이 없습니다.</p>}
      {rows.map(row=><article key={row.id} className={styles.order}><div className={styles.inline}><b>{row.product} · {row.customerName||"고객명 미입력"}</b><span>{statusLabel[row.status]??row.status}</span></div><p>{[row.salesChannel,row.orderNumber,row.customerEmail,row.paidAmountKrw===null?"":money(row.paidAmountKrw)].filter(Boolean).join(" · ")}</p><small>{date(row.createdAt)} · 메일: {emailLabel[row.emailStatus]??row.emailStatus}{row.failureCode?" · "+row.failureCode:""}{row.revoked?" · 링크 회수됨":""}</small>
        {row.resultUrl&&<div className={styles.inline}><a href={row.resultUrl} target="_blank" rel="noopener noreferrer">결과 열람</a><button type="button" onClick={()=>void navigator.clipboard.writeText(row.resultUrl!).then(()=>setMessage("결과 링크를 복사했습니다.")).catch(()=>setError("링크를 복사하지 못했습니다."))}>링크 복사</button><button type="button" disabled={busy||!row.customerEmail} onClick={()=>void act(row,"resend")}>메일 발송·재발송</button><button type="button" disabled={busy} onClick={()=>void act(row,"revoke")}>링크 회수</button></div>}
        {row.expiresAt&&<small>열람 기한 {date(row.expiresAt)}</small>}
      </article>)}
    </section>
  </main>;
}
