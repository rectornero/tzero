/* Spoiler gates: every .spoiler block stays blurred, with its images unloaded (data-spoiler-src), until the reader taps.
   Revealing one reveals all on the page and is remembered on this device; "Hide spoilers again" undoes it. */
(()=>{
  const KEY='tz-spoilers',root=document.documentElement,gates=[...document.querySelectorAll('.spoiler')];
  if(!gates.length&&!document.querySelector('.spoil-txt'))return;
  const load=()=>document.querySelectorAll('img[data-spoiler-src]').forEach(i=>{i.src=i.dataset.spoilerSrc;i.removeAttribute('data-spoiler-src')});
  function set(open,save){
    root.classList.toggle('spoilers-shown',open);root.classList.toggle('spoilers-hidden',!open);
    gates.forEach(g=>{g.classList.toggle('shut',!open);[...g.children].forEach(c=>{if(!c.classList.contains('spoiler-cover')){c.inert=!open;open?c.removeAttribute('aria-hidden'):c.setAttribute('aria-hidden','true')}})});
    if(open)load();
    if(save)try{open?localStorage.setItem(KEY,'shown'):localStorage.removeItem(KEY)}catch(e){}
  }
  gates.forEach(g=>{
    const b=document.createElement('button');b.type='button';b.className='spoiler-cover';
    b.innerHTML='<b>Spoiler · gameplay</b><span></span><i>Tap to reveal</i>';
    b.querySelector('span').textContent=g.dataset.spoiler||'How the game plays';
    b.onclick=()=>set(true,true);g.prepend(b);
    const again=document.createElement('button');again.type='button';again.className='spoil-again';again.textContent='Hide spoilers again';
    again.onclick=()=>{set(false,true);g.scrollIntoView({block:'start'})};g.after(again);
  });
  let open=false;try{open=localStorage.getItem(KEY)==='shown'}catch(e){}
  set(open,false);
})();
