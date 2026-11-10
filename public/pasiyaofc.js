const commentName=document.getElementById("commentName"),commentText=document.getElementById("commentText"),commentBtn=document.getElementById("commentBtn"),commentsList=document.getElementById("commentsList"),charCount=document.getElementById("charCount");
const STORAGE_KEY="pasiduEshanComments";
function updateCounter(){charCount.textContent=`${commentText.value.length} / 250`}
function getComments(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function saveComments(c){localStorage.setItem(STORAGE_KEY,JSON.stringify(c))}
function renderComments(){commentsList.innerHTML="";getComments().slice().reverse().forEach(c=>{const card=document.createElement("article");card.className="comment";const n=document.createElement("div");n.className="comment-name";n.textContent=c.name;const t=document.createElement("div");t.className="comment-text";t.textContent=c.text;const d=document.createElement("div");d.className="comment-date";d.textContent=c.date;card.append(n,t,d);commentsList.appendChild(card)})}
commentText.addEventListener("input",updateCounter);
commentBtn.addEventListener("click",()=>{const name=commentName.value.trim(),text=commentText.value.trim();if(!name||!text){alert("Please enter your name and comment.");return}const c=getComments();c.push({name:name.slice(0,40),text:text.slice(0,250),date:new Date().toLocaleString()});saveComments(c);commentName.value="";commentText.value="";updateCounter();renderComments()});
updateCounter();renderComments();

// Typing animation
const typingText=document.getElementById("typingText"),words=["Web Developer","Software Creator","Python Developer","Tech Enthusiast"];let wi=0,ci=0,deleting=false;
function typeLoop(){const word=words[wi];typingText.textContent=deleting?word.slice(0,ci--):word.slice(0,ci++);let delay=deleting?55:90;if(!deleting&&ci>word.length){delay=1300;deleting=true}else if(deleting&&ci<0){deleting=false;wi=(wi+1)%words.length;ci=0;delay=350}setTimeout(typeLoop,delay)}typeLoop();

// Reveal animations
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")}),{threshold:.12});document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));

// Scroll progress + back to top button
const toTop=document.getElementById("toTop"),progress=document.getElementById("scrollProgress"),circ=2*Math.PI*19;
function updateScroll(){const max=document.documentElement.scrollHeight-window.innerHeight;const percent=max>0?window.scrollY/max:0;progress.style.strokeDashoffset=circ-(circ*percent);toTop.classList.toggle("show",window.scrollY>280)}
window.addEventListener("scroll",updateScroll,{passive:true});updateScroll();toTop.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
