// ===== CONFIG + SAVE. WHY: all tuning in one place. HOW: localStorage 'bn'. IMPROVE: route via Store.backend (cloud).
const W=640,H=360,COLS={Violet:'#8f00ff',Indigo:'#4b0082',Blue:'#1e40ff',Green:'#00b000',Yellow:'#ffe600',Orange:'#ff8000',Red:'#ff0000'};
const SEG_PER_MIN=20; // design target: ~20 segments per minute of play. Level n has n*15 min => n*300 segments (L1 15min ... L11 165min)
const P=Object.assign({color:'Red',unlocked:1,lvl:1,lives:5,glow:true,snd:true,timer:true,score:0,hpMode:false,chain:false},JSON.parse(localStorage.getItem('bn')||'{}'));const sv=()=>localStorage.setItem('bn',JSON.stringify(P));
// ===== TRAP-LAB MERGE: the game and the Trap Lab share ONE wallet + unlock list in localStorage 'traplab.v1'.
// WHY: coins you earn in the campaign are spent in the Hazard Shop (here or inside the Lab); unlocked packs change the real levels. HOW: tiny read/modify/write helpers.
// IMPROVE: sync the wallet to the cloud through Store.backend.
const LITE=!!(window.GH&&GH.LITE);   // weak/keypad devices: no glow or texture effects
function TL(){try{var r=JSON.parse(localStorage.getItem('traplab.v1')||'{}');return r&&typeof r=='object'?r:{}}catch(e){return{}}}
function TLsave(o){try{localStorage.setItem('traplab.v1',JSON.stringify(o))}catch(e){}}
function wallet(){var t=TL();return typeof t.coins=='number'?t.coins:1500}
function walletAdd(n){var t=TL();t.coins=wallet()+n;TLsave(t)}
function packOn(id){var t=TL();return !!(t.unlocked&&t.unlocked[id]&&t.deployed&&t.deployed[id])}
let PK={};function refreshPacks(){PK={pspike:packOn('pspike'),acid:packOn('acid'),ring:packOn('ring')}}
const PACKS=[{id:'pspike',n:'Pixel Spikes',c:200,d:'Chunky 8-bit spike skin'},{id:'acid',n:'Acid Pools',c:500,d:'Adds deadly acid pools to the levels'},{id:'ring',n:'Electric Ring Blocks',c:800,d:'Adds drifting electric rings (level 5+)'}];
let labOpen=false,flashT=0;
const c=document.getElementById('c'),x=c.getContext('2d'),ov=document.getElementById('ov'),K={};
let L,B,cp,inv,dead,state='menu',cam=0,pulse=0,acc=0,last=0,back=null,ft=0,rings=0,keys=0,msg=0,mT=0;
const AC=new (window.AudioContext||window.webkitAudioContext)();const beep=(f,d=.07)=>{if(!P.snd)return;try{const o=AC.createOscillator(),g=AC.createGain();o.type='square';o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}};
// ===== LAZY LEVEL GENERATOR. WHY lazy: a 165-minute level is ~3300 segments; we only build ~900px ahead and delete what is far behind, so memory/CPU stay tiny.
// HOW: each segment = ground piece + one trap chosen by weighted roll; difficulty d rises with level AND with progress inside the level. Every 8th segment = safe checkpoint.
// FAIRNESS: gaps <=122px (jump covers ~135), spikes <=72px wide, traps never share a segment, rest segments are hazard-free.
// IMPROVE: hand-made set pieces, slopes, boss rooms, more trap types, seeded daily levels.
const rnd=o=>(o.r=(o.r*1103515245+12345)&0x7fffffff)/0x7fffffff;
function Lvl(n){return{n,segs:n*15*SEG_PER_MIN,k:0,cx:0,r:n*977+13,S:[],M:[],SP:[],SPR:[],FL:[],TU:[],PR:[],HZ:[],FS:[],DR:[],SW:[],CP:[],CN:[],WL:[],MON:[],KY:[],AC:[],MUD:[],CE:[],MS:[],LS:[],FB:[],ER:[],GZ:[],ks:[1,2,3,4,5].map(i=>Math.round(n*15*SEG_PER_MIN*i/6)),exit:null,sw:null}}
// gen(): builds ONE segment. WHY: lazy + seeded = endless variety, tiny memory. HOW: key chamber if this index is a key slot, else checkpoint every 8th, else one trap chosen by a weighted roll (t) gated by level n.
// Traps: spikes, flame jets, turrets, falling spikes, sliding spikes, pixel monsters (walker/bat), moving walls, floating walls, bounce pads (+coin arcs). IMPROVE: add set-pieces, bosses, slopes, trap combos at high levels.
function gen(o){const n=o.n,k=o.k,R=()=>rnd(o),d=(n*.7+3*k/o.segs)*Store.diff().spawn,gap=Math.min(55+d*7,122)|0,cx=o.cx,last=k==o.segs-1,ki=o.ks.indexOf(k),pw=ki%2?190:150,len=ki>=0?220+pw:k==0?240:last?320:230+(R()*90|0),mid=cx+len/2;
 if(ki<0)o.S.push({x:cx,y:300,w:len,h:60});if(last){o.exit={x:cx+len-60,y:260,w:22,h:40};o.k++;return}
 if(ki>=0){ // KEY CHAMBER: ground | pit | ground. Bounce pad launches you (-14 vy ~ 196px) onto a tiny high platform over the pit; key sits on it. Higher platform + guards at higher levels = hardest spot.
  const py=ki%2?118:140;o.S.push({x:cx,y:300,w:110,h:60},{x:cx+110+pw,y:300,w:110,h:60},{x:cx+180,y:py,w:44,h:10});o.SPR.push({x:cx+76,y:292,w:30,h:8});o.KY.push({x:cx+202,y:py-16,got:0});
  if(n>=3)o.MON.push({x:0,ax:cx+110+pw+55,y:276,y0:276,w:20,h:24,t:R()*6,amp:40});if(n>=6)o.MON.push({x:0,ax:cx+202,y:py-70,y0:py-70,w:20,h:24,t:R()*6,amp:30,fly:1})}
 else if(k%8==7)o.CP.push({x:cx+30,y:270,w:14,h:30});
 else if(k>1){const t=R(),mon=f=>({x:0,ax:mid,y:f?210:276,y0:f?210:276,w:20,h:24,t:R()*6,amp:f?70:60,fly:f});
  if(k%12==3&&n>=2){o.sw={x:mid,y:292,w:20,h:8,door:null};o.SW.push(o.sw)}
  else if(k%12==5&&n>=2&&o.sw&&!o.sw.door){const dr={x:mid,y:160,w:12,h:140,open:false};o.DR.push(dr);o.sw.door=dr}
  else if(t<.14){const w=24*(1+(d>3)+(d>6)),v=R();if(v<.3&&n>=2)o.SP.push({x:mid-w/2,y:284,w,h:16,pop:1,ph:R()*110|0});else if(v<.55&&PK.acid)o.AC.push({x:mid-(w+40)/2,y:292,w:w+40+(R()*30|0),h:8});else o.SP.push({x:mid-w/2,y:284,w,h:16});if(P.chain&&n>=2)o.SP.push({x:mid-w/2-85,y:284,w,h:16})} // classic spikes (CHAINED mode adds a 2nd group = two quick jumps) | POPPING THORNS (rhythm) | ACID POOL (deadly floor, jump it)
  else if(t<.24&&n>=2&&R()<.35)o.LS.push({x:mid-75,w:150,y0:235,amp:48,t:R()*6});   // MOVING LASER BEAM sweeping up/down: slip under when it is high, hop it when low
  else if(t<.24&&n>=3&&R()<.4)o.CE.push({x:mid,w:30,t:R()*6,h:260});   // CEILING CRUSHER: spiked bar whose tip moves up/down - time your pass
  else if(t<.24&&n>=2)o.FL.push({x:mid,y:230,w:16,h:70,per:Math.max(90,150-d*8)|0,ph:R()*150|0});
  else if(t<.32&&n>=3){const tu={x:cx+len-26,y:270,w:20,h:30,t:R()*60|0,per:Math.max(60,115-d*5)|0};o.TU.push(tu);o.S.push(tu)}
  else if(t<.40&&n>=3)o.FS.push({x:mid,y:70,y0:70,w:16,h:24,st:0,vy:0});
  else if(t<.48&&n>=4){const v=R();if(v<.35)o.FB.push({x:mid,y:238,len:62,a:R()*6});else if(v<.6&&PK.ring)o.ER.push({x:mid,t:R()*6,y:235,r:22});else o.HZ.push({x:mid,y:284,w:20,h:16,ax:mid,amp:45,t:R()*6})}   // ROTATING FIRE-BAR | ELECTRIC RING (pack) | sliding spikes
  else if(t<.58)o.MON.push(mon(0));                                   // pixel walker: stomp it (+50) or dodge
  else if(t<.64&&n>=3)o.MON.push(mon(1));                              // pixel bat: flies back and forth
  else if(t<.70&&n>=3)o.WL.push({x:mid,ax:mid,y:220,w:16,h:80,t:R()*6,amp:55}); // moving wall: slides across the path, jump it
  else if(t<.76&&n>=2)o.S.push({x:mid-45,y:220,w:90,h:50});             // floating wall: roll under it or hop on top
  else if(t<.82&&n>=5){o.SP.push({x:mid-40,y:284,w:110,h:16});o.SPR.push({x:mid-90,y:292,w:30,h:8})}
  else if(t<.90&&n>=3&&R()<.35)o.GZ.push({x:mid-70,w:140});   // ANTI-GRAVITY ZONE: you float up into ceiling spikes - press DOWN / move on!
  else if(t<.90&&n>=2){o.SPR.push({x:mid-15,y:292,w:30,h:8});for(let i=0;i<5;i++)o.CN.push({x:mid-40+i*20,y:225-Math.min(n,9)*4-Math.sin(i/4*Math.PI)*50,got:0})} // bounce pad + high coin arc (higher at higher levels)
  else{if(R()<.5)o.MUD.push({x:mid-60,y:290,w:120,h:10});for(let i=0;i<3;i++)o.CN.push({x:mid-20+i*20,y:262,got:0})}}   // coin row, sometimes inside STICKY MUD (-60% speed)
 if(k%2==1&&n>=2)o.M.push({x:cx+len+gap/2-25,y0:250,y:250,amp:30,w:50,h:10,t:R()*6});else if(gap>85)o.S.push({x:cx+len+gap/2-25,y:250,w:50,h:10});
 o.cx+=len+gap;o.k++}
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,box=()=>({x:B.x-10,y:B.y-10,w:20,h:20}),fmt=f=>{const s=f/60|0;return(s/60|0)+':'+String(s%60).padStart(2,'0')};
const flameOn=f=>(pulse+f.ph)%f.per<70;
const popK=s=>{const t=(pulse+s.ph)%110;return t<20?t/20:t<55?1:t<70?(70-t)/15:0};   // thorn pop animation 0..1
function load(n){refreshPacks();L=Lvl(n);P.lvl=n;sv();cp=null;ft=0;rings=0;keys=0;mT=0;spawn();while(L.k<12)gen(L);state='play';ov.style.display='none'}
function spawn(){B={x:cp?cp.x:40,y:cp?cp.y-10:280,vx:0,vy:0,on:null,hp:100};inv=90;dead=0;if(L){L.PR=[];L.MS=[]}}
// One life per death event: `dead` blocks further damage until respawn. Invulnerable after respawn (except pits).
function die(){if(dead||inv>0&&B.y<H+40)return;if(P.hpMode&&B.y<H+40){B.hp-=Math.round(25*Store.diff().dmg);inv=60;flashT=18;beep(150,.15);if(B.hp>0)return}   // HEALTH mode: hits drain HP, a life is lost at 0 (pits always cost a life)
 dead=45;P.lives--;beep(110,.3);sv();if(P.lives<=0)setTimeout(gameOver,600)}
// ===== PHYSICS (fixed 60Hz). AABB: move X & resolve, move Y & resolve, bounce on hard landings. IMPROVE: swept collision, slopes, coyote time.
function step(){pulse++;if(msg)msg--;ft++;while(L.k<L.segs&&L.cx<B.x+900)gen(L);
 if(pulse%120==0)for(const a of['S','M','SP','SPR','FL','TU','HZ','FS','DR','SW','CP','CN','WL','MON','KY','AC','MUD','CE','LS','FB','ER','GZ'])L[a]=L[a].filter(s=>s.x+s.w>B.x-5000);
 L.M.forEach(m=>{const py=m.y;m.t+=.03;m.y=m.y0+Math.sin(m.t)*m.amp;if(B.on===m)B.y+=m.y-py});L.HZ.forEach(h=>{h.t+=.04;h.x=h.ax+Math.sin(h.t)*h.amp});L.CE.forEach(c=>{c.t+=.05*Store.diff().spd;c.h=260+Math.sin(c.t)*30});L.LS.forEach(l=>{l.t+=.045*Store.diff().spd;l.y=l.y0+Math.sin(l.t)*l.amp});L.FB.forEach(f=>{f.a+=.045*Store.diff().spd});L.ER.forEach(e=>{e.t+=.04;e.y=235+Math.sin(e.t)*62});
 // HOMING MISSILES (Hard/Nightmare, level 2+): spawn ahead, steer toward the ball's height with a limited turn rate - jump or change height at the last moment.
 const DF=Store.diff();if(DF.missile&&!dead&&P.lvl>=2&&++mT>=DF.missile){mT=0;L.MS.push({x:B.x+380,y:B.y-30-Math.random()*40,vx:-2.2,vy:0,w:16,h:8,life:420});beep(200,.05)}
 for(const m of L.MS){m.life--;m.vy=Math.max(-1.8,Math.min(1.8,m.vy+Math.max(-.06,Math.min(.06,(B.y-m.y)*.01))));m.x+=m.vx*DF.spd;m.y+=m.vy}L.MS=L.MS.filter(m=>m.life>0&&m.x>B.x-200);
L.WL.forEach(w=>{w.t+=.03;w.x=w.ax+Math.sin(w.t)*w.amp});L.MON.forEach(m=>{m.t+=.05;m.x=m.ax+Math.sin(m.t)*m.amp;if(m.fly)m.y=m.y0+Math.sin(m.t*1.7)*34});
 L.FS.forEach(s=>{if(!s.st&&Math.abs(B.x-s.x)<50)s.st=1;if(s.st==1){s.vy+=.6;s.y+=s.vy;if(s.y>300)s.st=2}});
 L.TU.forEach(t=>{if(B.x<t.x&&t.x-B.x<420&&++t.t%t.per==0){L.PR.push({x:t.x-14,y:283,w:14,h:8});beep(240,.05)}});L.PR.forEach(p=>p.x-=3.2);L.PR=L.PR.filter(p=>p.x>B.x-500);
 if(inv>0)inv--;if(flashT>0)flashT--;if(dead){if(--dead==0&&P.lives>0)spawn();return}
 B.vx+=((K.r?1:0)-(K.l?1:0))*.5;B.vx*=.88;B.mud=L.MUD.some(m=>hit(box(),m));const cap=B.mud?1.36:3.4;B.vx=Math.max(-cap,Math.min(cap,B.vx));B.x+=B.vx;
 const sol=[...L.S,...L.M,...L.WL,...L.DR.filter(d=>!d.open)];for(const s of sol)if(hit(box(),s)){B.x=B.vx>0?s.x-10:s.x+s.w+10;B.vx=0}
 B.grav=L.GZ.some(z=>B.x>z.x&&B.x<z.x+z.w);B.vy+=(B.grav?-.3:.5);if(K.d)B.vy+=.7;B.y+=B.vy;if(B.y<12){B.y=12;B.vy=Math.max(0,B.vy)}B.on=null;let gr=false;   // anti-gravity zones flip gravity; DOWN = fast-fall
 for(const s of sol)if(hit(box(),s)){if(B.vy>0){B.y=s.y-10;if(B.vy>6){B.vy*=-.4;beep(300,.05)}else B.vy=0;gr=true;B.on=L.M.includes(s)?s:null}else{B.y=s.y+s.h+10;B.vy=0}}
 if(K.j&&gr&&B.vy>=0){B.vy=-10;beep(520)}B.x=Math.max(10,B.x);
 for(const s of L.SPR)if(hit(box(),s)&&B.vy>0){B.vy=-14;beep(700,.1)}
 for(const s of L.SW)if(s.door&&!s.door.open&&hit(box(),s)){s.door.open=true;beep(880,.15)}
 for(const q of L.CP)if(hit(box(),q)&&cp!==q){cp=q;beep(660,.12)}
 for(const r of L.CN)if(!r.got&&hit(box(),{x:r.x-10,y:r.y-10,w:20,h:20})){r.got=1;rings++;P.score+=10;beep(980,.05)}
 // Monsters: landing on top (falling, centre above its top) kills it; any other touch = death. Keys: collect all 5 to open the exit.
 for(const m of L.MON)if(!m.dead&&hit(box(),m)){if(B.vy>1&&B.y<m.y+4){m.dead=1;B.vy=-9;P.score+=50;beep(420,.1)}else die()}
 for(const q of L.KY)if(!q.got&&hit(box(),{x:q.x-10,y:q.y-10,w:20,h:20})){q.got=1;keys++;P.score+=100;beep(1200,.2)}
 for(const h of[...L.SP.filter(s=>!s.pop||popK(s)>.6),...L.AC,...L.HZ,...L.MS,...L.CE.map(c=>({x:c.x,y:0,w:c.w,h:c.h})),...L.PR,...L.FS.filter(s=>s.st==1),...L.FL.filter(flameOn)])if(hit(box(),h))die();
 for(const l of L.LS)if(B.x+10>l.x&&B.x-10<l.x+l.w&&Math.abs(B.y-l.y)<13)die();
 for(const f of L.FB){const ex=f.x+Math.cos(f.a)*f.len,ey=f.y+Math.sin(f.a)*f.len,vx=ex-f.x,vy=ey-f.y,t=Math.max(0,Math.min(1,((B.x-f.x)*vx+(B.y-f.y)*vy)/(vx*vx+vy*vy)));if(Math.hypot(B.x-(f.x+vx*t),B.y-(f.y+vy*t))<14)die()}
 for(const e of L.ER)if(Math.hypot(B.x-e.x,B.y-e.y)<32)die();
 for(const z of L.GZ)if(hit(box(),{x:z.x,y:0,w:z.w,h:30}))die();
 if(B.y>H+40)die();if(L.exit&&hit(box(),L.exit)){if(keys>=5)complete();else msg=90}cam=Math.max(0,B.x-W/2)}
// ===== FLOW. Level complete unlocks next; level 11 -> victory. Hub score = levels cleared*100 + lives*10.
function complete(){state='done';const n=P.lvl;P.unlocked=Math.max(P.unlocked,Math.min(11,n+1));sv();beep(880,.3);walletAdd(rings*10+50);
 if(n==11){Store.saveScore('bounce',P.score+P.lives*50);P.lvl=1;P.lives=Store.diff().lives;sv();show(`<h1 style="color:${COLS[P.color]}">★ CAMPAIGN COMPLETED ★</h1><p>Final score ${P.score} · last level time ${fmt(ft)}</p><button class="pri" onclick="newGame()">Replay (Enter)</button><button onclick="menu()">Main Menu</button>`)}
 else show(`<h2>LEVEL ${n} COMPLETE</h2><p>Time ${fmt(ft)} · Coins ${rings} · Keys 5/5 · Score ${P.score} · +${rings*10+50} trap-coins · Lives ${P.lives}</p><p>Next: Level ${n+1}</p><button class="pri" onclick="load(${n+1})">Continue (Enter)</button>`)}
function gameOver(){state='over';walletAdd(rings*10);Store.saveScore('bounce',P.score);const l=P.lvl;P.lvl=1;P.lives=Store.diff().lives;sv();show(`<h2>GAME OVER</h2><p>Reached level ${l}/11</p><button class="pri" onclick="newGame()">Restart Game (Enter)</button><button onclick="menu()">Main Menu</button>`)}
function cycleDiff(){const ks=Object.keys(Store.DIFFS);Store.setDiff(ks[(ks.indexOf(Store.diffKey())+1)%ks.length])}
function newGame(from=1){P.lives=Store.diff().lives;P.score=0;load(from)}
// ===== WINDOWS. show(html, backFn): Esc runs backFn; Enter clicks the .pri button.
function show(h,b){back=b||null;ov.innerHTML=h;ov.style.display='flex'}
function menu(){state='menu';show(`<h1>CLASSIC BOUNCE</h1><small>TRAP LAB EDITION · wallet 🪙${wallet()}</small><svg width="30" height="30"><circle cx="15" cy="15" r="12" fill="${COLS[P.color]}" stroke="#fff" stroke-width="2"/></svg>${P.lvl>1||P.lives<Store.diff().lives?`<button class="pri" onclick="load(P.lvl)">Continue (L${P.lvl}, ${P.lives}♥)</button>`:''}<button class="${P.lvl>1||P.lives<5?'':'pri'}" onclick="newGame()">New Campaign</button><button onclick="levels()">Level Select</button><button onclick="shop()">🛒 Hazard Shop</button><button onclick="openLab()">🧪 Trap Lab (sandbox)</button><button onclick="colors()">Ball Color</button><button onclick="cycleDiff();menu()">Difficulty: ${Store.diff().n}</button><button onclick="settings(menu)">Settings</button><button onclick="help()">Instructions</button>`)}
function levels(){show('<h2>LEVELS</h2><div>'+[...Array(11)].map((_,i)=>`<button ${i<P.unlocked?`onclick="newGame(${i+1})"`:'disabled style="opacity:.3"'}>${i+1}<br><small>~${(i+1)*15}m</small></button>`).join('')+'</div><button class="pri" onclick="menu()">Back (Esc)</button>',menu)}
function colors(){show('<h2>BALL COLOR</h2><div>'+Object.entries(COLS).map(([n,v])=>`<button class="sw" title="${n}" style="background:${v};${P.color==n?'outline:3px solid #fff':''}" onclick="P.color='${n}';sv();colors()"></button>`).join('')+'</div><button class="pri" onclick="menu()">Back (Esc)</button>',menu)}
function settings(r){const t=(k,l)=>`<button onclick="P.${k}=!P.${k};sv();settings(${r.name})">${l}: ${P[k]?'ON':'OFF'}</button>`;show(`<h2>SETTINGS</h2>${t('snd','Sound')}${t('glow','Ball glow')}${t('timer','Timer')}${t('hpMode','Health points mode')}${t('chain','Chained combos')}<button onclick="cycleDiff();settings(${r.name})">Difficulty: ${Store.diff().n}</button><button class="pri" onclick="${r.name}()">Back (Esc)</button>`,r)}
function help(){show('<h2>HOW TO PLAY</h2><p>←/→ A/D roll · Space/↑/W jump · ↓/S fast-fall<br>Keypad phone: 4/6 move · 2 or 5 jump · 8 fall · soft-left = pause<br>Esc pause/back · Enter confirm · R restart level<br>Traps: spikes · popping thorns · acid · mud (-60% speed) · lasers · fire-bars · anti-gravity zones · crushers · flames · turrets · homing missiles<br>Falling spikes: keep moving! · Checkpoints every 8 segments<br>Collect 5 keys + coins, stomp monsters, then reach the exit<br>Level n takes ~n×15 min if you never die (no time limit) · 5 lives</p><button class="pri" onclick="menu()">Back (Esc)</button>',menu)}
function shop(){const t=TL();show('<h2>HAZARD SHOP</h2><p>Wallet: 🪙 '+wallet()+'</p>'+PACKS.map(p=>{const own=t.unlocked&&t.unlocked[p.id],on=packOn(p.id);return '<div style="margin:4px 0"><b>'+p.n+'</b><br><small>'+p.d+'</small><br><button '+(own?'onclick="togglePack(\''+p.id+'\')"':'onclick="buyPack(\''+p.id+'\')"')+'>'+(own?(on?'✔ ON (click to turn off)':'OFF (click to turn on)'):'UNLOCK '+p.c+' 🪙')+'</button></div>'}).join('')+'<small>Earn coins in the campaign. Unlocked packs also work in the Trap Lab.</small><button class="pri" onclick="menu()">Back (Esc)</button>',menu)}
function buyPack(id){const p=PACKS.filter(x=>x.id==id)[0],t=TL();if(wallet()<p.c){beep(120,.25);return shop()}t.coins=wallet()-p.c;t.unlocked=t.unlocked||{};t.deployed=t.deployed||{};t.unlocked[id]=1;t.deployed[id]=1;TLsave(t);refreshPacks();beep(900,.15);shop()}
function togglePack(id){const t=TL();t.deployed=t.deployed||{};t.deployed[id]=!t.deployed[id];TLsave(t);refreshPacks();shop()}
// TRAP LAB overlay: the full Trap Lab (dashboard, bot playground, shop, generator, studio) opens INSIDE this game. Flat folder: loads trap-lab.html; single-file build: decodes GH_LAB_B64.
function openLab(){labOpen=true;let d=document.getElementById('lab');if(!d){d=document.createElement('div');d.id='lab';d.innerHTML='<iframe id="labf" title="Trap Lab"></iframe><button id="labx">✕ CLOSE LAB</button>';document.body.appendChild(d);document.getElementById('labx').onclick=closeLab}
 const f=document.getElementById('labf');f.removeAttribute('srcdoc');if(window.GH_LAB_B64)f.srcdoc=GH.b64(window.GH_LAB_B64);else f.src='trap-lab.html';d.style.display='block'}
function closeLab(){labOpen=false;const d=document.getElementById('lab');if(d){d.style.display='none';const f=document.getElementById('labf');f.removeAttribute('srcdoc');f.src='about:blank'}try{window.focus()}catch(e){}refreshPacks();menu()}
window.addEventListener('message',e=>{if(e.data&&e.data.gh=='home'&&labOpen)closeLab()});
function pauseMenu(){state='pause';show('<h2>PAUSED</h2><button class="pri" onclick="resume()">Resume (Esc / Enter)</button><button onclick="settings(pauseMenu)">Settings</button><button onclick="load(P.lvl)">Restart Level</button><button onclick="newGame()">Restart Game</button><button onclick="menu()">Main Menu</button>',resume)}
function resume(){state='play';ov.style.display='none'}
// ===== INPUT. Keyboard + touch feed the same K flags.
const km={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',ArrowUp:'j',KeyW:'j',Space:'j',ArrowDown:'d',KeyS:'d'};
addEventListener('keydown',e=>{if(e.code=='Enter'){const fb=document.activeElement,b=ov.style.display!='none'&&(fb&&fb.tagName=='BUTTON'&&ov.contains(fb)?fb:ov.querySelector('.pri'));if(b)b.click();e.preventDefault();return}
 if(km[e.code]){K[km[e.code]]=1;e.preventDefault()}
 if(e.code=='Escape'){if(ov.style.display!='none'){if(back)back()}else if(state=='play')pauseMenu()}
 if(e.code=='KeyR'&&state=='play'&&confirm('Restart level?'))load(P.lvl)});addEventListener('keyup',e=>{if(km[e.code])K[km[e.code]]=0});
[['bl','l'],['br','r'],['bj','j'],['bd','d']].forEach(([id,k])=>GH.hold(document.getElementById(id),()=>{K[k]=1},()=>{K[k]=0}));document.getElementById('bp').onclick=()=>state=='play'?pauseMenu():0;
// ===== DRAW. Black/white shapes only; just the ball is coloured. Off-screen objects are skipped. IMPROVE: sprites, particles, trail.
const vis=s=>s.x-cam<W+20&&s.x+(s.w||0)-cam>-20,rect=(s,fill)=>{if(!vis(s))return;x.fillStyle=fill||'#000';x.strokeStyle='#fff';x.lineWidth=2;x.fillRect(s.x-cam,s.y,s.w,s.h);x.strokeRect(s.x-cam,s.y,s.w,s.h);if(!fill&&s.h>=40&&!LITE){x.fillStyle='#ffffff14';for(let i=6;i<s.w;i+=12)x.fillRect(s.x-cam+i,s.y+5,2,s.h-10)}};
function tri(s,down){if(!vis(s))return;x.fillStyle='#fff';x.beginPath();for(let i=0;i<s.w;i+=10){const a=s.x-cam+i;if(down){x.moveTo(a,s.y);x.lineTo(a+5,s.y+s.h);x.lineTo(a+10,s.y)}else{x.moveTo(a,s.y+s.h);x.lineTo(a+5,s.y);x.lineTo(a+10,s.y+s.h)}}x.fill()}
function draw(){x.fillStyle='#000';x.fillRect(0,0,W,H);x.fillStyle='#222';for(let i=0;i<12;i++)x.fillRect(((i*64-cam*.3)%W+W)%W,0,1,H);
 [...L.S,...L.M,...L.WL].forEach(s=>rect(s));L.DR.forEach(d=>{if(!d.open)rect(d,'#fff');else if(vis(d)){x.setLineDash([4,4]);x.strokeRect(d.x-cam,d.y,d.w,d.h);x.setLineDash([])}});
 L.SW.forEach(s=>rect(s,s.door&&s.door.open?'#000':'#fff'));L.SPR.forEach(s=>rect(s,'#fff'));L.CP.forEach(q=>rect(q,cp===q?'#fff':'#000'));L.TU.forEach(t=>{if(vis(t)){x.fillStyle='#fff';x.fillRect(t.x-cam-6,t.y+8,8,6)}});
 L.SP.forEach(s=>{if(s.pop){const k=popK(s);if(k>0)tri({x:s.x,y:s.y+s.h*(1-k),w:s.w,h:s.h*k})}else if(PK.pspike)pxTri(s);else tri(s)});L.HZ.forEach(s=>tri(s));
L.GZ.forEach(z=>{if(!vis(z))return;x.fillStyle='#ffffff12';x.fillRect(z.x-cam,30,z.w,270);x.strokeStyle='#fff';x.setLineDash([3,4]);x.strokeRect(z.x-cam,30,z.w,270);x.setLineDash([]);x.fillStyle='#fff';x.font='14px monospace';for(let i=0;i<z.w;i+=34)x.fillText('↑',z.x-cam+i+8,280-((pulse*2+i*3)%240));tri({x:z.x,y:12,w:z.w,h:18},1)});   // anti-gravity zone + ceiling spikes
 L.LS.forEach(l=>{if(!vis({x:l.x,w:l.w}))return;x.fillStyle='#fff';x.fillRect(l.x-cam-5,l.y-9,6,18);x.fillRect(l.x-cam+l.w-1,l.y-9,6,18);x.save();if(!LITE){x.shadowColor='#fff';x.shadowBlur=10}x.fillRect(l.x-cam,l.y-1.5,l.w,3);x.restore();if(pulse%6<3)x.fillRect(l.x-cam+(pulse*7)%l.w,l.y-4,3,8)});   // moving laser beam
 L.FB.forEach(f=>{if(!vis({x:f.x-f.len,w:f.len*2}))return;x.strokeStyle='#fff';x.lineWidth=5;x.beginPath();x.moveTo(f.x-cam,f.y);x.lineTo(f.x-cam+Math.cos(f.a)*f.len,f.y+Math.sin(f.a)*f.len);x.stroke();x.fillStyle='#fff';x.beginPath();x.arc(f.x-cam,f.y,7,0,7);x.fill();x.beginPath();x.arc(f.x-cam+Math.cos(f.a)*f.len,f.y+Math.sin(f.a)*f.len,5,0,7);x.fill()});   // rotating fire-bar
 L.ER.forEach(e=>{if(!vis({x:e.x-24,w:48}))return;x.strokeStyle='#fff';x.lineWidth=3;x.setLineDash([6,5]);x.beginPath();x.arc(e.x-cam,e.y,e.r,pulse/8,pulse/8+6.28);x.stroke();x.setLineDash([]);x.fillRect(e.x-cam-2,e.y-2,4,4)});   // electric ring block
 L.AC.forEach(a=>{if(!vis(a))return;x.fillStyle='#fff';x.fillRect(a.x-cam,a.y,a.w,a.h);x.fillStyle='#000';for(let i=0;i<a.w;i+=9)x.fillRect(a.x-cam+i+2,a.y+2+Math.sin((pulse+i)/6)*2,3,3)});
 L.MUD.forEach(m=>{if(!vis(m))return;x.strokeStyle='#fff';x.setLineDash([3,3]);x.strokeRect(m.x-cam,m.y,m.w,m.h);x.setLineDash([]);x.fillStyle='#fff';for(let i=0;i<m.w;i+=7)x.fillRect(m.x-cam+i,m.y+3+(i*7%5),2,2)});
 L.CE.forEach(c=>{if(!vis(c))return;x.fillStyle='#000';x.strokeStyle='#fff';x.lineWidth=2;x.fillRect(c.x-cam,0,c.w,c.h);x.strokeRect(c.x-cam,0,c.w,c.h);tri({x:c.x,y:c.h-14,w:c.w,h:14},1)});
 L.MS.forEach(m=>{x.fillStyle='#fff';x.fillRect(m.x-cam,m.y,m.w,m.h);x.beginPath();x.moveTo(m.x-cam,m.y-2);x.lineTo(m.x-cam-8,m.y+4);x.lineTo(m.x-cam,m.y+10);x.fill();if(pulse%4<2)x.fillRect(m.x-cam+m.w,m.y+2,5,4)});L.FS.forEach(s=>{if(s.st<2){if(!s.st&&pulse%20<10)x.globalAlpha=.5;tri(s,1);x.globalAlpha=1}});L.PR.forEach(p=>{x.fillStyle='#fff';x.beginPath();x.moveTo(p.x-cam,p.y+4);x.lineTo(p.x-cam+14,p.y);x.lineTo(p.x-cam+14,p.y+8);x.fill()});
 L.FL.forEach(f=>{if(!vis(f))return;const on=flameOn(f);x.fillStyle='#fff';x.fillRect(f.x-cam-4,292,24,8);if(on){x.beginPath();x.moveTo(f.x-cam,300);x.quadraticCurveTo(f.x-cam+8-(pulse%6),250,f.x-cam+8,230);x.quadraticCurveTo(f.x-cam+16+(pulse%5),250,f.x-cam+16,300);x.fill()}else if((pulse+f.ph)%f.per>f.per-25&&pulse%6<3)x.fillRect(f.x-cam+4,284,8,8)});
 L.CN.forEach(r=>{if(!r.got&&vis({x:r.x,w:0})){x.fillStyle='#fff';x.beginPath();x.arc(r.x-cam,r.y,6,0,7);x.fill();x.fillStyle='#000';x.fillRect(r.x-cam-1,r.y-3,2,6)}});
 L.KY.forEach(q=>{if(!q.got&&vis({x:q.x,w:0})){const a=q.x-cam,b=q.y+Math.sin(pulse/10)*3;x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(a,b-4,5,0,7);x.stroke();x.fillStyle='#fff';x.fillRect(a-1,b,2,10);x.fillRect(a,b+6,5,2);x.fillRect(a,b+9,4,2)}});
 L.MON.forEach(m=>{if(m.dead||!vis(m))return;const a=m.x-cam,f=pulse>>3&1;x.fillStyle='#fff';x.fillRect(a+2,m.y+2,16,12);x.fillRect(a,m.y+7,20,8);x.fillRect(a+(f?2:6),m.y+15,4,9);x.fillRect(a+(f?14:10),m.y+15,4,9);x.fillStyle='#000';x.fillRect(a+5,m.y+7,3,3);x.fillRect(a+12,m.y+7,3,3);if(m.fly){x.fillStyle='#fff';x.fillRect(a-7,m.y+(f?0:4),7,4);x.fillRect(a+20,m.y+(f?0:4),7,4)}}); // pixel monsters; bats get flapping wings
 if(L.exit){const e=L.exit;rect(e);x.fillStyle='#fff';x.fillRect(e.x-cam+(pulse>>4&1)*4,e.y,6,6)}
 if(!dead&&!(inv>0&&pulse%8<4)){x.save();if(P.glow&&!LITE)x.shadowColor=COLS[P.color],x.shadowBlur=14;x.fillStyle=COLS[P.color];x.beginPath();x.arc(B.x-cam,B.y,10,0,7);x.fill();x.strokeStyle='#fff';x.lineWidth=2;x.stroke();x.fillStyle='#fff9';x.fillRect(B.x-cam-5,B.y-6,3,3);x.restore()}else if(dead){x.strokeStyle='#fff';x.beginPath();x.arc(B.x-cam,B.y,10+(45-dead),0,7);x.stroke()}
 x.fillStyle='#fff';x.font='13px monospace';x.fillText(`LV ${P.lvl}/11  🔑${keys}/5  ●${rings}  SCORE ${P.score}${cp?'  ✓CP':''}  ${Store.diff().n}`+(P.timer?`  ${fmt(ft)}`:''),10,18);
 const LV=Store.diff().lives;for(let i=0;i<LV;i++){x.beginPath();x.arc(W-16-i*(LV>5?14:18),14,5,0,7);i<P.lives?x.fill():x.stroke()}x.strokeStyle='#fff';if(msg){x.textAlign='center';x.font='bold 20px monospace';x.fillText('NEED ALL 5 KEYS!',W/2,60);x.textAlign='left';x.font='13px monospace'}x.strokeRect(10,H-12,W-20,5);x.fillRect(10,H-12,(W-20)*L.k/L.segs,5);hudExtra()}
// pxTri: PIXEL SPIKES skin (shop pack) = stepped 8-bit pyramids instead of smooth triangles.
function pxTri(s){if(!vis(s))return;x.fillStyle='#fff';for(let u=0;u<s.w;u+=24)for(let r=0;r<4;r++){const w=24-r*6;x.fillRect(s.x-cam+u+(24-w)/2,s.y+s.h-(r+1)*s.h/4,w,s.h/4)}}
// hudExtra: Trap-Lab style readouts: DANGER meter + REACTION WINDOW (ms until the nearest hazard at current speed), HP bar (Health mode), red hit flash.
function hudExtra(){const sp=3.4*60*(B.mud?.4:1);let nd=1e9;const chk=o=>{if(o.dead)return;const dx=o.x-B.x;if(dx>0&&dx<nd)nd=dx};[L.SP,L.AC,L.HZ,L.MS,L.CE,L.LS,L.FB,L.ER,L.FS,L.MON,L.TU,L.FL].forEach(a=>a.forEach(chk));
 const react=nd>600?'---':Math.round(nd/sp*1000)+'ms',dg=Math.min(100,Math.round((P.lvl*.7+3*L.k/L.segs)*Store.diff().spawn*7));
 x.fillStyle='#000a';x.fillRect(W/2-72,24,144,22);x.strokeStyle='#fff';x.lineWidth=1;x.strokeRect(W/2-72,24,144,22);x.fillStyle='#fff';x.font='10px monospace';x.fillText('DANGER '+dg+'%  REACT '+react,W/2-68,33);x.fillRect(W/2-68,37,136*dg/100,5);
 if(P.hpMode){x.strokeRect(10,24,100,8);x.fillRect(10,24,Math.max(0,B.hp),8)}
 if(flashT>0){x.fillStyle='rgba(255,0,0,'+(flashT/36)+')';x.fillRect(0,0,W,H)}}
function frame(t){acc+=Math.min(100,t-last);last=t;while(acc>=16.67){if(state=='play'&&!labOpen)step();acc-=16.67}if(L)draw();requestAnimationFrame(frame)}
refreshPacks();L=Lvl(1);while(L.k<12)gen(L);B={x:40,y:280,vx:0,vy:0};cp=null;inv=0;dead=0;menu();requestAnimationFrame(frame);
