// game.js — the heart of the game: ONE permanent requestAnimationFrame loop, the central game state, spawning waves, collisions, pickups, abilities, scoring, HUD updates and level flow.
// Other files provide the parts: player.js (ship), enemies.js / bosses.js (AI), weapons.js (shots), particles.js (effects), levels.js (data). ui.js shows menus.
SW.Game={
  W:600,H:800,state:'menu',time:0,last:0,raf:0,fps:0,fpsN:0,fpsT:0,shk:0,
  DIF:{easy:{hp:.8,dmg:.7,fire:1.25,spd:.9},normal:{hp:1,dmg:1,fire:1,spd:1},hard:{hp:1.3,dmg:1.2,fire:.8,spd:1.1},insane:{hp:1.7,dmg:1.5,fire:.65,spd:1.25}},
  ABIL:{emp:{name:'EMP Blast',cost:40},shield:{name:'Energy Shield',cost:35},warp:{name:'Time Warp',cost:50},over:{name:'Overdrive',cost:50},nova:{name:'Nova Bomb',cost:100},repair:{name:'Emergency Repair',cost:60}},
  // Power-ups: col/icon/label + duration (dur, seconds) for timed buffs. Weights decide how often each drops.
  PU:{hp:{c:'#ff5252',i:'+',l:'Health',w:12},shield:{c:'#40c4ff',i:'S',l:'Shield',w:12},invuln:{c:'#ffd740',i:'★',l:'Invulnerable',w:4},dmg:{c:'#ff9100',i:'D',l:'Damage+',w:8},rate:{c:'#69f0ae',i:'R',l:'Fire rate+',w:8},
    rapid:{c:'#ea80fc',i:'»',l:'Rapid fire',w:6},life:{c:'#ff4081',i:'♥',l:'Extra life',w:2},mult:{c:'#ffff00',i:'x2',l:'Score x2',w:6},energy:{c:'#b388ff',i:'E',l:'Energy',w:10},credit:{c:'#fff176',i:'$',l:'Credits',w:14},weapon:{c:'#fff',i:'W',l:'Weapon',w:6},ammo:{c:'#ffab91',i:'A',l:'Ammo',w:8}},
  init(cv){this.cv=cv;this.c=cv.getContext('2d');cv.width=600;cv.height=800;this.pb=[];this.eb=[];this.enemies=[];this.pickups=[];this.rocks=[];this.haz=[];this.q=[];this.boss=null;this.p=null;this.cache={};this.dif=this.DIF.normal;
    SW.BG.init(SW.PALS[0]);this.bound=t=>this.loop(t);if(!this.raf)this.raf=requestAnimationFrame(this.bound)},
  // ---- the one loop. dt is capped (0.05s) so coming back from a hidden tab never makes things jump.
  loop(t){this.raf=requestAnimationFrame(this.bound);let dt=(t-this.last)/1000;this.last=t;if(!(dt>0))dt=0;dt=Math.min(dt,.05);
    this.fpsN++;this.fpsT+=dt;if(this.fpsT>=.5){this.fps=Math.round(this.fpsN/this.fpsT);this.fpsN=0;this.fpsT=0}
    SW.Controls.poll();
    if(this.state=='playing')this.update(dt);else if(this.state!='paused'){SW.BG.update(dt,.7);SW.FX.update(dt);if(this.state=='victory'&&Math.random()<dt*3)SW.FX.burst(80+Math.random()*440,100+Math.random()*300,['#ff2bd6','#00e5ff','#ffea00'][(Math.random()*3)|0],40,260,1.2,3)}
    this.draw();this.hud()},
  sfx(n){SW.Audio.sfx(n)},shake(a){if(SW.Settings.get('shake'))this.shk=Math.max(this.shk,a*SW.Settings.get('shakeAmt'))},
  flash(){const f=document.getElementById('flash');f.classList.add('on');setTimeout(()=>f.classList.remove('on'),90)},
  toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('on');clearTimeout(this.tt);this.tt=setTimeout(()=>t.classList.remove('on'),2200)},
  // ---- level flow ----
  startLevel(idx){SW.UI.hide();this.endless=idx<0;this.idx=idx<0?0:idx;this.data=SW.LEVELS[this.idx];let dk=SW.Settings.get('difficulty');if(dk=='hub')dk={easy:'easy',normal:'normal',hard:'hard',nightmare:'insane'}[typeof Store!=='undefined'&&Store.diffKey?Store.diffKey():'normal']||'normal';this.dif=this.DIF[dk];   // 'hub' follows the hub's shared difficulty
    this.pb.forEach(b=>b.on=false);this.eb.forEach(b=>b.on=false);this.enemies.length=0;this.pickups.length=0;this.rocks.length=0;this.haz.length=0;this.q.length=0;this.boss=null;SW.FX.clear();
    this.score=0;this.kills=0;this.shots=0;this.hits=0;this.time=0;this.combo=0;this.comboT=0;this.maxCombo=0;this.livesLost=0;this.flawless=true;this.bossKills=0;this.runCredits=0;this.pickN=0;this.wi=0;this.ph='intro';this.wt=2.2;this.tsT=0;this.ts=1;this.envT=3;this.bossDone=false;this.tipT=0;
    this.hpMul=this.dif.hp*(1+.07*this.idx);this.p=SW.Player.create(this);this.p.energy=100;
    SW.BG.init(SW.PALS[this.data.w]);SW.BG.warp=1;SW.Audio.setWorld(this.data.w);SW.Audio.resume();SW.Audio.pause(false);SW.Controls.clear();this.state='playing';this.toast(this.endless?'ENDLESS SURVIVAL':'LEVEL '+(this.idx+1)+': '+this.data.n);document.getElementById('hud').classList.remove('hidden')},
  pause(){if(this.state!='playing')return;this.state='paused';SW.Audio.pause(true);SW.Controls.clear();SW.UI.show('pause')},
  resume(){if(this.state!='paused')return;SW.UI.hide();this.state='playing';SW.Audio.pause(false);SW.Controls.clear()},
  autoPause(){if(this.state=='playing'&&SW.Settings.get('pauseBlur'))this.pause()},
  toMenu(){this.state='menu';document.getElementById('hud').classList.add('hidden');this.boss=null;SW.Audio.pause(false);SW.BG.init(SW.PALS[0]);SW.UI.show('main')},
  onKey(code){const C=SW.Controls;if(C.map.pause.includes(code)){if(this.state=='playing')this.pause();else SW.UI.back()}else if(C.map.confirm.includes(code)&&this.state!='playing')SW.UI.enter()},
  // ---- entity helpers (used by weapons / enemies / bosses) ----
  bullet(arr,cap){for(const b of arr)if(!b.on)return b;if(arr.length<cap){const b={};arr.push(b);return b}return null},       // object pool: reuse inactive bullets
  pShot(x,y,vx,vy,dmg,o){o=o||{};const b=this.bullet(this.pb,320);if(!b)return;const st=this.p.st,crit=Math.random()<st.crit,k=o.homing?1:st.proj;
    Object.assign(b,{on:true,x,y,vx:vx*k,vy:vy*k,dmg:crit?dmg*2:dmg,crit,r:o.r||4,life:o.life||1.4,col:o.col||'#4df',pierce:o.pierce||0,hits:[],splash:o.splash||0,homing:o.homing||0,accel:o.accel||0,len:o.len||0,age:0,assist:!o.homing&&!o.accel&&!o.splash&&Math.abs(vx)<250})},
  eShot(x,y,ang,sp,dmg,o){o=o||{};const b=this.bullet(this.eb,520);if(!b)return;Object.assign(b,{on:true,x,y,vx:Math.sin(ang)*sp,vy:Math.cos(ang)*sp,dmg,r:o.r||5,col:o.col||'#ff5a3c'})},
  aim(x,y){return Math.atan2(this.p.x-x,this.p.y-y)},
  targets(){return this.boss&&this.boss.state=='fight'&&!this.boss.dying?this.enemies.concat([this.boss]):this.enemies},
  nearest(x,y,max){let b=null,bd=max;for(const t of this.targets()){const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}}return b},
  spawnEnemy(type,x,y,o){this.enemies.push(SW.Enemies.make(type,x,y,this,o))},
  hazard(h){h.age=0;h.hit=false;this.haz.push(h)},
  clearBullets(){this.eb.forEach(b=>b.on=false)},
  explodeAt(x,y,r,d){SW.FX.burst(x,y,'#fa4',34,260,.7,3);SW.FX.ring(x,y,'#fa4',r);this.sfx('explode');this.shake(6);if(Math.hypot(this.p.x-x,this.p.y-y)<r)SW.Player.hit(this.p,d,this)},
  // dmg(): damage anything (enemy, boss, rock). Handles shields, armor, vulnerable boss windows, damage numbers and kills.
  dmg(t,d,crit){if(t.dead)return;const col=crit?'#ffea00':'#fff';
    if(t.d){if(t.inv>0||t.state=='enter'||t.dying)return;if(t.vuln)d*=1.5;t.hp-=d;t.flash=.08;SW.FX.text(t.x+(Math.random()-.5)*60,t.y+20,Math.round(d),col);this.sfx('bossHit');this.p.special=Math.min(100,this.p.special+.15);
      if(t.hp<=0){t.hp=0;t.dying=.001;this.clearBullets();this.sfx('bossDie');this.shake(14)}return}
    if(t.rock){t.hp-=d;if(t.hp<=0){t.dead=true;SW.FX.burst(t.x,t.y,'#a98',16,160,.6);this.score+=10}return}
    if(t.shOn)d*=.2;d*={gunship:.85,carrier:.8,elite:.8}[t.type]||1;t.hp-=d;t.flash=.08;SW.FX.text(t.x,t.y-t.r,Math.round(d),col);this.sfx('hit');SW.FX.burst(t.x,t.y,'#fff',3,120,.25);if(t.hp<=0)this.kill(t,true)},
  kill(e,reward){e.dead=true;const T=SW.Enemies.T[e.type];SW.FX.burst(e.x,e.y,T.col,28,240,.7,3);SW.FX.ring(e.x,e.y,T.col,e.r*2);this.sfx('explode');this.shake(e.r>20?5:2);
    if(!reward)return;this.kills++;this.combo++;this.comboT=3;this.maxCombo=Math.max(this.maxCombo,this.combo);this.addScore(T.sc);this.p.special=Math.min(100,this.p.special+4);SW.data.totals.kills++;SW.Missions.event('kills',1);SW.Missions.event('combo',this.combo);
    if(Math.random()<(e.r>20?.4:.14))this.drop(e.x,e.y)},
  addScore(v){this.score+=Math.round(v*(1+Math.min(this.combo,50)*.1)*(this.p.buf.mult>0?2:1));SW.Missions.event('score',this.score)},
  drop(x,y,type){if(!type){let tot=0;for(const k in this.PU)tot+=this.PU[k].w;let r=Math.random()*tot;for(const k in this.PU){r-=this.PU[k].w;if(r<=0){type=k;break}}}this.pickups.push({x,y,vy:70,type,t:0})},
  beamHit(p){const m=p.dmgMul()*3.2;for(const t of this.targets().concat(this.rocks))if(!t.dead&&t.y<p.y&&Math.abs(t.x-p.x)<(t.d?t.w*.4:t.r)+8){this.dmg(t,m,false);this.hits++;if(Math.random()<.4)SW.FX.burst(t.x,t.y+t.r,'#f6a',2,120,.3)}},
  // ---- special abilities (Q). Energy cost is reduced by the Special Cooldown upgrade. ----
  useSpecial(){const p=this.p,id=SW.data.special,a=this.ABIL[id],cost=a.cost*p.st.cool;if(p.special<cost){this.toast('Special energy low');this.sfx('ui');return}
    p.special-=cost;SW.data.totals.specials++;SW.Missions.event('special',1);const FX=SW.FX;
    if(id=='emp'){this.enemies.forEach(e=>{if(Math.hypot(e.x-p.x,e.y-p.y)<300)e.stun=3.5});this.eb.forEach(b=>{if(b.on&&Math.hypot(b.x-p.x,b.y-p.y)<300)b.on=false});FX.ring(p.x,p.y,'#8cf',300);this.sfx('emp')}
    else if(id=='shield'){p.boost=80;p.buf.sh=8;this.sfx('shield');FX.ring(p.x,p.y,'#ffd740',60)}
    else if(id=='warp'){this.tsT=5;this.sfx('shield');FX.ring(p.x,p.y,'#b388ff',400)}
    else if(id=='over'){p.buf.over=8;this.sfx('pickup')}
    else if(id=='nova'){this.enemies.forEach(e=>this.dmg(e,140,false));if(this.boss&&this.boss.state=='fight')this.dmg(this.boss,160,false);this.rocks.forEach(r=>this.dmg(r,999,false));this.clearBullets();FX.ring(p.x,p.y,'#fff',700);FX.burst(p.x,p.y,'#fff',70,500,.9,3);this.flash();this.shake(14);this.sfx('emp')}
    else if(id=='repair'){p.hp=Math.min(p.maxhp,p.hp+p.maxhp*.4);this.sfx('pickup');FX.burst(p.x,p.y,'#6f6',20,120,.8)}},
  collect(k){const p=this.p,b=p.buf;this.pickN++;SW.data.totals.pickups++;SW.Missions.event('pickup',1);this.sfx('pickup');
    switch(k){case'hp':p.hp=Math.min(p.maxhp,p.hp+p.maxhp*.35);break;case'shield':p.sh=Math.min(p.maxsh,p.sh+p.maxsh*.5);break;case'invuln':b.invuln=6;break;case'dmg':b.dmg=10;break;case'rate':b.rate=10;break;case'rapid':b.rapid=8;break;
      case'life':p.lives=Math.min(5,p.lives+1);break;case'mult':b.mult=12;break;case'energy':p.special=Math.min(100,p.special+50);break;case'credit':this.runCredits+=25;break;case'ammo':p.missiles+=6;p.rockets+=6;break;
      case'weapon':{const pool=SW.Weapons.order.filter(w=>!p.owned.includes(w));if(pool.length&&Math.random()<.6){const w=pool[(Math.random()*pool.length)|0];p.owned.push(w);p.weapon=w;this.toast('New weapon: '+SW.Weapons.defs[w].name)}else{p.wl=Math.min(5,p.wl+1);this.toast('Weapon level '+p.wl)}}}},
  // ---- waves ----
  spawnWave(){const w=SW.Levels.wave(this.idx,this.wi,this.endless);this.hpMul=this.dif.hp*(1+(this.endless?.06*this.wi:.07*this.idx));w.forEach(s=>this.q.push({t:this.time+s.delay,type:s.type,x:s.x}))},
  updateWaves(dt){this.wt-=dt;const L=this.data,total=this.endless?1e9:L.waves,idle=!this.q.length&&!this.enemies.length;
    if(this.ph=='intro'){if(this.wt<=0)this.ph='gap',this.wt=.6}
    else if(this.ph=='gap'){if(this.wt<=0){if(this.wi<total){this.spawnWave();this.ph='fight';this.wt=50}else if(L.boss&&!this.boss&&!this.bossDone){this.ph='bossIntro';this.wt=2;SW.BG.warp=.8}else if(idle&&(!L.boss||this.bossDone))this.finish()}}
    else if(this.ph=='fight'){if(idle||this.wt<=0&&!this.q.length){this.wi++;SW.Missions.event('waves',this.wi);this.ph='gap';this.wt=1.4}}
    else if(this.ph=='bossIntro'){if(this.wt<=0){this.boss=SW.Bosses.spawn(L.boss,this);this.ph='boss'}}
    else if(this.ph=='boss'&&this.bossDone&&idle)this.finish();
    while(this.q.length&&this.q[0].t<=this.time){const s=this.q.shift();this.spawnEnemy(s.type,s.x,-30)}},
  bossDead(b){this.boss=null;this.bossDone=true;this.bossKills++;SW.data.totals.bosses++;SW.Missions.event('boss',1);this.addScore(2500+this.idx*300);this.runCredits+=150+this.idx*20;SW.FX.burst(b.x,b.y,'#fff',120,520,1.4,3);SW.FX.ring(b.x,b.y,'#ffd',500);this.flash();this.shake(16);this.enemies.forEach(e=>this.kill(e,true));this.q.length=0;
    for(let i=0;i<5;i++)this.drop(b.x+(Math.random()-.5)*120,b.y+(Math.random()-.5)*60);this.clearBullets()},
  // finish(): level complete. Rating uses accuracy, deaths, speed and score. Rewards are credits; the next level unlocks ONLY here (real objectives done).
  finish(){if(this.state!='playing')return;this.state='complete';const acc=this.shots?Math.min(1,this.hits/this.shots):0,par=this.data.waves*26+(this.data.boss?70:0);let pts=0;if(acc>=.35)pts++;if(this.livesLost==0)pts++;if(this.time<par)pts++;if(this.score>=1500+this.idx*900)pts++;
    const rate=['C','C','B','A','S'][pts],cr=110+this.idx*35+pts*45+this.runCredits;SW.data.credits+=cr;const d=SW.data;d.completed[this.idx]=Math.max(d.completed[this.idx]|0,pts+1);d.best[this.idx]=Math.max(d.best[this.idx]|0,this.score);d.unlocked=Math.max(d.unlocked,Math.min(12,this.idx+2));d.totals.levels++;
    SW.Missions.event('levels',1);if(this.livesLost==0)SW.Missions.event('flawless',1);if(this.time<150)SW.Missions.event('fast',1);SW.Missions.event('credits',d.credits);SW.Missions.event('ships',d.ships.length);
    const last=this.idx==11;if(last)SW.Missions.event('campaign',1);SW.Storage.addScore({score:this.score,level:this.idx+1,mode:'campaign',date:new Date().toLocaleDateString()});SW.Storage.save();this.sfx(last?'victory':'complete');SW.Audio.pause(true);
    this.res={rate,cr,score:this.score,kills:this.kills,time:this.time,acc,idx:this.idx};SW.BG.warp=1;SW.UI.show(last?'victory':'complete')},
  gameOver(){if(this.state!='playing')return;this.state='over';const d=SW.data,earned=Math.floor(this.score/60)+this.runCredits;d.credits+=earned;SW.Missions.event('credits',d.credits);
    if(this.endless)d.endlessBest=Math.max(d.endlessBest,this.score);SW.Storage.addScore({score:this.score,level:this.endless?0:this.idx+1,mode:this.endless?'endless':'campaign',date:new Date().toLocaleDateString()});SW.Storage.save();this.sfx('defeat');SW.Audio.pause(true);
    this.res={score:this.score,kills:this.kills,time:this.time,acc:this.shots?Math.min(1,this.hits/this.shots):0,bosses:this.bossKills,cr:earned};setTimeout(()=>SW.UI.show('over'),900)},
  // ---- main update ----
  update(dt){const p=this.p;this.time+=dt;
    if(this.tsT>0){this.tsT-=dt;this.ts=.4}else this.ts=1;if(this.comboT>0&&(this.comboT-=dt)<=0)this.combo=0;if(!(p.buf.sh>0))p.boost=0;p.special=Math.min(100,p.special+1.2*dt);
    SW.BG.update(dt,1);SW.Player.update(p,dt,this);if(this.state!='playing')return;this.updateWaves(dt);if(this.state!='playing')return;
    const env=this.data.env;this.envT-=dt;
    if(env=='asteroids'&&this.envT<=0){this.envT=1.4;const r=14+Math.random()*20;this.rocks.push({x:30+Math.random()*540,y:-40,vx:(Math.random()-.5)*60,vy:90+Math.random()*80,r,hp:r*1.6,rock:true,rot:0,sp:Math.random()*2-1,dead:false})}
    if(env=='storm'&&this.envT<=0){this.envT=4.5;for(let i=0;i<2;i++)this.hazard({k:'rect',x:Math.random()*540,y:0,w:60,h:800,tele:1.3,t:.35,dmg:18*this.dif.dmg});SW.Audio.sfx('hit')}
    if(env=='gravity'&&!p.dead){p.vx+=(300-p.x)*.35*dt*2}
    for(const e of this.enemies){SW.Enemies.update(e,dt,this);if(e.y>880||e.x<-80||e.x>680)e.dead=true}
    if(this.boss){SW.Bosses.update(this.boss,dt,this)}
    for(const r of this.rocks){r.x+=r.vx*dt*this.ts;r.y+=r.vy*dt*this.ts;r.rot+=r.sp*dt;if(r.y>860)r.dead=true}
    this.bullets(dt);this.collide();
    for(let i=this.pickups.length-1;i>=0;i--){const k=this.pickups[i];k.t+=dt;const d=Math.hypot(p.x-k.x,p.y-k.y);if(!p.dead&&d<p.st.magnet){k.x+=(p.x-k.x)/d*320*dt;k.y+=(p.y-k.y)/d*320*dt}else k.y+=k.vy*dt;
      if(!p.dead&&d<24){this.collect(k.type);this.pickups.splice(i,1)}else if(k.y>860)this.pickups.splice(i,1)}
    for(let i=this.haz.length-1;i>=0;i--){const h=this.haz[i];h.age+=dt;if(h.age<h.tele)continue;if(!h.hit&&!p.dead){const inR=h.k=='rect'?(p.x>h.x&&p.x<h.x+h.w&&p.y>h.y&&p.y<h.y+h.h):Math.hypot(p.x-h.x,p.y-h.y)<h.r+8;if(inR){h.hit=true;SW.Player.hit(p,h.dmg,this)}}if(h.age>h.tele+h.t)this.haz.splice(i,1)}
    this.enemies=this.enemies.filter(e=>!e.dead);this.rocks=this.rocks.filter(r=>!r.dead);SW.FX.update(dt);if(this.shk>0)this.shk=Math.max(0,this.shk-dt*30);if(SW.BG.warp>0&&this.ph!='intro'&&this.ph!='bossIntro'&&SW.BG.warp>.01)SW.BG.warp=Math.max(0,SW.BG.warp-dt*.3)},
  bullets(dt){const sp=SW.Settings.get('aimAssist');
    for(const b of this.pb){if(!b.on)continue;b.age+=dt;b.life-=dt;if(b.life<=0){b.on=false;continue}
      if(b.accel){const l=Math.hypot(b.vx,b.vy)||1,s=Math.min(l+b.accel*dt,900);b.vx*=s/l;b.vy*=s/l}
      if(b.homing){const t=this.nearest(b.x,b.y,420);if(t){const a=Math.atan2(t.y-b.y,t.x-b.x),c=Math.atan2(b.vy,b.vx);let d=a-c;while(d>3.14)d-=6.283;while(d<-3.14)d+=6.283;const n=c+Math.max(-b.homing*dt,Math.min(b.homing*dt,d)),s=Math.hypot(b.vx,b.vy);b.vx=Math.cos(n)*s;b.vy=Math.sin(n)*s}}
      else if(sp&&b.assist){const t=this.nearest(b.x,b.y-120,200);if(t&&t.y<b.y)b.vx+=Math.max(-1,Math.min(1,(t.x-b.x)/60))*420*dt}
      b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<-60||b.y>860||b.x<-60||b.x>660)b.on=false}
    for(const b of this.eb){if(!b.on)continue;b.x+=b.vx*dt*this.ts;b.y+=b.vy*dt*this.ts;if(b.y<-60||b.y>860||b.x<-60||b.x>660)b.on=false}},
  // collide(): player bullets vs enemies/boss/rocks, enemy bullets vs player, bodies vs player. Circle checks; the wide bosses use a box.
  collide(){const p=this.p,hit=(a,b,r)=>{const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy<r*r};
    for(const b of this.pb){if(!b.on)continue;const list=this.enemies.concat(this.rocks);let boss=this.boss&&this.boss.state=='fight'&&!this.boss.dying?this.boss:null;
      let used=false;
      const apply=t=>{if(b.hits.includes(t))return;b.hits.push(t);this.hits++;this.dmg(t,b.dmg,b.crit);SW.FX.burst(b.x,b.y,b.col,4,150,.3);if(b.splash){this.rocks.concat(this.enemies).forEach(o=>{if(o!==t&&!o.dead&&hit(b,o,b.splash+o.r))this.dmg(o,b.dmg*.5,false)});SW.FX.ring(b.x,b.y,b.col,b.splash);SW.FX.burst(b.x,b.y,'#fa4',12,180,.4)}
        if(b.pierce>0)b.pierce--;else{b.on=false;used=true}};
      for(const t of list){if(!b.on)break;if(!t.dead&&hit(b,t,b.r+t.r))apply(t)}
      if(boss&&b.on){const bx=boss.id=='serpent'?hit(b,boss,b.r+boss.r):Math.abs(b.x-boss.x)<boss.w/2+b.r&&Math.abs(b.y-boss.y)<boss.h/2+b.r;if(bx)apply(boss)}}
    if(p.dead)return;
    for(const b of this.eb)if(b.on&&hit(b,p,b.r+9)){b.on=false;SW.Player.hit(p,b.dmg,this)}
    for(const e of this.enemies)if(!e.dead&&e.type!='kamikaze'&&hit(e,p,e.r+p.r*.8)){if(SW.Player.hit(p,14,this))this.dmg(e,40,false)}
    for(const r of this.rocks)if(!r.dead&&hit(r,p,r.r+p.r*.8)){if(SW.Player.hit(p,14,this)){r.dead=true;SW.FX.burst(r.x,r.y,'#a98',14,160,.6)}}
    const b=this.boss;if(b&&b.state=='fight'&&!b.dying){let c=b.id=='serpent'?hit(b,p,b.r+10)||b.segs.some(s=>hit(s,p,24)):Math.abs(p.x-b.x)<b.w/2&&Math.abs(p.y-b.y)<b.h/2;if(c)SW.Player.hit(p,20,this)}},
  // ---- drawing ----
  draw(){const c=this.c,S=SW.Settings,gl=S.get('glow')*({low:0,medium:.6,high:1}[S.get('quality')]||1);c.save();c.clearRect(0,0,600,800);
    if(this.shk>0)c.translate((Math.random()-.5)*this.shk,(Math.random()-.5)*this.shk);SW.BG.draw(c);
    if(this.state=='menu'){c.restore();return}
    for(const r of this.rocks){c.save();c.translate(r.x,r.y);c.rotate(r.rot);c.fillStyle='#6a5a52';c.strokeStyle='#b8a8a0';c.lineWidth=2;c.beginPath();for(let i=0;i<8;i++){const a=i*.785,rr=r.r*(.8+.2*Math.sin(i*2.3+r.r));c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.stroke();c.restore()}
    for(const h of this.haz){const tele=h.age<h.tele,a=tele?.15+.15*Math.sin(h.age*20):.8;c.globalAlpha=a;c.fillStyle=tele?'#ff3030':'#fff';c.strokeStyle='#ff5050';c.lineWidth=2;if(h.k=='rect'){c.fillRect(h.x,h.y,h.w,h.h);if(tele)c.strokeRect(h.x,h.y,h.w,h.h)}else{c.beginPath();c.arc(h.x,h.y,h.r,0,6.283);c.fill();if(tele)c.stroke()}c.globalAlpha=1}
    for(const k of this.pickups){const d=this.PU[k.type];c.save();c.translate(k.x,k.y+Math.sin(k.t*4)*3);c.shadowColor=d.c;c.shadowBlur=14*gl;c.fillStyle='#0a1236';c.strokeStyle=d.c;c.lineWidth=2.5;c.beginPath();c.arc(0,0,13,0,6.283);c.fill();c.stroke();c.fillStyle=d.c;c.font='bold 14px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(d.i,0,1);c.restore()}
    for(const e of this.enemies)SW.Enemies.draw(c,e,this);if(this.boss)SW.Bosses.draw(c,this.boss,this);
    const cb=S.get('colorblind');c.save();c.globalCompositeOperation=gl>0?'lighter':'source-over';
    for(const b of this.pb){if(!b.on)continue;c.shadowColor=b.col;c.shadowBlur=10*gl;c.fillStyle=b.col;c.strokeStyle=b.col;if(b.len){c.lineWidth=4;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x,b.y+b.len);c.stroke()}else if(b.homing||b.accel){c.beginPath();c.ellipse(b.x,b.y,b.r,b.r*1.6,Math.atan2(b.vy,b.vx)+1.57,0,6.283);c.fill();SW.FX.burst&&Math.random()<.5&&SW.FX.burst(b.x-b.vx*.02,b.y-b.vy*.02,'#fa6',1,30,.25,2)}else{c.lineWidth=b.r;c.lineCap='round';c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.018,b.y-b.vy*.018);c.stroke()}}
    for(const b of this.eb){if(!b.on)continue;c.shadowColor=b.col;c.shadowBlur=8*gl;c.fillStyle=b.col;c.beginPath();if(cb){c.moveTo(b.x,b.y-b.r-2);c.lineTo(b.x+b.r+2,b.y);c.lineTo(b.x,b.y+b.r+2);c.lineTo(b.x-b.r-2,b.y);c.closePath();c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke()}else{c.arc(b.x,b.y,b.r,0,6.283);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(b.x,b.y,b.r*.45,0,6.283);c.fill()}}c.restore();
    SW.Player.draw(c,this.p,this);SW.FX.draw(c);
    if(this.ph=='intro'&&this.state=='playing'){c.fillStyle='#fff';c.globalAlpha=Math.min(1,this.wt);c.font='bold 30px sans-serif';c.textAlign='center';c.fillText(this.endless?'ENDLESS':'LEVEL '+(this.idx+1),300,300);c.font='18px sans-serif';c.fillText(this.endless?'Survive!':this.data.n.toUpperCase(),300,332);c.globalAlpha=1;c.textAlign='left'}
    c.restore()},
  // ---- HUD (HTML). set() only touches the DOM when a value changed. ----
  set(id,v,attr){const k=id+(attr||'');if(this.cache[k]===v)return;this.cache[k]=v;const el=document.getElementById(id);if(!el)return;if(attr=='w')el.style.width=v;else el.textContent=v},
  hud(){const p=this.p,S=SW.Settings;const tk=this.state+S.get('touch');if(this.cache.tk!==tk){this.cache.tk=tk;SW.UI.touchVis()}this.set('hFps',S.get('showFps')?this.fps+' FPS':'');if(!p||this.state=='menu')return;const s=this.set.bind(this);
    s('hHp',(p.hp/p.maxhp*100).toFixed(0)+'%','w');s('hSh',(p.sh/p.maxsh*100).toFixed(0)+'%','w');s('hSp',p.special.toFixed(0)+'%','w');s('hLives','♥'.repeat(Math.max(0,p.lives)));s('hScore',this.score);s('hHi',Math.max(this.score,this.endless?SW.data.endlessBest:SW.data.best[this.idx]|0));s('hCombo',(1+Math.min(this.combo,50)*.1).toFixed(1));
    s('hLevel',this.endless?'ENDLESS':'LV'+(this.idx+1)+' '+this.data.n);s('hWave',this.endless?'Wave '+(this.wi+1):this.boss||this.ph=='boss'||this.ph=='bossIntro'?'BOSS':'Wave '+Math.min(this.wi+1,this.data.waves)+'/'+this.data.waves);s('hKills','Kills '+this.kills);
    const w=SW.Weapons.defs[p.weapon];s('hWeapon',w.name+' L'+p.wl+' · ⚡'+Math.round(p.energy)+' · M'+p.missiles+' R'+p.rockets+' · Q:'+this.ABIL[SW.data.special].name);
    const b=this.boss;document.getElementById('hBoss').classList.toggle('hidden',!b);if(b){s('hBossName',b.name+(b.vuln?'  — VULNERABLE!':''));s('hBossBar',(b.hp/b.maxhp*100).toFixed(1)+'%','w')}
    s('hObj',this.endless?'Survive as long as you can':(this.data.boss?'Clear waves, then defeat the boss':'Clear all waves')+' · '+SW.Missions.nextText());
    let pw='';for(const k in p.buf)if(p.buf[k]>0)pw+='<span>'+{invuln:'★ Invulnerable',dmg:'D Damage+',rate:'R Rate+',rapid:'» Rapid',mult:'x2 Score',over:'Overdrive',sh:'Shield'}[k]+' '+Math.ceil(p.buf[k])+'s</span>';if(this.tsT>0)pw+='<span>Time Warp '+Math.ceil(this.tsT)+'s</span>';
    if(this.cache.pw!==pw){this.cache.pw=pw;document.getElementById('hPow').innerHTML=pw}
    const tip=S.get('tutorial')&&this.idx==0&&!this.endless&&this.time<14?'Move: WASD/Arrows · Fire: Space · Dash: Shift · Special: Q · Missile: E':'';s('hTip',tip)}
};
