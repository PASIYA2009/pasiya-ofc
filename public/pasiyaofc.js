const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);

// menu (mobile sidebar)
const sidebar=$("#sidebar"),overlay=$("#overlay"),menuBtn=$("#menuBtn");
function setMenu(o){sidebar.classList.toggle("open",o);overlay.classList.toggle("open",o);document.body.classList.toggle("lock",o);menuBtn.setAttribute("aria-expanded",String(o))}
menuBtn.addEventListener("click",()=>setMenu(!sidebar.classList.contains("open")));
overlay.addEventListener("click",()=>setMenu(false));
$$(".sidebar a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
document.addEventListener("keydown",e=>{if(e.key==="Escape")setMenu(false)});

// active section in sidebar
const links=[...$$('.side-group a[href^="#"]')];
const spy=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.toggle("active",l.getAttribute("href")==="#"+e.target.id))}}),{rootMargin:"-35% 0px -55% 0px"});
$$("main section[id]").forEach(s=>spy.observe(s));

// Sri Lanka live time
const t=$("#liveTime"),d=$("#liveDate");
function tick(){const n=new Date();t.textContent=new Intl.DateTimeFormat("en-LK",{timeZone:"Asia/Colombo",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(n);d.textContent=new Intl.DateTimeFormat("en-LK",{timeZone:"Asia/Colombo",weekday:"long",day:"2-digit",month:"short",year:"numeric"}).format(n)}
tick();setInterval(tick,1000);

// typing
const tt=$("#typingText"),words=["Web Developer","Software Creator","Python Developer","Tech Enthusiast"];let wi=0,ci=0,del=false;
(function loop(){const w=words[wi];tt.textContent=del?w.slice(0,ci--):w.slice(0,ci++);let dl=del?55:90;if(!del&&ci>w.length){dl=1300;del=true}else if(del&&ci<0){del=false;wi=(wi+1)%words.length;ci=0;dl=350}setTimeout(loop,dl)})();

// reveal + card spotlight
const ro=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")}),{threshold:.08});
$$(".page-head,.stats,.block").forEach(el=>{el.classList.add("reveal");ro.observe(el)});
document.addEventListener("pointermove",e=>{const c=e.target.closest&&e.target.closest(".card");if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty("--mx",e.clientX-r.left+"px");c.style.setProperty("--my",e.clientY-r.top+"px")},{passive:true});
$$(".soon").forEach(c=>c.addEventListener("click",e=>e.preventDefault()));

// comments (saved in this browser)
const cn=$("#commentName"),ct=$("#commentText"),cb=$("#commentBtn"),cl=$("#commentsList"),cc=$("#charCount"),KEY="pasiduEshanComments";
const get=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
function render(){cl.innerHTML="";get().slice().reverse().forEach(c=>{const a=document.createElement("article");a.className="comment";[["comment-name",c.name],["comment-text",c.text],["comment-date",c.date]].forEach(([k,v])=>{const x=document.createElement("div");x.className=k;x.textContent=v;a.appendChild(x)});cl.appendChild(a)})}
ct.addEventListener("input",()=>cc.textContent=ct.value.length+" / 250");
cb.addEventListener("click",()=>{const n=cn.value.trim(),x=ct.value.trim();if(!n||!x){alert("Please enter your name and comment.");return}const c=get();c.push({name:n.slice(0,40),text:x.slice(0,250),date:new Date().toLocaleString()});try{localStorage.setItem(KEY,JSON.stringify(c))}catch{}cn.value="";ct.value="";cc.textContent="0 / 250";render()});
render();
