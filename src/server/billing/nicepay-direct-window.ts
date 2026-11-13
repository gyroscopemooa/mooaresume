import "server-only";
import { nicepayBrandNames, type NicepayBrand, type NicepayConsent } from "@/domain/nicepay-method";
import type { NicepayOrder } from "./nicepay-order-repository";
import { getNicepayPaymentConfig } from "./nicepay-payment-service";
import { nicepayDigest, nicepayTimestamp } from "./nicepay-protocol";
import { escapeNicepayHtml } from "./nicepay-review";
import { nicepayWindowController } from "./nicepay-window-controller";

// NICE's v3 direct-call contract. Naver requires an explicit card/point choice.
const codes: Record<NicepayBrand, string> = { KAKAO: "E016", NAVER: "E020", TOSS: "E025", SAMSUNG: "E021", APPLE: "E022", PAYCO: "E015" };

export type NicepayWindowOrder = Pick<NicepayOrder, "id" | "moid" | "merchant_mid" | "amount" | "method" | "status" | "expires_at"> & { product: string };
export function renderNicepayDirectWindow(order: NicepayWindowOrder, origin: string, brand: NicepayBrand, consent?: NicepayConsent): string {
  const config = getNicepayPaymentConfig();
  if (order.method === "CARD" || order.merchant_mid !== config.mid || order.status !== "OPEN"
    || new Date(order.expires_at).getTime() <= Date.now()) throw new Error("NICEPAY_WINDOW_NOT_OPEN");
  const ediDate = nicepayTimestamp();
  const name = nicepayBrandNames[brand];
  const fields = { MID: order.merchant_mid, Moid: order.moid, Amt: String(order.amount),
    GoodsName: `MOOA ${order.product}`, PayMethod: "CARD", EdiDate: ediDate, CharSet: "utf-8",
    ReturnURL: `${new URL(origin).origin}/api/checkouts/nicepay/return`,
    SignData: nicepayDigest(ediDate + order.merchant_mid + order.amount + config.merchantKey),
    DirectShowOpt: "CARD", DirectEasyPay: codes[brand] };
  const hidden = Object.entries(fields).map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeNicepayHtml(value)}">`).join("");
  // Only the authenticated window route supplies a verified, order-bound receipt.
  if (consent && (brand !== "NAVER" || consent.naverMethod)) {
    const autoStart = true;
    const method = brand === "NAVER" ? `<input type="hidden" name="EasyPayMethod" value="E020=${consent.naverMethod}">` : "";
    return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} 연결 | MOOA Resume</title><body style="margin:0;min-height:100vh;background:radial-gradient(ellipse at top,#e6f1eb 0%,#f6f9f7 60%);color:#203b2e;font-family:Arial,Malgun Gothic,sans-serif"><main style="max-width:560px;margin:0 auto;padding:clamp(28px,7vw,72px) 24px"><div style="font-size:22px;letter-spacing:.08em;font-weight:800;color:#176b4a">MOOA RESUME</div><div style="font-size:10px;letter-spacing:.18em;color:#789083;margin-top:5px">by GYROSCOPE</div><h1 style="font-size:clamp(23px,4vw,30px);line-height:1.5;margin:36px 0 12px">결제 후, 더 나은 자기소개서로.</h1><p style="font-size:14px;line-height:1.9;color:#64766b">결제가 완료되면 자동으로 분석을 시작하고<br>자기소개서 첨삭을 진행합니다.</p><p id="status" style="font-size:12px;margin:28px 0;color:#176b4a" role="status">${name} 인증창으로 연결하고 있습니다.</p><form name="payForm" method="post" accept-charset="euc-kr" action="/api/checkouts/nicepay/return">${hidden}${method}<button type="button" id="retry" style="display:block;min-height:48px;padding:12px 20px;border:0;border-radius:10px;background:#176b4a;color:white;font-weight:700;cursor:pointer">${name} 인증창 열기</button></form><a id="availableMethods" hidden href="/api/checkouts/nicepay/window?id=${escapeNicepayHtml(order.id)}" style="margin-top:16px;color:#176b4a;font-size:13px">NICE 기본 결제창에서 사용 가능한 수단 확인</a><a style="display:inline-block;margin-top:20px;font-size:12px;color:#75857b;text-underline-offset:4px" href="/analysis/prepare">입력 확인으로 돌아가기</a></main><script src="https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js"></script><script>${nicepayWindowController(name, autoStart)}</script></body></html>`;
  }
  const terms = [
    ["financial", "전자금융거래 이용약관", "https://www.nicepay.co.kr/cs/terms/policy1.do"],
    ["collection", "개인정보 수집 및 이용", "https://www.nicepay.co.kr/cs/terms/private.do"],
    ["sharing", "개인정보 제3자 제공", "https://www.nicepay.co.kr/cs/terms/private.do"],
  ];
  const agreements = terms.map(([id, label, url]) => `<div class="agreement"><label><input type="checkbox" name="agreement" value="${id}" required> [필수] ${label} 동의</label><a href="${url}" target="_blank" rel="noopener noreferrer">내용 보기<span class="sr-only"> (새 창)</span></a></div>`).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} 결제 | MOOA Resume</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f8f6;color:#203b2e;font-family:Arial,"Malgun Gothic",sans-serif;line-height:1.65}main{max-width:560px;margin:48px auto;padding:32px;background:white;border:1px solid #dce7df;border-radius:20px}h1{font-size:26px;margin:12px 0}h2{font-size:17px}p{margin:12px 0}.eyebrow{color:#176b4a;font-weight:700}.amount{font-size:32px;font-weight:800}.note{font-size:14px;color:#5d7064}.agreements{border:1px solid #dce7df;border-radius:12px;padding:16px;margin:24px 0}.agreement{display:flex;justify-content:space-between;gap:12px;align-items:start;margin:14px 0;font-size:14px}input[type=checkbox]{width:19px;height:19px;vertical-align:middle;accent-color:#176b4a}a{color:#176b4a}.agreement a{white-space:nowrap}button{width:100%;padding:17px;border:0;border-radius:12px;font-size:17px;font-weight:700;background:#176b4a;color:white;cursor:pointer}button:disabled{background:#dbe4de;color:#65756b;cursor:default}.back{display:block;text-align:center;margin-top:20px}fieldset{border:1px solid #dce7df;border-radius:12px;margin:20px 0;padding:16px}fieldset label{margin-right:20px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(max-width:600px){main{margin:16px;padding:24px 18px}.agreement{gap:8px;font-size:13px}}
</style></head><body><main><span class="eyebrow">MOOA Resume · ${order.product}</span><h1>${name}로 결제</h1><p class="amount">${order.amount.toLocaleString("ko-KR")}원</p><p>결제 완료 후 분석을 자동으로 시작합니다.</p>
<form name="payForm" method="post" accept-charset="euc-kr" action="/api/checkouts/nicepay/return">${hidden}
${brand === "NAVER" ? '<fieldset><legend>네이버페이 결제수단</legend><label><input type="radio" name="EasyPayMethod" value="E020=CARD" required> 카드</label><label><input type="radio" name="EasyPayMethod" value="E020=POINT" required> 포인트</label><p class="note">카드와 포인트를 함께 사용하는 복합결제는 지원하지 않습니다.</p></fieldset>' : ""}
<section class="agreements" aria-label="결제 약관 동의"><label><input type="checkbox" id="agreeAll"> 필수 약관 전체 동의</label>${agreements}<p class="note">나이스정보통신의 결제 처리에 필요한 동의입니다. 내용을 확인한 뒤 선택해 주세요. 동의하지 않으면 이 결제를 진행할 수 없습니다.</p></section>
<button type="button" id="openNice" disabled>${name}로 결제하고 분석 시작</button></form><p id="status" role="status" aria-live="polite"></p><a class="back" href="/analysis/prepare">입력 확인으로 돌아가기</a></main>
<script src="https://pg-web.nicepay.co.kr/v3/common/js/nicepay-pgweb.js"></script><script>
const form=document.forms.namedItem('payForm');const button=document.getElementById('openNice');const all=document.getElementById('agreeAll');const status=document.getElementById('status');const agreements=Array.from(form.querySelectorAll('input[name="agreement"]'));let opening=false;
function ready(){return agreements.every(item=>item.checked)&&form.checkValidity()}
function sync(){const checked=agreements.filter(item=>item.checked).length;all.checked=checked===agreements.length;all.indeterminate=checked>0&&checked<agreements.length;button.disabled=opening||!ready()}
all.addEventListener('change',()=>{agreements.forEach(item=>item.checked=all.checked);sync()});form.addEventListener('change',sync);form.addEventListener('submit',event=>event.preventDefault());
function nicepaySubmit(){HTMLFormElement.prototype.submit.call(form)}
function nicepayClose(){opening=false;status.textContent='결제창을 닫았습니다. 다시 눌러 이어서 진행할 수 있습니다.';sync()}
button.addEventListener('click',()=>{if(opening||!ready())return;if(typeof goPay!=='function'){status.textContent='결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';return}opening=true;sync();status.textContent='${name} 인증창을 열고 있습니다.';try{goPay(form)}catch{opening=false;status.textContent='결제창을 열지 못했습니다. 다시 시도해 주세요.';sync()}});sync();
</script></body></html>`;
}
