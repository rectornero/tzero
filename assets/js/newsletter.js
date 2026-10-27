/* "Letters from the shore": the newsletter signup band above the footer on every page.
   The form posts straight to the newsletter service (no Netlify function, no feed). Set LETTERS once the account exists. */
(()=>{
const LETTERS={provider:'',id:''}; // provider: 'kit' (form id), 'buttondown' (username) or 'mailerlite' (account/form ids as "123/456")
const ENDPOINT={
  kit:id=>['https://app.kit.com/forms/'+id+'/subscriptions','email_address'],
  buttondown:id=>['https://buttondown.com/api/emails/embed-subscribe/'+id,'email'],
  mailerlite:id=>{const[a,f]=id.split('/');return['https://assets.mailerlite.com/jsonp/'+a+'/forms/'+f+'/subscribe','fields[email]']}
};
const foot=document.getElementById('publisher');if(!foot||document.getElementById('letters'))return;
const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/css/newsletter.css';document.head.appendChild(css);
const ep=LETTERS.provider&&LETTERS.id&&ENDPOINT[LETTERS.provider]?ENDPOINT[LETTERS.provider](LETTERS.id):null;
const sec=document.createElement('section');sec.id='letters';sec.className='letters';sec.setAttribute('aria-labelledby','letters-h');
sec.innerHTML=`<div class="wrap"><div class="letter">
  <div class="stamp" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2l2.6 6.9L22 9.3l-5.8 4.6 2.1 7.1L12 17l-6.3 4 2.1-7.1L2 9.3l7.4-.4z"/></svg><span>TZERØ</span></div>
  <div class="copy">
    <p class="kicker">Letters from the shore</p>
    <h2 id="letters-h">New stories, straight to your inbox.</h2>
    <p>Fresh articles, devlogs and what the studio is making. About once a month, never more than once a week. No spam, no tracking games, leave in one click.</p>
  </div>
  <form class="sign" method="post" target="letters-sink" novalidate>
    <label for="letters-mail" class="sr">Your email</label>
    <div class="field"><input id="letters-mail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required><button type="submit"><span>Write me</span><svg class="plane" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11.5 21 3l-6.5 18-3.2-7.3z"/><path d="M11.3 13.7 21 3"/></svg></button></div>
    <p class="msg" role="status" aria-live="polite"></p>
  </form>
</div></div><iframe name="letters-sink" title="" hidden></iframe>`;
foot.before(sec);
const form=sec.querySelector('form'),mail=sec.querySelector('input'),btn=sec.querySelector('button'),msg=sec.querySelector('.msg'),sink=sec.querySelector('iframe');
const say=(t,k)=>{msg.textContent=t;msg.dataset.k=k||''};
if(!ep){mail.disabled=btn.disabled=true;btn.querySelector('span').textContent='Opening soon';say('The first letter is being written. Sign-ups open very soon.');return}
form.action=ep[0];mail.name=ep[1];
let sent=false;
form.addEventListener('submit',e=>{
  if(!mail.checkValidity()){e.preventDefault();say('That address looks off. Try again?','err');mail.focus();return}
  sent=true;btn.disabled=true;sec.classList.add('flying');say('Folding your letter…');
});
sink.addEventListener('load',()=>{if(!sent)return;sent=false;sec.classList.remove('flying');sec.classList.add('done');
  btn.querySelector('span').textContent='On its way';say('Almost there: check your inbox and confirm, so we know it is really you.','ok');
  try{localStorage.setItem('tz-letters','1')}catch(e){}});
try{if(localStorage.getItem('tz-letters')){sec.classList.add('done');say('You are on the list. Thanks for reading!','ok')}}catch(e){}
})();
