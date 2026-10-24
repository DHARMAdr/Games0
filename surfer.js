// ===== RAIL RUSH: 3-lane pseudo-3D runner (Subway-Surfers style) in plain Canvas. 
// WHY pseudo-3D: no 3D engine needed. HOW: every object has a depth z (0 = player, bigger = farther). pz(z) shrinks things with distance; sy/sx convert (lane,z) to screen pixels, so lanes converge to the horizon.
// IMPROVE: real art/sprites, curved tracks, more characters, missions, daily rewards, music.
const W=800,H=450,HY=150,BY=390,LW=150,CX=400;                       // horizon y, player base y, lane width, centre x
const pz=z=>1/(1+z*.07),sy=z=>HY+(BY-HY)*pz(z),sx=(l,z)=>CX+l*LW*pz(z); // projection helpers
const S=Object.assign({coins:0,best:0,snd:true,night:false},JSON.parse(localStorage.getItem('sr')||'{}'));const save=()=>localStorage.setItem('sr',JSON.stringify(S));
// Difficulty comes from the shared Store (hub setting). cycleDiff() steps EASY>NORMAL>HARD>NIGHTMARE.
let DF=Store.diff();function cycleDiff(){const ks=Object.keys(Store.DIFFS);Store.setDiff(ks[(ks.indexOf(Store.diffKey())+1)%ks.length]);DF=Store.diff()}
const c=document.getElementById('c'),x=c.getContext('2d'),ui=document.getElementById('ui');
let st='menu',back=null,ent=[],nextZ=60,dist=0,speed=14,got=0,lane=0,plx=0,py=0,vy=0,slide=0,pw={mag:0,shoe:0,jet:0},shield=false,chase=0,shake=0,banner=0,tier=0,f=0,acc=0,lastT=0;
// ===== SOUND: tiny WebAudio beeps (no files). Respects Sound setting.
const AC=new (window.AudioContext||window.webkitAudioContext)();const beep=(fr,d=.07)=>{if(!S.snd)return;try{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=fr;g.gain.value=.05;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch(e){}};
// ===== WINDOWS (same pattern as other games): panel(html, backFn). Esc = backFn, Enter/Space = click green .pri button.
function panel(h,b){back=b||null;ui.innerHTML=h;ui.style.display='flex'}
function menu(msg=''){st='menu';panel(`<h1>🚆 RAIL RUSH</h1><b>Best ${S.best} · Total coins ${S.coins}</b>${msg}<button class="pri" onclick="start()">▶ Run! (Enter)</button><button onclick="cycleDiff();menu()">Difficulty: ${DF.n}</button><button onclick="settings(menu)">⚙ Settings</button><small>←/→ lane · ↑/Space jump · ↓ slide · Esc pause · swipe on phones<br>Hit 2 obstacles in a row and the guard catches you!</small>`)}
function settings(r){panel(`<h2>⚙ Settings</h2><button onclick="S.snd=!S.snd;save();settings(${r.name})">Sound: ${S.snd?'ON':'OFF'}</button><button onclick="S.night=!S.night;save();settings(${r.name})">Sky: ${S.night?'Night':'Sunset'}</button><button onclick="cycleDiff();settings(${r.name})">Difficulty: ${DF.n}</button><button class="pri" onclick="${r.name}()">Back (Esc)</button>`,r)}
function pauseMenu(){st='pause';panel(`<h2>⏸ Paused</h2><button class="pri" onclick="resume()">Resume (Esc / Enter)</button><button onclick="settings(pauseMenu)">⚙ Settings</button><button onclick="start()">Restart</button><button onclick="menu()">Main Menu</button>`,resume)}
function resume(){st='play';ui.style.display='none'}
function start(){DF=Store.diff();ent=[];nextZ=40;dist=0;speed=14*DF.spd;got=0;lane=0;plx=0;py=0;vy=0;slide=0;pw={mag:0,shoe:0,jet:0};shield=false;chase=0;tier=0;banner=0;st='play';ui.style.display='none'}
// ===== SPAWNER. WHY fair: each row blocks at most 1 lane (2 after 400m) so one lane is ALWAYS free; rows are >=14 apart and trains <=8 long so rows never overlap.
// Obstacles: train (solid, change lane), low barrier (jump), high bar (slide). Free lane gets a coin line or a power-up (12%). IMPROVE: pattern library, ramps on trains, moving trains in more variants.
function row(z){const n=dist>Math.max(100,400/DF.spawn)&&Math.random()<.5?2:1,ls=[-1,0,1].sort(()=>Math.random()-.5),bl=ls.slice(0,n),free=ls.slice(n);
 // Trap kinds: train (change lane), low barricade (jump), high bar (slide), pothole grate (jump), side-sweeper cleaner (jump, slides across lanes). Hard+: some trains SWITCH LANES right before impact.
 bl.forEach(l=>{const t=Math.random(),k=t<.3?'train':t<.52?'low':t<.7?'high':t<.86&&dist>150?'pothole':dist>300&&n==1?'sweep':'low';
  ent.push({k,l,z,len:k=='train'?5+Math.random()*3:k=='pothole'?.9:.8,ph:Math.random()*6,vz:k=='train'&&dist>600/DF.spawn&&Math.random()<.4*DF.spawn?1.5:1,sw:k=='train'&&DF.sw&&dist>500/DF.spawn&&Math.random()<.5})});
 const fl=free[0|Math.random()*free.length],r=Math.random();
 if(r<.12)ent.push({k:['mag','shoe','shield','jet'][0|Math.random()*4],l:fl,z:z+2,len:0,y:.3});else for(let i=0;i<5;i++)ent.push({k:'coin',l:fl,z:z+i*1.6,len:0,y:r<.5?.3:1.3})}
// ===== INPUT: keyboard + swipe + touch buttons share these actions. Jump physics: g=40, v=9.5 (shoes 14) in "height units" (barrier=0.5).
const goL=()=>{if(st=='play'){lane=Math.max(-1,lane-1);beep(300,.03)}},goR=()=>{if(st=='play'){lane=Math.min(1,lane+1);beep(300,.03)}},
 jump=()=>{if(st=='play'&&py<=.01&&pw.jet<=0){vy=pw.shoe>0?14:9.5;slide=0;beep(520)}},down=()=>{if(st=='play'){slide=.7;if(py>0)vy=-18}};
const confirmKey=()=>{const b=ui.style.display!='none'&&ui.querySelector('.pri');if(b){b.click();return true}};
addEventListener('keydown',e=>{const k=e.code;if(k=='Enter'){confirmKey();e.preventDefault()}
 if(k=='ArrowLeft'||k=='KeyA')goL();if(k=='ArrowRight'||k=='KeyD')goR();if(k=='ArrowUp'||k=='KeyW'||k=='Space'){if(!confirmKey())jump();e.preventDefault()}if(k=='ArrowDown'||k=='KeyS'){down();e.preventDefault()}
 if(k=='Escape'||k=='KeyP'){if(ui.style.display!='none'&&back)back();else if(st=='play')pauseMenu()}});
let sp0;c.onpointerdown=e=>{sp0=[e.clientX,e.clientY]};c.onpointerup=e=>{if(!sp0)return;const dx=e.clientX-sp0[0],dy=e.clientY-sp0[1];sp0=0;
 if(Math.max(Math.abs(dx),Math.abs(dy))<20){confirmKey()||jump()}else if(Math.abs(dx)>Math.abs(dy))dx>0?goR():goL();else dy<0?jump():down()};
const $=id=>document.getElementById(id);[['sl',goL],['sr',goR],['su',jump],['sd',down],['sp',()=>st=='play'?pauseMenu():0]].forEach(([id,fn])=>$(id).onpointerdown=e=>{e.preventDefault();fn()});
// ===== STUMBLE / CAUGHT. WHY: "someone catching up": 1st hit = guard appears right behind you (chase timer); 2nd hit while he is close = caught. Shield absorbs one hit. Trains = instant crash.
function stumble(o,train){spark(CX+plx*LW,BY-45,'#ffffff',12);if(shield){shield=false;o.dead=1;beep(200,.2);shake=10;return}shake=14;beep(90,.25);if(train&&Store.diffKey()!='easy'||chase>0||DF.ko)return over();chase=DF.chase;o.dead=1;speed*=.8}
// ===== UPDATE (fixed 60Hz). Speed ramps with distance and gets a banner every 500m. Magnet pulls coins to your lane; jetpack hovers + drops a coin trail; shoes boost jump.
function update(){const dt=1/60;f++;speed=Math.min(30*DF.spd,(14+dist/120)*DF.spd)*(chase>0?.92:1);dist+=speed*dt;nextZ-=speed*dt;while(nextZ<90){row(nextZ);nextZ+=Math.max(12,(15+Math.random()*8-Math.min(5,dist/300))*DF.gap)}
 const tr=Math.floor(dist/500);if(tr>tier){tier=tr;banner=120;beep(400,.2)}
 plx+=(lane-plx)*.25;if(pw.jet>0){py+=(2.2-py)*.1}else{vy-=40*dt;py+=vy*dt;if(py<=0){py=0;vy=0}}if(slide>0)slide-=dt;if(chase>0)chase--;if(shake>0)shake--;
 for(const k in pw)if(pw[k]>0)pw[k]-=dt;if(pw.jet<=0&&pw.jet>-1&&pw.jet!=0)pw.jet=0;
 const pl=Math.round(plx);
 for(const e of ent){e.z-=speed*dt*(e.vz||1);if(e.k=='sweep')e.l=Math.sin(f/45*DF.spd+e.ph)*1.15;if(e.sw&&e.z<18&&!e.swd){e.swd=1;e.tl=Math.round(e.l)==0?(Math.random()<.5?-1:1):0}if(e.swd)e.l+=(e.tl-e.l)*.1;if(pw.mag>0&&e.k=='coin'&&e.z<14&&e.z>-1){e.l+=(lane-e.l)*.2;e.z-=speed*dt*.5}
  if(e.dead)continue;const same=Math.round(e.l)==pl||Math.abs(e.l-plx)<.35;
  if(e.k=='coin'||e.len==0){if(same&&Math.abs(e.z)<.7&&Math.abs(py-e.y)<1.1){e.dead=1;beep(e.k=='coin'?900:660,.06);
    if(e.k=='coin'){got++;spark(CX+plx*LW,BY-e.y*90-20,'#ffd23f')}else if(e.k=='mag')pw.mag=8;else if(e.k=='shoe')pw.shoe=10;else if(e.k=='shield')shield=true;else{pw.jet=6;for(let i=0;i<22;i++)ent.push({k:'coin',l:Math.round(Math.sin(i/3)),z:8+i*1.4,len:0,y:2})}}}
  else if(same&&e.z<.5&&e.z+e.len>-.5){if(pw.jet>0)continue;
   if(e.k=='train')stumble(e,1);else if(e.k=='low'||e.k=='sweep'){if(py<.6)stumble(e)}else if(e.k=='pothole'){if(py<.15)stumble(e)}else if(!(slide>0&&py<.5))stumble(e)}}
 ent=ent.filter(e=>!e.dead&&e.z+e.len>-3)}
function over(){const sc=Math.floor(dist)+got*2;S.coins+=got;S.best=Math.max(S.best,sc);save();Store.saveScore('surfer',sc);beep(80,.5);st='over';
 panel(`<h2>🚔 Caught!</h2><p>Score ${sc} · ${Math.floor(dist)} m · 🪙${got} · Best ${S.best}</p><button class="pri" onclick="start()">Run Again (Enter)</button><button onclick="menu()">Main Menu</button>`,menu)}
// ===== DRAW (visual upgrade). WHY: layered depth + lighting makes flat shapes read as a real scene. HOW: sky gradient -> sun/moon/stars -> 2 parallax skylines -> perspective buildings with lit windows -> fog -> ballast + sleepers + metallic rails -> lamp posts with glow -> objects far->near -> runner -> particles -> vignette/scanlines -> neon digital HUD.
// IMPROVE: sprite sheets, curved tracks, rain/weather, bloom, day/night cycle by distance.
const fx=[];const spark=(X,Y,col,n=7)=>{for(let i=0;i<n;i++)fx.push({x:X,y:Y,vx:(Math.random()-.5)*220,vy:-Math.random()*180,t:.55,c:col})};
const hash=n=>{n=Math.sin(n*127.1)*43758.5453;return n-Math.floor(n)};
const glow=(c,b)=>{x.shadowColor=c;x.shadowBlur=b},noGlow=()=>{x.shadowBlur=0};
const PAL=['#e74c3c','#3498db','#9b59b6'];                                  // train colours per lane
function hudPanel(X,Y,w,h,col){x.save();x.fillStyle='#050a14d9';x.strokeStyle=col;x.lineWidth=1.5;glow(col,10);x.beginPath();x.rect(X,Y,w,h);x.fill();x.stroke();x.restore()}
function lcd(t,X,Y,size,col,al){x.save();x.font=`bold ${size}px "Courier New",monospace`;x.textAlign=al||'left';x.fillStyle=col;glow(col,10);x.fillText(t,X,Y);x.restore()}
function drawEnt(e){const zn=Math.max(e.z,-2),p=pz(zn),X=sx(e.l,zn),Y=sy(zn);
 if(e.k=='coin'){const w=Math.abs(Math.cos(f/7+e.z))*11*p+1.5,cy=Y-(e.y*90+18)*p,g=x.createRadialGradient(X,cy,1,X,cy,12*p);g.addColorStop(0,'#fff6a8');g.addColorStop(1,'#f5a300');x.save();glow('#ffd23f',12*p);x.fillStyle=g;x.beginPath();x.ellipse(X,cy,w,11*p,0,0,7);x.fill();x.restore()}
 else if(e.len==0){const col={mag:'#ff4081',shoe:'#ff9800',shield:'#40c4ff',jet:'#ffeb3b'}[e.k],cy=Y-(40+Math.sin(f/10)*5)*p,g=x.createRadialGradient(X,cy,2,X,cy,26*p);g.addColorStop(0,col+'ff');g.addColorStop(1,col+'00');x.fillStyle=g;x.beginPath();x.arc(X,cy,26*p,0,7);x.fill();x.font=26*p+'px serif';x.textAlign='center';x.fillText({mag:'🧲',shoe:'👟',shield:'🛡️',jet:'🚀'}[e.k],X,cy+9*p);x.textAlign='left'}
 else if(e.k=='train'){const zf=e.z+e.len,pf=pz(zf),Xf=sx(e.l,zf),Yf=sy(zf),w=LW*.4,h=115,col=PAL[e.l+1];
  x.fillStyle='#2b2f36';x.beginPath();x.moveTo(X-w*p,Y-h*p);x.lineTo(X+w*p,Y-h*p);x.lineTo(Xf+w*pf,Yf-h*pf);x.lineTo(Xf-w*pf,Yf-h*pf);x.fill();            // roof
  const sd=e.l<=0?1:-1;x.fillStyle=col;x.globalAlpha=.65;x.beginPath();x.moveTo(X+sd*w*p,Y);x.lineTo(X+sd*w*p,Y-h*p);x.lineTo(Xf+sd*w*pf,Yf-h*pf);x.lineTo(Xf+sd*w*pf,Yf);x.fill();x.globalAlpha=1; // side
  x.fillStyle='#ffffff55';for(let i=0;i<5;i++){const z1=e.z+e.len*i/5+.3,z2=z1+e.len/6;x.beginPath();x.moveTo(sx(e.l+sd*.4,z1),sy(z1)-h*.75*pz(z1));x.lineTo(sx(e.l+sd*.4,z2),sy(z2)-h*.75*pz(z2));x.lineTo(sx(e.l+sd*.4,z2),sy(z2)-h*.5*pz(z2));x.lineTo(sx(e.l+sd*.4,z1),sy(z1)-h*.5*pz(z1));x.fill()}      // side windows
  const g=x.createLinearGradient(0,Y-h*p,0,Y);g.addColorStop(0,col);g.addColorStop(1,'#1a1a22');x.fillStyle=g;x.fillRect(X-w*p,Y-h*p,2*w*p,h*p);                    // front
  x.fillStyle='#ffe9a8';x.fillRect(X-w*.72*p,Y-h*.82*p,w*1.44*p,h*.3*p);x.fillStyle='#0b1220';x.fillRect(X-w*.02*p,Y-h*.82*p,w*.04*p,h*.3*p);x.fillStyle='#fff';x.fillRect(X-w*p,Y-h*.38*p,2*w*p,4*p);
  for(const o of[-1,1]){x.save();glow('#fff7c0',30*p);x.fillStyle='#fffbe0';x.beginPath();x.arc(X+o*w*.7*p,Y-h*.15*p,7*p,0,7);x.fill();x.restore()}}                  // headlights
 else if(e.k=='low'){const bw=LW*.38*p;x.save();glow('#ff5252',8);x.fillStyle='#eceff1';x.fillRect(X-bw,Y-45*p,2*bw,45*p);x.fillStyle='#e53935';for(let i=0;i<4;i++)x.fillRect(X-bw+i*bw*.5,Y-45*p,bw*.25,45*p);x.restore();x.fillStyle='#0003';x.fillRect(X-bw,Y-4*p,2*bw,4*p)}
 else if(e.k=='pothole'){const bw=LW*.4*p;x.fillStyle='#050505';x.beginPath();x.ellipse(X,Y-4*p,bw,14*p,0,0,7);x.fill();x.strokeStyle='#607d8b';x.lineWidth=Math.max(1,2*p);for(let i=-3;i<=3;i++){x.beginPath();x.moveTo(X+i*bw/3.4,Y-17*p);x.lineTo(X+i*bw/3.4,Y+9*p);x.stroke()}x.strokeStyle='#ffca28';x.beginPath();x.ellipse(X,Y-4*p,bw,14*p,0,0,7);x.stroke()}
 else if(e.k=='sweep'){const bw=LW*.34*p;x.save();glow('#ffd600',14);x.fillStyle='#ffd600';x.fillRect(X-bw,Y-55*p,2*bw,50*p);x.fillStyle='#212121';for(let i=0;i<5;i++)x.fillRect(X-bw+i*bw*.45,Y-55*p,bw*.22,50*p);x.restore();x.fillStyle='#37474f';x.beginPath();x.arc(X,Y-5*p,13*p,0,7);x.fill();x.strokeStyle='#cfd8dc';x.lineWidth=2*p;x.beginPath();x.arc(X,Y-5*p,13*p,f/4,f/4+4);x.stroke();x.fillStyle='#ff1744';x.fillRect(X-4*p,Y-62*p,8*p,6*p)}
 else{const bw=LW*.38*p;x.fillStyle='#78909c';x.fillRect(X-bw,Y-100*p,7*p,100*p);x.fillRect(X+bw-7*p,Y-100*p,7*p,100*p);x.fillStyle='#ffca28';x.fillRect(X-bw,Y-100*p,2*bw,26*p);x.fillStyle='#212121';for(let i=0;i<6;i++)x.fillRect(X-bw+i*bw*.34,Y-100*p,bw*.17,26*p);x.save();glow('#f44',12);x.fillStyle=f>>3&1?'#ff1744':'#600';x.beginPath();x.arc(X-bw+3*p,Y-108*p,5*p,0,7);x.arc(X+bw-3*p,Y-108*p,5*p,0,7);x.fill();x.restore()}}
function draw(){const N=S.night;x.save();if(shake>0)x.translate((Math.random()-.5)*8,(Math.random()-.5)*8);
 let g=x.createLinearGradient(0,0,0,HY);if(N){g.addColorStop(0,'#02030f');g.addColorStop(.6,'#101a4a');g.addColorStop(1,'#3a2a6a')}else{g.addColorStop(0,'#2b1055');g.addColorStop(.45,'#d1477a');g.addColorStop(.8,'#ff9a5a');g.addColorStop(1,'#ffd08a')}x.fillStyle=g;x.fillRect(0,0,W,HY+2);
 if(N){x.fillStyle='#fff';for(let i=0;i<60;i++){x.globalAlpha=.3+.7*Math.abs(Math.sin(f/40+i));x.fillRect(hash(i)*W,hash(i+9)*HY*.85,1.6,1.6)}x.globalAlpha=1;g=x.createRadialGradient(640,60,2,640,60,40);g.addColorStop(0,'#fff');g.addColorStop(.3,'#dfe9ff');g.addColorStop(1,'#dfe9ff00');x.fillStyle=g;x.fillRect(590,10,100,100)}
 else{g=x.createRadialGradient(400,HY-6,4,400,HY-6,110);g.addColorStop(0,'#fff6d0');g.addColorStop(.25,'#ffd27a');g.addColorStop(1,'#ff9a5a00');x.fillStyle=g;x.fillRect(250,0,300,HY)}
 for(const[L,col,spd,hh]of[[0,N?'#0b0e30':'#8a3f73',.25,60],[1,N?'#080a24':'#5a2656',.55,85]]){x.fillStyle=col;for(let i=0;i<20;i++){const bx=((i*52-dist*spd*3)%1040+1040)%1040-60,bh=hh*.5+hash(i+L*40)*hh;x.fillRect(bx,HY-bh,40,bh);if(N&&L)for(let j=0;j<bh/10;j++)if(hash(i*9+j+L)>.6){x.fillStyle='#ffd88a';x.fillRect(bx+6+(j%3)*10,HY-bh+4+j*8,4,3);x.fillStyle=col}}}
 g=x.createLinearGradient(0,HY,0,H);g.addColorStop(0,N?'#1a1d2e':'#4a3a4a');g.addColorStop(1,N?'#0a0b12':'#1f1c24');x.fillStyle=g;x.fillRect(0,HY,W,H-HY);
 for(let k=24;k>=0;k--){const zb=k*6-(dist%6),idx=Math.floor(dist/6)+k;for(const sd of[-1,1]){const pp=pz(zb),bx=sx(sd*2.6,zb),bw=LW*1.5*pp,bh=(110+hash(idx*3+sd)*170)*pp,by=sy(zb),c0=N?'#10142e':'#59385a';x.fillStyle=c0;x.fillRect(sd<0?bx-bw:bx,by-bh,bw,bh);x.fillStyle=N?'#ffd88a':'#ffe9c4';x.globalAlpha=N?.9:.35;for(let wy=8*pp;wy<bh-6*pp;wy+=14*pp)for(let wx=6*pp;wx<bw-8*pp;wx+=16*pp)if(hash(idx*7+wx*3+wy+sd)>(N?.45:.6))x.fillRect((sd<0?bx-bw:bx)+wx,by-bh+wy,6*pp,7*pp);x.globalAlpha=1}}
 g=x.createLinearGradient(0,HY,0,HY+50);g.addColorStop(0,N?'#3a2a6a':'#ffb07a');g.addColorStop(1,'#0000');x.fillStyle=g;x.fillRect(0,HY,W,50);                                      // horizon fog
 g=x.createLinearGradient(0,HY,0,H);g.addColorStop(0,'#3b3b45');g.addColorStop(1,'#26262e');x.fillStyle=g;x.beginPath();x.moveTo(sx(-1.6,-5),sy(-5));x.lineTo(sx(-1.6,120),sy(120));x.lineTo(sx(1.6,120),sy(120));x.lineTo(sx(1.6,-5),sy(-5));x.fill();
 const off=dist%2;for(let z=-5;z<100;z+=2){const zz=z-off;x.strokeStyle='#4a3524';x.lineWidth=Math.max(1,6*pz(zz));x.beginPath();x.moveTo(sx(-1.55,zz),sy(zz));x.lineTo(sx(1.55,zz),sy(zz));x.stroke()}
 for(const l of[-1,0,1])for(const o of[-.27,.27])for(let z=-5;z<115;z+=5){const w=Math.max(1,4*pz(z));x.strokeStyle='#15151a';x.lineWidth=w+2;x.beginPath();x.moveTo(sx(l+o,z),sy(z));x.lineTo(sx(l+o,z+5),sy(z+5));x.stroke();x.strokeStyle='#cfd8dc';x.lineWidth=w*.6;x.beginPath();x.moveTo(sx(l+o,z),sy(z));x.lineTo(sx(l+o,z+5),sy(z+5));x.stroke()}
 if(N){x.save();glow('#00e5ff',8);x.strokeStyle='#00e5ff44';x.lineWidth=1;for(const l of[-.5,.5]){x.beginPath();x.moveTo(sx(l,-5),sy(-5));x.lineTo(sx(l,120),sy(120));x.stroke()}x.restore()}
 for(let k=12;k>=0;k--){const zz=k*8-(dist%8);for(const sd of[-1,1]){const pp=pz(zz),X=sx(sd*1.85,zz),Y=sy(zz);x.strokeStyle='#37474f';x.lineWidth=Math.max(1,4*pp);x.beginPath();x.moveTo(X,Y);x.lineTo(X,Y-150*pp);x.lineTo(X-sd*22*pp,Y-156*pp);x.stroke();x.save();glow('#ffe9a8',22*pp);x.fillStyle='#fff6cc';x.beginPath();x.arc(X-sd*22*pp,Y-154*pp,4*pp+1,0,7);x.fill();x.restore()}}
 if(speed>18){x.strokeStyle='#ffffff22';x.lineWidth=1;for(let i=0;i<24;i++){const a=hash(i+Math.floor(f/2))*6.28,r0=60+hash(i*3+f)*80;x.beginPath();x.moveTo(CX+Math.cos(a)*r0,HY+Math.abs(Math.sin(a))*r0*.8);x.lineTo(CX+Math.cos(a)*(r0+70),HY+Math.abs(Math.sin(a))*(r0+70)*.8);x.stroke()}}
 [...ent].sort((a,b)=>b.z-a.z).forEach(drawEnt);
 // player: shadow, run-cycle legs, hoodie, backpack, swinging arms, cap. Shield / shoes / jetpack add glows.
 const X=CX+plx*LW,Y=BY-py*90,sq=slide>0&&py<.1?.55:1,ph=Math.sin(f/3)*9,air=py>0.05;x.fillStyle='#0006';x.beginPath();x.ellipse(X,BY+4,28-py*7,8,0,0,7);x.fill();
 x.save();if(shield){x.shadowColor='#40c4ff';x.shadowBlur=30}else if(pw.shoe>0){x.shadowColor='#ff9800';x.shadowBlur=20}
 if(pw.jet>0){x.save();glow('#ffb300',24);x.fillStyle='#ff6d00';x.beginPath();x.moveTo(X-22,Y-30);x.lineTo(X-18,Y+14+Math.random()*14);x.lineTo(X-14,Y-30);x.moveTo(X+14,Y-30);x.lineTo(X+18,Y+14+Math.random()*14);x.lineTo(X+22,Y-30);x.fill();x.restore()}
 const lg=air?6:ph;x.fillStyle='#263238';x.fillRect(X-14,Y-26*sq,11,26*sq-lg*.3);x.fillRect(X+3,Y-26*sq,11,26*sq+lg*.3);x.fillStyle=pw.shoe>0?'#ff9800':'#eceff1';x.fillRect(X-16,Y-5-lg*.3,15,7);x.fillRect(X+1,Y-5+lg*.3,15,7);
 x.fillStyle='#455a64';x.fillRect(X-20,Y-72*sq,40,12*sq);x.fillStyle='#1e88e5';x.fillRect(X-17,Y-70*sq,34,46*sq);x.fillStyle='#1565c0';x.fillRect(X-17,Y-52*sq,34,5);
 x.fillStyle='#ffb74d';x.fillRect(X-26,Y-66*sq+(air?-8:-ph),8,22*sq);x.fillRect(X+18,Y-66*sq+(air?-8:ph),8,22*sq);
 x.fillStyle='#e0ac7a';x.beginPath();x.arc(X,Y-84*sq,12,0,7);x.fill();x.fillStyle='#e53935';x.beginPath();x.arc(X,Y-87*sq,13,Math.PI,0);x.fill();x.fillRect(X-13,Y-88*sq,26,4);x.fillRect(X-16,Y-86*sq,10,3);
 if(pw.jet>0){x.fillStyle='#90a4ae';x.fillRect(X-26,Y-68*sq,9,30*sq);x.fillRect(X+17,Y-68*sq,9,30*sq)}x.restore();
 if(shield){x.strokeStyle='#40c4ff99';x.lineWidth=3;x.beginPath();x.arc(X,Y-45*sq,46,0,7);x.stroke()}
 if(chase>0){const y2=BY+68+(chase<90?(90-chase)*2.4:0);x.font='72px serif';x.fillText('👮',X-62,y2+Math.sin(f/4)*4);x.font='46px serif';x.fillText('🐕',X+16,y2+6+Math.cos(f/4)*4)}
 for(let i=fx.length-1;i>=0;i--){const q=fx[i];q.t-=1/60;q.x+=q.vx/60;q.y+=q.vy/60;q.vy+=9;if(q.t<=0){fx.splice(i,1);continue}x.globalAlpha=Math.min(1,q.t*3);x.fillStyle=q.c;x.fillRect(q.x,q.y,3,3)}x.globalAlpha=1;
 if(speed>10&&st=='play'&&f%4==0&&!air)fx.push({x:X+(Math.random()-.5)*20,y:BY+2,vx:(Math.random()-.5)*40,vy:-20,t:.3,c:'#b0a090'});
 g=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);g.addColorStop(0,'#0000');g.addColorStop(1,'#0007');x.fillStyle=g;x.fillRect(0,0,W,H);x.fillStyle='#0000001c';for(let y=0;y<H;y+=3)x.fillRect(0,y,W,1);
 x.restore();
 // ---- digital HUD (neon LCD panels). Pulled outside the shake transform so it stays steady.
 const sc=Math.floor(dist)+got*2;hudPanel(10,10,210,58,'#00e5ff');lcd('SCORE',20,28,11,'#7fefff');lcd(String(sc).padStart(6,'0'),20,58,30,'#00e5ff');
 hudPanel(230,10,120,58,'#ffd23f');lcd('COINS',240,28,11,'#ffe98a');lcd(String(got).padStart(4,'0'),240,58,30,'#ffd23f');
 hudPanel(W-190,10,180,58,'#ff4081');lcd('SPEED km/h',W-180,28,11,'#ff9ec0');lcd(String(Math.round(speed*8)).padStart(3,'0'),W-180,58,30,'#ff4081');lcd('HI '+S.best,W-20,28,11,'#ff9ec0','right');
 let hx=10;for(const[k,ic,col,d]of[['mag','🧲','#ff4081',8],['shoe','👟','#ff9800',10],['jet','🚀','#ffeb3b',6]])if(pw[k]>0){hudPanel(hx,76,84,30,col);x.font='16px serif';x.fillText(ic,hx+6,98);x.fillStyle=col;x.fillRect(hx+30,86,Math.max(0,48*pw[k]/d),10);hx+=92}
 if(shield){hudPanel(hx,76,44,30,'#40c4ff');x.font='16px serif';x.fillText('🛡️',hx+10,98)}
 if(chase>0&&f>>3&1){lcd('⚠ GUARD BEHIND YOU ⚠',W/2,110,20,'#ff1744','center');x.fillStyle='#ff1744';x.fillRect(W/2-80,118,160*chase/480,5)}
 // Danger meter (speed + difficulty) and REACTION WINDOW = milliseconds until the nearest solid obstacle reaches you.
 {const nz=ent.reduce((m,e)=>e.len>0&&e.z>0&&e.z<m?e.z:m,99),react=nz>90?'---':Math.round(nz/speed*1000)+' ms',dg=Math.min(100,Math.round(speed/(30*DF.spd)*60+(DF.ko?25:0)+(chase>0?15:0)));
  hudPanel(360,10,230,58,'#ffffff');lcd('DANGER '+dg+'%  '+DF.n,370,28,11,'#fff');x.fillStyle='#ffffff22';x.fillRect(370,34,210,8);const gr=x.createLinearGradient(370,0,580,0);gr.addColorStop(0,'#39ff88');gr.addColorStop(.6,'#ffd23f');gr.addColorStop(1,'#ff1744');x.fillStyle=gr;x.fillRect(370,34,210*dg/100,8);lcd('REACT '+react,370,60,16,'#00e5ff')}
 if(banner>0){banner--;lcd('FASTER!  '+tier*500+' m',W/2,160,34,'#fff','center')}}
function frame(t){acc+=Math.min(100,t-lastT);lastT=t;while(acc>=16.67){if(st=='play')update();else f++;acc-=16.67}draw();requestAnimationFrame(frame)}
menu();requestAnimationFrame(frame);
