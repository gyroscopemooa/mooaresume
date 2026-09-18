import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';

// Standalone film renderer. Product files are read-only references.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const film = JSON.parse(fs.readFileSync(path.join(ROOT, 'source/film.json'), 'utf8'));
const W = film.width, H = film.height;
const FFMPEG = process.env.MOOA_FFMPEG || 'C:/Users/jeonm/AppData/Local/Programs/MiniMax Design/current/resources/ffmpeg/ffmpeg.exe';
const fontDir = 'C:/Users/jeonm/AppData/Local/Programs/vrew/resources/static/assets';
const fonts = [['Pretendard-Regular-5c3iZRvJ.woff2','Mooa Regular'], ['Pretendard-Medium-CvkpHfZp.woff2','Mooa Medium'], ['Pretendard-Bold-Bue7gu6t.woff2','Mooa Bold'], ['Pretendard-Light-CAs-M52A.woff2','Mooa Light']];
for (const [filename, alias] of fonts) {
  const installed = path.join(fontDir, filename);
  GlobalFonts.registerFromPath(fs.existsSync(installed) ? installed : 'C:/Windows/Fonts/malgun.ttf', alias);
}
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuil.ttf', 'Mooa Latin');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf', 'Mooa Latin Bold');
const heroPath = path.join(ROOT, 'assets/hero-glass.png');
const hero = fs.existsSync(heroPath) ? await loadImage(heroPath) : null;
const canvas = createCanvas(W,H);
const ctx = canvas.getContext('2d');
const sceneCanvas = createCanvas(W,H);
const sx = sceneCanvas.getContext('2d');
let c = ctx;
const C = { ink:'#14291f', dark:'#061610', green:'#176b4a', mint:'#91e3bc', ivory:'#f5f5ef', gray:'#6a7b72', white:'#ffffff', line:'#dce4dc', pale:'#eaf2e9' };
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;
const ease = t => 1-Math.pow(1-clamp(t),4);
const smooth = t => { const p=clamp(t); return p*p*(3-2*p); };
const enter = (t,delay=0,dur=.8) => ease((t-delay)/dur);

function rr(x,y,w,h,r,fill,stroke=null,width=1) {
  c.beginPath();c.roundRect(x,y,w,h,r);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function txt(s,x,y,size=32,color=C.ink,weight='Regular',align='left') {
  c.font=`${size}px "Mooa ${weight}"`;c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);
}
function spaced(s,x,y,size,color,spacing=4) {
  c.font=`${size}px "Mooa Medium"`;c.fillStyle=color;c.textAlign='left';
  for(const ch of s){c.fillText(ch,x,y);x+=c.measureText(ch).width+spacing;}
}
function rule(x1,y1,x2,y2,color,width=1) { c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke(); }
function dot(x,y,r,color) {c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
function check(x,y,color=C.green,s=1) {c.save();c.translate(x,y);c.scale(s,s);c.beginPath();c.moveTo(-8,0);c.lineTo(-2,6);c.lineTo(10,-8);c.strokeStyle=color;c.lineWidth=3;c.lineCap='round';c.lineJoin='round';c.stroke();c.restore();}
function arrow(x,y,len=35,color=C.ink) {rule(x,y,x+len,y,color,2);rule(x+len-9,y-8,x+len,y,color,2);rule(x+len-9,y+8,x+len,y,color,2);}
function shadow(blur=40,alpha=.1,offset=20) {c.shadowColor=`rgba(0,20,8,${alpha})`;c.shadowBlur=blur;c.shadowOffsetY=offset;}
function noShadow(){c.shadowBlur=0;c.shadowOffsetY=0;}
function pill(label,x,y,w,color=C.green,bg=C.pale,size=20) {rr(x,y,w,46,23,bg);txt(label,x+w/2,y+30,size,color,'Medium','center');}
function anim(t,delay,fn,distance=35) {const p=enter(t,delay);c.save();c.globalAlpha*=p;c.translate(0,(1-p)*distance);fn(p);c.restore();}
function revealText(s,x,y,size,color,t,delay=0,weight='Bold') {
  const p=enter(t,delay,.95);c.save();c.beginPath();c.rect(x-8,y-size*1.1,1800,size*1.4);c.clip();txt(s,x,y+(1-p)*size*1.1,size,color,weight);c.restore();
}
function bg(dark,t){
  c.fillStyle=dark?C.dark:C.ivory;c.fillRect(0,0,W,H);
  const gx=1300+Math.sin(t*.18)*160,gy=390+Math.cos(t*.13)*120;
  const g=c.createRadialGradient(gx,gy,30,gx,gy,1050);
  g.addColorStop(0,dark?'#103d2b':'#ffffff');g.addColorStop(1,dark?C.dark:C.ivory);c.fillStyle=g;c.fillRect(0,0,W,H);
}
function logo(x,y,scale=1,dark=false,wordmark=true) {
  c.save();c.translate(x,y);c.scale(scale,scale);
  rr(0,0,44,44,12,dark?'#a4e5c5':C.green);txt('M',22,32,30,dark?C.dark:'#fff','Latin Bold','center');
  if(wordmark)txt('MOOA Resume',60,31,29,dark?'#e6f3e9':C.ink,'Medium');c.restore();
}
function chrome(dark,section){
  logo(100,66,1,dark);
  spaced(section,1440,96,16,dark?'#a9beb0':'#718377',3);
  rule(100,1006,1820,1006,dark?'#234634':'#dce3da',1);
  txt('MOOA RESUME',100,1042,14,dark?'#7f9b8a':'#829084','Medium');
  txt('나의 다음을 준비하는 방법',1820,1042,15,dark?'#8ca798':'#7a8b7e','Regular','right');
}
function label(s,x,y,dark=false){spaced(s,x,y,22,dark?C.mint:C.green,5);}
function footnote(dark=false){txt('서비스 흐름을 재구성한 예시 화면',1768,958,16,dark?'#8aac99':'#839086','Regular','right');}
function pageIcon(x,y,s=1,color=C.green){
  c.save();c.translate(x,y);c.scale(s,s);rr(0,0,42,54,6,null,color,2);rule(10,17,30,17,color,2);rule(10,26,30,26,color,2);rule(10,35,24,35,color,2);c.restore();
}
function heroBackground(t,alpha=1){
  bg(true,t);
  if(hero){c.save();c.globalAlpha=alpha;const cover=Math.max(W/hero.width,H/hero.height)*(1.025+t*.0024);const iw=hero.width*cover,ih=hero.height*cover;c.drawImage(hero,(W-iw)/2+Math.sin(t*.12)*12,(H-ih)/2,iw,ih);c.restore();}
  const fade=c.createLinearGradient(0,0,1500,0);fade.addColorStop(0,'rgba(3,16,10,.9)');fade.addColorStop(.43,'rgba(3,16,10,.68)');fade.addColorStop(1,'rgba(3,16,10,0)');c.fillStyle=fade;c.fillRect(0,0,W,H);
}
function appWindow(x,y,w,h,title,dark=false){
  shadow(55,.14,26);rr(x,y,w,h,26,dark?'#112c20':'#ffffff',dark?'#335342':'#dce4db',1.3);noShadow();
  rr(x+1,y+1,w-2,61,[25,25,0,0],dark?'#183527':'#f4f6f1');
  [0,1,2].forEach(i=>dot(x+25+i*18,y+31,5,dark?'#476551':'#c4d0c4'));
  txt(title,x+w/2,y+39,18,dark?'#b3cbbd':'#718276','Medium','center');
}

function opening(t){
  heroBackground(t);chrome(true,'YOUR NEXT CHAPTER');
  anim(t,.15,()=>label('MOOA RESUME',110,307,true));
  revealText('막막한 시작을,',106,441,88,'#f6f6ef',t,.3);
  revealText('나를 보여줄 기회로.',106,554,88,C.mint,t,.75);
  anim(t,1.3,()=>txt('AI 취업 지원서 코치, 무아레쥬메',111,634,29,'#b4c9bc'));
  anim(t,1.75,()=>{rule(112,735,173,735,C.mint,2);txt('경험에서 지원서, 면접까지.',193,744,22,'#d9e6dc');});
}
function connection(t){
  bg(false,t);chrome(false,'BUILT AROUND YOU');
  revealText('자소서만 보지 않습니다.',350,296,82,C.ink,t,.15);
  anim(t,.4,()=>txt('공고와 이력서, 내 경험을 함께.',W/2,363,29,C.gray,'Regular','center'));
  const mid=enter(t,1,1.3);
  const labels=['채용공고','이력서','내 경험'];
  [0,1,2].forEach(i=>{
    const x=430+i*430,y=508+Math.sin(t*1.2+i)*7;
    anim(t,.35+i*.15,()=>{
      const endX=960,endY=867;
      c.beginPath();c.moveTo(x+100,y+169);c.bezierCurveTo(x+100,y+280,endX,endY-100,endX,endY);c.strokeStyle='#c8dace';c.lineWidth=2;c.stroke();
      const p=((t*.27+i*.22)%1);const px=lerp(x+100,endX,p),py=lerp(y+175,endY,p);dot(px,py,5,'#78b797');
      shadow(45,.08,20);rr(x-55,y,310,188,23,'#fff','#dfe7dc');noShadow();pageIcon(x+74,y+33,.9);txt(labels[i],x+100,y+133,30,C.ink,'Medium','center');
    });
  });
  c.save();c.globalAlpha=mid;logo(931,840,1.32,false,false);c.restore();
  anim(t,1.8,()=>txt('흩어진 자료가 하나의 지원 이야기로.',W/2,962,24,C.gray,'Regular','center'));
}
function beginner(t){
  bg(false,t);chrome(false,'01 / START');
  anim(t,.1,()=>pill('처음 시작 · PRO 작성 흐름',110,246,330,C.green,'#e1eddf',20));
  revealText('아무것도 몰라요?',108,406,77,C.ink,t,.2);
  revealText('그 시작부터 함께.',108,507,77,C.green,t,.5);
  anim(t,.8,()=>{txt('질문에 답하며,',112,593,30,C.gray);txt('내 경험과 소재부터 정리해요.',112,637,30,C.gray);});
  anim(t,1.3,()=>{['경험 찾기','소재 정리','개요 만들기'].forEach((s,i)=>{txt(String(i+1).padStart(2,'0'),112+i*208,770,17,C.green,'Medium');txt(s,112+i*208,812,25,C.ink,'Medium');if(i<2)arrow(243+i*208,802,32,'#99af9f');});});
  const y=210+Math.sin(t*.75)*4;
  anim(t,.25,()=>{
    appWindow(955,y,850,697,'처음부터 작성');
    txt('내 경험에서 시작하기',1002,y+117,32,C.ink,'Bold');
    txt('무엇을 했는지, 한 가지씩 꺼내볼까요?',1002,y+162,24,C.gray);
    ['경험 선택','내 역할','배운 점'].forEach((s,i)=>{rr(1002+i*257,y+200,237,6,3,i<=Math.min(2,Math.floor(t/2.7))?C.green:'#e3eae0');txt(s,1002+i*257,y+242,18,i<=Math.floor(t/2.7)?C.green:C.gray,'Medium');});
    rr(1001,y+283,755,124,16,'#f2f6ee');txt('어떤 경험이 있나요?',1026,y+326,24,C.ink,'Medium');
    ['팀 프로젝트','아르바이트','동아리'].forEach((s,i)=>{const selected=i===0&&t>1.8;pill(s,1026+i*220,y+347,199,selected?'#fff':C.gray,selected?C.green:'#e4ebe0',19);});
    anim(t,2.45,()=>{
      txt('그 안에서 내가 맡았던 역할은?',1002,y+457,24,C.ink,'Medium');
      rr(1002,y+481,755,94,13,'#fff','#a3bba6',1.5);
      const full='팀 프로젝트에서 의견을 정리했어요.';
      const count=Math.floor(clamp((t-2.7)/1.55)*full.length);
      txt(full.slice(0,count),1029,y+537,26,C.ink);if(t<4.6&&Math.floor(t*3)%2===0)rule(1030+c.measureText(full.slice(0,count)).width,y+510,1030+c.measureText(full.slice(0,count)).width,y+541,C.green,2);
    },18);
    anim(t,5.15,()=>{dot(1017,y+623,14,'#e0efdf');check(1017,y+623,C.green,.7);txt('나만의 소재로 개요를 이어가요.',1045,y+631,23,C.green,'Medium');},16);
  });footnote();
}
function quick(t){
  bg(false,t+8);chrome(false,'02 / REFINE');
  anim(t,.1,()=>label('QUICK',110,266));
  revealText('이미 쓴 글,',108,402,87,C.ink,t,.2);
  revealText('더 또렷하게.',108,511,87,C.green,t,.5);
  anim(t,.9,()=>{txt('핵심 개선점과 수정 이유를 한눈에.',112,598,28,C.gray);});
  ['핵심 개선점 3개','수정 이유','Before → After'].forEach((s,i)=>anim(t,1.35+i*.18,()=>{dot(127,698+i*63,15,'#dfebdd');check(127,698+i*63,C.green,.75);txt(s,158,707+i*63,26,C.ink,'Medium');}));
  const y=198+Math.sin(t*.6)*5;
  anim(t,.2,()=>{
    appWindow(918,y,892,716,'QUICK · 문장 비교');
    spaced('BEFORE',960,y+119,17,'#8d998d',3);
    txt('팀원의 의견을 정리하고 역할을 나눴습니다.',960,y+179,27,C.ink);
    txt('팀원들과 협력해 프로젝트를 마쳤습니다.',960,y+224,27,C.ink);
    const p=enter(t,1.5,1);rr(956,y+189,754*p,44,5,'rgba(215,193,130,.15)');
    anim(t,2.25,()=>{rr(960,y+277,804,73,13,'#f4f0e4');txt('수정 이유',981,y+308,17,'#8c743b','Bold');txt('반복 표현을 줄이고, 행동이 드러나도록 연결해요.',1083,y+322,22,'#756640');},18);
    rule(960,y+390,1765,y+390,'#e3e9df');
    anim(t,3.4,()=>{
      spaced('AFTER',960,y+447,17,C.green,3);
      rr(955,y+479,814,105,12,'#e9f3e6');
      txt('팀원의 의견을 정리해 역할을 나누고,',976,y+518,29,C.green,'Medium');
      txt('협업으로 프로젝트를 마무리했습니다.',976,y+562,29,C.green,'Medium');
    },22);
    anim(t,5.1,()=>{pill('원래 경험은 유지하고, 표현은 명확하게',960,y+622,570,C.green,'#f0f5ec',20);check(1732,y+646,C.green,1.2);},10);
  });footnote();
}
function connectionLine(x1,y1,x2,y2,t,delay=0){
  const p=enter(t,delay,1.2);c.save();c.beginPath();c.rect(x1-8,y1-200,(x2-x1+20)*p,600);c.clip();
  c.beginPath();c.moveTo(x1,y1);c.bezierCurveTo((x1+x2)/2,y1,(x1+x2)/2,y2,x2,y2);c.strokeStyle='#3d7857';c.lineWidth=2;c.stroke();
  const q=(t*.28+delay*.17)%1,px=lerp(x1,x2,q),py=lerp(y1,y2,smooth(q));dot(px,py,4,'#a1e7bf');c.restore();
}
function pro(t){
  bg(true,t);chrome(true,'03 / CONNECT');
  anim(t,.1,()=>label('PRO',110,266,true));
  revealText('내 경험을,',108,399,84,'#f4f5ee',t,.2);
  revealText('공고에 맞는',108,505,84,C.mint,t,.5);
  revealText('이야기로.',108,611,84,C.mint,t,.72);
  anim(t,1.1,()=>txt('쓸 소재부터 지원서 완성까지.',112,693,29,'#abc8b6'));
  anim(t,1.6,()=>{pill('공고 × 이력서 × 경험',110,772,365,'#c6eed8','#183e2c',22);});
  const sourceLabels=['채용공고','이력서','내 경험'];
  const sourceCopy=['요구역량을 확인하고','내 이력을 살펴보고','쓸 소재를 골라요'];
  sourceLabels.forEach((s,i)=>{
    const x=876,y=251+i*191+Math.sin(t*.8+i)*3;
    connectionLine(x+340,y+69,1360,489,t,1+i*.25);
    anim(t,.4+i*.3,()=>{
      rr(x,y,340,145,20,'#173827','#3b5b43',1);pageIcon(x+24,y+27,.7,'#89c49f');txt(s,x+79,y+57,28,'#f0f5e9','Medium');txt(sourceCopy[i],x+26,y+109,22,'#a7c6b1');
    });
  });
  anim(t,1.65,()=>{
    c.save();c.translate(1530,507);c.rotate(-.025+Math.sin(t*.32)*.012);
    shadow(65,.3,25);rr(-190,-251,405,545,20,'#f3f4ec');noShadow();
    spaced('MY APPLICATION',-156,-195,15,C.green,2);txt('나의 지원서',-156,-129,36,C.ink,'Bold');
    rule(-156,-95,173,-95,'#cedacc');
    ['공고에 맞는 소재','문항별 경험 배치','근거가 있는 문장'].forEach((s,i)=>anim(t,2.45+i*.8,()=>{dot(-138,-42+i*82,14,'#e0ebd9');check(-138,-42+i*82,C.green,.7);txt(s,-108,-34+i*82,23,C.ink,'Medium');},10));
    for(let i=0;i<3;i++)rr(-153,194+i*17,i===2?195:307,5,2,'#d3dfd0');
    c.restore();
  });footnote(true);
}
function finalScene(t){
  bg(true,t+13);chrome(true,'04 / PREPARE');
  anim(t,.1,()=>label('FINAL',110,266,true));
  revealText('지원서 다음은,',108,404,84,'#f4f5ee',t,.2);
  revealText('면접입니다.',108,512,84,C.mint,t,.5);
  anim(t,.95,()=>{txt('제출 전 검수부터',112,598,29,'#abc8b6');txt('AI 모의면접까지.',112,645,29,'#abc8b6');});
  anim(t,1.4,()=>{['답변 평가','꼬리질문','면접 리포트'].forEach((s,i)=>{check(128,750+i*59,C.mint,.8);txt(s,158,759+i*59,25,'#e5eee2','Medium');});});
  const y=194;
  anim(t,.25,()=>{
    appWindow(937,y,870,733,'FINAL · AI 모의면접',true);
    pill('텍스트로 연습하는 면접',980,y+87,304,'#d9ebda','#264b35',18);
    anim(t,.7,()=>{
      txt('AI 면접관',982,y+179,19,'#9fbea9','Medium');
      rr(980,y+200,694,111,18,'#254331');
      txt('의견이 달랐던 팀원과',1008,y+242,27,'#f0f5e9','Medium');
      txt('어떻게 협업했나요?',1008,y+283,27,'#f0f5e9','Medium');
    });
    anim(t,2.5,()=>{
      rr(1071,y+339,687,90,18,'#bee8cb');
      txt('각자의 의견을 정리하고,',1098,y+376,25,C.ink);
      txt('공통 목표를 기준으로 역할을 나눴습니다.',1098,y+411,25,C.ink);
    });
    anim(t,4.6,()=>{
      txt('답변 피드백',982,y+480,19,'#9fbea9','Medium');
      txt('내 행동은 명확해요. 판단 기준도 설명해 보세요.',982,y+521,23,'#d4e8d6');
    });
    anim(t,6.2,()=>{
      rr(980,y+558,777,117,18,'#244832','#517e5e');
      spaced('FOLLOW-UP',1008,y+593,15,C.mint,2);
      txt('그 역할 분담을 선택한 이유는 무엇인가요?',1008,y+643,26,'#f3f6ec','Medium');
    },16);
  });footnote(true);
}
function promise(t){
  bg(false,t);chrome(false,'THE MOOA WAY');
  anim(t,.15,()=>label('YOUR EXPERIENCE. YOUR STORY.',490,293));
  revealText('없는 경험은 만들지 않고.',330,433,80,C.ink,t,.3);
  revealText('내 경험이 전해지도록.',398,540,80,C.green,t,.75);
  anim(t,1.25,()=>txt('입력은 간단하게. 분석은 섬세하게.',W/2,625,30,C.gray,'Regular','center'));
  const names=['QUICK','PRO','FINAL'],caps=['작성한 글 첨삭','처음 작성부터 완성','지원서에서 면접까지'];
  names.forEach((s,i)=>anim(t,1.8+i*.18,()=>{
    const x=325+i*430;rr(x,747,410,142,18,i===1?C.green:'#edf1e8',i===1?null:'#dbe5d6');
    txt(s,x+32,800,28,i===1?'#eaf4e8':C.green,'Medium');txt(caps[i],x+32,848,23,i===1?'#d8ead8':C.gray);arrow(x+342,793,27,i===1?'#c2e1c5':C.green);
  }));
}
function endcard(t){
  heroBackground(t+15);chrome(true,'BEGIN YOUR NEXT');
  anim(t,.1,()=>logo(111,229,1.3,true,true));
  revealText('나의 다음을',108,426,92,'#f5f6ed',t,.2);
  revealText('준비하는 방법.',108,542,92,C.mint,t,.5);
  anim(t,.95,()=>txt('무아레쥬메',112,618,31,'#c6d8ca','Medium'));
  anim(t,1.25,()=>{rr(111,700,575,90,45,'#d1edda');txt('mooaresume.com',149,757,35,C.dark,'Medium');arrow(596,744,38,C.dark);});
  anim(t,1.75,()=>txt('지금, 내 지원 준비 시작하기',116,841,25,'#adc8b6'));
}
const renderers=[opening,connection,beginner,quick,pro,finalScene,promise,endcard];
function renderScene(index,t,target){c=target;c.resetTransform();c.globalAlpha=1;c.clearRect(0,0,W,H);renderers[index](t);}
function frame(time){
  const index=Math.max(0,film.scenes.findIndex(s=>time>=s.start&&time<s.end));
  const local=time-film.scenes[index].start;
  renderScene(index,local,ctx);
  if(index>0&&local<.32){
    renderScene(index-1,film.scenes[index-1].end-film.scenes[index-1].start+local,sx);
    ctx.save();ctx.globalAlpha=1-smooth(local/.32);ctx.drawImage(sceneCanvas,-local*30,0);ctx.restore();
  }
  const fadeIn=smooth(time/.35),fadeOut=1-smooth((time-59.6)/.4);
  if(fadeIn*fadeOut<1){ctx.fillStyle=`rgba(3,14,8,${1-fadeIn*fadeOut})`;ctx.fillRect(0,0,W,H);}
  return canvas;
}
async function writeStills(){
  const times=[2.8,7.4,12.2,16.6,21.6,25.7,32.8,36.6,42.2,46.8,52.1,58.1];
  fs.mkdirSync(path.join(ROOT,'qa'),{recursive:true});
  for(const t of times){frame(t);fs.writeFileSync(path.join(ROOT,'qa',`frame-${String(t).replace('.','-')}.png`),canvas.toBuffer('image/png'));}
  frame(58.1);fs.writeFileSync(path.join(ROOT,'poster.png'),canvas.toBuffer('image/png'));
  const sheet=createCanvas(1920,1080);const sc=sheet.getContext('2d');sc.fillStyle='#151c17';sc.fillRect(0,0,1920,1080);
  for(let i=0;i<times.length;i++){const im=await loadImage(path.join(ROOT,'qa',`frame-${String(times[i]).replace('.','-')}.png`));const x=(i%4)*480,y=Math.floor(i/4)*360;sc.drawImage(im,x,y,480,270);sc.font='22px "Mooa Medium"';sc.fillStyle='#dbe9dc';sc.fillText(`${times[i].toFixed(1)}s`,x+18,y+309);}
  fs.writeFileSync(path.join(ROOT,'qa/contact-sheet.jpg'),sheet.toBuffer('image/jpeg'));
  console.log('Stills written. Hero loaded:',Boolean(hero));
}
async function renderVideo(){
  if(!hero)throw new Error('Final master requires assets/hero-glass.png');
  const fps=Number(process.env.MOOA_RENDER_FPS||film.fps);
  const output=path.join(ROOT,'mooa-resume-60s-1080p.mp4');
  const audio=path.join(ROOT,'audio/original-score.wav');
  if(!fs.existsSync(audio))throw new Error('Missing original score');
  const args=['-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(fps),'-i','pipe:0','-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',String(fps),'-c:a','aac','-b:a','320k','-ar','48000','-t','60','-movflags','+faststart','-metadata','title=MOOA Resume | 나의 다음을 준비하는 방법','-metadata','comment=Original motion design and original instrumental score. Illustrative product UI. No customer data.',output];
  const ff=spawn(FFMPEG,args,{windowsHide:true,stdio:['pipe','ignore','pipe']});
  let errors='';ff.stderr.on('data',d=>{errors+=d.toString();});
  const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(new Error(`ffmpeg ${code}: ${errors}`)));});
  const started=Date.now();
  for(let i=0;i<60*fps;i++){
    frame(i/fps);const buffer=canvas.data();
    if(!ff.stdin.write(buffer))await once(ff.stdin,'drain');
    if(i%(fps*5)===0)console.log(`Rendered ${(i/fps).toFixed(0)}/60s, elapsed ${((Date.now()-started)/1000).toFixed(1)}s`);
  }
  ff.stdin.end();await done;console.log(`Master complete: ${output}`);if(errors)console.log(errors);
}
if(process.argv.includes('--stills'))await writeStills();else await renderVideo();
