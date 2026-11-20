// stagger delay + card spotlight
document.querySelectorAll(".link-grid .link-card,.skills .skill").forEach((el,i)=>el.style.setProperty("--i",i%8));
document.addEventListener("pointermove",e=>{const c=e.target.closest&&e.target.closest(".link-card,.skill");if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")},{passive:true});
document.querySelectorAll(".link-card.soon").forEach(a=>a.addEventListener("click",e=>e.preventDefault()));

// loading screen for EVERY link now comes from /_pasiya/navloader.js

// card ekak uda hover / touch karama project eka kalin "wake up" karanawa (Railway wage ewa nidimath unoth) -> click karama ikmanata open wenawa
(function(){
  var warmed={};
  function warm(e){
    var a=e.target.closest&&e.target.closest('.link-card[href^="/"]');
    if(!a)return;var h=a.getAttribute("href");if(warmed[h])return;warmed[h]=1;
    try{fetch(h,{credentials:"same-origin",priority:"low"}).catch(function(){})}catch(_){}}
  document.addEventListener("pointerover",warm,{passive:true});
  document.addEventListener("touchstart",warm,{passive:true});
})();
