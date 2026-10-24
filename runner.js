// ===== DATA. WHY: one table = add an animal in one line. FLIP: emoji art usually faces LEFT, so we mirror it to face the running direction (set FLIP=false if your device's emoji already faces right).
const FLIP=true;
const A=[{n:'Tiger',e:'🐅',jv:-13,sp:1.1,cost:0},{n:'Lion',e:'🦁',jv:-13,sp:1,cost:50},{n:'Elephant',e:'🐘',jv:-12,sp:.9,cost:100},{n:'Cheetah',e:'🐆',jv:-15,sp:1.25,cost:150},{n:'Crocodile',e:'🐊',jv:-12,sp:1,cost:200}];
const BIOMES=[['Jungle','#3fbf4f'],['Savanna','#e0b050'],['Desert','#f0a050'],['Swamp','#8fbf3f'],['Snow','#8fd0ff']]; // accent colour per biome (ground line + HUD)
// ===== SAVE. HOW: localStorage JSON. IMPROVE: route via Store.backend for cloud sync.
const S=Object.assign({coins:0,best:0,own:[0],sel:0,snd:true,light:false},JSON.parse(localStorage.getItem('wr')||'{}'));const save=()=>localStorage.setItem('wr',JSON.stringify(S));
let DF=Store.diff();function cycleDiff(){const ks=Object.keys(Store.DIFFS);Store.setDiff(ks[(ks.indexOf(Store.diffKey())+1)%ks.length]);DF=Store.diff()}
const c=document.getElementById('c'),x=c.getContext('2d'),ui=document.getElementById('ui'),G=250;
let tier=0,banner=0,st='menu',back=null,p,obs,items,spd,dist,got,power,cool,f=0,sh=false,flash=0,acc=0,lastT=0;
// Stars: parallax dots (black sky + white stars, or white sky + black dots in light mode).
const stars=[...Array(70)].map(()=>({x:Math.random()*800,y:Math.random()*230,r:Math.random()*2+1,p:Math.random()*.3+.05}));
// ===== SOUND (WebAudio beeps; respects the Sound setting). IMPROVE: real samples + music.
const AC=new (window.AudioContext||window.webkitAudioContext)();const beep=(fr,d=.08)=>{if(!S.snd)return;try{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=fr;g.gain.value=.05;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}};
// ===== WINDOWS. panel(html, backFn): Esc runs backFn; Enter/Space click the green .pri button.
function panel(h,b){back=b||null;ui.innerHTML=h;ui.style.display='flex'}
function menu(msg=''){st='menu';panel(`<b>Coins ${S.coins} · Best ${S.best}</b>${msg}<div>`+A.map((a,i)=>`<button onclick="pick(${i})" style="${S.sel==i?'outline:3px solid #fc0':''}">${a.e} ${a.n} ${S.own.includes(i)?'':'🔒'+a.cost}</button>`).join('')+`</div><button class="pri" onclick="start()">▶ Play (Enter)</button><button onclick="cycleDiff();menu()">Difficulty: ${DF.n}</button><button onclick="settings(menu)">⚙ Settings</button><small>Space/↑/tap jump · ↓/swipe duck · E smash · Esc pause</small>`)}
function pick(i){if(S.own.includes(i))S.sel=i;else if(S.coins>=A[i].cost){S.coins-=A[i].cost;S.own.push(i);S.sel=i}save();menu()}
function settings(ret){panel(`<h2>⚙ Settings</h2><button onclick="S.snd=!S.snd;save();settings(${ret.name})">Sound: ${S.snd?'ON':'OFF'}</button><button onclick="S.light=!S.light;save();settings(${ret.name})">Background: ${S.light?'White + black dots':'Black + white stars'}</button><button onclick="cycleDiff();settings(${ret.name})">Difficulty: ${DF.n}</button><button class="pri" onclick="${ret.name}()">Back (Esc)</button>`,ret)}
function pauseMenu(){st='pause';panel(`<h2>⏸ Paused</h2><button class="pri" onclick="resume()">Resume (Esc / Enter)</button><button onclick="settings(pauseMenu)">⚙ Settings</button><button onclick="start()">Restart</button><button onclick="menu()">Main Menu</button>`,resume)}
function resume(){st='play';ui.style.display='none'}
function start(){DF=Store.diff();p={y:G,v:0,d:false};obs=[];items=[];spd=5*DF.spd;dist=0;got=0;power=0;cool=0;sh=false;tier=0;banner=0;st='play';ui.style.display='none'}
// ===== INPUT. Enter/Space = confirm in windows; Esc = back/pause/resume.
const jump=()=>{if(st=='play'&&p.y>=G){p.v=A[S.sel].jv;beep(500)}},duck=v=>{if(st=='play')p.d=v},smash=()=>{if(st=='play'&&!cool){power=90;cool=400;beep(150,.3)}};
const confirmKey=()=>{const b=ui.style.display!='none'&&ui.querySelector('.pri');if(b){b.click();return true}};
addEventListener('keydown',e=>{if(e.code=='Enter'){confirmKey();e.preventDefault()}
 if(e.code=='Space'||e.code=='ArrowUp'){if(!confirmKey())jump();e.preventDefault()}
 if(e.code=='ArrowDown'){duck(true);e.preventDefault()}if(e.code=='KeyE')smash();
 if(e.code=='Escape'||e.code=='KeyP'){if(ui.style.display!='none'&&back)back();else if(st=='play')pauseMenu()}});
addEventListener('keyup',e=>{if(e.code=='ArrowDown')duck(false)});
let ty;c.addEventListener('touchstart',e=>{e.preventDefault();ty=e.touches[0].clientY;e.touches.length>1?smash():jump()});c.addEventListener('touchmove',e=>{if(e.touches[0].clientY-ty>30)duck(true)});c.addEventListener('touchend',()=>duck(false));
// ===== SPAWN. Fair: min gap grows with speed. Birds fly high enough to duck under. 6% of coin drops are shields.
function spawn(){const l=obs[obs.length-1];if(l&&800-l.x<(260+spd*14)*DF.gap)return;if(Math.random()>.03*DF.spawn)return;const t=Math.random();
 obs.push(t>.88&&tier>=1?{x:820,w:34,h:34,y:G-34,k:'boulder',ex:2.5}:t<.4?{x:820,w:30,h:30,y:G-30,k:'rock'}:t<.7?{x:820,w:22,h:45,y:G-45,k:'bush'}:{x:820,w:36,h:20,y:G-62,k:'bird'});
 if(Math.random()<.5)items.push({x:930,y:G-70-Math.random()*40,k:Math.random()<.06?'🛡️':'🪙'})}
// ===== UPDATE (fixed 60Hz). Shield absorbs 1 hit; Smash destroys obstacles; milestone every 100 like the Dino game.
function update(){f++;const a=A[S.sel],pd=Math.floor(dist/100);spd=Math.min(spd+.002*DF.spd,18*DF.spd);const tr=Math.floor(dist/1000);if(tr>tier){tier=tr;spd+=.9*DF.spd;banner=120;beep(300,.2);setTimeout(()=>beep(600,.3),150)}dist+=spd*a.sp/10;if(Math.floor(dist/100)>pd){flash=30;beep(1000,.1)}if(flash)flash--;
 p.v+=.7;p.y=Math.min(G,p.y+p.v);if(p.y>=G)p.v=0;if(power)power--;if(cool)cool--;spawn();
 const h=p.d&&p.y>=G?22:42,b={x:84,y:p.y-h,w:34,h};obs.forEach(o=>o.x-=spd*a.sp+(o.ex||0));items.forEach(q=>q.x-=spd*a.sp);obs=obs.filter(o=>o.x>-60);
 for(const o of obs)if(b.x<o.x+o.w&&b.x+b.w>o.x&&b.y<o.y+o.h&&b.y+b.h>o.y){if(power){o.x=-99;beep(100)}else if(sh){sh=false;o.x=-99;beep(200,.2)}else return over()}
 items=items.filter(q=>{if(Math.abs(q.x-100)<26&&Math.abs(q.y-(p.y-20))<32){q.k=='🪙'?got++:sh=true;beep(900,.05);return false}return q.x>-20})}
function over(){const sc=Math.floor(dist);S.coins+=got;S.best=Math.max(S.best,sc);save();Store.saveScore('runner',sc);beep(80,.5);st='over';
 panel(`<h2>💥 Game Over</h2><p>Score ${sc} · +${got} coins · Best ${S.best}</p><button class="pri" onclick="start()">Play Again (Enter)</button><button onclick="menu()">Main Menu</button>`,menu)}
// ===== DRAW. Black sky + white twinkling stars (or white + black dots). Animal is mirrored (FLIP) so it faces right.
function draw(){const L=S.light,bg=L?'#fff':'#000',fg=L?'#000':'#fff',bi=BIOMES[Math.floor(dist/300)%5];x.fillStyle=bg;x.fillRect(0,0,800,300);
 x.fillStyle=fg;stars.forEach((s,i)=>{x.globalAlpha=.35+.65*Math.abs(Math.sin(f/45+i));x.fillRect(((s.x-f*(st=='play'?spd:1)*s.p)%800+800)%800,s.y,s.r,s.r)});x.globalAlpha=1;
 x.fillStyle=bi[1];x.fillRect(0,G,800,2);x.fillStyle=fg;x.globalAlpha=.5;for(let i=0;i<9;i++)x.fillRect(((i*97-f*(spd||5))%800+800)%800,G+10+i%3*10,12+i%4*8,2);x.globalAlpha=1;
 x.font='30px serif';obs.forEach(o=>x.fillText(o.k=='rock'?'🪨':o.k=='bush'?'🌵':o.k=='boulder'?'🌑':(f>>3&1?'🦅':'🕊️'),o.x,o.y+o.h));items.forEach(q=>x.fillText(q.k,q.x,q.y));
 if(p){x.save();if(power)x.shadowColor='#fc0',x.shadowBlur=25;if(sh)x.shadowColor='#4cf',x.shadowBlur=20;const sz=44;x.font=sz+'px serif';x.translate(FLIP?70+sz:70,p.y+(p.y>=G?Math.sin(f/3)*2:0));if(FLIP)x.scale(-1,1);if(p.d&&p.y>=G)x.scale(1,.6);x.fillText(A[S.sel].e,0,0);x.restore()}
 if(banner>0){banner--;x.fillStyle=fg;x.textAlign='center';x.font='bold 28px monospace';x.fillText('SPEED UP!  LEVEL '+(tier+1),400,110);x.textAlign='left'}
 x.fillStyle=fg;x.font='bold 16px monospace';const sc=String(Math.floor(dist)).padStart(5,'0');x.textAlign='right';if(!flash||f>>2&1)x.fillText(`HI ${String(S.best).padStart(5,'0')}   ${sc}`,790,22);x.textAlign='left';
 x.fillStyle=bi[1];x.fillText(`${bi[0]} ${DF.n} Lv${tier+1}  🪙${got} ${sh?'🛡️':''} ⚡${cool?Math.ceil(cool/60)+'s':'ready'}`,10,22)}
// ===== LOOP: accumulator keeps speed identical on 60Hz and 144Hz screens.
function frame(t){acc+=Math.min(100,t-lastT);lastT=t;while(acc>=16.67){if(st=='play')update();else f++;acc-=16.67}draw();requestAnimationFrame(frame)}
spd=5;dist=0;obs=[];items=[];got=0;menu();requestAnimationFrame(frame);
// ===== TOUCH PAD + MOUSE. WHY pointer events: same handler for finger/mouse/pen. Buttons mirror the keyboard (jump/duck/smash/pause).
const $=id=>document.getElementById(id);$('rj').onpointerdown=e=>{e.preventDefault();confirmKey()||jump()};
$('rd').onpointerdown=e=>{e.preventDefault();duck(true)};$('rd').onpointerup=$('rd').onpointerleave=$('rd').onpointercancel=()=>duck(false);
$('re').onpointerdown=e=>{e.preventDefault();smash()};$('rp').onpointerdown=e=>{e.preventDefault();st=='play'?pauseMenu():0};c.onmousedown=()=>{if(!confirmKey())jump()};
