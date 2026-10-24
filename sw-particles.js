// particles.js — visual effects: SW.FX (pooled particles, floating text, lightning, shockwaves) and SW.BG (parallax starfield, nebula, planet, warp).
SW.FX={
  P:[],T:[],B:[],R:[],cap:700,
  // Particle pool: dead particles are REUSED instead of allocating new objects (keeps the garbage collector calm).
  burst(x,y,col,n,spd,life,size){n=Math.ceil(n*SW.Settings.fxScale());for(let i=0;i<n;i++){let p=null;for(const q of this.P)if(!q.on){p=q;break}if(!p){if(this.P.length>=this.cap)return;p={};this.P.push(p)}
    const a=Math.random()*6.283,s=spd*(.3+Math.random());p.on=true;p.x=x;p.y=y;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s;p.life=p.max=life*(.5+Math.random()*.7);p.col=col;p.size=size||2.5}},
  text(x,y,str,col){if(!SW.Settings.get('dmgNumbers')||this.T.length>40)return;this.T.push({x,y,str,col,t:.7})},
  bolt(pts,col){this.B.push({pts,col,t:.14})},ring(x,y,col,r1){this.R.push({x,y,col,r:6,r1:r1||80,t:.4,max:.4})},
  clear(){this.P.forEach(p=>p.on=false);this.T.length=0;this.B.length=0;this.R.length=0},
  update(dt){for(const p of this.P)if(p.on){p.life-=dt;if(p.life<=0){p.on=false;continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98}
    for(let i=this.T.length-1;i>=0;i--){const t=this.T[i];t.t-=dt;t.y-=40*dt;if(t.t<=0)this.T.splice(i,1)}
    for(let i=this.B.length-1;i>=0;i--){this.B[i].t-=dt;if(this.B[i].t<=0)this.B.splice(i,1)}
    for(let i=this.R.length-1;i>=0;i--){const r=this.R[i];r.t-=dt;r.r+=(r.r1-r.r)*dt*7;if(r.t<=0)this.R.splice(i,1)}},
  draw(c){const g=SW.Settings.get('glow');c.save();c.globalCompositeOperation='lighter';
    for(const p of this.P)if(p.on){c.globalAlpha=Math.max(0,p.life/p.max);c.fillStyle=p.col;c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)}
    c.globalAlpha=1;for(const r of this.R){c.strokeStyle=r.col;c.globalAlpha=r.t/r.max;c.lineWidth=3;c.beginPath();c.arc(r.x,r.y,r.r,0,6.283);c.stroke()}
    c.globalAlpha=1;c.lineWidth=2;for(const b of this.B){c.strokeStyle=b.col;c.shadowColor=b.col;c.shadowBlur=12*g;c.beginPath();b.pts.forEach((p,i)=>{const j=i?(Math.random()-.5)*10:0;i?c.lineTo(p[0]+j,p[1]+j):c.moveTo(p[0],p[1])});c.stroke()}
    c.restore();c.font='bold 13px sans-serif';c.textAlign='center';for(const t of this.T){c.globalAlpha=Math.min(1,t.t*2);c.fillStyle=t.col;c.fillText(t.str,t.x,t.y)}c.globalAlpha=1;c.textAlign='left'}
};
SW.BG={
  pal:null,stars:[],neb:null,ny:0,planetA:0,warp:0,scroll:0,
  // init(palette): builds the nebula image ONCE (offscreen canvas) so drawing it each frame is just one cheap drawImage.
  // NOTE: nebula blobs are drawn 9x (wrapped around the tile edges) so the tile is SEAMLESS when it scrolls.
  init(pal){this.pal=pal;const n=Math.floor(140*SW.Settings.get('stars')*({low:.4,medium:.7,high:1}[SW.Settings.get('quality')]||1));this.stars=[];
    for(let i=0;i<n;i++){const l=i%3;this.stars.push({x:Math.random()*600,y:Math.random()*800,l,s:[18,45,100][l],r:[.7,1.2,1.9][l],tw:Math.random()*6})}
    const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');if(x&&x.createRadialGradient){for(let i=0;i<7;i++){const px=Math.random()*300,py=Math.random()*400,r=60+Math.random()*90;for(const ox of[-300,0,300])for(const oy of[-400,0,400]){const g=x.createRadialGradient(px+ox,py+oy,2,px+ox,py+oy,r);g.addColorStop(0,pal.neb[i%2]+'66');g.addColorStop(1,pal.neb[i%2]+'00');x.fillStyle=g;x.fillRect(0,0,300,400)}}}this.neb=c},
  update(dt,sp){this.scroll+=dt;this.planetA+=dt*.3;this.ny=(this.ny+dt*14*(1+this.warp*8))%800;const m=1+this.warp*10;for(const s of this.stars){s.y+=s.s*dt*(sp||1)*m;if(s.y>800){s.y=-5;s.x=Math.random()*600}}if(this.warp>0)this.warp=Math.max(0,this.warp-dt*.6)},
  draw(c){const p=this.pal||SW.PAL0;let g=c.createLinearGradient(0,0,0,800);g.addColorStop(0,p.top);g.addColorStop(1,p.bot);c.fillStyle=g;c.fillRect(0,0,600,800);
    if(this.neb){c.globalAlpha=.9;c.drawImage(this.neb,0,this.ny-800,600,800);c.drawImage(this.neb,0,this.ny,600,800);c.globalAlpha=1}
    // Planet: gradient sphere + moving bands (rotation) + terminator shadow.
    const pl=p.planet,py=((this.scroll*6)%1100)-150,px=pl.x;c.save();c.beginPath();c.arc(px,py,pl.r,0,6.283);c.clip();g=c.createRadialGradient(px-pl.r*.3,py-pl.r*.3,pl.r*.1,px,py,pl.r);g.addColorStop(0,pl.c1);g.addColorStop(1,pl.c2);c.fillStyle=g;c.fillRect(px-pl.r,py-pl.r,pl.r*2,pl.r*2);
    c.globalAlpha=.25;c.fillStyle='#000';for(let i=0;i<5;i++)c.fillRect(px-pl.r,py-pl.r+((i*pl.r*.45+this.planetA*20)%(pl.r*2)),pl.r*2,pl.r*.1);c.globalAlpha=.55;g=c.createLinearGradient(px-pl.r,py,px+pl.r,py);g.addColorStop(0,'#0000');g.addColorStop(1,'#000');c.fillStyle=g;c.fillRect(px-pl.r,py-pl.r,pl.r*2,pl.r*2);c.restore();
    for(const s of this.stars){c.globalAlpha=.4+.6*Math.abs(Math.sin(this.scroll*2+s.tw));c.fillStyle='#fff';if(this.warp>.05){c.fillRect(s.x,s.y,s.r,s.r+s.s*this.warp*.5)}else c.fillRect(s.x,s.y,s.r,s.r)}c.globalAlpha=1}
};
SW.PAL0={top:'#02030c',bot:'#0a1240',neb:['#7c4dff','#00e5ff'],planet:{x:470,r:90,c1:'#4aa8ff',c2:'#0a2a6a'}};
