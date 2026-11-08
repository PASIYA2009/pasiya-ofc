// stagger delay + card spotlight
document.querySelectorAll(".link-grid .link-card,.skills .skill").forEach((el,i)=>el.style.setProperty("--i",i%8));
document.addEventListener("pointermove",e=>{const c=e.target.closest&&e.target.closest(".link-card,.skill");if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")},{passive:true});
document.querySelectorAll(".link-card.soon").forEach(a=>a.addEventListener("click",e=>e.preventDefault()));
