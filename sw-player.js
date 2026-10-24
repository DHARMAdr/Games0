// player.js — ships, upgrades, the player object (movement, dash, firing, damage, respawn) and the ship drawing.
SW.Player={
  // 5 ships. Stats really change gameplay: hp, shield, speed, dmg (damage x), fire (rate x), dashCd/dashInv (dash cooldown / invulnerable time).
  SHIPS:{interceptor:{name:'Interceptor',desc:'Fast movement',hp:80,sh:40,speed:380,dmg:1,fire:1.1,dashCd:1.4,dashInv:.25,col:'#3af',cost:0},
    defender:{name:'Defender',desc:'Heavy armor & shields',hp:150,sh:100,speed:270,dmg:1,fire:1,dashCd:2,dashInv:.25,col:'#6f6',cost:700},
    destroyer:{name:'Destroyer',desc:'Heavy weapon damage',hp:100,sh:50,speed:250,dmg:1.5,fire:.9,dashCd:2,dashInv:.25,col:'#f74',cost:1000},
    phantom:{name:'Phantom',desc:'Enhanced evasion',hp:70,sh:50,speed:330,dmg:1,fire:1,dashCd:.8,dashInv:.5,col:'#c6f',cost:1200},
    nova:{name:'Nova',desc:'Balanced performance',hp:110,sh:70,speed:310,dmg:1.15,fire:1.1,dashCd:1.3,dashInv:.3,col:'#fd3',cost:1800}},
  // 10 upgrade lines, 5 levels each. `per` text is shown in the UI; stats() below applies them for real.
  UPG:[{id:'hull',name:'Hull Plating',per:'+20 HP',base:120},{id:'shield',name:'Shield Capacity',per:'+15 shield',base:120},{id:'engine',name:'Engine Speed',per:'+6% speed',base:100},
    {id:'damage',name:'Weapon Damage',per:'+8% damage',base:150},{id:'rate',name:'Firing Rate',per:'+6% rate',base:150},{id:'proj',name:'Projectile Speed',per:'+8% speed',base:90},
    {id:'cool',name:'Special Cooldown',per:'-8% special cost',base:130},{id:'magnet',name:'Pickup Range',per:'+25 range',base:80},{id:'crit',name:'Critical Chance',per:'+3% crit',base:140},{id:'start',name:'Starting Resources',per:'+4 missiles/rockets',base:100}],
  lv(id){return SW.data.upgrades[id]|0},cost(id){const u=this.UPG.find(x=>x.id==id);return Math.round(u.base*(1+this.lv(id)*.9))},
  stats(){const s=this.SHIPS[SW.data.ship]||this.SHIPS.interceptor,L=id=>this.lv(id);
    return{hp:s.hp+20*L('hull'),sh:s.sh+15*L('shield'),speed:s.speed*(1+.06*L('engine')),dmg:s.dmg*(1+.08*L('damage')),fire:s.fire*(1+.06*L('rate')),proj:1+.08*L('proj'),
      cool:1-.08*L('cool'),magnet:70+25*L('magnet'),crit:.05+.03*L('crit'),ammo:6+4*L('start'),dashCd:s.dashCd,dashInv:s.dashInv,col:s.col,shRegen:9}},
  create(g){const st=this.stats();const p={x:300,y:680,vx:0,vy:0,r:12,st,hp:st.hp,maxhp:st.hp,sh:st.sh,maxsh:st.sh,lives:3,inv:2,flash:0,shT:0,dashT:0,dashCd:0,dvx:0,dvy:-1,energy:100,special:0,
      weapon:'laser',owned:['laser'],wl:1,missiles:st.ammo,rockets:st.ammo,cd:0,sec:0,tick:0,beamOn:false,overheat:false,buf:{},boost:0,dead:false,rt:0,fireOn:false,autoT:false,ang:0,hitT:0,
      dmgMul(){let m=this.st.dmg*(1+.25*(this.wl-1))*(this.buf.dmg>0?1.6:1)*(this.buf.over>0?1.2:1);return m},
      droneList(){const n=this.weapon=='drones'?2+(this.wl>=3)+(this.wl>=5):0,a=[];for(let i=0;i<n;i++){const k=this.ang+i*6.283/n;a.push({x:this.x+Math.cos(k)*38,y:this.y+Math.sin(k)*38})}return a}};return p},
  update(p,dt,g){const C=SW.Controls,S=SW.Settings,st=p.st,b=p.buf;for(const k in b)if(b[k]>0)b[k]-=dt;
    p.ang+=dt*3;p.hitT-=dt;p.flash-=dt;
    if(p.dead){p.rt-=dt;if(p.rt<=0&&p.lives>0){p.dead=false;p.hp=p.maxhp;p.sh=p.maxsh;p.inv=2.5;p.x=300;p.y=700}C.edge.fire=false;return}
    p.inv-=dt;p.dashCd-=dt;p.cd-=dt;p.sec-=dt;
    const m=C.move(p),sp=st.speed*(b.over>0?1.35:1);
    if(p.dashT<=0&&C.pressed('dash')&&p.dashCd<=0){const l=Math.hypot(m.x,m.y);p.dvx=l>.1?m.x/l:0;p.dvy=l>.1?m.y/l:-1;p.dashT=.16;p.inv=Math.max(p.inv,st.dashInv);p.dashCd=st.dashCd;g.sfx('dash');SW.FX.burst(p.x,p.y,st.col,16,160,.4)}
    if(p.dashT>0){p.dashT-=dt;p.vx=p.dvx*sp*3;p.vy=p.dvy*sp*3;if(p.tick++%2==0)SW.FX.burst(p.x,p.y+8,st.col,2,40,.3)}
    else{p.vx+=(m.x*sp-p.vx)*Math.min(1,dt*12);p.vy+=(m.y*sp-p.vy)*Math.min(1,dt*12)}
    p.x=Math.max(20,Math.min(580,p.x+p.vx*dt));p.y=Math.max(60,Math.min(780,p.y+p.vy*dt));
    // Weapon firing. fireMode 'toggle' = press once to start/stop firing. Auto-fire (setting or F key) fires without holding.
    if(C.pressed('auto'))p.autoT=!p.autoT;let want;if(S.get('fireMode')=='toggle'){if(C.pressed('fire'))p.fireOn=!p.fireOn;want=p.fireOn}else{want=C.held('fire');C.edge.fire=false}
    want=want||S.get('autoFire')||p.autoT;const w=SW.Weapons.defs[p.weapon];
    if(w.beam){p.beamOn=want&&!p.overheat&&p.energy>0;if(p.beamOn){p.energy-=30*dt;p.tick++;if(p.energy<=0){p.energy=0;p.overheat=true;g.toast('Beam overheated!')}if(g.time-(p.bt||0)>.05){p.bt=g.time;g.beamHit(p)}}}
    else{p.beamOn=false;if(want&&p.cd<=0){const used=SW.Weapons.fire(g,p);if(used){p.cd=1/(used.rate*st.fire*(b.rate>0?1.4:1)*(b.rapid>0?2:1)*(b.over>0?1.5:1));g.shots++}}}
    if(p.overheat&&p.energy>25)p.overheat=false;
    if(!p.beamOn)p.energy=Math.min(100,p.energy+16*dt);
    if(C.held('secondary')&&p.sec<=0&&p.missiles>0){p.missiles--;p.sec=.5;SW.Weapons.defs.missile.fire(g,p,p.dmgMul());g.sfx('missile');g.shots++}
    if(C.pressed('special'))g.useSpecial();
    if(C.pressed('switchW')){const i=p.owned.indexOf(p.weapon);p.weapon=p.owned[(i+1)%p.owned.length];g.sfx('ui');g.toast(SW.Weapons.defs[p.weapon].name)}
    if(C.pressed('switchA')){const ids=Object.keys(g.ABIL),i=ids.indexOf(SW.data.special);SW.data.special=ids[(i+1)%ids.length];g.sfx('ui');g.toast('Ability: '+g.ABIL[SW.data.special].name)}
    p.shT-=dt;if(p.shT<=0&&p.sh<p.maxsh)p.sh=Math.min(p.maxsh,p.sh+st.shRegen*dt)},
  // hit(): returns true if damage landed. Order: invulnerable? -> energy-shield ability -> shield -> hull.
  hit(p,d,g){if(p.dead||p.inv>0||p.buf.invuln>0)return false;g.combo=0;g.comboT=0;p.hitT=.4;p.shT=3;g.flawless=false;
    if(p.boost>0){p.boost-=d;g.sfx('shield');SW.FX.ring(p.x,p.y,'#4df',40);if(p.boost<=0)p.boost=0;p.inv=.3;return true}
    p.inv=1.1;g.sfx('hurt');g.shake(8);g.flash();
    if(p.sh>0){const a=Math.min(p.sh,d);p.sh-=a;d-=a;SW.FX.ring(p.x,p.y,'#4df',50)}
    if(d>0){p.hp-=d;p.flash=.15;SW.FX.burst(p.x,p.y,'#f66',12,140,.5)}
    if(p.hp<=0)this.die(p,g);return true},
  die(p,g){p.dead=true;p.lives--;p.rt=1.4;g.livesLost++;g.flawless=false;SW.FX.burst(p.x,p.y,'#ff9',60,320,.9,3);SW.FX.ring(p.x,p.y,'#fa4',140);g.sfx('explode');g.shake(16);g.flash();
    if(p.lives<=0)g.gameOver()},
  draw(c,p,g){if(p.dead)return;const st=p.st,glow=SW.Settings.get('glow');c.save();c.translate(p.x,p.y);if(p.inv>0&&((p.inv*18)|0)%2)c.globalAlpha=.45;c.rotate(p.vx/st.speed*.22);
    const fl=12+Math.random()*10+Math.abs(p.vy)*.02+(p.dashT>0?16:0);for(const o of[-7,7]){const gr=c.createLinearGradient(0,12,0,12+fl);gr.addColorStop(0,'#fff');gr.addColorStop(.3,'#8cf');gr.addColorStop(1,'#00e5ff00');c.fillStyle=gr;c.beginPath();c.moveTo(o-4,12);c.lineTo(o+4,12);c.lineTo(o,12+fl);c.fill()}
    c.shadowColor=st.col;c.shadowBlur=14*glow;
    let gr=c.createLinearGradient(-22,0,22,0);gr.addColorStop(0,'#3a4a70');gr.addColorStop(.5,'#cfe0ff');gr.addColorStop(1,'#3a4a70');
    c.fillStyle=gr;c.beginPath();c.moveTo(0,-22);c.lineTo(8,-4);c.lineTo(26,14);c.lineTo(22,18);c.lineTo(9,10);c.lineTo(7,16);c.lineTo(-7,16);c.lineTo(-9,10);c.lineTo(-22,18);c.lineTo(-26,14);c.lineTo(-8,-4);c.closePath();c.fill();   // wings + hull
    c.shadowBlur=0;c.fillStyle=st.col;c.beginPath();c.moveTo(-26,14);c.lineTo(-17,8);c.lineTo(-19,16);c.fill();c.beginPath();c.moveTo(26,14);c.lineTo(17,8);c.lineTo(19,16);c.fill();c.fillRect(-1.5,-18,3,16);      // accent stripes
    if(p.wl>=3){c.fillStyle='#9ab';c.fillRect(-20,2,4,12);c.fillRect(16,2,4,12)}if(p.wl>=5){c.strokeStyle=st.col;c.globalAlpha=.5;c.beginPath();c.arc(0,0,30,0,6.283);c.stroke();c.globalAlpha=1}
    gr=c.createRadialGradient(0,-6,1,0,-6,7);gr.addColorStop(0,'#fff');gr.addColorStop(.5,'#4df');gr.addColorStop(1,'#06a');c.fillStyle=gr;c.beginPath();c.ellipse(0,-6,4.5,7,0,0,6.283);c.fill();                                // cockpit
    if(p.flash>0){c.globalAlpha=.7;c.fillStyle='#fff';c.beginPath();c.moveTo(0,-22);c.lineTo(26,14);c.lineTo(-26,14);c.fill();c.globalAlpha=1}
    c.restore();
    if(p.sh>0||p.boost>0){c.save();c.translate(p.x,p.y);const w=p.hitT>0?Math.sin(g.time*60)*3*p.hitT*2.5:0;c.strokeStyle=p.boost>0?'#ffd740':'#4df';c.globalAlpha=.25+.35*(p.hitT>0?1:p.sh/p.maxsh);c.lineWidth=2;c.beginPath();c.ellipse(0,0,30+w,30-w,0,0,6.283);c.stroke();c.restore()}
    for(const d of p.droneList()){c.fillStyle='#9f9';c.shadowColor='#9f9';c.shadowBlur=8*glow;c.beginPath();c.arc(d.x,d.y,5,0,6.283);c.fill();c.shadowBlur=0}
    if(p.beamOn){const gr=c.createLinearGradient(0,p.y,0,0);gr.addColorStop(0,'#f6a');gr.addColorStop(1,'#f6a0');c.fillStyle=gr;c.globalAlpha=.7+Math.random()*.3;c.fillRect(p.x-7,0,14,p.y-20);c.fillStyle='#fff';c.fillRect(p.x-2,0,4,p.y-20);c.globalAlpha=1}}
};
