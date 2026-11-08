// stagger delay + card spotlight
document.querySelectorAll(".link-grid .link-card,.skills .skill").forEach((el,i)=>el.style.setProperty("--i",i%8));
document.addEventListener("pointermove",e=>{const c=e.target.closest&&e.target.closest(".link-card,.skill");if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty("--mx",(e.clientX-r.left)+"px");c.style.setProperty("--my",(e.clientY-r.top)+"px")},{passive:true});
document.querySelectorAll(".link-card.soon").forEach(a=>a.addEventListener("click",e=>e.preventDefault()));

// project card ekak click karama loading screen eka penawa (aluth page eka load wenakan)
(function(){
  var names={"/api":"PASIYA API","/pastpapers":"Past Papers","/bot":"WhatsApp Bot","/qr":"QR Editor"};
  function show(name){
    var l=document.getElementById("ps-loader");
    if(!l){l=document.createElement("div");l.id="ps-loader";l.className="ps-loader ps-hide";
      l.innerHTML='<div class="ps-orb"><i></i><i></i><i></i><b>P</b></div><div class="ps-brand">PASIYA OFC</div><div class="ps-sub"></div><div class="ps-bar"><span></span></div>';
      document.body.appendChild(l)}
    l.querySelector(".ps-sub").textContent="Opening "+name;
    void l.offsetWidth;l.classList.remove("ps-hide")}
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest('.link-card[href^="/"]');
    if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.button||a.target==="_blank")return;
    show(names[a.getAttribute("href")]||"page")});
  // back button eken enakota loader eka nathi wenna
  addEventListener("pageshow",function(e){if(e.persisted){var l=document.getElementById("ps-loader");if(l)l.classList.add("ps-hide")}});
})();
