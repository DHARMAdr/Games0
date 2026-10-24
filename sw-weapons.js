// weapons.js — weapon definitions. Each weapon is {name, rate (shots/sec), col, fire(g,p,m)}.
// g = the Game, p = the player, m = damage multiplier (weapon level x upgrades x buffs). Bullets are created with g.pShot(x,y,vx,vy,damage,options).
// To add a weapon: add an entry to defs, push its id into `order`, done. (12 weapons total: 10 primary + homing missiles (E) + Nova Blast (special ability).)
SW.Weapons={
  order:['laser','twin','triple','spread','plasma','railgun','chain','beam','rocket','drones'],
  defs:{
    laser:{name:'Laser Cannon',rate:6,col:'#4df',fire(g,p,m){g.pShot(p.x,p.y-18,0,-760,10*m,{col:this.col})}},
    twin:{name:'Twin Beams',rate:6,col:'#7ff',fire(g,p,m){for(const o of[-9,9])g.pShot(p.x+o,p.y-14,0,-780,8*m,{col:this.col})}},
    triple:{name:'Triple Shot',rate:4.5,col:'#fd4',fire(g,p,m){const a=p.wl>=3?[-.36,-.18,0,.18,.36]:[-.18,0,.18];for(const k of a)g.pShot(p.x,p.y-16,Math.sin(k)*700,-Math.cos(k)*700,8*m,{col:this.col})}},
    spread:{name:'Spread Shot',rate:3.5,col:'#f94',fire(g,p,m){const n=p.wl>=3?7:5;for(let i=0;i<n;i++){const k=(i/(n-1)-.5)*1.1;g.pShot(p.x,p.y-14,Math.sin(k)*600,-Math.cos(k)*600,6*m,{col:this.col,life:1.05})}}},
    plasma:{name:'Plasma Cannon',rate:1.6,col:'#c5f',fire(g,p,m){g.pShot(p.x,p.y-20,0,-380,42*m,{col:this.col,r:11,pierce:2,splash:45,life:2.4})}},
    railgun:{name:'Railgun',rate:.9,col:'#fff',cost:22,fire(g,p,m){g.pShot(p.x,p.y-24,0,-1500,95*m,{col:this.col,r:6,pierce:99,len:46})}},
    chain:{name:'Chain Lightning',rate:2.2,col:'#8cf',cost:10,fire(g,p,m){const t=g.nearest(p.x,p.y,420);if(!t)return false;let cur=t,hit=[t],pts=[[p.x,p.y-16],[t.x,t.y]];g.dmg(t,22*m,false);
      for(let i=0;i<1+Math.ceil(p.wl/2);i++){let best=null,bd=170;for(const e of g.targets())if(!hit.includes(e)){const d=Math.hypot(e.x-cur.x,e.y-cur.y);if(d<bd){bd=d;best=e}}if(!best)break;hit.push(best);pts.push([best.x,best.y]);g.dmg(best,18*m,false);cur=best}SW.FX.bolt(pts,this.col)}},
    beam:{name:'Charged Beam',rate:0,col:'#f6a',beam:true,fire(){return false}},   // continuous; handled in player.js (drains energy, can overheat)
    rocket:{name:'Explosive Rockets',rate:1.5,col:'#f84',ammo:'rockets',fire(g,p,m){g.pShot(p.x,p.y-16,0,-300,32*m,{col:this.col,r:6,splash:80,accel:520,life:2})}},
    drones:{name:'Orbit Drones',rate:5,col:'#9f9',fire(g,p,m){g.pShot(p.x,p.y-16,0,-720,6*m,{col:this.col});for(const d of p.droneList()){const t=g.nearest(d.x,d.y,500);const a=t?Math.atan2(t.y-d.y,t.x-d.x):-1.5708;g.pShot(d.x,d.y,Math.cos(a)*620,Math.sin(a)*620,5*m,{col:this.col,r:3})}}},
    missile:{name:'Homing Missiles',rate:2,col:'#ff8a65',fire(g,p,m){for(const o of[-12,12])g.pShot(p.x+o,p.y-6,o*3,-260,28*m,{col:this.col,r:5,homing:6,splash:35,accel:380,life:2.6})}}
  },
  // fire(): called by the player when the cooldown is ready. Returns the weapon definition that REALLY fired (or false).
  // If a special weapon lacks energy/ammo (or chain lightning has no target) the LASER fires instead - with the laser's own fire rate - so the player can ALWAYS shoot.
  fire(g,p){let d=this.defs[p.weapon];const m=p.dmgMul();if(d.beam)return false;
    const can=!(d.cost&&p.energy<d.cost||d.ammo&&p[d.ammo]<=0);
    if(can&&d.fire(g,p,m)!==false){if(d.cost)p.energy-=d.cost;if(d.ammo)p[d.ammo]--}else{d=this.defs.laser;d.fire(g,p,m)}
    g.sfx('laser');return d}
};
