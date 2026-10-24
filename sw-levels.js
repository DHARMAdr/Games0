// levels.js — campaign data (12 levels in 4 worlds), the wave generator, missions and achievements.
// To add a level: push an object to SW.LEVELS {n:name, w:worldIndex, pool:[enemy types allowed], waves:count, env:'none|asteroids|storm|gravity', boss:'id' (optional)}.
SW.WORLDS=['SOLAR FRONTIER','NEBULA SECTOR','ABYSSAL EMPIRE','INFINITY CORE'];
SW.PALS=[{top:'#050818',bot:'#1a2a6a',neb:['#ff8a40','#4a7cff'],planet:{x:450,r:100,c1:'#ffb36b',c2:'#7a2a10'}},
  {top:'#12031f',bot:'#3a1068',neb:['#c64dff','#2bd6ff'],planet:{x:130,r:80,c1:'#d68cff',c2:'#3a1070'}},
  {top:'#02050a',bot:'#06201f',neb:['#00e5a0','#3a4a80'],planet:{x:480,r:120,c1:'#2a8a8a',c2:'#031a1a'}},
  {top:'#0a0010',bot:'#3a0030',neb:['#ff2bd6','#ffea00'],planet:{x:300,r:140,c1:'#ffffff',c2:'#ff2bd6'}}];
SW.LEVELS=[
 {n:'First Contact',w:0,pool:['scout'],waves:4,env:'none'},
 {n:'Debris Field',w:0,pool:['scout','interceptor'],waves:5,env:'asteroids'},
 {n:'Raider Ambush',w:0,pool:['scout','interceptor','gunship','kamikaze'],waves:4,boss:'warden'},
 {n:'Violet Storm',w:1,pool:['interceptor','kamikaze','sniper'],waves:6,env:'storm'},
 {n:'Phantom Corridor',w:1,pool:['scout','phantom','sniper','interceptor'],waves:6,env:'none'},
 {n:'Nebula Siege',w:1,pool:['gunship','cruiser','phantom','kamikaze'],waves:5,boss:'serpent'},
 {n:'Dark Matter',w:2,pool:['phantom','cruiser','carrier','sniper'],waves:7,env:'gravity'},
 {n:'Dreadnought Assault',w:2,pool:['gunship','cruiser','carrier','interceptor','sniper'],waves:7,env:'asteroids'},
 {n:'The Fallen Fleet',w:2,pool:['carrier','cruiser','elite','phantom','gunship'],waves:5,boss:'dread'},
 {n:'Singularity Gate',w:3,pool:['elite','anomaly','kamikaze','sniper'],waves:8,env:'gravity'},
 {n:'Cosmic Collapse',w:3,pool:['anomaly','elite','carrier','cruiser','phantom'],waves:8,env:'asteroids'},
 {n:'The Infinity Overlord',w:3,pool:['elite','anomaly','carrier','cruiser'],waves:4,boss:'overlord'}];
SW.Levels={
  COST:{scout:1,interceptor:1.5,gunship:3,kamikaze:1,sniper:2,cruiser:3,phantom:2,carrier:4,elite:5,anomaly:4},
  // wave(li, wi, endless): spends a "budget" on random enemies from the level pool. Budget grows with wave number and level, so difficulty rises smoothly.
  // Heavier enemies only appear in later waves (gradual introduction). Returns [{type,x,delay}].
  wave(li,wi,endless){const L=endless?{pool:Object.keys(this.COST)}:SW.LEVELS[li],pool=L.pool.filter((t,i)=>endless?i<=Math.min(9,2+wi):i<=Math.floor(wi/2)+1),
      cost=this.COST;let budget=4+wi*1.8+(endless?li:li*1.2)+(endless?wi*.8:0),out=[],guard=0;
    while(budget>0&&out.length<14&&guard++<40){const t=pool[(Math.random()*pool.length)|0];if(cost[t]>budget&&out.length)break;budget-=cost[t];out.push({type:t,x:50+Math.random()*500,delay:out.length*.55})}
    if(!out.length)out.push({type:pool[0],x:300,delay:0});return out}
};
// Missions & achievements: progress is saved in SW.data.missions[id] = {p:progress, done:bool}. Game code reports with SW.Missions.event('kills',1).
SW.MISSIONS=[
 {id:'m_kills',name:'Destroy 50 enemies',type:'kills',target:50,mode:'sum',reward:150},
 {id:'m_flawless',name:'Complete a level without losing a life',type:'flawless',target:1,mode:'sum',reward:200},
 {id:'m_boss',name:'Defeat a boss',type:'boss',target:1,mode:'sum',reward:250},
 {id:'m_pick',name:'Collect 10 power-ups',type:'pickup',target:10,mode:'sum',reward:120},
 {id:'m_waves',name:'Survive 8 waves in one run',type:'waves',target:8,mode:'max',reward:200},
 {id:'m_fast',name:'Complete a level in under 150 seconds',type:'fast',target:1,mode:'sum',reward:200},
 {id:'m_spec',name:'Use special abilities 10 times',type:'special',target:10,mode:'sum',reward:150},
 {id:'m_score',name:'Score 15,000 in one run',type:'score',target:15000,mode:'max',reward:250}];
SW.ACH=[
 {id:'a_first',name:'First Blood — destroy an enemy',type:'kills',target:1,mode:'sum',reward:50},{id:'a_combo',name:'Combo x20',type:'combo',target:20,mode:'max',reward:100},
 {id:'a_levels',name:'Cleared 5 levels',type:'levels',target:5,mode:'sum',reward:150},{id:'a_camp',name:'Campaign Complete',type:'campaign',target:1,mode:'sum',reward:500},
 {id:'a_rich',name:'Hoarder — hold 2000 credits',type:'credits',target:2000,mode:'max',reward:100},{id:'a_fleet',name:'Fleet Commander — own 3 ships',type:'ships',target:3,mode:'max',reward:200}];
SW.Missions={
  event(type,val){for(const list of[SW.MISSIONS,SW.ACH])for(const m of list)if(m.type==type){const s=SW.data.missions[m.id]||(SW.data.missions[m.id]={p:0,done:false});if(s.done)continue;
      s.p=m.mode=='sum'?s.p+val:Math.max(s.p,val);if(s.p>=m.target){s.done=true;s.p=m.target;SW.data.credits+=m.reward;SW.Game&&SW.Game.toast('✔ '+m.name+'  +'+m.reward+' credits');SW.Game&&SW.Game.sfx('complete')}}
    SW.Storage.save()},
  prog(m){const s=SW.data.missions[m.id];return s?s.p:0},done(m){const s=SW.data.missions[m.id];return !!(s&&s.done)},
  nextText(){const m=SW.MISSIONS.find(x=>!this.done(x));return m?'Mission: '+m.name+' ('+this.prog(m)+'/'+m.target+')':'All missions complete!'}
};
