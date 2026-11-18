(function(){'use strict';
 if(window.__PASIYA_CYBER__)return;window.__PASIYA_CYBER__=true;
 var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce)return;
 var box=document.createElement('aside');box.className='cyber-terminal min';box.setAttribute('aria-label','Pasiya system terminal');
 box.innerHTML='<div class="cyber-terminal-head" role="button" tabindex="0" aria-expanded="false"><span class="dots"><i></i><i></i><i></i></span><b>PASIYA // SYSTEM</b><span>LIVE</span></div><div class="cyber-terminal-body" hidden><div class="cyber-terminal-line"><strong>root@pasiya</strong>:~$ <span data-cy-command></span><span class="cyber-terminal-cursor"></span></div><div class="cyber-terminal-line output" data-cy-output>Initializing secure interface...</div></div>';
 document.body.appendChild(box);var head=box.querySelector('.cyber-terminal-head'),body=box.querySelector('.cyber-terminal-body'),cmd=box.querySelector('[data-cy-command]'),out=box.querySelector('[data-cy-output]');
 function toggle(){var open=body.hidden;body.hidden=!open;box.classList.toggle('min',!open);head.setAttribute('aria-expanded',String(open));}
 head.addEventListener('click',toggle);head.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 var tasks=[['system.scan --modules','All modules operational.'],['network.status --secure','Encrypted connection established.'],['pasiya.init --ecosystem','Digital ecosystem ready.'],['ui.optimize --responsive','Adaptive layout enabled.'],['security.check --integrity','Integrity check passed.']];var idx=0;
 function run(){var t=tasks[idx++%tasks.length],s=t[0],i=0;cmd.textContent='';out.textContent='';var timer=setInterval(function(){cmd.textContent=s.slice(0,++i);if(i>=s.length){clearInterval(timer);out.textContent=t[1];setTimeout(run,3600);}},42);}
 setTimeout(run,900);
})();
