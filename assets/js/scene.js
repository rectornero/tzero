/* TZERØ living page: season scene, page glow, click effects, the red thread and its critter.
   Ported from the approved "Tide and Thread" mockup. */
(()=>{
const still=matchMedia('(prefers-reduced-motion: reduce)').matches,dpr=Math.min(devicePixelRatio||1,2),root=document.documentElement;
const sea=document.querySelector('.sea'),c=document.getElementById('waves')||document.createElement('canvas'),x=c.getContext('2d');
const f=document.getElementById('fx'),fx=f.getContext('2d'),b=document.getElementById('bg'),bx=b.getContext('2d');let cx=-1,cy=-1;
let w,h,W,H,t=0,mx=-1,my=-1,px=-1,py=-1,energy=0,gust=0,lastX=null;
const SKINS={sea:'Summer',autumn:'Autumn'};const month=new Date().getMonth();
let skin=month>=2&&month<=7?'sea':'autumn';try{const s=localStorage.getItem('tz-skin');if(SKINS[s])skin=s}catch(e){}
const btn=document.getElementById('skin');function setSkin(s){skin=s;root.dataset.skin=s;btn.textContent='Skin: '+SKINS[s]}setSkin(skin);
btn.onclick=()=>{setSkin(skin==='sea'?'autumn':'sea');try{localStorage.setItem('tz-skin',skin)}catch(e){}};
function size(){w=c.width=c.clientWidth*dpr;h=c.height=c.clientHeight*dpr;W=f.width=innerWidth*dpr;H=f.height=innerHeight*dpr;b.width=W;b.height=H}
addEventListener('resize',size);size();

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
document.addEventListener('click',e=>{if(e.target.closest('a,button,.polaroid'))return;memory(e);const X=e.clientX*dpr,Y=e.clientY*dpr;
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

function frame(){t+=.016;energy*=.96;x.clearRect(0,0,w,h);if(skin==='sea')summer();else autumn();drawFx();if(!still)requestAnimationFrame(frame)}
frame();

function bindTilt(scope){scope.querySelectorAll('.tilt:not([data-tilt])').forEach(el=>{el.dataset.tilt='1';el.addEventListener('pointermove',e=>{if(still)return;const b=el.getBoundingClientRect(),qx=(e.clientX-b.left)/b.width,qy=(e.clientY-b.top)/b.height;
  el.style.setProperty('--gx',qx*100+'%');el.style.setProperty('--gy',qy*100+'%');el.style.transform=`perspective(1000px) rotateY(${(qx-.5)*7}deg) rotateX(${(.5-qy)*7}deg) translateY(-4px)`});
  el.addEventListener('pointerleave',()=>el.style.transform='')})}
bindTilt(document);

/* floating red thread: no gravity, desk friction */
const tc=document.getElementById('thread'),tx_=tc.getContext('2d');let N=38;const seg=13;let home=false,sleeping=false;let stake=null;let spin=0,squash=0,blinkT=3,sass=0,dodgeCool=0;let pts=[],hx=null,hy=null;
function tsize(){tc.width=innerWidth*dpr;tc.height=innerHeight*dpr;if(!pts.length)for(let i=0;i<N;i++){pts.push({x:60+i*seg,y:110,px:60+i*seg,py:110})}}
addEventListener('resize',tsize);tsize();addEventListener('pointermove',e=>{hx=e.clientX;hy=e.clientY});

/* the thread's tail is curious: it goes to things it likes and says little things */
const say=document.createElement('div');say.className='say';document.body.appendChild(say);
let target=null,until=0,said=null,cool=0;
function pick(){const els=[...document.querySelectorAll('[data-say]')].filter(el=>{const b=el.getBoundingClientRect();return b.bottom>40&&b.top<innerHeight-40&&b.right>0&&b.left<innerWidth});
  target=els.length?els[Math.floor(Math.random()*els.length)]:null;until=tt+6+Math.random()*4;said=null}
function seek(){if(home){const sp=slotPos(),tl=pts[N-1];tl.x+=(sp.x-tl.x)*.2;tl.y+=(sp.y-tl.y)*.2;pts[0].x+=(sp.x-pts[0].x)*.2;pts[0].y+=(sp.y-pts[0].y)*.2;if(!sleeping&&Math.hypot(tl.x-sp.x,tl.y-sp.y)<8&&Math.hypot(pts[0].x-sp.x,pts[0].y-sp.y)<8){sleeping=true;slot.classList.add('full');say.classList.remove('on')}return}if(caught){const tl=pts[N-1];tl.x+=(caught.x-tl.x)*.25;tl.y+=(caught.y-tl.y)*.25;return}if(!target||tt>until||!document.contains(target))pick();if(!target)return;
  const b=target.getBoundingClientRect(),tx=b.left+b.width*.5,ty=b.top+Math.min(b.height*.3,60),tl=pts[N-1],dx=tx-tl.x,dy=ty-tl.y,d=Math.hypot(dx,dy);
  tl.x+=dx*.035;tl.y+=dy*.035;
  if(d<70&&said!==target&&tt>cool&&!caught){said=target;cool=tt+2;say.textContent=nextLine(target.dataset.say);if(say.textContent)say.classList.add('on');setTimeout(()=>say.classList.remove('on'),2600)}}
addEventListener('scroll',()=>{if(target&&target.getBoundingClientRect().bottom<0)pick()},{passive:true});

/* 100+ lines per item, shuffled; no repeats until the whole bag is used */
let LINES={};fetch('/assets/lines.json').then(r=>r.json()).then(d=>{LINES=d}).catch(()=>{});const bags={};
function nextLine(k){if(!LINES[k]||!LINES[k].length)return '';if(!bags[k]||!bags[k].length){bags[k]=LINES[k].slice();for(let i=bags[k].length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bags[k][i],bags[k][j]]=[bags[k][j],bags[k][i]]}}return bags[k].pop()}
/* catch the critter and talk to it */
let caught=null;const chat=document.createElement('div');chat.className='chat';chat.hidden=true;document.body.appendChild(chat);
const secrets=['the 9th floor has a 10th floor. probably','I was drawn with AI help, then fixed by people','every season I change clothes. try the Skin button','click the sky. it does things','I\'ve read all 158 old letters','the Ø is my cousin','my full name is Redache. Ache for short','Nero named me. I pretend I picked it','TZERØ means the moment things start','the polaroids can be dragged. rearrange my room!','Nero plays with me like a cat. I pretend not to notice','I don\'t sleep. I coil','I steal one pixel from every page. nobody noticed','I\'m why the cursor glows. you\'re welcome','I could dodge every click. I\'m just nice'];let si=0;
function talk(text,opts){chat.innerHTML='';const p=document.createElement('p');p.textContent=text;chat.appendChild(p);const row=document.createElement('div');row.className='opts';
  opts.forEach(([label,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=e=>{e.stopPropagation();fn()};row.appendChild(b)});chat.appendChild(row)}
function menu(text){talk(text,[['Who are you?',()=>talk("A four-point star on a string, obviously. Nero's nickname comes from a star like me, so technically I'm the boss here. The name's Ache. Full name Redache. Only friends call me Ache. You may call me Ache.",back)],
  ['What should I read?',()=>{const c=[...document.querySelectorAll('.card[data-say]')];if(!c.length){talk('The fresh stuff is on the front page. Follow me.',[['Take me',()=>{location.href='/#latest'}],['Maybe later',()=>menu('Suit yourself. Anything else?')]]);return}const pick=c[Math.floor(Math.random()*c.length)];talk('Try "'+pick.querySelector('h4').textContent+'". I\'ll show you!',[['Show me',()=>{release();pick.scrollIntoView({behavior:'smooth',block:'center'});target=pick;until=tt+8;said=null}],['Maybe later',()=>menu('Okay! Anything else?')]])}],
  ['Fight me!',()=>talk('You dare challenge Redache? Choose your doom.',[['Easy',()=>startFight('easy')],['Normal',()=>startFight('normal')],['Hard',()=>startFight('hard')],['NieR',()=>startFight('nier')],['Never mind',()=>menu('Coward. Anything else?')]])],
  ['Tell me a secret',()=>talk(secrets[si++%secrets.length],back)],
  ['Get shorter',()=>{resize(-6);talk(N<=20?'Any shorter and I\'m just a star with no string. Free at last? No.':'Ahh, lighter. Speedrun mode.',back)}],
  ['Get longer',()=>{resize(6);talk(N>=62?'Max length. I\'m basically a kite now.':'Wheee, more room to dodge you.',back)}],
  stake?['Pull the stake',()=>{stake=null;talk('FREEDOM. I mean, thanks.',[]);setTimeout(release,1000)}]:['Stake Ache here',()=>{driveStake();talk('A stake? Seriously? Fine. I\'ll guard this spot. Don\'t be long.',[]);setTimeout(release,1400)}],
  ['Bye!',()=>{talk('Finally. Try to keep up next time.',[]);setTimeout(release,1100)}]])}
const back=[['Back',()=>menu('What else?')],['Bye!',()=>{talk('See you around!',[]);setTimeout(release,1000)}]];
function resize(dn){const n=Math.max(20,Math.min(62,N+dn));while(N<n){const l=pts[N-1];pts.push({x:l.x,y:l.y,px:l.x,py:l.y});N++}while(N>n){pts.pop();N--}}
function release(){caught=null;chat.hidden=true;pick()}
addEventListener('click',e=>{if(fight||home)return;const tl=pts[N-1];if(!caught&&Math.hypot(e.clientX-tl.x,e.clientY-tl.y)<26){e.stopImmediatePropagation();e.preventDefault();
  caught={x:Math.min(Math.max(e.clientX,40),innerWidth-40),y:Math.min(Math.max(e.clientY,120),innerHeight-40)};say.classList.remove('on');
  chat.hidden=false;chat.style.left=Math.min(caught.x+18,innerWidth-300)+'px';chat.style.top=Math.max(caught.y-20,70)+'px';
  menu(['Ugh. Fine. You caught me.','Hey! Hands off the points!','Okay, okay, lucky click.','Caught? I let you catch me.','Rude. Impressive, but rude.','Unhand me, I\'m a star!'][Math.floor(Math.random()*4)]+' What\'s up?')}
  else if(caught&&!e.target.closest('.chat')){e.stopImmediatePropagation();release()}},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&caught)release()});

addEventListener('pointermove',e=>{if(fight||home||caught||tt<dodgeCool)return;const tl=pts[N-1],d=Math.hypot(e.clientX-tl.x,e.clientY-tl.y);
  if(d<60&&Math.random()<.35){dodgeCool=tt+2.5;const ax=tl.x-e.clientX,ay=tl.y-e.clientY,n=Math.hypot(ax,ay)||1;tl.x+=ax/n*70;tl.y+=ay/n*70;sass=1.2;
    say.textContent=nextLine('sass');if(say.textContent)say.classList.add('on');clearTimeout(say._t);say._t=setTimeout(()=>say.classList.remove('on'),1800)}});

function driveStake(){const h=pts[0];stake={x:h.x+scrollX,y:h.y+scrollY}}
const stakeLines=['you just left me here?','I\'m not mad. I\'m staked','this stake is ugly. I love it','guard duty, day one','I could escape. I choose not to','tell the cursor I said hi','I\'ll be here. obviously','a star, tied to a stick. art','free? no. fabulous? yes','come back, I\'m bored'];let sli=0;
setInterval(()=>{if(stake&&!caught&&Math.random()<.5){say.textContent=stakeLines[sli++%stakeLines.length];say.classList.add('on');clearTimeout(say._t);say._t=setTimeout(()=>say.classList.remove('on'),2200)}},9000);
addEventListener('click',e=>{if(fight||!stake||caught)return;const sx=stake.x-scrollX,sy=stake.y-scrollY;if(Math.hypot(e.clientX-sx,e.clientY-(sy-4))<18){e.stopImmediatePropagation();stake=null;say.textContent='FREE! I mean… thanks.';say.classList.add('on');clearTimeout(say._t);say._t=setTimeout(()=>say.classList.remove('on'),1800)}},true);

/* ===== Redache vs Mouse: a small bullet-hell boss fight ===== */
let fight=null;
const fc=document.createElement('canvas');fc.id='arena';fc.hidden=true;document.body.appendChild(fc);const fx2=fc.getContext('2d');
const hud=document.createElement('div');hud.className='fhud';hud.hidden=true;
hud.innerHTML='<div class="boss"><b>REDACHE</b><span class="fdiff"></span><div class="hp"><i></i></div></div><div class="you"><b>MOUSE</b><span class="hearts"></span><button type="button" class="flee">Flee (Esc)</button></div><div class="fend" hidden><h3></h3><p></p><div class="opts"><button type="button" class="again">Rematch</button><button type="button" class="leave">Leave</button></div></div>';
document.body.appendChild(hud);
const DIFF={easy:{name:'Easy',php:10,ahp:20,spd:1.7,rate:1.5,dens:.6},normal:{name:'Normal',php:6,ahp:30,spd:2.3,rate:1.05,dens:1},hard:{name:'Hard',php:4,ahp:40,spd:2.9,rate:.8,dens:1.3},nier:{name:'NieR',php:3,ahp:50,spd:3.5,rate:.6,dens:1.7}};
const RM={
 start:['Foolish cursor! Redache shall teach you humility!','You dare raise a pointer against me?','Behold my four glorious points!','I have read every tome on this site. Prepare yourself!','A duel! At last, a worthy distraction!'],
 hurt:['Ow! My point!','A lucky click, nothing more!','Insolent pointer!','That one tickled. Mostly.','You will pay for that pixel!','Hmph. A scratch.','Do not touch the star!','My eye! Not the eye!'],
 taunt:['Ha! Feeble cursor!','Is that all, little arrow?','Dodge, mouse! Dodge!','Your clicking hand trembles!','Pathetic. Truly pathetic.','The orange ones can be clicked, you know. Not that it will save you.','Too slow, rodent!','Mind the thread, mouse. It bites.','My thread is longer than your patience!'],
 low:['No… my glorious points are fraying!','This cannot be! I am the boss!','I am merely warming up!','Very well. No more mercy!'],
 win:['Impossible… a mouse… defeated Redache…','Fine. FINE. You win. This time.','I let you win. Obviously. Rematch?'],
 lose:['Mouse K.O.! Bow before Redache!','And stay down, cursor!','Victory is mine, as written in the tomes!'],
 pat:['Dark Blast!','Spiral of Ruin!','Volley of Spite!','Lances of Ache!','The Wall of Pages!','Red Thread Lash!']};
const pickR=k=>RM[k][Math.floor(Math.random()*RM[k].length)];
function sprite(col,glow){const c=document.createElement('canvas'),S=40;c.width=c.height=S;const g=c.getContext('2d'),gr=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2);
  gr.addColorStop(0,'#fff');gr.addColorStop(.3,col);gr.addColorStop(.55,glow);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,S,S);return c}
const SPR={o:sprite('#ff9a3c','rgba(255,120,30,.45)'),p:sprite('#9b5cff','rgba(110,50,255,.45)')};
function fsay(t,ms=1800){say.textContent=t;say.classList.add('on');clearTimeout(say._t);say._t=setTimeout(()=>say.classList.remove('on'),ms)}
function startFight(k){const d=DIFF[k];stake=null;caught=null;chat.hidden=true;
  fight={k,d,ahp:d.ahp,php:d.php,b:[],t:0,pat:0,patT:0,fire:0,ang:0,iframe:0,ax:innerWidth/2,ay:innerHeight*.3,tx:innerWidth/2,ty:innerHeight*.3,mt:0,over:false,shake:0,flash:0,lances:[],talkT:3};
  fc.width=innerWidth*dpr;fc.height=innerHeight*dpr;fc.hidden=false;hud.hidden=false;hud.querySelector('.fend').hidden=true;hud.querySelector('.fdiff').textContent=d.name;
  document.body.classList.add('fighting');updHud();fsay(pickR('start'),2400)}
function endFight(){fight=null;fc.hidden=true;hud.hidden=true;document.body.classList.remove('fighting');say.classList.remove('on');pick()}
function updHud(){if(!fight)return;hud.querySelector('.hp i').style.width=Math.max(0,fight.ahp/fight.d.ahp*100)+'%';
  hud.querySelector('.hearts').textContent='♥'.repeat(Math.max(0,fight.php))+'♡'.repeat(Math.max(0,fight.d.php-fight.php))}
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
    if(hit){F.php--;F.iframe=1.1;F.shake=10;F.flash=.35;updHud();
      if(F.php<=0){F.over=true;F.b=[];F.lances=[];F.whip=null;fsay(pickR('lose'),3000);showEnd('Mouse K.O.','Redache wins on '+F.d.name+'. The star is insufferable now.')}else if(Math.random()<.6)fsay(pickR('taunt'))}}
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
  /* the mouse's hitbox */
  if(!F.over||F.php>0){const blink=F.iframe>0&&Math.floor(F.t*14)%2;if(!blink){g.strokeStyle=F.php<=1?'#ff4d5a':'#fff6cf';g.lineWidth=2;g.beginPath();g.arc(px,py,9,0,7);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(px,py,2.5,0,7);g.fill()}}
  else{g.fillStyle='#fff6cf';g.font='700 46px Geist, sans-serif';g.textAlign='center';g.fillText('K.O.',px,py-24)}
  if(F.flash>0){g.fillStyle=`rgba(208,2,27,${F.flash*.5})`;g.fillRect(-20,-20,W+40,H+40);F.flash-=dt}
  say.style.left=F.ax+'px';say.style.top=F.ay-26+'px'}
function showEnd(h,p){const e=hud.querySelector('.fend');e.querySelector('h3').textContent=h;e.querySelector('p').textContent=p;setTimeout(()=>{if(fight)e.hidden=false},900)}
fc.addEventListener('click',e=>{e.stopPropagation();const F=fight;if(!F||F.over)return;
  if(Math.hypot(e.clientX-F.ax,e.clientY-F.ay)<28){F.ahp--;F.hurt=.15;F.mt=0;updHud();
    if(F.ahp<=0){F.over=true;F.b=[];F.lances=[];F.whip=null;fsay(pickR('win'),3200);showEnd('Redache defeated!','You beat Ache on '+F.d.name+' with '+F.php+' ♥ left. It will remember this.')}
    else if(F.ahp===Math.floor(F.d.ahp*.3))fsay(pickR('low'),2000);else if(Math.random()<.35)fsay(pickR('hurt'),1300);return}
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
function goSleep(){if(fight)return;caught=null;chat.hidden=true;stake=null;home=true;slot.setAttribute('aria-label','Wake Ache up');fsay('Bedtime? Fine. Don\'t touch my thread.',1600);try{localStorage.setItem('ache-asleep','1')}catch(e){}}
function wakeAche(){const sp=slotPos();home=false;sleeping=false;slot.classList.remove('full');slot.setAttribute('aria-label','Put Ache to sleep');pts.forEach(q=>{q.x=q.px=sp.x;q.y=q.py=sp.y});pick();
  setTimeout(()=>fsay(sleepLines[sli2++%sleepLines.length],1800),400);try{localStorage.removeItem('ache-asleep')}catch(e){}}
slot.addEventListener('click',e=>{e.stopPropagation();home?wakeAche():goSleep()});
try{if(localStorage.getItem('ache-asleep')){home=true;sleeping=true;slot.classList.add('full');slot.setAttribute('aria-label','Wake Ache up')}}catch(e){}
let tt=0;(function thread(){if(fight||sleeping){tx_.clearRect(0,0,tc.width,tc.height);tt+=.016;if(!still)requestAnimationFrame(thread);return}tt+=.016;const h0=pts[0],gx=home?slotPos().x:stake?stake.x-scrollX:hx===null?innerWidth*.6+Math.sin(tt*.4)*innerWidth*.25:hx,gy=home?slotPos().y:stake?stake.y-scrollY:hy===null?160+Math.sin(tt*.7)*50:hy;if(stake){h0.x=gx;h0.y=gy}
  h0.x+=(gx-h0.x)*.3;h0.y+=(gy-h0.y)*.3;
  for(let i=1;i<N;i++){const p=pts[i],vx=(p.x-p.px)*.86,vy=(p.y-p.py)*.86;p.px=p.x;p.py=p.y;p.x+=vx+Math.sin(tt*1.3+i*.4)*.05;p.y+=vy+Math.cos(tt*1.1+i*.3)*.05}
  seek();
  for(let k=0;k<5;k++)for(let i=1;i<N;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(d<=seg)continue;const df=(d-seg)/d;
    if(i===1){b.x-=dx*df;b.y-=dy*df}else{a.x+=dx*df*.5;a.y+=dy*df*.5;b.x-=dx*df*.5;b.y-=dy*df*.5}}
  const g=tx_;g.clearRect(0,0,tc.width,tc.height);g.lineCap=g.lineJoin='round';
  g.strokeStyle='rgba(10,31,68,.14)';g.lineWidth=3*dpr;g.beginPath();pts.forEach((p,i)=>i?g.lineTo((p.x+2)*dpr,(p.y+4)*dpr):g.moveTo((p.x+2)*dpr,(p.y+4)*dpr));g.stroke();
  g.strokeStyle='#D0021B';g.lineWidth=2.1*dpr;g.beginPath();g.moveTo(pts[0].x*dpr,pts[0].y*dpr);
  for(let i=1;i<N-1;i++){g.quadraticCurveTo(pts[i].x*dpr,pts[i].y*dpr,(pts[i].x+pts[i+1].x)/2*dpr,(pts[i].y+pts[i+1].y)/2*dpr)}g.stroke();
  const tl=pts[N-1],sp=Math.hypot(tl.x-tl.px,tl.y-tl.py);spin+=.02+sp*.04;squash+=(Math.min(.35,sp*.04)-squash)*.2;
  const R=11*dpr,ang=Math.sin(spin)*.5+(caught?Math.sin(tt*10)*.15:0);g.save();g.translate(tl.x*dpr,tl.y*dpr);g.rotate(ang);g.scale(1+squash,1-squash*.6);
  g.fillStyle='#D0021B';g.shadowColor='rgba(10,31,68,.25)';g.shadowBlur=6*dpr;g.shadowOffsetY=2*dpr;g.beginPath();
  for(let k=0;k<8;k++){const r=k%2?R*.34:R,a2=k*Math.PI/4-Math.PI/2;g.lineTo(Math.cos(a2)*r,Math.sin(a2)*r)}g.closePath();g.fill();g.shadowColor='transparent';
  const ex=(hx??tl.x)-tl.x,ey=(hy??tl.y)-tl.y,ed=Math.hypot(ex,ey)||1,look=Math.min(1,ed/60);blinkT-=.016;if(blinkT<-.12)blinkT=2+Math.random()*4;
  const open=blinkT<0?.15:1;g.fillStyle='#fff';g.beginPath();g.ellipse(0,0,R*.32,R*.32*open,0,0,7);g.fill();
  if(open>.5){g.fillStyle='#0A1F44';g.beginPath();g.arc(ex/ed*R*.14*look,ey/ed*R*.14*look,R*.15,0,7);g.fill()}
  if(sass>0){sass-=.016;g.strokeStyle='#0A1F44';g.lineWidth=1.4*dpr;g.beginPath();g.moveTo(-R*.3,-R*.48);g.lineTo(R*.25,-R*.4);g.stroke()}
  g.restore();
  if(stake){const sx=(stake.x-scrollX)*dpr,sy=(stake.y-scrollY)*dpr;g.save();g.translate(sx,sy);g.fillStyle='rgba(10,31,68,.18)';g.beginPath();g.ellipse(0,9*dpr,9*dpr,3*dpr,0,0,7);g.fill();
    const wg=g.createLinearGradient(-4*dpr,0,4*dpr,0);wg.addColorStop(0,'#8a5a33');wg.addColorStop(1,'#c08a5a');g.fillStyle=wg;g.beginPath();g.moveTo(-4*dpr,-16*dpr);g.lineTo(4*dpr,-16*dpr);g.lineTo(4*dpr,4*dpr);g.lineTo(0,10*dpr);g.lineTo(-4*dpr,4*dpr);g.closePath();g.fill();
    g.fillStyle='#6b4325';g.fillRect(-5*dpr,-18*dpr,10*dpr,3*dpr);g.strokeStyle='#D0021B';g.lineWidth=2*dpr;g.beginPath();g.ellipse(0,-6*dpr,5.5*dpr,2.2*dpr,0,0,7);g.stroke();g.restore()}
  say.style.left=tl.x+'px';say.style.top=tl.y-18+'px';
  if(!still)requestAnimationFrame(thread)})();
/* draggable polaroids */
let zz=10;document.querySelectorAll('.polaroid').forEach(p=>{let sx,sy,ox,oy,drag=false;
  p.addEventListener('pointerdown',e=>{drag=true;p.setPointerCapture(e.pointerId);sx=e.clientX;sy=e.clientY;ox=p.offsetLeft;oy=p.offsetTop;p.style.zIndex=++zz;p.style.transition='none'});
  p.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-sx;p.style.left=ox+dx+'px';p.style.top=oy+(e.clientY-sy)+'px';p.style.transform=`rotate(${Math.max(-14,Math.min(14,dx*.05))}deg) scale(1.04)`});
  p.addEventListener('pointerup',()=>{drag=false;p.style.transition='transform .5s cubic-bezier(.3,1.5,.5,1)';p.style.transform=`rotate(${(Math.random()*10-5).toFixed(1)}deg)`})});
/* memories on click */
const mem=['the first save file','summer 2004, a borrowed console','blowing on a cartridge','a soundtrack you still hum','the 9th floor, lights flickering','one more level before bed','player two on the couch','the smell of a new game manual'];let mi=0;
function memory(e){const d=document.createElement('div');d.className='memory';d.textContent=mem[mi++%mem.length];d.style.left=e.clientX+'px';d.style.top=e.clientY-24+'px';document.body.appendChild(d);setTimeout(()=>d.remove(),3700)}
window.TZ={bindTilt};
})();
