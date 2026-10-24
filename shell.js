// shell.js — WHY: one shared "game window" helper used by EVERY game page: digital HOME button, size selector (S/M/L/FIT) and fullscreen.
// HOW: injects its own CSS + a top bar, then sizes the element #w (the game wrapper) from the canvas aspect ratio. Size choice is remembered in localStorage 'gh_size'.
// IMPROVE: add more sizes, a per-game size, or a settings drawer. New games only need a #w wrapper containing a <canvas> and this script tag with data-home.
(function(){const home=document.currentScript.dataset.home||'index.html',w=document.getElementById('w'),cv=w.querySelector('canvas');
 const css=document.createElement('style');css.textContent=`#shell{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-family:'Courier New',monospace}
 #shell .home{color:#39ff88;border:2px solid #39ff88;background:#04140a;padding:6px 14px;border-radius:6px;text-decoration:none;font-weight:bold;letter-spacing:2px;text-shadow:0 0 8px #39ff88;box-shadow:0 0 10px #39ff8855,inset 0 0 10px #39ff8833;transition:.15s}
 #shell .home:hover{background:#39ff88;color:#000;text-shadow:none}
 #shell button{margin:0 3px;padding:6px 10px;background:#04140a;color:#39ff88;border:1px solid #39ff8888;border-radius:6px;font:inherit;cursor:pointer}#shell button.on{background:#39ff88;color:#000}
 html.kp #shell button,html.lite #shell button{display:none}
 @media(max-width:480px){#shell{padding:4px 6px}#shell .home{padding:4px 8px;font-size:.8rem}#shell button{padding:4px 7px;margin:0 2px;font-size:.8rem}}`;document.head.appendChild(css);
 const bar=document.createElement('div');bar.id='shell';bar.innerHTML=`<a class="home" href="${home}"${home=='#'?' data-home-link':''}>⏻ HOME</a><span>${['S','M','L','FIT'].map(s=>`<button data-s="${s}">${s}</button>`).join('')}<button data-s="FS" title="Fullscreen">⛶</button></span>`;document.body.prepend(bar);
 const sizes={S:480,M:760,L:1100};
 // apply(): FIT = biggest size that fits BOTH width and height of the screen (keeps aspect). Fullscreen uses the whole screen.
 function apply(){const s=localStorage.getItem('gh_size')||'FIT',a=cv.width/cv.height;let wd;
  if(document.fullscreenElement)wd=Math.min(innerWidth,innerHeight*a);else wd=s=='FIT'?Math.min(innerWidth,(innerHeight-60)*a):Math.min(sizes[s],innerWidth);
  w.style.width=wd+'px';w.style.maxWidth='none';bar.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.s==s))}
 bar.onclick=e=>{const s=e.target.dataset&&e.target.dataset.s;if(!s)return;if(s=='FS'){document.fullscreenElement?document.exitFullscreen():w.requestFullscreen&&w.requestFullscreen();return}localStorage.setItem('gh_size',s);apply()};
 addEventListener('resize',apply);document.addEventListener('fullscreenchange',apply);apply()})();
