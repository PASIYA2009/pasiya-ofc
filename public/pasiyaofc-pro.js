/* PRO layer: progress bar, cursor glow, 3D tilt, counters, terminal typing, magnetic buttons. No libraries. */
(function(){
  var fine=matchMedia("(hover:hover) and (pointer:fine)").matches,calm=matchMedia("(prefers-reduced-motion:reduce)").matches;
  var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return[].slice.call((r||document).querySelectorAll(s))};

  // scroll progress (top bar)
  var bar=document.createElement("div");bar.className="pro-progress";document.body.appendChild(bar);
  function prog(){var m=document.documentElement.scrollHeight-innerHeight;bar.style.transform="scaleX("+(m>0?scrollY/m:0)+")"}
  addEventListener("scroll",prog,{passive:true});prog();

  // cursor glow
  if(fine&&!calm){
    var g=document.createElement("div");g.className="pro-glow";document.body.appendChild(g);
    var gx=0,gy=0,tx=0,ty=0,run=false;
    addEventListener("pointermove",function(e){tx=e.clientX;ty=e.clientY;g.classList.add("on");if(!run){run=true;loop()}},{passive:true});
    document.addEventListener("pointerleave",function(){g.classList.remove("on")});
    function loop(){gx+=(tx-gx)*.14;gy+=(ty-gy)*.14;g.style.transform="translate3d("+gx+"px,"+gy+"px,0)";requestAnimationFrame(loop)}
  }

  // 3D tilt: hero stage + bento tiles
  function tilt(el,max,lift){
    var raf=0;
    el.addEventListener("pointermove",function(e){
      if(e.pointerType==="touch")return;
      var r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;
      el.style.setProperty("--mx",(px*100)+"%");el.style.setProperty("--my",(py*100)+"%");
      cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){
        el.style.transform="perspective(900px) rotateX("+((.5-py)*max)+"deg) rotateY("+((px-.5)*max*1.2)+"deg)"+(lift?" translateY(-4px)":"")});
    });
    el.addEventListener("pointerleave",function(){cancelAnimationFrame(raf);el.style.transform=""});
  }
  if(fine&&!calm){var st=$(".stage");if(st)tilt(st,16,false);$$(".tile").forEach(function(t){tilt(t,7,true)})}
  else{$$(".tile").forEach(function(t){t.addEventListener("pointermove",function(e){var r=t.getBoundingClientRect();t.style.setProperty("--mx",(e.clientX-r.left)+"px");t.style.setProperty("--my",(e.clientY-r.top)+"px")},{passive:true})})}

  // magnetic buttons
  if(fine&&!calm)$$(".btn").forEach(function(b){
    b.addEventListener("pointermove",function(e){var r=b.getBoundingClientRect();b.style.transform="translate("+((e.clientX-r.left-r.width/2)*.18)+"px,"+((e.clientY-r.top-r.height/2)*.3-3)+"px)"});
    b.addEventListener("pointerleave",function(){b.style.transform=""});
  });

  // count-up numbers
  function count(el){var to=+el.dataset.to,suf=el.dataset.suf||"",t0=performance.now(),d=1400;
    (function s(t){var p=Math.min(1,(t-t0)/d),e=1-Math.pow(1-p,4);el.textContent=Math.round(to*e)+suf;if(p<1)requestAnimationFrame(s)})(t0)}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){count(e.target);io.unobserve(e.target)}})},{threshold:.6});
  $$("[data-to]").forEach(function(n){calm?(n.textContent=n.dataset.to+(n.dataset.suf||"")):io.observe(n)});

  // terminal typewriter (types once when scrolled into view)
  var pre=$("#termCode");
  if(pre){
    var html=pre.innerHTML;pre.dataset.full=html;
    function typeTerm(){
      if(calm){pre.innerHTML=html+'<span class="caret"></span>';return}
      var tok=html.match(/<[^>]+>|&[a-z#0-9]+;|[\s\S]/g)||[],i=0,out="";pre.innerHTML="";
      (function step(){
        var n=3;while(n--&&i<tok.length){out+=tok[i++];while(i<tok.length&&tok[i-1].charAt(0)==="<"&&tok[i].charAt(0)==="<")out+=tok[i++]}
        pre.innerHTML=out+'<span class="caret"></span>';
        if(i<tok.length)setTimeout(step,14);
      })();
    }
    var tio=new IntersectionObserver(function(es){if(es[0].isIntersecting){tio.disconnect();typeTerm()}},{threshold:.35});tio.observe(pre);
  }

  // active section link in menu is handled by shell; here: hero parallax on scroll
  if(!calm){var vis=$(".hero-visual");if(vis)addEventListener("scroll",function(){var y=Math.min(scrollY,600);vis.style.transform="translateY("+(y*.08)+"px)"},{passive:true})}
})();
