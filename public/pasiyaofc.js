// Typing animation
const typingText=document.getElementById("typingText"),words=["Web Developer","Software Creator","Python Developer","Tech Enthusiast"];let wi=0,ci=0,deleting=false;
function typeLoop(){const word=words[wi];typingText.textContent=deleting?word.slice(0,ci--):word.slice(0,ci++);let delay=deleting?55:90;if(!deleting&&ci>word.length){delay=1300;deleting=true}else if(deleting&&ci<0){deleting=false;wi=(wi+1)%words.length;ci=0;delay=350}setTimeout(typeLoop,delay)}typeLoop();

// Reveal animations
(function(){const items=[...document.querySelectorAll(".reveal")];if(!items.length)return;const showAll=()=>items.forEach(el=>el.classList.add("visible"));if(!("IntersectionObserver" in window)){showAll();return;}try{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");observer.unobserve(entry.target);}}),{threshold:0,rootMargin:"0px 0px 100px 0px"});document.documentElement.classList.add("ps-reveal-ready");items.forEach(el=>observer.observe(el));setTimeout(showAll,5000);window.addEventListener("error",showAll,{once:true});}catch(e){document.documentElement.classList.remove("ps-reveal-ready");showAll();}})();

// Scroll progress + back to top button
const toTop=document.getElementById("toTop"),progress=document.getElementById("scrollProgress"),circ=2*Math.PI*19;
function updateScroll(){const max=document.documentElement.scrollHeight-window.innerHeight;const percent=max>0?window.scrollY/max:0;progress.style.strokeDashoffset=circ-(circ*percent);toTop.classList.toggle("show",window.scrollY>280)}
window.addEventListener("scroll",updateScroll,{passive:true});updateScroll();toTop.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
