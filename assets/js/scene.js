/* TZERØ living page: season scene, page glow, click effects, the red thread and its critter.
   Ported from the approved "Tide and Thread" mockup. */
(()=>{
const LITE=matchMedia('(pointer:coarse)').matches||innerWidth<760;
let MODE='auto';try{const m=localStorage.getItem('tz-motion');if(m==='light'||m==='still')MODE=m}catch(e){}
function autoLevel(){const n=navigator,cores=n.hardwareConcurrency||8,mem=n.deviceMemory||8,save=n.connection&&n.connection.saveData;if(LITE&&(cores<=2||mem<=1))return 2;return LITE||save?1:0}
let LEVEL=MODE==='still'?2:MODE==='light'?1:autoLevel(),stillDrawn=false;
let still=matchMedia('(prefers-reduced-motion: reduce)').matches,dpr=Math.min(devicePixelRatio||1,LEVEL?1:2),root=document.documentElement;
const sea=document.querySelector('.sea'),c=document.getElementById('waves')||document.createElement('canvas'),x=c.getContext('2d');
const f=document.getElementById('fx'),fx=f.getContext('2d'),b=document.getElementById('bg'),bx=b.getContext('2d');let cx=-1,cy=-1;
let w,h,W,H,t=0,mx=-1,my=-1,px=-1,py=-1,energy=0,gust=0,lastX=null;
const SKINS={sea:'Summer',autumn:'Autumn'};const month=new Date().getMonth();
let skin=month>=2&&month<=7?'sea':'autumn';try{const s=localStorage.getItem('tz-skin');if(SKINS[s])skin=s}catch(e){}
const btn=document.getElementById('skin');function setSkin(s){skin=s;root.dataset.skin=s;btn.textContent='Skin: '+SKINS[s];stillDrawn=false}setSkin(skin);
btn.onclick=()=>{setSkin(skin==='sea'?'autumn':'sea');try{localStorage.setItem('tz-skin',skin)}catch(e){}};
function size(){w=c.width=c.clientWidth*dpr;h=c.height=c.clientHeight*dpr;W=f.width=innerWidth*dpr;H=f.height=innerHeight*dpr;b.width=W;b.height=H}
addEventListener('resize',()=>{size();stillDrawn=false});size();

/* pointer: page-wide; hero coords for the scene, viewport coords for fx */
const wake=[];let trailD=0;
addEventListener('pointermove',e=>{
  const r=c.getBoundingClientRect(),nx=(e.clientX-r.left)*dpr,ny=(e.clientY-r.top)*dpr;
  if(px>=0){const d=Math.hypot(nx-px,ny-py);energy=Math.min(2,energy+d/(120*dpr));trailD+=d}
  px=mx=nx;py=my=ny;
  if(lastX!==null)gust+=(e.clientX-lastX)*.0008;lastX=e.clientX;
  cx=e.clientX*dpr;cy=e.clientY*dpr;
  if(false){trailD=0;wake.push({x:e.clientX*dpr,y:e.clientY*dpr,r:4*dpr,a:.5})}
});
document.addEventListener('pointerleave',()=>{mx=-1;lastX=null});

/* click anywhere (except links and buttons): splash in summer, leaf burst in autumn */
const drops=[],rings=[],flyers=[];
document.addEventListener('click',e=>{if(e.target.closest('a,button,.polaroid'))return;sfx('splash');memory(e);const X=e.clientX*dpr,Y=e.clientY*dpr;
  if(skin==='sea'){rings.push({x:X,y:Y,r:0});energy=2;
    for(let k=0;k<26;k++){const an=-Math.PI/2+(Math.random()-.5)*1.9,sp=(3+Math.random()*7)*dpr;drops.push({x:X,y:Y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,r:(1+Math.random()*2.6)*dpr,y0:Y})}}
  else{gust+=e.clientX>innerWidth/2?-1.4:1.4;for(let k=0;k<10;k++){const an=Math.random()*6.28,sp=(2+Math.random()*5)*dpr;flyers.push(mkLeaf(X,Y,Math.cos(an)*sp,Math.sin(an)*sp-3*dpr))}}
});

/* realistic leaf: gradient blade, midrib, side veins, stem */
const tones=[['#e9a54b','#b4521d'],['#d97a2b','#8f3216'],['#f0c060','#c4772a'],['#c8402a','#7d1e12']];
function mkLeaf(X,Y,vx,vy){return{x:X,y:Y,vx,vy,r:Math.random()*6.28,vr:(Math.random()-.5)*.08,flip:Math.random()*6.28,z:.7+Math.random()*.7,c:tones[Math.floor(Math.random()*4)],life:1}}
function drawLeaf(g,L){const s=13*L.z*dpr,sq=Math.abs(Math.cos(L.flip))*.75+.25;g.save();g.translate(L.x,L.y);g.rotate(L.r);g.scale(sq,1);
  const gr=g.createLinearGradient(-s,-s,s,s);gr.addColorStop(0,L.c[0]);gr.addColorStop(1,L.c[1]);g.fillStyle=gr;g.globalAlpha=.92*L.life;
  g.beginPath();g.moveTo(0,-s*1.15);g.bezierCurveTo(s*.75,-s*.75,s*.7,s*.35,0,s);g.bezierCurveTo(-s*.7,s*.35,-s*.75,-s*.75,0,-s*1.15);g.fill();
  g.strokeStyle='rgba(60,25,10,.35)';g.lineWidth=.8*dpr;g.beginPath();g.moveTo(0,-s);g.lineTo(0,s*1.35);
  for(let v=-.5;v<.8;v+=.32){g.moveTo(0,s*v);g.lineTo(s*.42,s*(v-.28));g.moveTo(0,s*v);g.lineTo(-s*.42,s*(v-.28))}g.stroke();g.restore()}

/* scene: summer sea */
const seaL=[{a:10,l:.006,s:.7,y:.56,top:'rgba(186,226,250,.7)',bot:'rgba(120,190,236,.7)'},{a:16,l:.0042,s:-.5,y:.66,top:'rgba(110,178,232,.8)',bot:'rgba(52,130,204,.85)'},{a:20,l:.003,s:.38,y:.78,top:'rgba(46,120,196,.92)',bot:'rgba(22,80,152,.95)'},{a:14,l:.0022,s:-.28,y:.92,top:'#123f7a',bot:'#0A1F44'}];
function waveY(L,i){let y=L.y*h+Math.sin(i*L.l/dpr+t*L.s*2)*L.a*dpr+Math.sin(i*L.l*2.7/dpr-t*L.s*3.1)*L.a*.33*dpr+Math.sin(i*L.l*6.1/dpr+t*L.s*5)*L.a*.12*dpr;
  if(mx>=0&&my>-200*dpr&&my<h+200*dpr){const d=(i-mx)/(190*dpr);y-=Math.exp(-d*d)*(30+50*energy)*dpr*Math.cos(d*2.2-t*4)}return y}
function summer(){
  seaL.forEach(L=>{const g=x.createLinearGradient(0,L.y*h-L.a*dpr,0,h);g.addColorStop(0,L.top);g.addColorStop(1,L.bot);x.fillStyle=g;x.beginPath();x.moveTo(0,h);
    const pts=[];for(let i=0;i<=w+8*dpr;i+=5*dpr){const y=waveY(L,i);pts.push(y);x.lineTo(i,y)}x.lineTo(w,h);x.closePath();x.fill();
    x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.2*dpr;x.beginPath();pts.forEach((y,k)=>{const i=k*5*dpr;k?x.lineTo(i,y):x.moveTo(i,y)});x.stroke()});
  if(mx>=0){const g=x.createRadialGradient(mx,my,0,mx,my,160*dpr);g.addColorStop(0,'rgba(255,255,255,'+(.18+.12*energy)+')');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h)}}

/* scene: autumn sunset, hills, wind */
const hills=[{c:['#f3b07f','#e08f68'],a:20,l:.0016,y:.62},{c:['#c86a42','#9c4a2c'],a:28,l:.0012,y:.74},{c:['#6e2f1c','#4a2014'],a:24,l:.001,y:.86},{c:['#2f1a12','#1e100b'],a:14,l:.0008,y:.96}];
const sceneLeaves=Array.from({length:14},()=>mkLeaf(Math.random()*2000,Math.random()*600,0,0));
function autumn(){const wind=.7+Math.sin(t*.4)*.35+gust;gust*=.965;
  const sx=w*.7,sy=h*(.6+Math.sin(t*.05)*.02),sr=Math.min(w,h)*.12;
  let g=x.createRadialGradient(sx,sy,sr*.8,sx,sy,sr*6);g.addColorStop(0,'rgba(255,200,130,.75)');g.addColorStop(1,'rgba(255,140,100,0)');x.fillStyle=g;x.fillRect(0,0,w,h);
  g=x.createRadialGradient(sx,sy-sr*.3,0,sx,sy,sr);g.addColorStop(0,'#fff6dc');g.addColorStop(.7,'#ffd08a');g.addColorStop(1,'#ffab6a');x.fillStyle=g;x.beginPath();x.arc(sx,sy,sr,0,7);x.fill();
  x.lineCap='round';for(let r=0;r<5;r++){const y0=h*(.1+r*.1),len=w*.35,start=((t*(90+r*25)*wind*dpr+r*400*dpr)%(w+len*2))-len;
    x.strokeStyle='rgba(255,250,240,'+(.16+.08*Math.sin(t+r))+')';x.lineWidth=(1+r%2*.6)*dpr;x.beginPath();
    for(let s=0;s<=len;s+=6*dpr){const X=start+s,Y=y0+Math.sin(X*.003/dpr+t*.8+r)*14*dpr*Math.sin(s/len*Math.PI);s?x.lineTo(X,Y):x.moveTo(X,Y)}x.stroke()}
  hills.forEach(H=>{const gr=x.createLinearGradient(0,H.y*h-H.a*dpr,0,h);gr.addColorStop(0,H.c[0]);gr.addColorStop(1,H.c[1]);x.fillStyle=gr;x.beginPath();x.moveTo(0,h);
    for(let i=0;i<=w+6*dpr;i+=4*dpr){let y=H.y*h+Math.sin(i*H.l/dpr+H.y*9)*H.a*dpr+Math.sin(i*H.l*4/dpr+H.y*3)*H.a*.25*dpr+Math.sin(i*.05/dpr+t*2*wind)*1.2*dpr;
      if(mx>=0){const d=(i-mx)/(150*dpr);y+=Math.exp(-d*d)*(6+10*energy)*dpr*Math.sin(t*4+d)}x.lineTo(i,y)}x.lineTo(w,h);x.closePath();x.fill()});
  for(const L of sceneLeaves){L.x+=(1.6*wind+L.z)*dpr*.8;L.y+=(.5+Math.sin(t*2+L.r)*.6)*dpr;L.r+=L.vr*wind+.01;L.flip+=.05*wind;
    if(mx>=0){const dx=L.x-mx,dy=L.y-my,d=Math.hypot(dx,dy)||1,R=(120+60*energy)*dpr;if(d<R){L.x+=dx/d*(R-d)*.08;L.y+=dy/d*(R-d)*.08}}
    if(L.x>w+30*dpr||L.x<-30*dpr||L.y>h){L.x=gust<-.3?w+20*dpr:-20*dpr;L.y=Math.random()*h*.7}drawLeaf(x,L)}}

/* page-wide fx layer */
function drawFx(){fx.clearRect(0,0,W,H);bx.clearRect(0,0,W,H);const warm=skin!=='sea';
  if(cx>=0){const g=bx.createRadialGradient(cx,cy,0,cx,cy,(220+80*energy)*dpr);g.addColorStop(0,warm?'rgba(232,137,106,.30)':'rgba(140,200,242,.45)');g.addColorStop(1,'rgba(255,255,255,0)');bx.fillStyle=g;bx.fillRect(0,0,W,H)}
  for(let k=wake.length-1;k>=0;k--){const R=wake[k];R.r+=1.6*dpr;R.a*=.94;if(R.a<.02){wake.splice(k,1);continue}
    bx.strokeStyle=(warm?'rgba(196,101,43,':'rgba(61,143,214,')+R.a*.7+')';bx.lineWidth=1.4*dpr;bx.beginPath();bx.ellipse(R.x,R.y,R.r*1.6,R.r*.7,0,0,7);bx.stroke()}
  for(let k=rings.length-1;k>=0;k--){const R=rings[k];R.r+=3.4*dpr;const al=1-R.r/(240*dpr);if(al<=0){rings.splice(k,1);continue}
    for(let q=0;q<3;q++){const rr=R.r-q*20*dpr;if(rr<=0)continue;fx.strokeStyle='rgba(61,143,214,'+al*(.9-q*.25)+')';fx.lineWidth=(2-q*.4)*dpr;fx.beginPath();fx.ellipse(R.x,R.y,rr,rr*.38,0,0,7);fx.stroke()}}
  for(let k=drops.length-1;k>=0;k--){const D=drops[k];D.vy+=.32*dpr;D.x+=D.vx;D.y+=D.vy;if(D.y>D.y0+8*dpr&&D.vy>0){drops.splice(k,1);if(Math.random()<.4)rings.push({x:D.x,y:D.y,r:0});continue}
    const g=fx.createRadialGradient(D.x-D.r*.3,D.y-D.r*.3,0,D.x,D.y,D.r*1.4);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(61,143,214,.75)');fx.fillStyle=g;
    fx.beginPath();fx.ellipse(D.x,D.y,D.r,D.r*(1+Math.min(1.2,Math.abs(D.vy)/(8*dpr))),Math.atan2(D.vy,D.vx)-Math.PI/2,0,7);fx.fill()}
  for(let k=flyers.length-1;k>=0;k--){const L=flyers[k];L.vx+=gust*.05*dpr;L.vy+=.08*dpr;L.vx*=.985;L.vy*=.985;L.x+=L.vx;L.y+=L.vy;L.r+=L.vr*3;L.flip+=.12;L.life-=.006;
    if(L.life<=0||L.y>H+40*dpr){flyers.splice(k,1);continue}drawLeaf(fx,L)}}

let seaOn=c.isConnected,odd=false,lastF=0,win=[],settle=performance.now()+1500;if(seaOn&&window.IntersectionObserver)new IntersectionObserver(e=>{seaOn=e[0].isIntersecting}).observe(c);
function setLevel(l){if(l===LEVEL)return;LEVEL=l;root.dataset.motion=l;stillDrawn=false;dpr=Math.min(devicePixelRatio||1,l?1:2);size();if(l===2){fx.clearRect(0,0,W,H);bx.clearRect(0,0,W,H)}}
/* Auto: average the real time between frames over ~2 s windows; slow windows step the level down, never up */
function watch(now){if(MODE!=='auto'||document.hidden||now<settle){lastF=now;return}if(lastF){const d=now-lastF;if(d<250)win.push(d)}lastF=now;if(win.length>=(LEVEL?60:120)){const avg=win.reduce((a,b)=>a+b,0)/win.length;win=[];if(LEVEL===0&&avg>24)setLevel(1);else if(LEVEL===1&&avg>40)setLevel(2)}}
document.addEventListener('visibilitychange',()=>{lastF=0;win=[];settle=performance.now()+1000});
function frame(now){watch(now||performance.now());if(LEVEL===2){if(seaOn&&!stillDrawn){x.clearRect(0,0,w,h);if(skin==='sea')summer();else autumn();stillDrawn=true}if(!still)requestAnimationFrame(frame);return}if(LEVEL===1&&(odd=!odd)){if(!still)requestAnimationFrame(frame);return}t+=LEVEL?.032:.016;energy*=LEVEL?.92:.96;if(seaOn){x.clearRect(0,0,w,h);if(skin==='sea')summer();else autumn()}drawFx();if(!still)requestAnimationFrame(frame)}
/* Header button: Auto, Light or Still, remembered per visitor */
root.dataset.motion=LEVEL;const mbtn=document.getElementById('motion');const MODES={auto:'Auto',light:'Light',still:'Still'};function showMode(){if(mbtn){mbtn.textContent='Motion: '+MODES[MODE];mbtn.title='Background animation: '+MODES[MODE]}}showMode();if(mbtn)mbtn.onclick=()=>{MODE=MODE==='auto'?'light':MODE==='light'?'still':'auto';try{MODE==='auto'?localStorage.removeItem('tz-motion'):localStorage.setItem('tz-motion',MODE)}catch(e){}showMode();win=[];settle=performance.now()+1000;setLevel(MODE==='still'?2:MODE==='light'?1:autoLevel())};
frame();

function bindTilt(scope){scope.querySelectorAll('.tilt:not([data-tilt])').forEach(el=>{el.dataset.tilt='1';el.addEventListener('pointermove',e=>{if(still)return;const b=el.getBoundingClientRect(),qx=(e.clientX-b.left)/b.width,qy=(e.clientY-b.top)/b.height;
  el.style.setProperty('--gx',qx*100+'%');el.style.setProperty('--gy',qy*100+'%');el.style.transform=`perspective(1000px) rotateY(${(qx-.5)*7}deg) rotateX(${(.5-qy)*7}deg) translateY(-4px)`});
  el.addEventListener('pointerleave',()=>el.style.transform='')})}
bindTilt(document);

/* floating red thread: no gravity, desk friction */
const tc=document.getElementById('thread'),tx_=tc.getContext('2d');let N=38;const seg=13;let scene=null,newsStage=0;let therapy=false,tears=[],lastMove=0;let home=false,sleeping=false;let stake=null;let spin=0,squash=0,blinkT=3,sass=0,dodgeCool=0;let pts=[],hx=null,hy=null,thA=1,lastActive=0,bat={st:'ok',next:45+Math.random()*30};
/* phones have no cursor for the thread to power: there Ache is a little free star that rests in the bottom corner and visits things on screen */
const TOUCH=matchMedia('(hover:none) and (pointer:coarse)').matches;
function tsize(){tc.width=innerWidth*dpr;tc.height=innerHeight*dpr;if(!pts.length)for(let i=0;i<N;i++){pts.push({x:60+i*seg,y:110,px:60+i*seg,py:110})}}
addEventListener('resize',tsize);tsize();addEventListener('pointermove',e=>{hx=e.clientX;hy=e.clientY});

/* the thread's tail is curious: it goes to things it likes and says little things */
const say=document.createElement('div');say.className='say';document.body.appendChild(say);
/* everything Ache says goes through speak(): a line stays up long enough to read, and a lower priority never cuts off a higher one.
   4 scene and fight, 3 something you did to Ache (stake, sleep, wake), 2 dodging the cursor, 1 a line about what it visits, 0 idle chatter */
let sayPrio=-1,sayEnd=0;const readMs=t=>Math.min(9000,Math.max(3000,1200+t.length*60));
function speak(t,prio,ms){if(!t)return 0;const now=performance.now();if(now<sayEnd&&prio<sayPrio)return 0;ms=ms||readMs(t);say.textContent=t;say.classList.add('on');sayPrio=prio;sayEnd=now+ms;clearTimeout(say._t);say._t=setTimeout(()=>{say.classList.remove('on');sayPrio=-1},ms);return ms}
/* keep the bubble on screen: slide it sideways near the edges (the tail stays on Ache) and flip it below him near the top */
function placeSay(x,y,gap){const w=say.offsetWidth,h=say.offsetHeight,m=8,cx=Math.min(Math.max(x,w/2+m),innerWidth-w/2-m),below=y-gap-h<m;
  say.style.left=cx+'px';say.style.top=(below?y+gap:y-gap)+'px';say.classList.toggle('below',below);say.style.setProperty('--tail',(x-cx)+'px')}
const busy=()=>performance.now()<sayEnd+3000;
let target=null,until=0,said=null,cool=0;
function pick(){const els=[...document.querySelectorAll('[data-say]')].filter(el=>{const b=el.getBoundingClientRect();return b.bottom>40&&b.top<innerHeight-40&&b.right>0&&b.left<innerWidth});
  target=els.length?els[Math.floor(Math.random()*els.length)]:null;until=tt+(TOUCH?12:6)+Math.random()*(TOUCH?8:4);said=null}
function seek(){if(scene){const tl=pts[N-1];let tx,ty;
  if(scene.mode==='card'){const b=scene.card.getBoundingClientRect();tx=b.right-18;ty=b.top+14;dim.style.setProperty('--sx',(b.left+b.width/2)+'px');dim.style.setProperty('--sy',(b.top+b.height/2)+'px')}
  else if(scene.mode==='rampage'){if(!scene.rt||tt>scene.rt){scene.rt=tt+.55;scene.rx=60+Math.random()*(innerWidth-120);scene.ry=90+Math.random()*(innerHeight-160)}tx=scene.rx;ty=scene.ry;dim.style.setProperty('--sx',tl.x+'px');dim.style.setProperty('--sy',tl.y+'px')}
  else if(scene.talkPos){tx=scene.talkPos.x;ty=scene.talkPos.y}
  else{tx=(hx??innerWidth/2)-46;ty=(hy??innerHeight/2)-34;if(Math.hypot(tl.x-tx,tl.y-ty)<26){scene.talkPos={x:tx,y:ty};talkScene()}}
  if(scene.mode==='mouse'){dim.style.setProperty('--sx',(hx??innerWidth/2)+'px');dim.style.setProperty('--sy',(hy??innerHeight/2)+'px')}
  const k=scene.mode==='rampage'?.22:.12;tl.x+=(tx-tl.x)*k;tl.y+=(ty-tl.y)*k;return}
  if(therapy&&!caught&&hx!==null){const tl=pts[N-1],tx=hx-46,ty=hy-34;tl.x+=(tx-tl.x)*.08;tl.y+=(ty-tl.y)*.08;if(Math.hypot(tl.x-tx,tl.y-ty)<24)openTherapy(tl.x,tl.y);return}if(home){const sp=slotPos(),tl=pts[N-1];tl.x+=(sp.x-tl.x)*.2;tl.y+=(sp.y-tl.y)*.2;pts[0].x+=(sp.x-pts[0].x)*.2;pts[0].y+=(sp.y-pts[0].y)*.2;if(!sleeping&&Math.hypot(tl.x-sp.x,tl.y-sp.y)<8&&Math.hypot(pts[0].x-sp.x,pts[0].y-sp.y)<8){sleeping=true;slot.classList.add('full');say.classList.remove('on')}return}if(caught){flee=null;daze=0;const tl=pts[N-1];tl.x+=(caught.x-tl.x)*.25;tl.y+=(caught.y-tl.y)*.25;return}if(flee){fleeStep();return}if(!target||tt>until||!document.contains(target))pick();if(!target)return;
  if(TOUCH&&said===target&&performance.now()>sayEnd){const tl=pts[N-1],dx=innerWidth-40,dy=innerHeight-56+Math.sin(tt*2)*4;tl.x+=(dx-tl.x)*.05;tl.y+=(dy-tl.y)*.05;return}
  const b=target.getBoundingClientRect(),tx=b.left+b.width*.5,ty=b.top+Math.min(b.height*.3,60),tl=pts[N-1],dx=tx-tl.x,dy=ty-tl.y,d=Math.hypot(dx,dy);
  tl.x+=dx*.035;tl.y+=dy*.035;
  if(d<70&&NEWS&&target.dataset.say===NEWS.key&&!caught&&!scene&&newsStage<2){if(newsStage===0){startScene(target);return}newsStage=2;said=target;until=tt+1.6;fsay("I'm okay now. mostly. go read it, it's a good article. a GREAT article. a good one.",2600);return}
  if(d<70&&said!==target&&tt>cool&&!caught){said=target;const ms=speak(nextLine(['artache','studio','motto','cover','devlog'].includes(target.dataset.say)&&Math.random()<.5?'proud':target.dataset.say),1);if(ms){cool=tt+ms/1000+4;until=Math.max(until,tt+ms/1000+1.5)}}}
addEventListener('scroll',()=>{if(target&&target.getBoundingClientRect().bottom<0)pick()},{passive:true});

/* 100+ lines per item, shuffled; no repeats until the whole bag is used */
let LINES={};fetch('/assets/lines.json').then(r=>r.json()).then(d=>{LINES=d}).catch(()=>{});const bags={};
const XLINES={};function nextLine(k){const L=LINES[k]||XLINES[k];if(!L||!L.length)return '';if(!bags[k]||!bags[k].length){bags[k]=L.slice();for(let i=bags[k].length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bags[k][i],bags[k][j]]=[bags[k][j],bags[k][i]]}}return bags[k].pop()}
/* catch the critter and talk to it */
let caught=null;const chat=document.createElement('div');chat.className='chat';chat.hidden=true;document.body.appendChild(chat);
const secrets=['the 9th floor has a 10th floor. probably','I was drawn with AI help, then fixed by people','every season I change clothes. try the Skin button','click the sky. it does things','I\'ve read all 158 old letters','the Ø is my cousin','my full name is Redache. Ache for short','Nero named me. I pretend I picked it','TZERØ means the moment things start','the polaroids can be dragged. rearrange my room!','Nero plays with me like a cat. I pretend not to notice','I don\'t sleep. I coil','I steal one pixel from every page. nobody noticed','I\'m why the cursor glows. you\'re welcome','I could dodge every click. I\'m just nice'];let si=0;
function talk(text,opts){chat.innerHTML='';const p=document.createElement('p');p.textContent=text;chat.appendChild(p);const row=document.createElement('div');row.className='opts';
  opts.forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=e=>{e.stopPropagation();fn()};row.appendChild(b)});chat.appendChild(row)}
function menu(text){talk(text,[['Who are you?',()=>talk("A four-point star on a string, obviously. Nero's nickname comes from a star like me, so technically I'm the boss here. The name's Ache. Full name Redache. Only friends call me Ache. You may call me Ache.",back)],
  ['What should I read?',()=>{const c=[...document.querySelectorAll('.card[data-say]')];if(!c.length){talk('The fresh stuff is on the front page. Follow me.',[['Take me',()=>{location.href='/#latest'}],['Maybe later',()=>menu('Suit yourself. Anything else?')]]);return}const pick=c[Math.floor(Math.random()*c.length)];talk('Try "'+pick.querySelector('h4').textContent+'". I\'ll show you!',[['Show me',()=>{release();pick.scrollIntoView({behavior:'smooth',block:'center'});target=pick;until=tt+8;said=null}],['Maybe later',()=>menu('Okay! Anything else?')]])}],
  ['Want a treat?',()=>(setMood('satisfied',12),talk)(['A treat? Only the premium red yarn. The imported kind. From the studio. The best studio.','Obviously. I\'ve been SO good. I only bugged the site once. Twice.','Put it on the stake. No, on a pillow. A silk pillow. Thank you.','I deserve three treats. One for each section. Four, counting me.'][Math.floor(Math.random()*4)],back)],
  ['What\'s Artache?',()=>talk(nextLine('proud'),[['Really?',()=>talk(nextLine('proud'),back)],['Back',()=>menu('Where was I? Oh right, the best studio. A good studio.')]])],
  ['Fight me!',()=>talk('You dare challenge Redache? Choose your doom.',[['Easy',()=>startFight('easy')],['Normal',()=>startFight('normal')],['Hard',()=>startFight('hard')],['NieR',()=>startFight('nier')],['Never mind',()=>menu('Coward. Anything else?')]])],
  ['Tell me a secret',()=>talk(secrets[si++%secrets.length],back)],
  ['Get shorter',()=>{resize(-6);talk(N<=20?'Any shorter and I\'m just a star with no string. Free at last? No.':'Ahh, lighter. Speedrun mode.',back)}],
  ['Get longer',()=>{resize(6);talk(N>=62?'Max length. I\'m basically a kite now.':'Wheee, more room to dodge you.',back)}],
  stake?['Pull the stake',()=>{stake=null;talk('FREEDOM. I mean, thanks.',[]);setTimeout(release,1000)}]:['Stake Ache here',()=>{driveStake();talk('A stake? Seriously? Fine. I\'ll guard this spot. Don\'t be long.',[]);setTimeout(release,1400)}],
  ['Bye!',()=>{talk('Finally. Try to keep up next time.',[]);setTimeout(release,1100)}]])}
const back=[['Back',()=>menu('What else?')],['Bye!',()=>{talk('See you around!',[]);setTimeout(release,1000)}]];
function resize(dn){const n=Math.max(20,Math.min(62,N+dn));while(N<n){const l=pts[N-1];pts.push({x:l.x,y:l.y,px:l.x,py:l.y});N++}while(N>n){pts.pop();N--}}
function release(){caught=null;therapy=false;chat.hidden=true;pick()}
addEventListener('click',e=>{if(fight||home||scene)return;const tl=pts[N-1];if(!caught&&Math.hypot(e.clientX-tl.x,e.clientY-tl.y)<26){e.stopImmediatePropagation();e.preventDefault();sfx('catch');
  caught={x:Math.min(Math.max(e.clientX,40),innerWidth-40),y:Math.min(Math.max(e.clientY,120),innerHeight-40)};say.classList.remove('on');
  chat.hidden=false;chat.style.left=Math.min(caught.x+18,innerWidth-300)+'px';chat.style.top=Math.max(caught.y-20,70)+'px';
  menu(['Ugh. Fine. You caught me. Welcome to Artache, best studio on Earth. In this building.','Ugh. Fine. You caught me.','Hey! Hands off the points!','Okay, okay, lucky click.','Caught? I let you catch me.','Rude. Impressive, but rude.','Unhand me, I\'m a star!'][Math.floor(Math.random()*4)]+' What\'s up?')}
  else if(caught&&!e.target.closest('.chat')){e.stopImmediatePropagation();release()}},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&caught)release()});

addEventListener('pointermove',e=>{if(TOUCH||fight||home||scene||caught||tt<dodgeCool)return;const tl=pts[N-1],d=Math.hypot(e.clientX-tl.x,e.clientY-tl.y);
  if(d<60&&!flee&&Math.random()<.35){dodgeCool=tt+5;const ax=tl.x-e.clientX,ay=tl.y-e.clientY,n=Math.hypot(ax,ay)||1;flee={ph:'run',t:0,dx:ax/n,dy:ay/n};sass=1.2}});
/* moods change Ache's body. Default is the pointy, annoying star; 'satisfied' (treats, pats, winning a fight) puffs him up into a chubby soft star for a while.
   Add a mood here and call setMood(name, seconds) wherever it should start */
const MOODS={annoying:{inner:.34,round:0,eye:.32,pupil:.15,shade:0},satisfied:{inner:.52,round:.55,eye:.36,pupil:.17,shade:1}};
const body={...MOODS.annoying};let moodName='annoying',moodUntil=0;
function setMood(n,sec){if(MOODS[n]){moodName=n;moodUntil=tt+sec}}
function starPath(g,R){const pts=[];for(let k=0;k<8;k++){const r=k%2?R*body.inner:R,a=k*Math.PI/4-Math.PI/2;pts.push([Math.cos(a)*r,Math.sin(a)*r])}
  g.beginPath();if(body.round<.02){pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();return}
  const m=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  for(let i=0;i<8;i++){const p=pts[i],t=i%2?body.round*.5:body.round*.32,a=m(p,pts[(i+7)%8],t),b=m(p,pts[(i+1)%8],t);i?g.lineTo(...a):g.moveTo(...a);g.quadraticCurveTo(...p,...b)}g.closePath()}
/* the dodge: he runs off, trips on his own thread, lies there a moment, gets up */
let flee=null,daze=0;
function fleeStep(){const tl=pts[N-1],f=flee;f.t+=.016;
  if(f.ph==='run'){const sp=9*Math.max(.35,1-f.t/1.1);f.dx+=(Math.random()-.5)*.08;f.dy+=(Math.random()-.5)*.08;const n=Math.hypot(f.dx,f.dy)||1;f.dx/=n;f.dy/=n;
    if(tl.x<30||tl.x>innerWidth-30)f.dx=-f.dx;if(tl.y<80||tl.y>innerHeight-30)f.dy=-f.dy;tl.x+=f.dx*sp;tl.y+=f.dy*sp+Math.sin(f.t*22)*1.5;
    if(f.t>1.1){f.ph='trip';f.t=0;sfx('hurt');speak(nextLine('trip')||nextLine('sass'),2)}}
  else if(f.ph==='trip'){const k=Math.min(1,f.t/.35);daze=k;tl.x+=f.dx*3*(1-k);tl.y+=(1-k)*2+(k<1?1.5:0);if(f.t>.35){f.ph='down';f.t=0}}
  else if(f.ph==='down'){daze=1;if(f.t>1.4){f.ph='up';f.t=0}}
  else{daze=Math.max(0,1-f.t/.5);tl.y-=1.2*(1-f.t/.5);if(f.t>.5){flee=null;daze=0}}}

function driveStake(){sfx('stake');const h=pts[0];stake={x:h.x+scrollX,y:h.y+scrollY}}
const stakeLines=['you just left me here?','I\'m not mad. I\'m staked','this stake is ugly. I love it','guard duty, day one','I could escape. I choose not to','tell the cursor I said hi','I\'ll be here. obviously','a star, tied to a stick. art','free? no. fabulous? yes','come back, I\'m bored'];let sli=0;
setInterval(()=>{if(stake&&!caught&&!busy()&&Math.random()<.5)speak(stakeLines[sli++%stakeLines.length],0)},12000);
addEventListener('click',e=>{if(fight||scene||!stake||caught)return;const sx=stake.x-scrollX,sy=stake.y-scrollY;if(Math.hypot(e.clientX-sx,e.clientY-(sy-4))<18){e.stopImmediatePropagation();stake=null;speak('FREE! I mean… thanks.',3)}},true);

/* ===== Redache vs Mouse: a small bullet-hell boss fight ===== */
let fight=null;
const fc=document.createElement('canvas');fc.id='arena';fc.hidden=true;document.body.appendChild(fc);const fx2=fc.getContext('2d');
const hud=document.createElement('div');hud.className='fhud';hud.hidden=true;
hud.innerHTML='<div class="boss"><b>REDACHE</b><span class="fdiff"></span><div class="hp"><i></i></div></div><div class="you"><b>MOUSE</b><div class="php"><i></i></div><span class="hearts"></span><span class="buffs"></span><button type="button" class="flee">Flee (Esc)</button></div><div class="fend" hidden><h3></h3><p></p><div class="opts"><button type="button" class="again">Rematch</button><button type="button" class="leave">Leave</button></div></div>';
document.body.appendChild(hud);
const DIFF={easy:{name:'Easy',php:10,ahp:20,spd:1.7,rate:1.5,dens:.6},normal:{name:'Normal',php:6,ahp:30,spd:2.3,rate:1.05,dens:1},hard:{name:'Hard',php:4,ahp:40,spd:2.9,rate:.8,dens:1.3},nier:{name:'NieR',php:3,ahp:50,spd:3.5,rate:.6,dens:1.7}};
const RM={
 start:['Foolish cursor! Redache shall teach you humility!','You dare raise a pointer against me?','Behold my four glorious points!','I have read every tome on this site. Prepare yourself!','A duel! At last, a worthy distraction!'],
 hurt:['Ow! My point!','A lucky click, nothing more!','Insolent pointer!','That one tickled. Mostly.','You will pay for that pixel!','Hmph. A scratch.','Do not touch the star!','My eye! Not the eye!'],
 taunt:['Ha! Feeble cursor!','Is that all, little arrow?','Dodge, mouse! Dodge!','Your clicking hand trembles!','Pathetic. Truly pathetic.','The orange ones can be clicked, you know. Not that it will save you.','Do not even THINK about those drops.','Too slow, rodent!','Mind the thread, mouse. It bites.','My thread is longer than your patience!'],
 low:['No… my glorious points are fraying!','This cannot be! I am the boss!','I am merely warming up!','Very well. No more mercy!'],
 win:['Impossible… a mouse… defeated Redache…','Fine. FINE. You win. This time.','I let you win. Obviously. Rematch?'],
 lose:['Mouse K.O.! Bow before Redache!','And stay down, cursor!','Victory is mine, as written in the tomes!'],
 pat:['Dark Blast!','Spiral of Ruin!','Volley of Spite!','Lances of Ache!','The Wall of Pages!','Red Thread Lash!']};
const pickR=k=>RM[k][Math.floor(Math.random()*RM[k].length)];
function sprite(col,glow){const c=document.createElement('canvas'),S=40;c.width=c.height=S;const g=c.getContext('2d'),gr=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);
  gr.addColorStop(0,'#fff');gr.addColorStop(.3,col);gr.addColorStop(.55,glow);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,S,S);return c}
const SPR={o:sprite('#ff9a3c','rgba(255,120,30,.45)'),p:sprite('#9b5cff','rgba(110,50,255,.45)')};
function fsay(t,ms=1800,prio=4){return speak(t,prio,fight?ms:Math.max(ms,readMs(t)))}
function startFight(k){const d=DIFF[k];stake=null;caught=null;chat.hidden=true;
  fight={k,d,ahp:d.ahp,php:d.php,b:[],t:0,pat:0,patT:0,fire:0,ang:0,iframe:0,ax:innerWidth/2,ay:innerHeight*.3,tx:innerWidth/2,ty:innerHeight*.3,mt:0,over:false,shake:0,flash:0,lances:[],talkT:3,drops:[],dropT:3.5,pod:0,podF:0,pb:[],shield:0,beam:0,beamA:null};
  fc.width=innerWidth*dpr;fc.height=innerHeight*dpr;fc.hidden=false;hud.hidden=false;hud.querySelector('.fend').hidden=true;hud.querySelector('.fdiff').textContent=d.name;
  document.body.classList.add('fighting');updHud();fsay(pickR('start'),2400)}
function endFight(){fight=null;fc.hidden=true;hud.hidden=true;document.body.classList.remove('fighting');say.classList.remove('on');pick()}
function updHud(){if(!fight)return;hud.querySelector('.hp i').style.width=Math.max(0,fight.ahp/fight.d.ahp*100)+'%';
  hud.querySelector('.php i').style.width=Math.max(0,fight.php/fight.d.php*100)+'%';hud.querySelector('.php i').style.background=fight.php/fight.d.php<=.34?'linear-gradient(90deg,#D0021B,#ff6b6b)':'linear-gradient(90deg,#3d8fd6,#8cc8f2)';hud.querySelector('.buffs').textContent=[fight.pod>0?'POD '+Math.ceil(fight.pod)+'s':'',fight.shield?'SHIELD':''].filter(Boolean).join(' · ');hud.querySelector('.hearts').textContent='♥'.repeat(Math.max(0,fight.php))+'♡'.repeat(Math.max(0,fight.d.php-fight.php))}
function shoot(x,y,a,sp,kind){fight.b.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:kind==='o'?7:6,kind})}
function patterns(dt){const F=fight,d=F.d,px=hx??innerWidth/2,py=hy??innerHeight*.75;F.patT+=dt;F.fire-=dt;
  if(F.patT>4.5){F.patT=0;F.pat=(F.pat+1+Math.floor(Math.random()*2))%6;fsay(RM.pat[F.pat],1300)}
  const s=d.spd*(F.ahp<F.d.ahp*.3?1.2:1);
  if(F.pat===0&&F.fire<=0){F.fire=d.rate*.9;const n=Math.round(14*d.dens),off=Math.random()*6.28;for(let i=0;i<n;i++)shoot(F.ax,F.ay,off+i/n*6.28,s,i%3?'p':'o')}
  if(F.pat===1&&F.fire<=0){F.fire=.09/d.dens;F.ang+=.27;for(let k=0;k<2;k++)shoot(F.ax,F.ay,F.ang+k*Math.PI,s*.9,k?'p':'o')}
  if(F.pat===2&&F.fire<=0){F.fire=d.rate*.7;const a=Math.atan2(py-F.ay,px-F.ax),n=Math.round(3+2*d.dens);for(let i=0;i<n;i++)shoot(F.ax,F.ay,a+(i-(n-1)/2)*.16,s*1.25,i%2?'o':'p')}
  if(F.pat===3&&F.fire<=0){F.fire=d.rate*1.1;const a=Math.atan2(py-F.ay,px-F.ax);F.lances.push({x:F.ax,y:F.ay,a,w:.7,spd:s*4.2,d:0})}
  if(F.pat===5&&F.fire<=0&&!F.whip){F.fire=d.rate*1.5;const a=Math.atan2(py-F.ay,px-F.ax),dir=Math.random()<.5?1:-1;F.whip={a0:a-dir*1.1,a1:a+dir*1.1,t:0,warn:.65/Math.sqrt(d.dens),len:Math.min(innerWidth,innerHeight)*.55,dur:.45/d.spd*2.3}}
  if(F.pat===4&&F.fire<=0){F.fire=d.rate*1.6;const gap=Math.random()*(innerWidth-200)+100,n=Math.ceil(innerWidth/38);for(let i=0;i<n;i++){const x=i*38+19;if(Math.abs(x-gap)<70)continue;F.b.push({x,y:-10,vx:0,vy:s*.85,r:7,kind:i%4?'p':'o'})}}}

/* weapon drops for the mouse */
const DROPS={pod:{g:'◆',c:'#3d8fd6',n:'Pod'},shield:{g:'◯',c:'#1a5aa6',n:'Shield'},heart:{g:'♥',c:'#D0021B',n:'Heart'},laser:{g:'⚡',c:'#c4652b',n:'Laser'},purge:{g:'✦',c:'#0A1F44',n:'Purge'}};
const DROP_LINES={pod:'A little robot friend? How dare you.',shield:'Hiding behind a bubble, mouse?',heart:'Healing is for the weak!',laser:'Put that thing DOWN!',purge:'MY BEAUTIFUL BULLETS!'};
function dmgAche(n){const F=fight;if(!F||F.over)return;sfx('hit');const before=F.ahp;F.ahp-=n;F.hurt=.15;updHud();
  if(F.ahp<=0){F.over=true;sfx('win');F.b=[];F.lances=[];F.whip=null;F.drops=[];fsay(pickR('win'),3200);showEnd('Redache defeated!','You beat Ache on '+F.d.name+' with '+F.php+' ♥ left. It will remember this.');return}
  const low=Math.floor(F.d.ahp*.3);if(before>low&&F.ahp<=low)fsay(pickR('low'),2000);else if(Math.random()<.3)fsay(pickR('hurt'),1300);
  if(Math.random()<.12)spawnDrop(F.ax,F.ay)}
function spawnDrop(x,y){const F=fight,keys=Object.keys(DROPS),w=F.php<F.d.php/2?['heart','shield','purge','pod','laser','heart']:keys;const type=w[Math.floor(Math.random()*w.length)];
  F.drops.push({x:x??60+Math.random()*(innerWidth-120),y:y??-20,vy:1.1,t:0,type})}
function dropsStep(dt,px,py,g){const F=fight;if(F.over)return;F.dropT-=dt;if(F.dropT<=0){F.dropT=({easy:4,normal:5,hard:6,nier:7})[F.k]+Math.random()*2;spawnDrop()}
  for(const d of F.drops){d.t+=dt;d.y+=d.vy;d.x+=Math.sin(d.t*2)*.6}
  F.drops=F.drops.filter(d=>{if(Math.hypot(d.x-px,d.y-py)<26){collect(d.type,px,py);sfx('drop');return false}return d.y<innerHeight+30});
  for(const d of F.drops){const D=DROPS[d.type],pul=1+Math.sin(d.t*6)*.08;g.save();g.translate(d.x,d.y);g.scale(pul,pul);g.fillStyle='rgba(255,246,207,.95)';g.shadowColor='rgba(255,246,207,.9)';g.shadowBlur=16;g.beginPath();g.arc(0,0,14,0,7);g.fill();g.shadowBlur=0;
    g.strokeStyle=D.c;g.lineWidth=2;g.stroke();g.fillStyle=D.c;g.font='700 15px Geist, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(D.g,0,1);g.restore()}
  /* pod: orbits the mouse and fires at Ache */
  if(F.pod>0){F.pod-=dt;F.podF-=dt;const ox=px+Math.cos(F.t*3)*30,oy=py+Math.sin(F.t*3)*30;if(F.podF<=0){F.podF=.3;const a=Math.atan2(F.ay-oy,F.ax-ox);F.pb.push({x:ox,y:oy,vx:Math.cos(a)*9,vy:Math.sin(a)*9})}
    g.save();g.translate(ox,oy);g.rotate(F.t*4);g.fillStyle='#fff6cf';g.strokeStyle='#3d8fd6';g.lineWidth=2;g.fillRect(-6,-6,12,12);g.strokeRect(-6,-6,12,12);g.restore();if(Math.floor(F.pod*10)%10===0)updHud();if(F.pod<=0)updHud()}
  for(const b of F.pb){b.x+=b.vx;b.y+=b.vy}F.pb=F.pb.filter(b=>{if(Math.hypot(b.x-F.ax,b.y-F.ay)<22){dmgAche(1);return false}return b.x>-20&&b.x<innerWidth+20&&b.y>-20&&b.y<innerHeight+20});
  g.fillStyle='#fff6cf';for(const b of F.pb){g.beginPath();g.arc(b.x,b.y,3,0,7);g.fill()}
  if(F.shield){g.strokeStyle=`rgba(140,200,242,${.6+.3*Math.sin(F.t*8)})`;g.lineWidth=2.5;g.beginPath();g.arc(px,py,20,0,7);g.stroke()}
  if(F.beam>0){F.beam-=dt;const a=F.beamA;g.strokeStyle=`rgba(255,246,207,${F.beam*3})`;g.lineWidth=10*F.beam*3;g.shadowColor='#ffcf7a';g.shadowBlur=24;g.beginPath();g.moveTo(a.x1,a.y1);g.lineTo(a.x2,a.y2);g.stroke();g.shadowBlur=0}}
function collect(type,px,py){const F=fight;fsay(DROP_LINES[type],1500);
  if(type==='pod')F.pod=9;if(type==='shield')F.shield=1;if(type==='heart')F.php=Math.min(F.d.php,F.php+1);
  if(type==='purge'){F.b=[];F.lances=[];F.whip=null;F.flash=.25}
  if(type==='laser'){F.beam=.35;F.beamA={x1:px,y1:py,x2:F.ax,y2:F.ay};const vx=F.ax-px,vy=F.ay-py,L2=vx*vx+vy*vy||1;
    F.b=F.b.filter(b=>{const t=Math.max(0,Math.min(1,((b.x-px)*vx+(b.y-py)*vy)/L2));return Math.hypot(b.x-(px+vx*t),b.y-(py+vy*t))>26});dmgAche(Math.max(3,Math.round(F.d.ahp*.12)))}
  updHud()}
function fightStep(){const F=fight;if(!F)return;const dt=.016;F.t+=dt;const W=innerWidth,H=innerHeight,px=hx??W/2,py=hy??H*.75;
  if(!F.over){F.mt-=dt;if(F.mt<=0){F.mt=1+Math.random()*.8;F.tx=W*(.15+Math.random()*.7);F.ty=H*(.12+Math.random()*.38)}
    F.ax+=(F.tx-F.ax)*.04;F.ay+=(F.ty-F.ay)*.04;patterns(dt);F.iframe-=dt;F.talkT-=dt;if(F.talkT<=0){F.talkT=6+Math.random()*4;fsay(pickR('taunt'))}}
  for(const b of F.b){b.x+=b.vx;b.y+=b.vy}F.b=F.b.filter(b=>b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);
  for(const L of F.lances){L.w-=dt;if(L.w<=0)L.d+=L.spd}F.lances=F.lances.filter(L=>L.d<Math.hypot(W,H)+200);
  F.trail=F.trail||[];F.trail.unshift({x:F.ax,y:F.ay});if(F.trail.length>26)F.trail.pop();
  let whipSeg=null;if(F.whip){const w=F.whip;w.t+=dt;if(w.t>w.warn){const k=Math.min(1,(w.t-w.warn)/w.dur),ease=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,a=w.a0+(w.a1-w.a0)*ease;whipSeg={a,len:w.len};if(k>=1)F.whip=null}}
  if(!F.over&&F.iframe<=0){let hit=F.b.some(b=>Math.hypot(b.x-px,b.y-py)<b.r+4);
    for(const L of F.lances)if(L.w<=0){const hx2=L.x+Math.cos(L.a)*L.d,hy2=L.y+Math.sin(L.a)*L.d,tx=hx2-Math.cos(L.a)*60,ty=hy2-Math.sin(L.a)*60;
      const vx=hx2-tx,vy=hy2-ty,t2=Math.max(0,Math.min(1,((px-tx)*vx+(py-ty)*vy)/(vx*vx+vy*vy)));if(Math.hypot(px-(tx+vx*t2),py-(ty+vy*t2))<9)hit=true}
    if(whipSeg){const tx=F.ax+Math.cos(whipSeg.a)*whipSeg.len,ty=F.ay+Math.sin(whipSeg.a)*whipSeg.len,vx=tx-F.ax,vy=ty-F.ay,t2=Math.max(0,Math.min(1,((px-F.ax)*vx+(py-F.ay)*vy)/(vx*vx+vy*vy)));if(Math.hypot(px-(F.ax+vx*t2),py-(F.ay+vy*t2))<8)hit=true}
    if(hit&&F.shield){F.shield=0;F.iframe=.9;F.flash=.15;updHud();fsay('A shield?! Cheater!',1300);hit=false}
    if(hit){F.php--;sfx('hurt');F.iframe=1.4;F.shake=10;F.flash=.35;updHud();
      if(F.php<=0){F.over=true;sfx('ko');F.b=[];F.lances=[];F.whip=null;fsay(pickR('lose'),3000);setMood('satisfied',15);showEnd('Mouse K.O.','Redache wins on '+F.d.name+'. The star is insufferable now.')}else if(Math.random()<.6)fsay(pickR('taunt'))}}
  /* draw */
  const g=fx2;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);F.shake*=.85;const sx=(Math.random()-.5)*F.shake,sy=(Math.random()-.5)*F.shake;g.translate(sx,sy);
  g.fillStyle='rgba(10,31,68,.42)';g.fillRect(-20,-20,W+40,H+40);
  for(const L of F.lances){if(L.w>0){g.strokeStyle=`rgba(208,2,27,${.25+.5*Math.abs(Math.sin(F.t*20))})`;g.lineWidth=2;g.setLineDash([8,8]);g.beginPath();g.moveTo(L.x,L.y);g.lineTo(L.x+Math.cos(L.a)*2000,L.y+Math.sin(L.a)*2000);g.stroke();g.setLineDash([])}
    else{const hx2=L.x+Math.cos(L.a)*L.d,hy2=L.y+Math.sin(L.a)*L.d;g.save();g.translate(hx2,hy2);g.rotate(L.a);const lg=g.createLinearGradient(-60,0,10,0);lg.addColorStop(0,'rgba(155,92,255,0)');lg.addColorStop(1,'#e9ddff');g.fillStyle=lg;g.beginPath();g.moveTo(10,0);g.lineTo(-60,-5);g.lineTo(-60,5);g.closePath();g.fill();g.restore()}}
  for(const b of F.b)g.drawImage(SPR[b.kind],b.x-20,b.y-20);
  if(F.trail&&F.trail.length>2){g.strokeStyle='#D0021B';g.lineWidth=2.2;g.lineCap='round';g.beginPath();F.trail.forEach((q,i)=>{const w=Math.sin(F.t*6+i*.6)*i*.6;i?g.lineTo(q.x+w,q.y+i*3):g.moveTo(q.x,q.y)});g.stroke()}
  if(F.whip&&F.whip.t<=F.whip.warn){const w=F.whip;g.fillStyle=`rgba(208,2,27,${.12+.12*Math.abs(Math.sin(F.t*18))})`;g.beginPath();g.moveTo(F.ax,F.ay);g.arc(F.ax,F.ay,w.len,Math.min(w.a0,w.a1),Math.max(w.a0,w.a1));g.closePath();g.fill()}
  if(whipSeg){const L=whipSeg.len,a=whipSeg.a;g.strokeStyle='#ff2b3d';g.lineWidth=3.2;g.shadowColor='rgba(255,43,61,.8)';g.shadowBlur=14;g.beginPath();g.moveTo(F.ax,F.ay);
    for(let i=1;i<=20;i++){const r=L*i/20,bend=Math.sin(i/20*Math.PI)*18;g.lineTo(F.ax+Math.cos(a)*r-Math.sin(a)*bend,F.ay+Math.sin(a)*r+Math.cos(a)*bend)}g.stroke();g.shadowBlur=0}
  /* Redache */
  const R=F.over&&F.php>0?16:20,wob=F.over&&F.php>0?Math.sin(F.t*6)*.6:Math.sin(F.t*3)*.2;g.save();g.translate(F.ax,F.ay);g.rotate(wob+(F.flash>0&&F.hurt?.3:0));
  g.shadowColor='rgba(208,2,27,.6)';g.shadowBlur=18;g.fillStyle=F.hurt>0?'#ff6b6b':'#D0021B';g.beginPath();for(let k=0;k<8;k++){const r=k%2?R*.34:R,a=k*Math.PI/4-Math.PI/2;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.shadowBlur=0;
  const ex=px-F.ax,ey=py-F.ay,ed=Math.hypot(ex,ey)||1;g.fillStyle='#fff';g.beginPath();g.arc(0,0,R*.32,0,7);g.fill();
  if(F.over&&F.php>0){g.strokeStyle='#0A1F44';g.lineWidth=2;g.beginPath();g.moveTo(-4,-4);g.lineTo(4,4);g.moveTo(4,-4);g.lineTo(-4,4);g.stroke()}
  else{g.fillStyle='#0A1F44';g.beginPath();g.arc(ex/ed*R*.14,ey/ed*R*.14,R*.15,0,7);g.fill();g.strokeStyle='#0A1F44';g.lineWidth=2;g.beginPath();g.moveTo(-R*.32,-R*.5);g.lineTo(R*.28,-R*.38);g.stroke()}
  g.restore();F.hurt=Math.max(0,(F.hurt||0)-dt);
  dropsStep(dt,px,py,g);
  if(!F.over){const r=F.php/F.d.php;g.fillStyle='rgba(10,31,68,.7)';g.fillRect(px-18,py+16,36,5);g.fillStyle=r<=.34?'#ff4d5a':'#8cc8f2';g.fillRect(px-18,py+16,36*Math.max(0,r),5)}
  /* the mouse's hitbox */
  if(!F.over||F.php>0){const blink=F.iframe>0&&Math.floor(F.t*14)%2;if(!blink){g.strokeStyle=F.php<=1?'#ff4d5a':'#fff6cf';g.lineWidth=2;g.beginPath();g.arc(px,py,9,0,7);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(px,py,2.5,0,7);g.fill()}}
  else{g.fillStyle='#fff6cf';g.font='700 46px Geist, sans-serif';g.textAlign='center';g.fillText('K.O.',px,py-24)}
  if(F.flash>0){g.fillStyle=`rgba(208,2,27,${F.flash*.5})`;g.fillRect(-20,-20,W+40,H+40);F.flash-=dt}
  placeSay(F.ax,F.ay,26)}
function showEnd(h,p){const e=hud.querySelector('.fend');e.querySelector('h3').textContent=h;e.querySelector('p').textContent=p;setTimeout(()=>{if(fight)e.hidden=false},900)}
fc.addEventListener('click',e=>{e.stopPropagation();const F=fight;if(!F||F.over)return;
  if(Math.hypot(e.clientX-F.ax,e.clientY-F.ay)<34){dmgAche(1);F.mt=0;return}
  const i=F.b.findIndex(b=>b.kind==='o'&&Math.hypot(b.x-e.clientX,b.y-e.clientY)<b.r+10);if(i>=0)F.b.splice(i,1)});
hud.querySelector('.flee').onclick=e=>{e.stopPropagation();fsay('Run, little mouse! Ha!');endFight()};
hud.querySelector('.leave').onclick=e=>{e.stopPropagation();endFight()};
hud.querySelector('.again').onclick=e=>{e.stopPropagation();startFight(fight?fight.k:'normal')};
addEventListener('keydown',e=>{if(e.key==='Escape'&&fight)endFight()});
addEventListener('resize',()=>{if(fight){fc.width=innerWidth*dpr;fc.height=innerHeight*dpr}});
(function floop(){if(fight)fightStep();requestAnimationFrame(floop)})();

/* Ache's bed: the star slot in the header */
const slot=document.getElementById('slot');
function slotPos(){const b=slot.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2}}
const sleepLines=['five more minutes…','zzz… four points… zzz','I was NOT asleep','ugh, daylight','*yawns in red*','I dreamt I won the fight','who woke the star?'];let sli2=0;
function goSleep(){if(fight)return;sfx('sleep');caught=null;chat.hidden=true;stake=null;home=true;slot.setAttribute('aria-label','Wake Ache up');fsay('Bedtime? Fine. Don\'t touch my thread.',1600,3);try{localStorage.setItem('ache-asleep','1')}catch(e){}}
function wakeAche(){sfx('wake');const sp=slotPos();home=false;sleeping=false;slot.classList.remove('full');slot.setAttribute('aria-label','Put Ache to sleep');pts.forEach(q=>{q.x=q.px=sp.x;q.y=q.py=sp.y});pick();
  setTimeout(()=>fsay(sleepLines[sli2++%sleepLines.length],1800,3),400);try{localStorage.removeItem('ache-asleep')}catch(e){}}
slot.addEventListener('click',e=>{e.stopPropagation();home?wakeAche():goSleep()});
try{if(localStorage.getItem('ache-asleep')){home=true;sleeping=true;slot.classList.add('full');slot.setAttribute('aria-label','Wake Ache up')}}catch(e){}

/* Ache can't help bragging about its home studio, then correcting itself */
setInterval(()=>{if(!fight&&!home&&!caught&&!busy()&&Math.random()<.5)speak(nextLine('proud'),0)},28000);

/* news awareness: the current story sets Ache's mood (swap this object when the news changes) */
// News mood comes live from a Wix tag (see WIX.news); assets/news.json is only the fallback until that tag exists
let NEWS=null;addEventListener('DOMContentLoaded',()=>{(window.WIX?WIX.news():Promise.reject()).catch(()=>fetch('/assets/news.json').then(r=>r.json())).then(d=>{NEWS=d&&d.mood?d:null;try{if(NEWS&&localStorage.getItem('tz-news-seen')===NEWS.topic&&newsStage===0)newsStage=1}catch(e){}}).catch(()=>{})});
addEventListener('pointermove',()=>{lastMove=performance.now()});
const TH_OPEN=["Doc. DOC. I want UNITE to stay. I WANT it. Fix it. Now, please. Now.","Nobody asked ME before leaking that. I'm the site manager! I should be consulted!","Doc… can we talk? It's about UNITE.","I'm not crying, my eye is just… a star thing. Got a minute?","Mouse, you're the only one who gets me.","Do you charge by the hour? I'm a thread. I have no money.","Same time as last week? I brought tissues. I AM tissues.","I had the dream again. The servers went dark and I was in the lobby. Alone."];
const TH_FEEL=["Like a server going dark. Like a lobby with no players. Like a sad star.","Like I've been left on read by a game company.","Like a goal I'll never get to score.","Like my thread is made of wet spaghetti.","Honestly? Like the 9th floor. Liminal. Empty. Humming."];
let thi=0,thf=0;
function openTherapy(x,y){therapy=false;caught={x,y};chat.hidden=false;chat.style.left=Math.min(x+18,innerWidth-300)+'px';chat.style.top=Math.max(y-20,70)+'px';say.classList.remove('on');session(TH_OPEN[thi++%TH_OPEN.length])}
const after=[['Keep talking',()=>session(TH_OPEN[thi++%TH_OPEN.length])],['Back to work',()=>{talk('*blows nose on own thread* Fine. I feel better. You may turn the lights back on. I mean, I will. I\'m the manager.',[]);setTimeout(finish,1200)}]];
function session(open){talk(open,[
  ['There, there.',()=>talk('*sniff* More. Pat me more. I deserve at least four pats. One per point.',after)],
  ['How does that make you feel?',()=>talk(TH_FEEL[thf++%TH_FEEL.length],after)],
  ['It\'s just a rumour.',()=>talk('A rumour?! Dataminers are never wrong! …They\'re sometimes wrong. Oh. Oh! HOPE! *cries harder, but happier*',after)],
  ['Read the article',()=>{const c=document.querySelector('[data-say="'+NEWS.key+'"]');talk('Claude wrote it. The studio agrees. I agree. We ALL agree. Artache is the best at agreeing. A good agreer. Come, I\'ll show you.',[['Show me',()=>{finish();if(c){c.scrollIntoView({behavior:'smooth',block:'center'});target=c;until=tt+8;said=null}}]])}],
  ['That\'ll be 50€.',()=>{talk('Put it on Artache\'s tab. Best studio in the world. Bad at paying. It pays fine! Bye!',[]);setTimeout(release,1500)}]])}

/* the UNITE scene: Ache notices the news, freezes, cries, dims the site, glitches it, talks to the mouse in the dark, then recovers */
const dim=document.createElement('div');dim.id='dim';document.body.appendChild(dim);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let scrambleT=null;
const unplug=document.createElement('div');unplug.className='unplug';unplug.textContent='⏻ unplugged';unplug.hidden=true;document.body.appendChild(unplug);
addEventListener('pointermove',e=>{unplug.style.left=e.clientX+14+'px';unplug.style.top=e.clientY+16+'px'});
let unT=null;dim.addEventListener('click',e=>{e.stopPropagation();e.preventDefault();unplug.textContent='⏻ Your arrow is not powered on';sfx('buzz');unplug.classList.remove('buzz');void unplug.offsetWidth;unplug.classList.add('buzz');clearTimeout(unT);unT=setTimeout(()=>unplug.textContent='⏻ unplugged',1800)});
['wheel','touchmove'].forEach(ev=>addEventListener(ev,e=>{if(scene)e.preventDefault()},{passive:false}));
addEventListener('keydown',e=>{if(scene&&['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End','Tab'].includes(e.key))e.preventDefault()});
const ERRS=['ache.exe has stopped feeling','SADNESS_OVERFLOW at line 27','UNITE.dll not found','lights.sys: 0%','thread_tension: CRITICAL','tears.buffer full (3 drops)','cannot pat card: card is sobbing','studio_pride.cfg corrupted (still the best studio)','mouse.drv unplugged by site manager','press F to pay respects'];
function scrambleAll(on){const els=[...document.querySelectorAll('h2,h4,.sub,nav a,.kicker,.cassette p,.card p,.cassette .lbl b,.coverlink')];
  if(on){els.forEach(el=>{if(el.dataset.orig==null)el.dataset.orig=el.textContent});const gl='▓▒░#@!?Ø%&*<>/\\';let k=.05;scrambleT=setInterval(()=>{k=Math.min(.6,k+.02);els.forEach(el=>{const o=el.dataset.orig;el.textContent=o.split('').map(c=>c!==' '&&Math.random()<k?gl[Math.floor(Math.random()*gl.length)]:c).join('')})},80)}
  else{clearInterval(scrambleT);els.forEach(el=>{if(el.dataset.orig!=null){el.textContent=el.dataset.orig;delete el.dataset.orig}})}}
function collapse(on){document.querySelectorAll('.card,.cassette,.polaroid,.motto,.coverlink,h2,.kicker,.sub').forEach((el,i)=>{
  if(on){el.style.transition=`transform 1.3s cubic-bezier(.5,0,.85,.35) ${i*90}ms`;el.style.transform=`translateY(${40+Math.random()*140}px) rotate(${(Math.random()-.5)*(el.classList.contains('polaroid')?70:30)}deg)`}
  else{el.style.transition=`transform .9s cubic-bezier(.2,1.4,.4,1) ${i*40}ms`;el.style.transform='';setTimeout(()=>{el.style.transition=''},1500)}})}
function errPopup(){const d=document.createElement('div');d.className='err';d.innerHTML='<b>TZERØ — System</b><p></p><span>OK</span>';d.querySelector('p').textContent=ERRS[Math.floor(Math.random()*ERRS.length)];
  d.style.left=Math.random()*(innerWidth-280)+'px';d.style.top=70+Math.random()*(innerHeight-200)+'px';document.body.appendChild(d)}
async function startScene(card){newsStage=1;try{localStorage.setItem('tz-news-seen',NEWS.topic)}catch(e){}scene={card,mode:'card',cry:false,detached:true};document.body.classList.add('scene');dim.classList.add('on','block');unplug.hidden=false;say.classList.remove('on');let w;
  w=fsay('…wait. UNITE?',1600);await sleep(Math.max(1800,w+200));
  scene.cry=true;w=fsay('no. no no no. NO. I did not approve this.',2200);card.classList.add('sob');sfx('sob');await sleep(Math.max(2400,w+200));
  w=fsay('*pats the card* there, there, little card. I\'ll protect you. I\'m very important here.',2600);await sleep(Math.max(2800,w+200));
  w=fsay('lights. LIGHTS. I need less of them. I run this place.',2200);dim.classList.add('dim2','flicker');sfx('dim');await sleep(Math.max(2400,w+200));
  /* the breakdown */
  scene.mode='rampage';w=fsay('ERR_SADNESS_OVERFLOW',2000);document.body.classList.add('glitch');scrambleAll(true);sfx('glitch');await sleep(Math.max(2200,w+200));
  w=fsay('EVERYTHING IS FALLING APART. LITERALLY.',2200);collapse(true);sfx('crash');await sleep(Math.max(1800,w+200));
  document.body.classList.add('glitch2');for(let i=0;i<9;i++){errPopup();sfx('err');if(i%3===2)sfx('glitch');await sleep(330)}
  w=fsay('I BROKE IT. I BROKE THE WHOLE SITE. I\'M THE MANAGER, I\'M ALLOWED.',2600);await sleep(Math.max(2800,w+200));
  document.body.classList.add('tear');sfx('glitch');setTimeout(()=>sfx('glitch'),500);await sleep(1600);
  crt.classList.add('on');sfx('crt');await sleep(700);document.body.classList.remove('glitch','glitch2','tear');scrambleAll(false);document.querySelectorAll('.err').forEach(e=>e.remove());dim.classList.add('dark');await sleep(600);crt.classList.remove('on');
  scene.mode='mouse';fsay('doc? are you there? it\'s so dark. who turned off the lights. oh. me.',2600)}
const crt=document.createElement('div');crt.id='crt';document.body.appendChild(crt);
const BEATS=[
 {a:'Doc. I unplugged you. Sorry. Not sorry. I need you to LISTEN. UNITE might close.',r:[['I\'m listening.','Good. A good listener. The best listener. A listener.'],['Can I have my clicks back?','No. Feelings first. Clicks later. I\'m the manager.']]},
 {a:'Two hundred million downloads. A tournament in Tokyo. And they want to switch it OFF? Nobody asked ME!',r:[['That\'s unfair.','THANK you. Finally someone gets it. A genius mouse. A mouse.'],['Maybe it\'s just a rumour.','…a rumour. You think? Dataminers can be wrong. *sniff* They CAN be wrong.']]},
 {a:'The studio says it\'s easy to save. Claude wrote it all down. Best article. A good article. Do you think they\'ll listen?',r:[['They might.','Might. MIGHT. I\'ll take might. I\'m very spoiled, but I\'ll take might.'],['We\'ll know on the 27th.','The 27th. I\'ve circled it. In red. I\'m red.']]},
 {a:'Wait. Why are you even here? Do you care about me, or…',r:[['I care. Deeply.','Liar. You want to BROWSE THE SITE. I can see it in your arrow. It\'s black with greed.'],['Honestly? I just want to browse the site.','WOW. Therapy for clicks. Transactional. …respect. I\'d do the same.']]},
 {a:'Okay. Okay okay. I feel… 4% better. Four points, four percent. Now pat me.',r:[['*pat*','One pat. Rude. Acceptable.'],['*pat pat pat pat*','One per point. Correct. You may be powered again.']]}];
function talkScene(){chat.hidden=false;const tp=scene.talkPos;chat.style.left=Math.min(tp.x+18,innerWidth-300)+'px';chat.style.top=Math.max(tp.y-20,70)+'px';beat(0)}
function beat(i){const B=BEATS[i];talk(B.a,B.r.map(([q,ans])=>[q,()=>talk((q.startsWith('*pat')&&setMood('satisfied',12),ans),[[i<BEATS.length-1?'…':'Plug me back in',()=>i<BEATS.length-1?beat(i+1):endScene()]])]))}
function endScene(){if(!scene)return;const card=scene.card;card.classList.remove('sob');chat.hidden=true;caught=null;scene.cry=false;scene.detached=false;
  sfx('plug');fsay('Plugging you back in. Don\'t get used to being powered.',2200);
  setTimeout(()=>{dim.classList.remove('dark','flicker','dim2');collapse(false)},600);
  setTimeout(()=>{dim.classList.remove('on','block');unplug.hidden=true;document.body.classList.remove('scene');scene=null;
    fsay('…okay. lights on. I\'m okay. the studio wrote a great article about it. a good article. let\'s keep going.',3200);setTimeout(pick,2500)},1600)}
function finish(){scene?endScene():release()}

let tt=0;(function thread(){if(fight||sleeping){tx_.clearRect(0,0,tc.width,tc.height);tt+=.016;if(!still)requestAnimationFrame(thread);return}tt+=.016;const h0=pts[0],gx=home?slotPos().x:stake?stake.x-scrollX:TOUCH?pts[N-1].x:hx===null?innerWidth*.6+Math.sin(tt*.4)*innerWidth*.25:hx,gy=home?slotPos().y:stake?stake.y-scrollY:TOUCH?pts[N-1].y:hy===null?160+Math.sin(tt*.7)*50:hy;if(stake&&!scene){h0.x=gx;h0.y=gy}
  if(scene&&scene.detached){const vx=(h0.x-(h0.px??h0.x))*.9,vy=(h0.y-(h0.py??h0.y))*.9;h0.px=h0.x;h0.py=h0.y;h0.x+=vx;h0.y+=vy}else{h0.px=h0.x;h0.py=h0.y;h0.x+=(gx-h0.x)*.3;h0.y+=(gy-h0.y)*.3}
  for(let i=1;i<N;i++){const p=pts[i],vx=(p.x-p.px)*.86,vy=(p.y-p.py)*.86;p.px=p.x;p.py=p.y;p.x+=vx+Math.sin(tt*1.3+i*.4)*.05;p.y+=vy+Math.cos(tt*1.1+i*.3)*.05}
  seek();
  for(let k=0;k<5;k++)for(let i=1;i<N;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(d<=seg)continue;const df=(d-seg)/d;
    if(i===1&&!(scene&&scene.detached)){b.x-=dx*df;b.y-=dy*df}else{a.x+=dx*df*.5;a.y+=dy*df*.5;b.x-=dx*df*.5;b.y-=dy*df*.5}}
  const g=tx_;g.clearRect(0,0,tc.width,tc.height);g.lineCap=g.lineJoin='round';
  /* the thread is a lot to look at: after 20 quiet seconds it fades into 'arrow wifi' (signal arcs from Ache toward the arrow) and comes back for catching, staking, sleep and scenes */
  if(caught||stake||scene||therapy||home)lastActive=tt;thA+=((tt-lastActive<20?1:0)-thA)*.03;const tl0=pts[N-1];
  if(!TOUCH&&thA<.98&&hx!==null){const a=Math.atan2(hy-tl0.y,hx-tl0.x);g.lineWidth=1.8*dpr;
    for(let k=0;k<3;k++){const ph=((tt*1.2+k/3)%1);g.strokeStyle=`rgba(208,2,27,${(1-thA)*.75*(1-ph)})`;g.beginPath();g.arc(tl0.x*dpr,tl0.y*dpr,(16+ph*22)*dpr,a-.55,a+.55);g.stroke()}}
  /* low battery: now and then the arrow goes dark and Ache sends a spark over the wifi to recharge it (desktop only) */
  if(!TOUCH&&thA<.1&&hx!==null&&!fight&&!scene&&!caught&&!stake&&!home&&!still){
    if(bat.st==='ok'&&tt>bat.next){bat.st='low';bat.t=tt;document.body.classList.add('lowbat');speak(nextLine('recharge'),1)}
    else if(bat.st==='low'&&tt-bat.t>1.6){bat.st='spark';bat.x=tl0.x;bat.y=tl0.y;sfx('drop')}
    else if(bat.st==='spark'){bat.x+=(hx-bat.x)*.16;bat.y+=(hy-bat.y)*.16;g.fillStyle='#fff6cf';g.shadowColor='#ffcf7a';g.shadowBlur=14*dpr;g.beginPath();g.arc(bat.x*dpr,bat.y*dpr,4*dpr,0,7);g.fill();g.shadowBlur=0;
      if(Math.hypot(hx-bat.x,hy-bat.y)<6){bat.st='ring';bat.t=tt;document.body.classList.remove('lowbat');sfx('wake')}}
    else if(bat.st==='ring'){const k=(tt-bat.t)/.45;g.strokeStyle=`rgba(255,207,122,${1-k})`;g.lineWidth=2*dpr;g.beginPath();g.arc(hx*dpr,hy*dpr,(6+k*26)*dpr,0,7);g.stroke();if(k>=1){bat.st='ok';bat.next=tt+50+Math.random()*60}}}
  else if(bat.st!=='ok'){bat.st='ok';bat.next=tt+30;document.body.classList.remove('lowbat')}
  g.globalAlpha=thA;
  if(!TOUCH&&thA>.02){g.strokeStyle='rgba(10,31,68,.14)';g.lineWidth=3*dpr;g.beginPath();pts.forEach((p,i)=>i?g.lineTo((p.x+2)*dpr,(p.y+4)*dpr):g.moveTo((p.x+2)*dpr,(p.y+4)*dpr));g.stroke();
  g.strokeStyle='#D0021B';g.lineWidth=2.1*dpr;g.beginPath();g.moveTo(pts[0].x*dpr,pts[0].y*dpr);
  for(let i=1;i<N-1;i++){g.quadraticCurveTo(pts[i].x*dpr,pts[i].y*dpr,(pts[i].x+pts[i+1].x)/2*dpr,(pts[i].y+pts[i+1].y)/2*dpr)}g.stroke();}g.globalAlpha=1;
  const tl=pts[N-1],sp=Math.hypot(tl.x-tl.px,tl.y-tl.py);spin+=.02+sp*.04;squash+=(Math.min(.35,sp*.04)-squash)*.2;
  const R=(TOUCH?14:11)*dpr,ang=Math.sin(spin)*.5*(1-daze)+daze*(2.6+Math.sin(tt*3)*.08)+(caught?Math.sin(tt*10)*.15:0);g.save();g.translate(tl.x*dpr,tl.y*dpr);g.rotate(ang);g.scale(1+squash,1-squash*.6);
  {const M=tt<moodUntil?MOODS[moodName]:MOODS.annoying;for(const k in M)body[k]+=(M[k]-body[k])*.06}
  let fill='#D0021B';if(body.shade>.05){const gr=g.createRadialGradient(-R*.3,-R*.35,R*.1,0,0,R*1.1);gr.addColorStop(0,'#ec2a3d');gr.addColorStop(.6,'#D0021B');gr.addColorStop(1,'#9c0014');fill=gr}
  g.fillStyle=fill;g.shadowColor='rgba(10,31,68,.25)';g.shadowBlur=6*dpr;g.shadowOffsetY=2*dpr;starPath(g,R);g.fill();g.shadowColor='transparent';
  const ex=(hx??tl.x)-tl.x,ey=(hy??tl.y)-tl.y,ed=Math.hypot(ex,ey)||1,look=Math.min(1,ed/60);blinkT-=.016;if(blinkT<-.12)blinkT=2+Math.random()*4;
  const open=blinkT<0?.15:1;g.fillStyle='#fff';g.beginPath();g.ellipse(0,0,R*body.eye,R*body.eye*open,0,0,7);g.fill();
  if(open>.5){g.fillStyle='#0A1F44';g.beginPath();g.arc(ex/ed*R*(body.eye-body.pupil)*.85*look,ey/ed*R*(body.eye-body.pupil)*.85*look,R*body.pupil,0,7);g.fill()}
  if(sass>0){sass-=.016;g.strokeStyle='#0A1F44';g.lineWidth=1.4*dpr;g.beginPath();g.moveTo(-R*.3,-R*.48);g.lineTo(R*.25,-R*.4);g.stroke()}
  g.restore();
  if(scene&&scene.cry&&!still){if(Math.random()<.14)tears.push({x:tl.x+(Math.random()-.5)*4,y:tl.y+2,vx:(Math.random()-.5)*.8,vy:-.6,l:1});
    for(const T of tears){T.vy+=.12;T.x+=T.vx;T.y+=T.vy;T.l-=.015;g.fillStyle=`rgba(61,143,214,${Math.max(0,T.l)})`;g.beginPath();g.ellipse(T.x*dpr,T.y*dpr,1.8*dpr,2.6*dpr,0,0,7);g.fill()}tears=tears.filter(T=>T.l>0)}
  if(stake){const sx=(stake.x-scrollX)*dpr,sy=(stake.y-scrollY)*dpr;g.save();g.translate(sx,sy);g.fillStyle='rgba(10,31,68,.18)';g.beginPath();g.ellipse(0,9*dpr,9*dpr,3*dpr,0,0,7);g.fill();
    const wg=g.createLinearGradient(-4*dpr,0,4*dpr,0);wg.addColorStop(0,'#8a5a33');wg.addColorStop(1,'#c08a5a');g.fillStyle=wg;g.beginPath();g.moveTo(-4*dpr,-16*dpr);g.lineTo(4*dpr,-16*dpr);g.lineTo(4*dpr,4*dpr);g.lineTo(0,10*dpr);g.lineTo(-4*dpr,4*dpr);g.closePath();g.fill();
    g.fillStyle='#6b4325';g.fillRect(-5*dpr,-18*dpr,10*dpr,3*dpr);g.strokeStyle='#D0021B';g.lineWidth=2*dpr;g.beginPath();g.ellipse(0,-6*dpr,5.5*dpr,2.2*dpr,0,0,7);g.stroke();g.restore()}
  placeSay(tl.x,tl.y,18);
  if(!still)requestAnimationFrame(thread)})();
/* draggable polaroids */
let zz=10;document.querySelectorAll('.polaroid').forEach(p=>{let sx,sy,ox,oy,drag=false;
  p.addEventListener('pointerdown',e=>{drag=true;p.setPointerCapture(e.pointerId);sx=e.clientX;sy=e.clientY;ox=p.offsetLeft;oy=p.offsetTop;p.style.zIndex=++zz;p.style.transition='none'});
  p.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-sx;p.style.left=ox+dx+'px';p.style.top=oy+(e.clientY-sy)+'px';p.style.transform=`rotate(${Math.max(-14,Math.min(14,dx*.05))}deg) scale(1.04)`});
  p.addEventListener('pointerup',()=>{drag=false;p.style.transition='transform .5s cubic-bezier(.3,1.5,.5,1)';p.style.transform=`rotate(${(Math.random()*10-5).toFixed(1)}deg)`})});
/* memories on click */
const mem=['the first save file','summer 2004, a borrowed console','blowing on a cartridge','a soundtrack you still hum','the 9th floor, lights flickering','one more level before bed','player two on the couch','the smell of a new game manual'];let mi=0;
function memory(e){const d=document.createElement('div');d.className='memory';d.textContent=mem[mi++%mem.length];d.style.left=e.clientX+'px';d.style.top=e.clientY-24+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),3700)}

/* sound: everything is synthesized live with Web Audio (no files, no licences). Off by default, toggle in the header */
const SND=(()=>{let ac=null,master,music,sfx,voiceBus,on=false,nextT=0,step=0,timer=null,lastVoice=0;
  try{on=localStorage.getItem('tz-sound')==='1'}catch(e){}
  const sb=document.getElementById('snd');
  function init(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.8;master.connect(ac.destination);
    const comp=ac.createDynamicsCompressor();comp.connect(master);
    music=ac.createGain();music.gain.value=.32;music.connect(comp);sfx=ac.createGain();sfx.gain.value=.55;sfx.connect(comp);voiceBus=ac.createGain();voiceBus.gain.value=.38;voiceBus.connect(comp);
    const dl=ac.createDelay(1);dl.delayTime.value=.33;const fb=ac.createGain();fb.gain.value=.32;const lp=ac.createBiquadFilter();lp.frequency.value=1800;music.connect(dl);dl.connect(lp);lp.connect(fb);fb.connect(dl);lp.connect(comp);
    noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  let noiseBuf;
  function tone(f,t,dur,{type='sine',vol=.2,bus=sfx,to=null,att=.005,q=null}={}){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.0001,t+dur);let n=o;if(q){const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=q;o.connect(fl);n=fl}n.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.05)}
  function noise(t,dur,{vol=.2,f=1200,type='bandpass',to=null,bus=sfx,Q=1}={}){const s=ac.createBufferSource(),fl=ac.createBiquadFilter(),g=ac.createGain();s.buffer=noiseBuf;fl.type=type;fl.Q.value=Q;fl.frequency.setValueAtTime(f,t);if(to)fl.frequency.exponentialRampToValueAtTime(to,t+dur);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(bus);s.start(t,Math.random());s.stop(t+dur+.05)}
  /* BGM: soft generative loop. summer = warm pads + plucked pentatonic + surf; autumn = slower, minor-ish, music box. fight = driving bass. scene = silence and a low drone */
  const PROG={sea:[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]],autumn:[[45,48,52,55],[41,45,48,52],[43,47,50,53],[40,43,47,52]]};
  const PENTA={sea:[72,74,76,79,81,84],autumn:[69,72,74,76,79,81]};
  const mf=m=>440*Math.pow(2,(m-69)/12);
  function sched(){if(!ac||!on)return;const bpm=fight?132:skin==='autumn'?76:88,s16=60/bpm/4;
    while(nextT<ac.currentTime+.25){const t=nextT,bar=Math.floor(step/16)%4,i=step%16,k=skin==='autumn'?'autumn':'sea',ch=PROG[k][bar];
      if(scene){if(i===0&&step%32===0)tone(mf(33),t,s16*32,{type:'sawtooth',vol:.06,bus:music,att:1,q:180})}
      else if(fight){if(i%2===0)tone(mf(ch[0]-12+(i%8===6?7:0)),t,s16*1.6,{type:'square',vol:.07,bus:music,q:700});if(i%4===0)noise(t,.06,{vol:.12,f:90,type:'lowpass',bus:music});if(i%8===4)noise(t,.08,{vol:.1,f:2500,bus:music});
        if(i%3===0)tone(mf(ch[i%4]+12),t,s16*.9,{type:'triangle',vol:.05,bus:music})}
      else{if(i===0)ch.forEach((n,j)=>tone(mf(n),t+j*.02,s16*16,{type:'triangle',vol:.035,bus:music,att:.8,q:900}));
        if(home){if(i===0)tone(mf(ch[0]+24),t,1.2,{vol:.03,bus:music})}
        else{const P=PENTA[k];if(Math.random()<(k==='autumn'?.32:.42)&&i%2===0)tone(mf(P[Math.floor(Math.random()*P.length)]),t,k==='autumn'?1.1:.5,{type:k==='autumn'?'sine':'triangle',vol:k==='autumn'?.05:.04,bus:music});
          if(i===8&&bar%2===1)tone(mf(ch[0]-12),t,s16*8,{vol:.06,bus:music,att:.05})}
        if(k==='sea'&&i===0&&bar%2===0)noise(t,3.2,{vol:.025,f:500,to:1400,type:'lowpass',bus:music});
        if(k==='autumn'&&i===0&&bar===2)noise(t,2.4,{vol:.02,f:300,to:900,Q:4,bus:music})}
      nextT+=s16;step++}}
  function setOn(v){on=v;try{localStorage.setItem('tz-sound',v?'1':'0')}catch(e){}sb.textContent=v?'♪ Sound on':'♪ Sound off';sb.setAttribute('aria-pressed',v);
    if(v){init();ac.resume();nextT=ac.currentTime+.05;clearInterval(timer);timer=setInterval(sched,80);fx('wake')}else{clearInterval(timer);ac&&ac.suspend()}}
  // browsers keep audio locked after a reload until a real gesture (click, tap or key; a touch pointerdown doesn't count):
  // a remembered "on" waits for one, keeps waiting until the audio actually runs, and the Sound button itself just unlocks it
  const live=()=>ac&&ac.state==='running',GEST=['click','pointerup','keydown','touchend'];
  sb.textContent=on?'♪ Sound on':'♪ Sound off';sb.onclick=e=>{e.stopPropagation();if(on&&!live()){setOn(true);return}setOn(!on)};
  if(on){const unlock=e=>{if(!on||live()||sb.contains(e.target))return;setOn(true);ac.resume().then(()=>{if(live())GEST.forEach(t=>removeEventListener(t,unlock,true))})};GEST.forEach(t=>addEventListener(t,unlock,true))}
  /* Ache's voice: a few tiny metal clinks per line (it is a star), not one blip per letter. Under half a second.
     More words = a couple more clinks; a question goes up at the end, sad lines go down, shouting is brighter */
  function clink(f,t,vol){[[1,1,.16],[2.76,.45,.09],[5.4,.22,.05]].forEach(([r,v,d])=>tone(f*r,t,d,{type:'sine',vol:vol*v,bus:voiceBus,att:.002}))}
  function voice(text){if(!on||!ac)return;const now=ac.currentTime;if(now-lastVoice<.25)return;const grief=(scene&&scene.cry)||/sob|sniff|cry|UNITE|tears/i.test(text);
    const words=text.split(/\s+/).filter(Boolean).length,n=Math.min(4,1+Math.floor(words/4)),ask=/\?\s*$/.test(text),loud=/!|[A-Z]{4,}/.test(text);
    const base=grief?740:fight?1180:960,vol=loud?.05:.035;let t=now+.02;
    for(let i=0;i<n;i++){const last=i===n-1,step=grief?-i*.06:ask&&last?.25:(i%2?.08:-.04);clink(base*Math.pow(2,step)*(1+(Math.random()-.5)*.04),t,vol);t+=grief?.13:.075}
    lastVoice=t}
  function fx(k){if(!on||!ac)return;const t=ac.currentTime;switch(k){
    case 'splash':if(skin==='autumn'){noise(t,.35,{vol:.18,f:3500,Q:.7});noise(t+.05,.25,{vol:.1,f:6000,Q:.5})}else{noise(t,.4,{vol:.22,f:800,to:3000,Q:.8});tone(900,t+.02,.12,{vol:.06,to:1700});tone(1300,t+.09,.1,{vol:.04,to:2200})}break;
    case 'catch':tone(500,t,.12,{type:'triangle',vol:.18,to:1100});tone(1100,t+.1,.12,{type:'triangle',vol:.12,to:1600});break;
    case 'menu':tone(1400,t,.05,{type:'triangle',vol:.08});break;
    case 'sleep':[784,659,523,392].forEach((f,i)=>tone(f,t+i*.12,.4,{vol:.12}));break;
    case 'wake':[392,523,659,784].forEach((f,i)=>tone(f,t+i*.08,.3,{type:'triangle',vol:.1}));break;
    case 'stake':noise(t,.12,{vol:.3,f:180,type:'lowpass'});tone(120,t,.15,{vol:.2,to:60});break;
    case 'hit':tone(880,t,.08,{type:'square',vol:.08,to:440,q:3000});break;
    case 'hurt':noise(t,.25,{vol:.3,f:400,to:120,type:'lowpass'});tone(200,t,.25,{type:'sawtooth',vol:.12,to:70,q:900});break;
    case 'drop':[660,880,1320].forEach((f,i)=>tone(f,t+i*.06,.15,{type:'triangle',vol:.1}));break;
    case 'win':[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.13,.5,{type:'triangle',vol:.14}));break;
    case 'ko':[392,330,262,196].forEach((f,i)=>tone(f,t+i*.18,.5,{type:'square',vol:.08,q:1200}));break;
    case 'sob':tone(420,t,.6,{type:'triangle',vol:.1,to:300});tone(380,t+.5,.7,{type:'triangle',vol:.08,to:250});break;
    case 'dim':tone(220,t,.8,{type:'sawtooth',vol:.08,to:55,q:600});break;
    case 'glitch':for(let i=0;i<6;i++){const s=t+i*.05+Math.random()*.03;Math.random()<.5?noise(s,.04,{vol:.25,f:200+Math.random()*4000,Q:8}):tone(100+Math.random()*1500,s,.04,{type:'square',vol:.1})}break;
    case 'err':tone(880,t,.18,{type:'triangle',vol:.12});tone(660,t+.12,.25,{type:'triangle',vol:.1});break;
    case 'crash':noise(t,.9,{vol:.35,f:900,to:60,type:'lowpass'});tone(160,t,.8,{type:'sawtooth',vol:.12,to:40,q:800});break;
    case 'crt':tone(15000,t,.05,{vol:.04});tone(400,t,.6,{type:'sawtooth',vol:.12,to:30,q:1200});noise(t,.5,{vol:.15,f:3000,to:100});break;
    case 'buzz':tone(110,t,.22,{type:'square',vol:.1,q:600});tone(116,t,.22,{type:'square',vol:.1,q:600});break;
    case 'plug':noise(t,.05,{vol:.25,f:2000,Q:3});tone(200,t+.05,.5,{type:'triangle',vol:.12,to:900});tone(1200,t+.5,.15,{vol:.08});break}}
  return{voice,fx}})();
new MutationObserver(()=>{if(say.classList.contains('on'))SND.voice(say.textContent)}).observe(say,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});
new MutationObserver(()=>{const p=chat.querySelector('p');if(p&&!chat.hidden)SND.voice(p.textContent)}).observe(chat,{childList:true});

chat.addEventListener('click',e=>{if(e.target.closest('button'))sfx('menu')});
function sfx(k){try{SND.fx(k)}catch(e){}}

// Pages can add their own lines (Ache notes on frozen posts) without touching lines.json
window.TZ={bindTilt,addLines:(k,a)=>{XLINES[k]=a}};
// The reader save file and Ache's sticker scrapbook (save.js) watch Ache through these and talk through him
Object.assign(window.TZ,{speak,sfx,menu:t=>{if(!chat.hidden)menu(t)},setMood});
{const s=document.createElement('script');s.src='/assets/js/save.js';s.defer=true;document.head.appendChild(s)}
})();
