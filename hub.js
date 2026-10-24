// hub.js — hub logic. WHY: one registry (GAMES) drives the cards, search, scores and profile panel. HOW: plain DOM, no libraries. IMPROVE: load GAMES from a JSON file, add categories/favourites.
// To add a game: copy its files into this folder, add ONE object below and (optionally) a static card in index.html.
const GAMES=[
 {id:'runner',title:'Wild Animal Runner',em:'🐅',desc:'Endless runner with 5 animals',tags:['Endless','Arcade'],url:'runner.html'},
 {id:'bounce',title:'Classic Bounce · Trap Lab Edition',em:'🔴',desc:'11 levels, 5 keys, every trap, hazard shop + built-in Trap Lab',tags:['Platformer','Traps','Lab'],url:'bounce.html'},
 {id:'surfer',title:'Rail Rush',em:'🚆',desc:'3-lane subway runner: coins, jetpack, guards',tags:['Runner','3 Lanes'],url:'surfer.html'},
 {id:'spacewar',title:'Spacewar Infinity',em:'🚀',desc:'12-level space shooter with 4 bosses',tags:['Shooter','Campaign'],url:'spacewar.html'}];
const $=s=>document.querySelector(s);
// Theme: saved locally, applied as data-theme on <html>.
const setTheme=t=>{document.documentElement.setAttribute('data-theme',t);localStorage.setItem('gh_theme',t)};setTheme(localStorage.getItem('gh_theme')||'dark');
// Digital clock in the title bar.
function tick(){const d=new Date(),p=n=>String(n).padStart(2,'0'),c=$('#clock');if(c)c.textContent=`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`}tick();setInterval(tick,1000);
// Cards + stat chips: filter by title/description/tags; show the signed-in user's best score per game. (Promise style, no async/await.)
function bestOf(u,id){var h=u&&u.hist&&u.hist[id];return h?h.best:'--'}
function render(){try{var q=$('#q').value.toLowerCase(),id=Store.user();(id?Store.users():Promise.resolve({})).then(function(all){var u=id?all[id]:null,total=0;
 if(u)for(var k in u.hist)total+=u.hist[k].best;
 var list=GAMES.filter(function(g){return (g.title+g.desc+g.tags.join(' ')).toLowerCase().indexOf(q)>=0});
 $('#grid').innerHTML=list.map(function(g){return '<a class="card" href="'+g.url+'"><div class="idx">GAME '+String(GAMES.indexOf(g)+1).padStart(2,'0')+'</div><div class="em">'+g.em+'</div><h3>'+g.title+'</h3><p>'+g.desc+'</p>'+g.tags.map(function(t){return '<span class="tag">'+t+'</span>'}).join('')+(u?'<small>BEST: '+bestOf(u,g.id)+'</small>':'')+'<span class="play">▶ START</span></a>'}).join('')||'<p>NO GAMES FOUND</p>';
 $('#stats').innerHTML='<span>GAMES '+String(GAMES.length).padStart(2,'0')+'</span><span>USER '+(id?id.toUpperCase():'GUEST')+'</span><span>DIFFICULTY '+Store.diff().n+'</span><span>TOTAL BEST '+total+'</span><span>DATA: SAVED IN THIS BROWSER</span>'})}catch(e){console.error('render failed',e)}}
// Profile panel: signed-out = sign in/up form; signed-in = history. Also holds the difficulty + theme switches.
function panel(){var id=Store.user(),p=$('#panel');(id?Store.users():Promise.resolve({})).then(function(all){var u=id?all[id]:null;
 var h='<label>DIFFICULTY <select id="df">'+Object.keys(Store.DIFFS).map(function(k){return '<option value="'+k+'"'+(k==Store.diffKey()?' selected':'')+'>'+Store.DIFFS[k].n+'</option>'}).join('')+'</select></label><br><label><input type="checkbox" id="kp" '+(localStorage.getItem('gh_keypad')==='1'?'checked':'')+' style="width:auto"> Keypad-phone keys (2/4/6/8/5)</label><br><label><input type="checkbox" id="dk" '+(document.documentElement.dataset.theme=='light'?'checked':'')+' style="width:auto"> LCD day theme</label><hr>';
 if(u){h+='<b>👤 '+id+'</b><ul>'+GAMES.map(function(g){var x=u.hist[g.id];return '<li>'+g.title+': best '+bestOf(u,g.id)+' ('+(x?x.plays.length:0)+' plays)</li>'}).join('')+'</ul><button id="so">SIGN OUT</button>'}
 else h+='<input id="u" placeholder="Email or username"><input id="pin" placeholder="6-digit PIN" type="password" maxlength="6" inputmode="numeric"><button id="si">SIGN IN</button><button id="su">SIGN UP</button><div id="msg"></div>';
 p.innerHTML=h;$('#df').onchange=function(e){Store.setDiff(e.target.value);render()};$('#kp').onchange=function(e){localStorage.setItem('gh_keypad',e.target.checked?'1':'0')};$('#dk').onchange=function(e){setTheme(e.target.checked?'light':'dark')};
 var go=function(f){return function(){Store[f]($('#u').value,$('#pin').value).then(function(m){if(m)$('#msg').textContent=m;else{panel();render()}})}};
 if(id)$('#so').onclick=function(){Store.signOut();panel();render()};else{$('#si').onclick=go('signIn');$('#su').onclick=go('signUp')}})}
$('#q').oninput=render;$('#pbtn').onclick=function(){$('#panel').classList.toggle('hide');panel()};render();

// ===== ALL-IN-ONE mode. WHY: when this hub is built as ONE file, every game is embedded (base64) in window.GH_EMBED and opens in a full-screen iframe, so nothing can be "missing".
// HOW: card click -> decode the embedded page -> iframe.srcdoc. A game's HOME button posts {gh:'home'} to close it. In the normal flat folder GH_EMBED is undefined and cards are plain links.
if(window.GH_EMBED){document.getElementById('grid').addEventListener('click',e=>{const a=e.target.closest('a.card');if(!a)return;const b=GH_EMBED[a.getAttribute('href')];if(!b)return;e.preventDefault();
  const f=$('#frame'),u8=Uint8Array.from(atob(b),c=>c.charCodeAt(0));f.querySelector('iframe').srcdoc=new TextDecoder().decode(u8);f.classList.remove('hide')});
 const closeFrame=()=>{const f=$('#frame');f.classList.add('hide');f.querySelector('iframe').srcdoc='';render()};
 addEventListener('message',e=>{if(e.data&&e.data.gh=='home')closeFrame()});$('#frame .xbtn').onclick=closeFrame}
