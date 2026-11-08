/* PASIYA auto theme: site ekak athule thiyena light/random colours, portfolio theme ekata maru karanawa */
(function(){try{
var SKIP={IMG:1,SVG:1,svg:1,CANVAS:1,VIDEO:1,PICTURE:1,IFRAME:1,SCRIPT:1,STYLE:1,LINK:1,META:1,HEAD:1,BR:1,HR:1,HTML:1,BODY:1,path:1,use:1,defs:1,g:1,circle:1,rect:1,NOSCRIPT:1,SOURCE:1,OPTION:1};
var st=document.createElement("style");
st.textContent='[data-ps~=card]{background-color:rgba(9,18,24,.72)!important;background-image:none!important}'+
'[data-ps~=accent]{background-image:linear-gradient(90deg,#00e5ff,#00ffc8)!important;background-color:#00e5ff!important;color:#001013!important}'+
'[data-ps~=accent] *{color:#001013!important}'+
'[data-ps~=text]{color:#f4fbff!important}[data-ps~=muted]{color:#91a2ad!important}'+
'[data-ps~=border]{border-color:rgba(0,229,255,.16)!important}';
document.head.appendChild(st);
function parse(c){var m=c&&c.match(/rgba?\(([^)]+)\)/);if(!m)return null;var p=m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
function lum(o){return(.2126*o.r+.7152*o.g+.0722*o.b)/255}
function sat(o){var mx=Math.max(o.r,o.g,o.b),mn=Math.min(o.r,o.g,o.b);return mx?(mx-mn)/mx:0}
function isPreview(el){
  var b=parse(getComputedStyle(el).backgroundColor);
  if(!b||b.a<.5||lum(b)<.55)return false;
  if(el.offsetWidth*el.offsetHeight>360000)return false;
  if(el.querySelector("canvas"))return true;
  var v=el.querySelectorAll("svg");
  for(var i=0;i<v.length;i++){var r=v[i].getBoundingClientRect();if(r.width>=120&&r.height>=120)return true}
  return false}
function evalEl(el){
  if(el.nodeType!==1||SKIP[el.tagName]||(el.closest&&el.closest(".ps-loader,.ps-home,canvas,svg,[data-ps-keep]")))return;
  el.removeAttribute("data-ps");
  // QR preview wage thanak (canvas / loku svg ekak thiyena light box ekak) scan wenna oni nisa palaweni widiyatama thiyenawa
  if(isPreview(el)){el.setAttribute("data-ps-keep","1");return}
  var cs=getComputedStyle(el),t=[],bg=parse(cs.backgroundColor),accent=false;
  if(bg&&bg.a>.15){
    var L=lum(bg),S=sat(bg);
    if(L>.55&&S<.35)t.push("card");
    else if(S>=.35&&L>.12){
      if(el.offsetWidth*el.offsetHeight<60000){t.push("accent");accent=true}else t.push("card")
    }
  }
  if(!accent){
    var c=parse(cs.color);
    if(c){var cl=lum(c);if(cl<.28)t.push("text");else if(cl<.5&&sat(c)<.25)t.push("muted")}
  }
  var bc=parse(cs.borderTopColor);
  if(bc&&parseFloat(cs.borderTopWidth)>0&&lum(bc)>.6)t.push("border");
  if(t.length)el.setAttribute("data-ps",t.join(" "));
}
var q=[],busy=false;
function enqueue(n){if(n.nodeType!==1)return;q.push(n);var l=n.querySelectorAll?n.querySelectorAll("*"):[];for(var i=0;i<l.length;i++)q.push(l[i]);if(!busy){busy=true;requestAnimationFrame(run)}}
function run(){var n=0;while(q.length&&n<400){evalEl(q.shift());n++}if(q.length)requestAnimationFrame(run);else busy=false}
function start(){enqueue(document.body);
  new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];
    if(m.type==="childList")m.addedNodes.forEach(function(x){if(x.nodeType===1)enqueue(x)});
    else if(m.target.nodeType===1&&m.attributeName!=="data-ps"){q.push(m.target);if(!busy){busy=true;requestAnimationFrame(run)}}}
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style"]});}
if(document.body)start();else document.addEventListener("DOMContentLoaded",start);
}catch(e){}})();
