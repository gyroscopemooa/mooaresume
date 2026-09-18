import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';

// Independent portrait edition. Landscape source and master remain unchanged.
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const film=JSON.parse(fs.readFileSync(path.join(ROOT,'source/film.json'),'utf8'));
const W=1080,H=1920,FPS=60;
const FFMPEG=process.env.MOOA_FFMPEG||'C:/Users/jeonm/AppData/Local/Programs/MiniMax Design/current/resources/ffmpeg/ffmpeg.exe';
const fontDir='C:/Users/jeonm/AppData/Local/Programs/vrew/resources/static/assets';
for(const [name,alias] of [['Pretendard-Regular-5c3iZRvJ.woff2','Regular'],['Pretendard-Medium-CvkpHfZp.woff2','Medium'],['Pretendard-Bold-Bue7gu6t.woff2','Bold']]){
  const installed=path.join(fontDir,name);
  GlobalFonts.registerFromPath(fs.existsSync(installed)?installed:'C:/Windows/Fonts/malgun.ttf',`Mooa ${alias}`);
}
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf','Mooa Latin Bold');
const hero=await loadImage(path.join(ROOT,'assets/hero-glass.png'));
const canvas=createCanvas(W,H),ctx=canvas.getContext('2d');
const blend=createCanvas(W,H),bx=blend.getContext('2d');
let c=ctx;
const C={ink:'#14291f',dark:'#061610',green:'#176b4a',mint:'#91e3bc',ivory:'#f5f5ef',gray:'#6a7b72',pale:'#eaf2e9'};
const clamp=v=>Math.min(1,Math.max(0,v));
const ease=v=>1-(1-clamp(v))**4;
const smooth=v=>{const p=clamp(v);return p*p*(3-2*p);};
const enter=(t,d=0,dur=.8)=>ease((t-d)/dur);
function rr(x,y,w,h,r,fill,stroke=null,width=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}}
function txt(s,x,y,size=32,color=C.ink,weight='Regular',align='left'){c.font=`${size}px "Mooa ${weight}"`;c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);}
function spaced(s,x,y,size,color,spacing=4){c.font=`${size}px "Mooa Medium"`;c.fillStyle=color;c.textAlign='left';for(const char of s){c.fillText(char,x,y);x+=c.measureText(char).width+spacing;}}
function rule(x1,y1,x2,y2,color,w=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=w;c.stroke();}
function dot(x,y,r,color){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();}
function check(x,y,color=C.green,s=1){c.save();c.translate(x,y);c.scale(s,s);c.beginPath();c.moveTo(-8,0);c.lineTo(-2,6);c.lineTo(10,-8);c.strokeStyle=color;c.lineWidth=3;c.lineCap='round';c.lineJoin='round';c.stroke();c.restore();}
function arrow(x,y,len=35,color=C.ink){rule(x,y,x+len,y,color,2.5);rule(x+len-10,y-8,x+len,y,color,2.5);rule(x+len-10,y+8,x+len,y,color,2.5);}
function shadow(blur=40,alpha=.1,offset=20){c.shadowColor=`rgba(0,20,8,${alpha})`;c.shadowBlur=blur;c.shadowOffsetY=offset;}
function noShadow(){c.shadowBlur=0;c.shadowOffsetY=0;}
function anim(t,d,fn,distance=42){const p=enter(t,d);c.save();c.globalAlpha*=p;c.translate(0,(1-p)*distance);fn();c.restore();}
function reveal(s,x,y,size,color,t,d=0){const p=enter(t,d,.9);c.save();c.beginPath();c.rect(x-6,y-size*1.08,W,size*1.32);c.clip();txt(s,x,y+(1-p)*size*1.2,size,color,'Bold');c.restore();}
function pill(s,x,y,w,color=C.green,bg=C.pale,size=25){rr(x,y,w,55,27,bg);txt(s,x+w/2,y+37,size,color,'Medium','center');}
function bg(dark,t){c.fillStyle=dark?C.dark:C.ivory;c.fillRect(0,0,W,H);const g=c.createRadialGradient(700+Math.sin(t*.15)*90,800,20,650,850,1300);g.addColorStop(0,dark?'#153d2b':'#ffffff');g.addColorStop(1,dark?C.dark:C.ivory);c.fillStyle=g;c.fillRect(0,0,W,H);}
function logo(x,y,scale=1,dark=false){c.save();c.translate(x,y);c.scale(scale,scale);rr(0,0,44,44,12,dark?'#a4e5c5':C.green);txt('M',22,32,30,dark?C.dark:'#fff','Latin Bold','center');txt('MOOA Resume',60,31,29,dark?'#e6f3e9':C.ink,'Medium');c.restore();}
function chrome(dark,section){logo(88,153,1.2,dark);spaced(section,90,285,23,dark?C.mint:C.green,4);}
function note(dark=false,y=1558){txt('서비스 흐름을 재구성한 예시 화면',90,y,23,dark?'#9bbfa7':'#7c8c7e');}
function heroBackground(t){
  c.fillStyle=C.dark;c.fillRect(0,0,W,H);
  const scale=1.23+t*.002;
  const iw=hero.width*scale,ih=hero.height*scale;
  c.drawImage(hero,W+40-iw+Math.sin(t*.2)*12,778,iw,ih);
  const g=c.createLinearGradient(0,740,0,1280);g.addColorStop(0,'#061610');g.addColorStop(.17,'rgba(6,22,16,.74)');g.addColorStop(.5,'rgba(6,22,16,0)');g.addColorStop(1,'rgba(6,22,16,0)');c.fillStyle=g;c.fillRect(0,740,W,540);
  const b=c.createLinearGradient(0,1480,0,H);b.addColorStop(0,'rgba(6,22,16,0)');b.addColorStop(1,'#061610');c.fillStyle=b;c.fillRect(0,1480,W,H-1480);
}
function pageIcon(x,y,s=1,color=C.green){c.save();c.translate(x,y);c.scale(s,s);rr(0,0,42,54,6,null,color,2);rule(10,17,30,17,color,2);rule(10,27,30,27,color,2);rule(10,37,24,37,color,2);c.restore();}
function appWindow(x,y,w,h,title,dark=false){shadow(45,.12,25);rr(x,y,w,h,29,dark?'#112c20':'#ffffff',dark?'#3b6249':'#d9e4d8',1.5);noShadow();rr(x+1,y+1,w-2,72,[28,28,0,0],dark?'#1b3c2a':'#f0f4ec');[0,1,2].forEach(i=>dot(x+29+i*21,y+36,5,dark?'#55765d':'#bacab9'));txt(title,x+w/2+15,y+46,23,dark?'#bbd5c2':'#6b8071','Medium','center');}
function feature(s,x,y,dark=false){dot(x+15,y-10,17,dark?'#214d34':'#dfebdd');check(x+15,y-10,dark?C.mint:C.green,.85);txt(s,x+48,y,29,dark?'#dcecdf':C.ink,'Medium');}

function opening(t){
  heroBackground(t);chrome(true,'YOUR NEXT CHAPTER');
  reveal('막막한 시작을,',84,439,87,'#f5f6ed',t,.25);
  reveal('나를 보여줄',84,551,87,C.mint,t,.6);
  reveal('기회로.',84,663,87,C.mint,t,.85);
  anim(t,1.3,()=>{txt('AI 취업 지원서 코치,',89,746,35,'#c2d9c9');txt('무아레쥬메',89,796,35,'#c2d9c9');});
  anim(t,1.75,()=>{rr(86,1470,714,84,42,'rgba(5,24,14,.83)','#436750');txt('경험에서 지원서, 면접까지.',126,1525,32,'#e1eee1','Medium');});
}
function connection(t){
  bg(false,t);chrome(false,'BUILT AROUND YOU');
  reveal('자소서만',84,422,94,C.ink,t,.2);
  reveal('보지 않습니다.',84,538,94,C.green,t,.5);
  anim(t,.9,()=>{txt('공고와 이력서,',90,625,36,C.gray);txt('내 경험을 함께.',90,677,36,C.gray);});
  const names=['채용공고','이력서','내 경험'],caps=['지원할 곳이 원하는 것','내가 해온 일','나를 보여주는 이야기'];
  names.forEach((s,i)=>anim(t,.75+i*.16,()=>{
    const x=90,y=790+i*177+Math.sin(t*.8+i)*4;
    if(i<2)rule(156,y+128,156,y+181,'#b4ceba',2);
    shadow(35,.07,14);rr(x,y,790,142,24,'#fff','#d9e5d6');noShadow();pageIcon(x+37,y+42,.95);txt(s,x+117,y+61,34,C.ink,'Medium');txt(caps[i],x+117,y+108,28,C.gray);arrow(x+690,y+71,36,C.green);
  }));
  anim(t,1.8,()=>{rule(156,1286,156,1350,'#b4ceba',2);pill('하나의 지원 이야기로.',90,1360,790,'#e5f3e5',C.green,33);});
}
function beginner(t){
  bg(false,t);chrome(false,'처음 시작 · PRO 작성 흐름');
  reveal('아무것도 몰라요?',84,418,82,C.ink,t,.2);
  reveal('그 시작부터 함께.',84,523,82,C.green,t,.5);
  anim(t,.85,()=>{txt('질문에 답하며,',90,611,34,C.gray);txt('내 경험과 소재부터 정리해요.',90,662,34,C.gray);});
  anim(t,.4,()=>{
    const x=88,y=755,w=815;
    appWindow(x,y,w,684,'처음부터 작성');
    txt('내 경험에서 시작하기',x+37,y+140,36,C.ink,'Bold');
    ['경험 선택','내 역할','배운 점'].forEach((s,i)=>{rr(x+37+i*248,y+179,226,7,3,i<=Math.min(2,Math.floor(t/2.7))?C.green:'#e2eadd');txt(s,x+37+i*248,y+224,24,C.gray,'Medium');});
    txt('어떤 경험이 있나요?',x+37,y+290,30,C.ink,'Medium');
    ['팀 프로젝트','아르바이트','동아리'].forEach((s,i)=>pill(s,x+36+i*250,y+320,234,i===0&&t>1.8?'#fff':C.gray,i===0&&t>1.8?C.green:'#edf2e8',23));
    anim(t,2.4,()=>{
      txt('그 안에서 내가 맡은 역할은?',x+37,y+436,29,C.ink,'Medium');
      rr(x+35,y+462,744,103,15,'#fff','#a3bba6',1.5);
      const full='팀 프로젝트에서 의견을 정리했어요.';
      txt(full.slice(0,Math.floor(clamp((t-2.7)/1.55)*full.length)),x+57,y+526,30,C.ink);
    },20);
    anim(t,5.1,()=>{check(x+51,y+620,C.green,.95);txt('나만의 소재로 개요를 이어가요.',x+83,y+631,29,C.green,'Medium');},15);
  });
  note(false,1514);
}
function quick(t){
  bg(false,t);chrome(false,'QUICK');
  reveal('이미 쓴 글,',84,418,94,C.ink,t,.2);
  reveal('더 또렷하게.',84,535,94,C.green,t,.5);
  anim(t,.85,()=>{txt('핵심 개선점과 수정 이유를',90,620,34,C.gray);txt('한눈에 확인해요.',90,669,34,C.gray);});
  anim(t,.3,()=>{
    const x=88,y=754,w=815;
    appWindow(x,y,w,720,'QUICK · 문장 비교');
    spaced('BEFORE',x+36,y+133,22,'#809280',3);
    txt('팀원의 의견을 정리하고 역할을 나눴습니다.',x+36,y+185,30,C.ink);
    rr(x+31,y+213,752*enter(t,1.5),43,5,'rgba(215,193,130,.2)');
    txt('팀원들과 협력해 프로젝트를 마쳤습니다.',x+36,y+245,30,C.ink);
    anim(t,2.25,()=>{
      rr(x+34,y+297,746,106,15,'#f4f0e4');txt('수정 이유',x+58,y+334,24,'#8c743b','Bold');txt('반복을 줄이고 행동이 드러나도록 연결해요.',x+58,y+379,27,'#756640');
    },16);
    rule(x+37,y+439,x+w-38,y+439,'#dce6d9');
    anim(t,3.4,()=>{
      spaced('AFTER',x+36,y+490,22,C.green,3);rr(x+32,y+518,752,116,14,'#e8f2e4');
      txt('팀원의 의견을 정리해 역할을 나누고,',x+51,y+562,31,C.green,'Medium');
      txt('협업으로 프로젝트를 마무리했습니다.',x+51,y+611,31,C.green,'Medium');
    },20);
    anim(t,5.1,()=>{check(x+49,y+676,C.green,.9);txt('경험은 유지하고, 표현은 명확하게.',x+80,y+686,27,C.green,'Medium');},12);
  });note(false,1550);
}
function pro(t){
  bg(true,t);chrome(true,'PRO');
  reveal('내 경험을,',84,416,88,'#f5f6ed',t,.2);
  reveal('공고에 맞는',84,523,88,C.mint,t,.5);
  reveal('이야기로.',84,630,88,C.mint,t,.75);
  anim(t,1.1,()=>txt('쓸 소재부터 지원서 완성까지.',90,718,35,'#acc9b6'));
  ['채용공고','이력서','내 경험'].forEach((s,i)=>anim(t,.7+i*.22,()=>{
    const x=90+i*278,y=818;rr(x,y,254,132,20,'#193d29','#40694c');pageIcon(x+24,y+31,.74,'#9dccaa');txt(s,x+72,y+77,29,'#edf4e9','Medium');
    c.beginPath();c.moveTo(x+127,y+132);c.bezierCurveTo(x+127,y+211,492,975,492,1020);c.strokeStyle='#4a7e59';c.lineWidth=2;c.stroke();
    const p=(t*.3+i*.2)%1;dot((x+127)*(1-p)+492*p,950+p*70,4,C.mint);
  }));
  anim(t,1.8,()=>{
    const y=1021+Math.sin(t*.7)*3;
    shadow(45,.28,18);rr(90,y,812,450,25,'#f0f3e9');noShadow();
    spaced('MY APPLICATION',128,y+55,22,C.green,2);txt('나의 지원서',128,y+120,42,C.ink,'Bold');rule(128,y+152,857,y+152,'#c9d9c4');
    ['공고에 맞는 소재','문항별 경험 배치','근거가 있는 문장'].forEach((s,i)=>anim(t,2.5+i*.8,()=>feature(s,129,y+218+i*81),14));
  });note(true,1550);
}
function finalScene(t){
  bg(true,t);chrome(true,'FINAL');
  reveal('지원서 다음은,',84,419,86,'#f5f6ed',t,.2);
  reveal('면접입니다.',84,528,86,C.mint,t,.5);
  anim(t,.85,()=>{txt('제출 전 검수부터',90,615,34,'#abc8b6');txt('AI 모의면접까지.',90,665,34,'#abc8b6');});
  anim(t,1.2,()=>txt('답변 평가 · 꼬리질문 · 면접 리포트',90,714,25,'#95bda3','Medium'),20);
  anim(t,.3,()=>{
    const x=88,y=746,w=815;
    appWindow(x,y,w,755,'FINAL · 텍스트 AI 모의면접',true);
    anim(t,.7,()=>{
      txt('AI 면접관',x+34,y+129,24,'#a9c9b4','Medium');rr(x+32,y+151,675,115,19,'#254b32');
      txt('의견이 달랐던 팀원과',x+58,y+197,33,'#f0f5e9','Medium');txt('어떻게 협업했나요?',x+58,y+241,33,'#f0f5e9','Medium');
    });
    anim(t,2.5,()=>{
      rr(x+107,y+298,675,142,19,'#bce6ca');txt('각자의 의견을 정리하고,',x+133,y+346,29,C.ink);
      txt('공통 목표를 기준으로',x+133,y+383,29,C.ink);txt('역할을 나눴습니다.',x+133,y+420,29,C.ink);
    });
    anim(t,4.6,()=>{
      txt('답변 피드백',x+34,y+474,24,'#a9c9b4','Medium');txt('내 행동은 명확해요.',x+34,y+516,29,'#d9ecda');txt('판단 기준도 설명해 보세요.',x+34,y+554,29,'#d9ecda');
    });
    anim(t,6.2,()=>{
      rr(x+31,y+587,752,135,19,'#244c32','#588868');spaced('FOLLOW-UP',x+56,y+624,20,C.mint,2);
      txt('그 역할 분담을 선택한 이유는',x+56,y+669,29,'#f3f6ec','Medium');txt('무엇인가요?',x+56,y+707,29,'#f3f6ec','Medium');
    },17);
  });note(true,1570);
}
function promise(t){
  bg(false,t);chrome(false,'THE MOOA WAY');
  reveal('없는 경험은',84,418,83,C.ink,t,.2);
  reveal('만들지 않고.',84,520,83,C.ink,t,.4);
  reveal('내 경험이',84,659,83,C.green,t,.65);
  reveal('전해지도록.',84,761,83,C.green,t,.9);
  anim(t,1.3,()=>{txt('입력은 간단하게.',90,846,34,C.gray);txt('분석은 섬세하게.',90,895,34,C.gray);});
  const names=['QUICK','PRO','FINAL'],caps=['작성한 글 첨삭','처음 작성부터 완성','지원서에서 면접까지'];
  names.forEach((s,i)=>anim(t,1.8+i*.2,()=>{
    const x=90,y=997+i*166;rr(x,y,807,143,23,i===1?C.green:'#e9f0e4',i===1?null:'#d4e0ce');
    txt(s,x+32,y+57,31,i===1?'#f0f6e8':C.green,'Bold');txt(caps[i],x+32,y+110,30,i===1?'#d8ead8':C.gray);arrow(x+707,y+67,37,i===1?'#c2e1c5':C.green);
  }));
}
function endcard(t){
  heroBackground(t+2);chrome(true,'BEGIN YOUR NEXT');
  reveal('나의 다음을',84,428,89,'#f5f6ed',t,.2);
  reveal('준비하는 방법.',84,542,89,C.mint,t,.5);
  anim(t,.95,()=>txt('무아레쥬메',90,632,38,'#c4d8c9','Medium'));
  anim(t,1.25,()=>{rr(87,721,799,110,55,'#d1edda');txt('mooaresume.com',127,793,44,C.dark,'Medium');arrow(777,776,46,C.dark);});
  anim(t,1.7,()=>txt('지금, 내 지원 준비 시작하기',91,905,32,'#bad5c3'));
}
const renderers=[opening,connection,beginner,quick,pro,finalScene,promise,endcard];
function scene(index,t,target){c=target;c.resetTransform();c.globalAlpha=1;c.clearRect(0,0,W,H);renderers[index](t);}
function frame(time){
  const index=Math.max(0,film.scenes.findIndex(s=>time>=s.start&&time<s.end));
  const t=time-film.scenes[index].start;scene(index,t,ctx);
  if(index>0&&t<.32){scene(index-1,film.scenes[index-1].end-film.scenes[index-1].start+t,bx);ctx.save();ctx.globalAlpha=1-smooth(t/.32);ctx.drawImage(blend,0,-t*30);ctx.restore();}
  const fade=smooth(time/.35)*(1-smooth((time-59.6)/.4));if(fade<1){ctx.fillStyle=`rgba(3,14,8,${1-fade})`;ctx.fillRect(0,0,W,H);}return canvas;
}
async function stills(){
  const qa=path.join(ROOT,'qa/vertical');fs.mkdirSync(qa,{recursive:true});
  const times=[2.8,7.4,12.2,16.6,21.6,25.7,32.8,36.6,42.2,46.8,52.1,58.1];
  const sheet=createCanvas(1440,2016),sc=sheet.getContext('2d');sc.fillStyle='#15251b';sc.fillRect(0,0,1440,2016);
  for(let i=0;i<times.length;i++){frame(times[i]);const file=path.join(qa,`frame-${String(times[i]).replace('.','-')}.png`);fs.writeFileSync(file,canvas.toBuffer('image/png'));const image=await loadImage(file);sc.drawImage(image,i%4*360,Math.floor(i/4)*672,360,640);sc.fillStyle='#dfeddd';sc.font='20px "Mooa Medium"';sc.fillText(`${times[i].toFixed(1)}s`,i%4*360+14,Math.floor(i/4)*672+665);}
  fs.writeFileSync(path.join(qa,'contact-sheet.jpg'),sheet.toBuffer('image/jpeg'));
  frame(58.1);fs.writeFileSync(path.join(ROOT,'poster-vertical.png'),canvas.toBuffer('image/png'));
  console.log('Portrait stills ready: 1080x1920');
}
async function render(){
  const output=path.join(ROOT,'mooa-resume-60s-vertical-1080x1920.mp4');
  const args=['-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(FPS),'-i','pipe:0','-i',path.join(ROOT,'audio/original-score.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',String(FPS),'-c:a','aac','-b:a','320k','-ar','48000','-t','60','-movflags','+faststart','-metadata','title=MOOA Resume | 세로 60초 브랜드 필름','-metadata','comment=Portrait 9:16 composition. Original music. Illustrative product UI; no customer data.',output];
  const ff=spawn(FFMPEG,args,{windowsHide:true,stdio:['pipe','ignore','pipe']});let errors='';ff.stderr.on('data',d=>{errors+=d.toString();});
  const done=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(new Error(`ffmpeg ${code}: ${errors}`)));});
  const start=Date.now();
  for(let i=0;i<60*FPS;i++){frame(i/FPS);if(!ff.stdin.write(canvas.data()))await once(ff.stdin,'drain');if(i%(FPS*5)===0)console.log(`Portrait ${i/FPS}/60s, elapsed ${((Date.now()-start)/1000).toFixed(1)}s`);}
  ff.stdin.end();await done;console.log(`Portrait complete: ${output}`);if(errors)console.log(errors);
}
if(process.argv.includes('--stills'))await stills();else await render();
