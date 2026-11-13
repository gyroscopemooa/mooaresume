import "server-only";

/** Uses only the documented SDK callbacks; never intercepts provider popup APIs. */
export function nicepayWindowController(name: string, autoStart: boolean): string {
  return `
const form=document.forms.namedItem('payForm');const retry=document.getElementById('retry');const status=document.getElementById('status');let opening=false;let submitting=false;let watchdog;
function showRetry(message){opening=false;clearTimeout(watchdog);retry.hidden=false;retry.disabled=false;retry.textContent=${JSON.stringify(name + " 인증창 열기")};status.textContent=message}
function nicepaySubmit(){const code=form.elements.namedItem('AuthResultCode');if(!code||code.value!=='0000'){nicepayClose();return}if(submitting)return;submitting=true;clearTimeout(watchdog);retry.disabled=true;HTMLFormElement.prototype.submit.call(form)}
function nicepayClose(){if(submitting)return;const code=form.elements.namedItem('AuthResultCode');const message=form.elements.namedItem('AuthResultMsg');const failed=code&&code.value&&code.value!=='0000';showRetry(failed?'인증창을 열지 못했습니다. '+(message?message.value.slice(0,240):'')+' (코드: '+code.value.slice(0,40)+')':'인증창이 닫혔습니다. 아래 버튼을 눌러 다시 진행해 주세요.')}
function openNice(){if(opening||submitting)return;if(typeof goPay!=='function'){showRetry('인증창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');return}for(const key of ['AuthResultCode','AuthResultMsg']){const field=form.elements.namedItem(key);if(field)field.value=''}opening=true;retry.disabled=true;status.textContent=${JSON.stringify(name + " 인증창을 열고 있습니다.")};watchdog=setTimeout(()=>{if(!submitting)showRetry('인증창이 보이지 않으면 브라우저의 팝업 차단 표시를 확인한 뒤 아래 버튼을 눌러 주세요. 이미 열린 창이 있으면 그 창에서 계속 진행해 주세요.')},12000);try{if(goPay(form)===false)showRetry('인증창을 열지 못했습니다. 아래 버튼을 눌러 다시 시도해 주세요.')}catch{showRetry('인증창을 열지 못했습니다. 아래 버튼을 눌러 다시 시도해 주세요.')}}
retry.onclick=openNice;
${autoStart ? "window.addEventListener('load',openNice);" : "showRetry('아래 버튼을 눌러 " + name + " 인증을 계속해 주세요.');"}
`;
}
