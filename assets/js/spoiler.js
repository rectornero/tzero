/* Spoiler seals: each .spoiler block stays blurred under a frosted gacha pane, its images unloaded (data-spoiler-src),
   until the reader breaks the seal. It takes HITS taps (Nero: "make it require a lot of touches"): each one cracks the glass
   where you tapped and fills a pity counter; the last one shatters it into falling shards. Ache comments along the way.
   Breaking one opens all of them on this page and is remembered on this device; "Seal it again" undoes it. */
(()=>{
  const KEY='tz-spoilers',root=document.documentElement,gates=[...document.querySelectorAll('.spoiler')];
  if(!gates.length)return;
  const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"/></svg>';
  const HITS=8;
  const LINES={
    hover:["Sealed. I sealed it. Some of us like surprises.","That glass is load-bearing. Please don't.","There are spoilers in there. I've read them. I'm not telling.","Gameplay secrets behind frosted glass. Very tasteful. My idea."],
    hit:["Hey! That's a spoiler seal, not bubble wrap.","You're really doing this.","Tap, tap, tap. Very mature.","Pity counter's climbing. I built it that way. You're welcome.","Okay, it's cracking. Are you SURE?","Fine, keep going. I'll look away."],
    last:["One more and I'm not responsible.","Last chance to stay surprised!"],
    open:["Fine! Spoiled. Don't come crying to me at the boss fight.","There. You broke a gacha seal. Nero would be proud.","Spoilers everywhere now. I'm sweeping this up later."],
    reseal:["Sealed again. I'll pretend you never saw anything.","Good as new. Mostly."],
    near:["Psst. The frosted bits are spoilers: how the game plays. Break them only if you want to know.","Heads up: spoiler seals ahead. I'd leave them. You won't."]};
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const awake=()=>{const z=document.getElementById('slot');return !!(window.TZ&&TZ.speak)&&!(z&&z.classList.contains('full'))};
  const ache=(k,prio)=>{try{if(awake())TZ.speak(pick(LINES[k]),prio||2)}catch(e){}};
  try{window.TZ&&TZ.addLines&&TZ.addLines('spoiler',LINES.hover)}catch(e){}
  const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||root.dataset.motion==='2';
  const load=()=>document.querySelectorAll('img[data-spoiler-src]').forEach(i=>{i.src=i.dataset.spoilerSrc;i.removeAttribute('data-spoiler-src')});
  function set(open,save){
    root.classList.toggle('spoilers-shown',open);root.classList.toggle('spoilers-hidden',!open);
    gates.forEach(g=>{g.classList.toggle('shut',!open);const s=g.querySelector(':scope>.seal');if(s){s.classList.remove('going');s._hits=0;s.querySelector('.cracks').innerHTML='';s.querySelector('.pity b').style.width='0';s.querySelector('.pity span').textContent='0/'+HITS}
      [...g.children].forEach(c=>{if(c.classList.contains('seal')||c.classList.contains('shards'))return;c.inert=!open;open?c.removeAttribute('aria-hidden'):c.setAttribute('aria-hidden','true')})});
    if(open)load();
    if(save)try{open?localStorage.setItem(KEY,'shown'):localStorage.removeItem(KEY)}catch(e){}
  }
  // Crack the pane from the impact point: radial cracks, one ring, shards that fall and spin away
  function shatter(g,px,py){
    const W=g.offsetWidth,H=g.offsetHeight,R=Math.hypot(W,H),N=9,ring=Math.min(W,H)*.32;
    const box=document.createElement('div');box.className='shards';
    const ang=[...Array(N)].map((_,k)=>(k+Math.random()*.6)/N*Math.PI*2);
    const at=(a,r)=>[px+Math.cos(a)*r,py+Math.sin(a)*r];
    const inner=ang.map(a=>at(a,ring*(.7+Math.random()*.6))),outer=ang.map(a=>at(a,R));
    const polys=[];
    for(let k=0;k<N;k++){const n=(k+1)%N;polys.push([[px,py],inner[k],inner[n]]);polys.push([inner[k],outer[k],outer[n],inner[n]])}
    let d='';for(let k=0;k<N;k++){const n=(k+1)%N;d+=`M${px} ${py}L${outer[k][0]} ${outer[k][1]}M${inner[k][0]} ${inner[k][1]}L${inner[n][0]} ${inner[n][1]}`}
    polys.forEach(p=>{const i=document.createElement('i');i.style.clipPath='polygon('+p.map(([x,y])=>x+'px '+y+'px').join(',')+')';box.appendChild(i)});
    box.insertAdjacentHTML('beforeend','<svg aria-hidden="true"><path d="'+d+'"/></svg>');
    g.appendChild(box);
    const path=box.querySelector('path'),len=path.getTotalLength?path.getTotalLength():4000;
    path.style.strokeDasharray=len;path.animate([{strokeDashoffset:len},{strokeDashoffset:0}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
    [...box.querySelectorAll('i')].forEach((s,j)=>{
      const p=polys[j],cx=p.reduce((a,q)=>a+q[0],0)/p.length,cy=p.reduce((a,q)=>a+q[1],0)/p.length;
      const dx=(cx-px)*.35+(Math.random()-.5)*60,dy=(cy-py)*.25+H*.9+Math.random()*120,rot=(Math.random()-.5)*70;
      s.animate([{transform:'translate(0,0) rotate(0)',opacity:1,offset:0},{transform:'translate(0,0) rotate(0)',opacity:1,offset:.28},
        {transform:`translate(${dx}px,${dy}px) rotate(${rot}deg)`,opacity:0}],{duration:1050+Math.random()*350,easing:'cubic-bezier(.45,0,.8,.6)',fill:'forwards'});
    });
    path.animate([{opacity:1,offset:0},{opacity:1,offset:.3},{opacity:0}],{duration:700,fill:'forwards'});
    setTimeout(()=>box.remove(),1600);
  }
  function brk(g,ev){
    const r=g.getBoundingClientRect(),px=ev&&ev.clientX?ev.clientX-r.left:r.width/2,py=ev&&ev.clientY?ev.clientY-r.top:r.height/2;
    if(still()){set(true,true);return}
    g.querySelector(':scope>.seal').classList.add('going');
    shatter(g,px,py);set(true,true);
    gates.filter(o=>o!==g&&o.getBoundingClientRect().bottom>0&&o.getBoundingClientRect().top<innerHeight).forEach(o=>shatter(o,o.offsetWidth/2,o.offsetHeight/2));
  }
  // One tap = one hit: a crack where you tapped, a shake, the pity counter goes up. The last hit shatters the pane.
  function hit(g,s,ev){
    const r=s.getBoundingClientRect();
    const px=ev&&ev.clientX?ev.clientX-r.left:r.width*(.25+Math.random()*.5),py=ev&&ev.clientY?ev.clientY-r.top:r.height*(.25+Math.random()*.5);
    s._hits=(s._hits||0)+1;
    s.querySelector('.pity b').style.width=(s._hits/HITS*100)+'%';s.querySelector('.pity span').textContent=s._hits+'/'+HITS;
    if(s._hits>=HITS){ache('open',3);brk(g,ev&&ev.clientX?ev:{clientX:r.left+px,clientY:r.top+py});return}
    let d='';const n=3+Math.floor(Math.random()*3),len=28+s._hits*14;
    for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2;let x=px,y=py;d+='M'+x+' '+y;for(let j=0;j<3;j++){const aa=a+(Math.random()-.5)*.7,l=len/3*(.7+Math.random()*.6);x+=Math.cos(aa)*l;y+=Math.sin(aa)*l;d+='L'+x.toFixed(1)+' '+y.toFixed(1)}}
    const pth=document.createElementNS('http://www.w3.org/2000/svg','path');pth.setAttribute('d',d);s.querySelector('.cracks').appendChild(pth);
    if(!still()){const L=pth.getTotalLength?pth.getTotalLength():400;pth.style.strokeDasharray=L;pth.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:180,fill:'forwards'});
      const m=3+s._hits;s.animate([{transform:'translate(0,0)'},{transform:`translate(${-m}px,${m/2}px)`},{transform:`translate(${m}px,${-m/2}px)`},{transform:'translate(0,0)'}],{duration:220});}
    ache(s._hits>=HITS-1?'last':'hit',2);
  }
  gates.forEach(g=>{
    const s=document.createElement('div');s.className='seal';s.setAttribute('role','button');s.tabIndex=0;s.dataset.say='spoiler';
    s.innerHTML='<svg class="cracks" aria-hidden="true"></svg><span class="seal-tag">'+STAR+'Sealed · spoiler</span><span class="seal-what"></span><span class="seal-odds">Odds of a spoiler inside: <b>100%</b>, shown as always.</span><span class="seal-btn">Tap the glass to break it</span><span class="pity" aria-hidden="true"><b></b><span>0/'+HITS+'</span></span>';
    s.querySelector('.seal-what').textContent=g.dataset.spoiler||'How the game plays';
    s.setAttribute('aria-label','Spoiler seal: '+(g.dataset.spoiler||'how the game plays')+'. Press '+HITS+' times to break it.');
    s.addEventListener('click',e=>hit(g,s,e));
    s.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();hit(g,s,null)}});
    g.prepend(s);
    const again=document.createElement('button');again.type='button';again.className='spoil-again';again.textContent='Seal the spoilers again';
    again.onclick=()=>{set(false,true);ache('reseal',2);g.scrollIntoView({block:'start',behavior:still()?'auto':'smooth'})};g.after(again);
  });
  // Ache interjects once, if he's awake, when the first sealed block comes into view
  if(window.IntersectionObserver){let told=false;const io=new IntersectionObserver(es=>{if(told)return;if(es.some(e=>e.isIntersecting&&e.target.classList.contains('shut'))&&awake()){told=true;setTimeout(()=>ache('near',2),600);io.disconnect()}},{threshold:.5});gates.forEach(g=>io.observe(g))}
  let open=false;try{open=localStorage.getItem(KEY)==='shown'}catch(e){}
  set(open,false);
})();
