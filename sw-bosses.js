// bosses.js — 4 bosses (one per world). Each boss is data + small functions:
//  move(b,dt,g)  default movement;   pats(b) -> list of attack patterns {n,dur,f(b,dt,g,first)} chosen by phase;   phases(hpRatio) -> phase number;   draw(c,b)
// The generic update() runs patterns in order. Powerful attacks first show a TELEGRAPH (g.hazard with tele>0 = red warning), and each boss has VULNERABLE windows (b.vuln=true = takes +50% damage).
// Phase changes make the boss invulnerable for ~1.6s (so the player can read the change) and clear enemy bullets.
SW.Bosses={
  D:{
    warden:{name:'SOLAR WARDEN',hp:1700,w:220,h:90,ty:130,col:'#ffb35a',phases:r=>r<.5?1:0,
      move(b,dt){b.x=300+Math.sin(b.t*.7)*150},
      pats(b){const s=b.phase?1.25:1;return[
        {n:'volley',dur:2.4,f(b,dt,g){b.a=(b.a||0)-dt;if(b.a<=0){b.a=.5/s;const a=g.aim(b.x,b.y+40);for(let k=-1;k<=1;k++)g.eShot(b.x,b.y+50,a+k*.18,300*s,9*g.dif.dmg)}}},
        {n:'arc',dur:2,f(b,dt,g,first){if(first||b.phase&&b.pt>1&&!b.k2){b.k2=!first;for(let i=0;i<11;i++)g.eShot(b.x,b.y+50,-.8+i*.16,230*s,8*g.dif.dmg)}if(first)b.k2=false}},
        {n:'beam',dur:3.4,f(b,dt,g,first){if(first){g.hazard({k:'rect',x:g.p.x-28,y:0,w:56,h:800,tele:1.1,t:.7,dmg:28*g.dif.dmg});g.sfx('bossHit')}
          if(b.phase&&Math.abs(b.pt-1.2)<dt){g.hazard({k:'rect',x:g.p.x-28,y:0,w:56,h:800,tele:.9,t:.6,dmg:28*g.dif.dmg})}b.vuln=b.pt>2.3}}]},
      draw(c,b){const w=b.w/2;let gr=c.createLinearGradient(0,-45,0,45);gr.addColorStop(0,'#ffd9a0');gr.addColorStop(.5,'#b86a2a');gr.addColorStop(1,'#4a2410');c.fillStyle=gr;c.beginPath();c.moveTo(-w,10);c.lineTo(-w*.6,-40);c.lineTo(w*.6,-40);c.lineTo(w,10);c.lineTo(w*.55,45);c.lineTo(-w*.55,45);c.closePath();c.fill();
        c.strokeStyle='#ffe0b0';c.lineWidth=2;c.stroke();c.fillStyle='#5a2a10';for(const o of[-70,70]){c.fillRect(o-10,20,20,34)}c.fillStyle='#ffcc80';c.fillRect(-w*.4,-30,w*.8,8);
        gr=c.createRadialGradient(0,0,2,0,0,22);gr.addColorStop(0,b.vuln?'#fff':'#ffeb3b');gr.addColorStop(1,b.vuln?'#2af':'#f40');c.fillStyle=gr;c.beginPath();c.arc(0,0,16+(b.vuln?4:0),0,6.283);c.fill()}},
    serpent:{name:'NEBULA SERPENT',hp:2400,w:70,h:70,ty:190,col:'#c64dff',phases:r=>r<.5?1:0,
      move(b,dt){if(!b.ov){b.x=300+Math.sin(b.t*.9)*220;b.y=190+Math.sin(b.t*1.7)*70}},
      pats(b){const s=b.phase?1.3:1;return[
        {n:'sweep',dur:4,f(b,dt,g,first){if(first){b.sy=200+Math.random()*260;g.hazard({k:'rect',x:0,y:b.sy-26,w:600,h:52,tele:1,t:.9,dmg:26*g.dif.dmg})}
          b.ov=b.pt<2.4;if(b.pt<1){b.x+=(-90-b.x)*Math.min(1,dt*5);b.y+=(b.sy-b.y)*Math.min(1,dt*5)}else if(b.pt<1.9){b.x=-90+(b.pt-1)/.9*780;b.y=b.sy}else if(b.pt<2.4){b.y+=(180-b.y)*Math.min(1,dt*4);b.x+=(300-b.x)*Math.min(1,dt*3)}b.vuln=b.pt>2.4}},
        {n:'spit',dur:3,f(b,dt,g){b.a=(b.a||0)-dt;if(b.a<=0){b.a=.55/s;const sg=b.segs[(Math.random()*b.segs.length)|0]||b;for(let i=0;i<8;i++)g.eShot(sg.x,sg.y,i*.785+b.t,190*s,7*g.dif.dmg)}}},
        {n:'storm',dur:3,f(b,dt,g,first){if(first)for(let i=0;i<(b.phase?5:4);i++)g.hazard({k:'circle',x:80+Math.random()*440,y:300+Math.random()*420,r:70,tele:1.2,t:.8,dmg:22*g.dif.dmg})}}]},
      draw(c,b,g){const n=b.segs.length;for(let i=n-1;i>=0;i--){const s=b.segs[i],r=26-i*.8;c.save();c.translate(s.x-b.x,s.y-b.y);const gr=c.createRadialGradient(-4,-4,2,0,0,r);gr.addColorStop(0,'#f0b0ff');gr.addColorStop(1,'#4a1070');c.fillStyle=gr;c.beginPath();c.arc(0,0,r,0,6.283);c.fill();c.strokeStyle='#e0a0ff';c.lineWidth=1.5;c.stroke();c.restore()}
        const gr=c.createRadialGradient(0,-6,3,0,0,36);gr.addColorStop(0,b.vuln?'#fff':'#e6a0ff');gr.addColorStop(1,'#5a1a90');c.fillStyle=gr;c.beginPath();c.ellipse(0,0,32,38,0,0,6.283);c.fill();c.fillStyle='#ff0';c.beginPath();c.arc(-12,-6,6,0,6.283);c.arc(12,-6,6,0,6.283);c.fill();c.strokeStyle='#e6a0ff';c.lineWidth=3;c.beginPath();c.moveTo(-14,16);c.lineTo(-8,34);c.moveTo(14,16);c.lineTo(8,34);c.stroke()}},
    dread:{name:'ABYSSAL DREADNOUGHT',hp:3400,w:300,h:110,ty:150,col:'#2a8a7a',phases:r=>r<.5?1:0,
      move(b){b.x=300+Math.sin(b.t*.4)*80},
      pats(b){const s=b.phase?1.2:1;return[
        {n:'turrets',dur:4,f(b,dt,g){b.a=(b.a||0)-dt;if(b.a<=0){b.a=.6/s;b.tt=!b.tt;const tx=b.x+(b.tt?-95:95),ty=b.y+38;g.eShot(tx,ty,g.aim(tx,ty),320*s,9*g.dif.dmg);g.eShot(tx,ty,g.aim(tx,ty)+.12,320*s,9*g.dif.dmg)}}},
        {n:'barrage',dur:3,f(b,dt,g,first){if(first||Math.abs(b.pt-1.5)<dt){const o=Math.random();for(let i=0;i<16;i++)g.eShot(b.x,b.y+30,i*.3927+o,200*s,8*g.dif.dmg)}}},
        {n:'summon',dur:3.2,f(b,dt,g,first){if(first){g.sfx('bossArrive');g.spawnEnemy('interceptor',b.x-90,b.y+60,{x0:150,st:1});g.spawnEnemy('interceptor',b.x+90,b.y+60,{x0:450,st:1})}b.vuln=b.pt>1.5}},
        {n:'cannon',dur:3.6,f(b,dt,g,first){if(first){g.hazard({k:'rect',x:g.p.x-45,y:0,w:90,h:800,tele:1.3,t:.8,dmg:32*g.dif.dmg});if(b.phase){g.hazard({k:'rect',x:100,y:0,w:50,h:800,tele:1.5,t:.7,dmg:26*g.dif.dmg});g.hazard({k:'rect',x:450,y:0,w:50,h:800,tele:1.5,t:.7,dmg:26*g.dif.dmg})}}b.vuln=b.pt>2.4}}]},
      draw(c,b){const w=b.w/2,gr=c.createLinearGradient(0,-55,0,55);gr.addColorStop(0,'#4a6a68');gr.addColorStop(1,'#0a1a1a');c.fillStyle=gr;c.beginPath();c.moveTo(-w,0);c.lineTo(-w*.8,-50);c.lineTo(w*.8,-50);c.lineTo(w,0);c.lineTo(w*.7,55);c.lineTo(-w*.7,55);c.closePath();c.fill();c.strokeStyle='#5fd0b8';c.lineWidth=2;c.stroke();
        for(const o of[-95,95]){c.fillStyle='#183030';c.beginPath();c.arc(o,38,16,0,6.283);c.fill();c.strokeStyle='#5fd0b8';c.stroke();c.fillStyle='#8ff';c.fillRect(o-3,40,6,22)}c.fillStyle=b.vuln?'#fff':'#0ff';c.fillRect(-50,-20,100,14);c.fillStyle='#0a1a1a';c.fillRect(-w*.3,18,w*.6,20)}},
    overlord:{name:'THE INFINITY OVERLORD',hp:5200,w:180,h:180,ty:170,col:'#ff2bd6',phases:r=>r<.33?2:r<.66?1:0,
      move(b){b.x=300+Math.sin(b.t*.6)*(120+b.phase*40);b.y=170+Math.sin(b.t*1.1)*20},
      pats(b){const P=b.phase,s=1+P*.25,rings={n:'rings',dur:3,f(b,dt,g){b.a=(b.a||0)-dt;if(b.a<=0){b.a=.75/s;b.ro=(b.ro||0)+.2;for(let i=0;i<14;i++)g.eShot(b.x,b.y,i*.4488+b.ro,190*s,8*g.dif.dmg)}}},
        aimed={n:'aimed',dur:2.4,f(b,dt,g){b.a=(b.a||0)-dt;if(b.a<=0){b.a=.5/s;const a=g.aim(b.x,b.y);for(let k=-1;k<=1;k++)g.eShot(b.x,b.y+40,a+k*.16,320*s,9*g.dif.dmg)}b.vuln=b.pt>1.4}},
        spiral={n:'spiral',dur:3.5,f(b,dt,g){b.a=(b.a||0)-dt;if(b.a<=0){b.a=.07;b.sp=(b.sp||0)+.35;for(let k=0;k<3;k++)g.eShot(b.x,b.y,b.sp+k*2.094,210*s,7*g.dif.dmg)}}},
        wave={n:'wave',dur:2.5,f(b,dt,g,first){if(first){const gap=60+Math.random()*480;for(let x=20;x<600;x+=36)if(Math.abs(x-gap)>60)g.eShot(x,b.y+70,0,210,8*g.dif.dmg,{r:7,col:'#f8f'})}b.vuln=b.pt>1.5}},
        summon={n:'summon',dur:2.2,f(b,dt,g,first){if(first){g.sfx('bossArrive');for(let i=0;i<3;i++)g.spawnEnemy('scout',150+i*150,-20,{x0:150+i*150})}b.vuln=b.pt>1}},
        beams={n:'beams',dur:3,f(b,dt,g,first){if(first){for(const x of[g.p.x-30,Math.random()*500+40]){g.hazard({k:'rect',x:x-26,y:0,w:52,h:800,tele:1.2,t:.7,dmg:30*g.dif.dmg})}}b.vuln=b.pt>2}};
        return P==0?[rings,aimed,rings,summon]:P==1?[spiral,wave,aimed,summon,rings]:[rings,spiral,beams,wave,aimed,summon,beams]},
      draw(c,b){const P=b.phase,col=['#ff2bd6','#7c4dff','#ffea00'][P],t=b.t;let gr=c.createRadialGradient(0,0,6,0,0,80);gr.addColorStop(0,b.vuln?'#fff':'#ffd0f8');gr.addColorStop(.35,col);gr.addColorStop(1,'#10002a');c.fillStyle=gr;c.shadowColor=col;c.shadowBlur=28*SW.Settings.get('glow');c.beginPath();c.arc(0,0,66+Math.sin(t*5)*3,0,6.283);c.fill();c.shadowBlur=0;
        c.strokeStyle=col;c.lineWidth=3;for(let i=0;i<3+P;i++){c.beginPath();c.arc(0,0,78+i*8,t*(.8+i*.3)+i*2,t*(.8+i*.3)+i*2+1.8);c.stroke()}
        c.fillStyle=col;for(let i=0;i<8;i++){const a=i*.785+t*.4;c.beginPath();c.moveTo(Math.cos(a)*70,Math.sin(a)*70);c.lineTo(Math.cos(a+.12)*100,Math.sin(a+.12)*100);c.lineTo(Math.cos(a+.24)*70,Math.sin(a+.24)*70);c.fill()}
        c.fillStyle='#000';c.beginPath();c.ellipse(0,0,24,12+P*3,0,0,6.283);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(0,0,6,0,6.283);c.fill()}}
  },
  spawn(id,g){const d=this.D[id],hp=d.hp*g.hpMul;const b={id,d,x:300,y:-200,ty:d.ty,hp,maxhp:hp,w:d.w,h:d.h,r:Math.max(d.w,d.h)*.42,phase:0,t:0,pt:0,pi:0,state:'enter',inv:99,vuln:false,flash:0,dying:0,segs:[],trail:[],name:d.name};
    if(id=='serpent')b.r=34;g.sfx('bossArrive');g.toast('WARNING: '+d.name);return b},
  update(b,dt,g){const d=b.d;b.t+=dt;b.flash-=dt;
    if(b.dying>0){b.dying+=dt;if(Math.random()<dt*16)SW.FX.burst(b.x+(Math.random()-.5)*b.w,b.y+(Math.random()-.5)*b.h,'#ffc',22,280,.8,3);g.shake(5);if(b.dying>2.6)g.bossDead(b);return}
    if(b.state=='enter'){b.y+=dt*110;if(b.y>=b.ty){b.y=b.ty;b.state='fight';b.inv=0}this.trail(b);return}
    const ph=d.phases(b.hp/b.maxhp);if(ph>b.phase){b.phase=ph;b.inv=1.6;b.pt=0;b.pi=0;g.clearBullets();SW.FX.ring(b.x,b.y,'#fff',260);g.sfx('bossArrive');g.toast('PHASE '+(ph+1));g.shake(12)}
    if(b.inv>0){b.inv-=dt;this.trail(b);return}
    b.vuln=false;d.move(b,dt,g);const pats=d.pats(b),pt=pats[b.pi%pats.length],first=b.pt==0;b.pt+=dt;pt.f(b,dt,g,first);if(b.pt>=pt.dur){b.pi++;b.pt=0;b.ov=false}this.trail(b)},
  trail(b){if(b.id!='serpent')return;b.trail.push({x:b.x,y:b.y});if(b.trail.length>240)b.trail.shift();b.segs=[];for(let i=1;i<=9;i++){const t=b.trail[b.trail.length-1-i*7];if(t)b.segs.push({x:t.x,y:t.y})}},
  draw(c,b,g){c.save();if(b.id!='serpent')c.translate(b.x,b.y);else c.translate(b.x,b.y);if(b.inv>0&&b.state=='fight')c.globalAlpha=.55+.3*Math.sin(b.t*30);b.d.draw(c,b,g);
    if(b.flash>0){c.globalAlpha=.4;c.fillStyle='#fff';c.beginPath();c.arc(0,0,b.r,0,6.283);c.fill()}c.restore()}
};
