// enemies.js — 10 enemy types. Each has stats in T (hp, radius r, speed sp, score sc, credits cr, colour, outline polygon pts) and its AI lives in update() as a small state machine
// (e.st = current state, e.stT = time in state). g = Game; g.eShot(x,y,angle,speed,dmg) fires an enemy bullet (angle 0 = straight down).
// To add an enemy: add a row to T, a `case` in update(), and use it in a level pool (levels.js).
SW.Enemies={
  T:{
    scout:{hp:20,r:13,sp:140,sc:100,cr:2,col:'#4f8',pts:[[0,1],[.7,-.8],[0,-.4],[-.7,-.8]]},
    interceptor:{hp:36,r:15,sp:200,sc:160,cr:3,col:'#6cf',pts:[[0,1.1],[1,.2],[.6,-.9],[0,-.4],[-.6,-.9],[-1,.2]]},
    gunship:{hp:160,r:26,sp:60,sc:400,cr:8,col:'#fa5',pts:[[0,1],[1.1,.3],[1,-.7],[.4,-1],[-.4,-1],[-1,-.7],[-1.1,.3]]},
    kamikaze:{hp:26,r:13,sp:150,sc:130,cr:2,col:'#f55',pts:[[0,1.2],[.5,.2],[1,0],[.4,-.4],[0,-1],[-.4,-.4],[-1,0],[-.5,.2]]},
    sniper:{hp:64,r:16,sp:90,sc:300,cr:6,col:'#e7f',pts:[[0,1.4],[.4,.2],[.8,-.8],[0,-.5],[-.8,-.8],[-.4,.2]]},
    cruiser:{hp:130,r:28,sp:50,sc:450,cr:9,col:'#5df',pts:[[0,1],[1.2,.2],[1,-.9],[0,-.6],[-1,-.9],[-1.2,.2]]},
    phantom:{hp:56,r:16,sp:40,sc:350,cr:7,col:'#b9f',pts:[[0,1.1],[.9,-.2],[.5,-.9],[0,-.5],[-.5,-.9],[-.9,-.2]]},
    carrier:{hp:240,r:34,sp:40,sc:700,cr:14,col:'#9a8',pts:[[-1.2,.7],[1.2,.7],[1.4,-.6],[.8,-1],[-.8,-1],[-1.4,-.6]]},
    elite:{hp:280,r:26,sp:60,sc:900,cr:18,col:'#fd3',pts:[[0,1.3],[.3,.4],[1.2,.5],[.6,-.2],[1,-1],[0,-.6],[-1,-1],[-.6,-.2],[-1.2,.5],[-.3,.4]]},
    anomaly:{hp:220,r:24,sp:50,sc:800,cr:16,col:'#f4d',pts:null}
  },
  make(type,x,y,g,o){const t=this.T[type],hp=t.hp*g.hpMul;return Object.assign({type,x,y,x0:x,vx:0,vy:t.sp*g.dif.spd,hp,maxhp:hp,r:t.r,t:0,cd:.4+Math.random()*.8,st:0,stT:0,flash:0,stun:0,alpha:1,ph:Math.random()*6.28,shOn:false,cyc:-1,burst:0,bt:0,ang:0,chg:0,dead:false},o||{})},
  update(e,dt,g){const p=g.p,d=dt*g.ts,dif=g.dif;e.t+=d;e.flash-=dt;e.cd-=d;
    if(e.stun>0){e.stun-=dt;e.y+=15*dt;return}                         // EMP'd enemies drift and cannot fire
    const toP=()=>Math.atan2(p.x-e.x,p.y-e.y);
    switch(e.type){
    case'scout':e.y+=e.vy*d;e.x=e.x0+Math.sin(e.t*2.2+e.ph)*60;if(e.cd<=0&&e.y>0&&e.y<600){g.eShot(e.x,e.y+10,toP(),260*dif.spd,8*dif.dmg);e.cd=1.8*dif.fire}break;
    case'interceptor':if(e.st==0){e.y+=220*d;if(e.y>140+e.ph*10){e.st=1;e.stT=0}}                // enter, then flank the player
      else{e.stT+=d;const tx=p.x+(e.x0<300?-170:170);e.x+=(tx-e.x)*Math.min(1,d*1.6);e.y+=Math.sin(e.t*2)*30*d;if(e.cd<=0){e.burst=3;e.cd=2.2*dif.fire}
        if(e.burst>0&&(e.bt-=d)<=0){g.eShot(e.x,e.y+12,toP(),340*dif.spd,7*dif.dmg);e.burst--;e.bt=.13}if(e.stT>9)e.y+=300*d}break;
    case'gunship':if(e.y<110)e.y+=60*d;else e.x=e.x0+Math.sin(e.t*.6)*90;if(e.cd<=0&&e.y>40){const a=toP();for(let i=-2;i<=2;i++)g.eShot(e.x,e.y+20,a+i*.22,230*dif.spd,9*dif.dmg);e.cd=2.4*dif.fire}break;
    case'kamikaze':{const dx=p.x-e.x,dy=p.y-e.y,l=Math.hypot(dx,dy)||1;e.vx+=dx/l*420*d;e.vy+=dy/l*420*d;const s=Math.hypot(e.vx,e.vy),m=290*dif.spd;if(s>m){e.vx*=m/s;e.vy*=m/s}e.x+=e.vx*d;e.y+=e.vy*d;e.ang=Math.atan2(e.vx,e.vy);
      if(l<46&&!p.dead){g.explodeAt(e.x,e.y,90,22*dif.dmg);e.dead=true}}break;
    case'sniper':if(e.y<70)e.y+=90*d;else{e.x+=Math.sign(p.x-e.x)*40*d;e.stT+=d;
        if(e.st==0){if(e.stT<1.1)e.ang=toP();e.chg=Math.min(1,e.stT/1.4);if(e.stT>=1.4){g.eShot(e.x,e.y+16,e.ang,760*dif.spd,30*dif.dmg,{r:4,col:'#f4f'});e.st=1;e.stT=0;e.chg=0}}   // visible charge line, then precise shot
        else if(e.stT>1.8){e.st=0;e.stT=0}}break;
    case'cruiser':if(e.y<120)e.y+=50*d;else e.x=e.x0+Math.sin(e.t*.5)*70;e.shOn=(e.t%5)<3;                                   // temporary shield: 80% damage reduction while on
      if(e.cd<=0&&e.y>40){g.eShot(e.x-14,e.y+22,0,260*dif.spd,8*dif.dmg);g.eShot(e.x+14,e.y+22,0,260*dif.spd,8*dif.dmg);g.eShot(e.x,e.y+22,toP(),240*dif.spd,8*dif.dmg);e.cd=1.8*dif.fire}break;
    case'phantom':{e.y+=20*d;const t0=e.t%5,cyc=Math.floor(e.t/5);
      if(cyc!=e.cyc){e.cyc=cyc;e.x=Math.max(40,Math.min(560,p.x+(Math.random()-.5)*240));e.y=80+Math.random()*180;e.fireT=.6}                // reappear near the player, then attack
      e.alpha=t0<2?1:t0<2.5?1-(t0-2)*1.7:t0<4?.15:.15+(t0-4)*.85;if(e.fireT>0&&(e.fireT-=d)<=0){const a=toP();for(let i=-1;i<=1;i++)g.eShot(e.x,e.y+14,a+i*.2,280*dif.spd,8*dif.dmg)}}break;
    case'carrier':if(e.y<90)e.y+=40*d;else e.x=e.x0+Math.sin(e.t*.4)*80;if(e.cd<=0&&e.y>60){if(g.enemies.filter(k=>k.parent===e).length<4)g.spawnEnemy('scout',e.x,e.y+20,{parent:e});e.cd=3.5*dif.fire}break;
    case'elite':if(e.y<120)e.y+=50*d;else e.x=300+Math.sin(e.t*.7+e.ph)*200;{const pat=Math.floor(e.t/3)%3;
      if(e.cd<=0&&e.y>60){if(pat==0){const a=toP();for(let i=-2;i<=2;i++)g.eShot(e.x,e.y+20,a+i*.15,320*dif.spd,9*dif.dmg);e.cd=.9*dif.fire}
        else if(pat==1){for(let i=0;i<12;i++)g.eShot(e.x,e.y,i*.5236+e.t,200*dif.spd,8*dif.dmg);e.cd=1.2*dif.fire}else{g.eShot(e.x,e.y+10,Math.sin(e.t*4)*1.5,260*dif.spd,7*dif.dmg);e.cd=.1*dif.fire}}}break;
    case'anomaly':e.x=300+Math.cos(e.t*.8+e.ph)*170;e.y=230+Math.sin(e.t*1.3+e.ph)*90;
      if(e.cd<=0){g.hazard({k:'circle',x:p.x,y:p.y,r:80,tele:.9,t:.25,dmg:22*dif.dmg});for(let i=0;i<8;i++)g.eShot(e.x,e.y,i*.785+e.t,170*dif.spd,7*dif.dmg);e.cd=3.2*dif.fire}break}},
  draw(c,e,g){const t=this.T[e.type],r=e.r,gl=SW.Settings.get('glow');c.save();c.translate(e.x,e.y);c.globalAlpha=e.alpha;
    if(e.type=='anomaly'){const gr=c.createRadialGradient(0,0,2,0,0,r);gr.addColorStop(0,'#fff');gr.addColorStop(.4,t.col);gr.addColorStop(1,'#40006000');c.fillStyle=gr;c.shadowColor=t.col;c.shadowBlur=16*gl;c.beginPath();c.arc(0,0,r*(1+.1*Math.sin(e.t*6)),0,6.283);c.fill();c.strokeStyle=t.col;c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,r*.8+i*5,e.t*(1+i)+i,e.t*(1+i)+i+2.2);c.stroke()}}
    else{c.rotate(e.type=='kamikaze'?-e.ang+3.1416:0);const gr=c.createLinearGradient(0,-r,0,r);gr.addColorStop(0,t.col);gr.addColorStop(1,'#101830');const path=()=>{c.beginPath();t.pts.forEach((q,i)=>i?c.lineTo(q[0]*r,q[1]*r):c.moveTo(q[0]*r,q[1]*r));c.closePath()};
      c.fillStyle=gr;c.shadowColor=t.col;c.shadowBlur=10*gl;path();c.fill();c.shadowBlur=0;c.strokeStyle=t.col;c.lineWidth=1.5;c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(0,r*.25,r*.13,0,6.283);c.fill();
      if(e.type=='carrier'){c.fillStyle='#ff0';for(const o of[-.7,0,.7])c.fillRect(o*r-3,r*.3,6,4)}if(e.flash>0){c.globalAlpha=.7;c.fillStyle='#fff';path();c.fill()}}
    c.restore();
    if(e.type=='cruiser'&&e.shOn){c.strokeStyle='#5df';c.globalAlpha=.6;c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,r+10,0,6.283);c.stroke();c.globalAlpha=1}
    if(e.type=='sniper'&&e.chg>0){c.strokeStyle='rgba(255,70,200,'+(.2+e.chg*.7)+')';c.lineWidth=1+e.chg*2;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.sin(e.ang)*900,e.y+Math.cos(e.ang)*900);c.stroke()}
    if(e.hp<e.maxhp&&e.maxhp>90){c.fillStyle='#0008';c.fillRect(e.x-r,e.y-r-10,r*2,4);c.fillStyle='#f55';c.fillRect(e.x-r,e.y-r-10,r*2*Math.max(0,e.hp/e.maxhp),4)}}
};
