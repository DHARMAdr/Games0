// storage.js — creates the shared namespace SW (every file attaches itself to it) and wraps localStorage.
// WHY: all saving goes through here so bad/missing data never crashes the game. Scores are LOCAL only (not shared online, not cheat-proof).
var SW=window.SW=window.SW||{};
SW.Storage={
  KEY:'spacewarInfinity.',
  getJSON(k,d){try{const v=JSON.parse(localStorage.getItem(this.KEY+k));return v===null||v===undefined?d:v}catch(e){return d}},
  setJSON(k,v){try{localStorage.setItem(this.KEY+k,JSON.stringify(v));return true}catch(e){return false}},
  // Default save file. Unknown/invalid fields in an old save are ignored and replaced by these.
  defaults(){return{credits:0,upgrades:{},ship:'interceptor',ships:['interceptor'],special:'emp',unlocked:1,completed:{},best:{},scores:[],missions:{},ach:{},endlessBest:0,totals:{kills:0,bosses:0,pickups:0,specials:0,levels:0}}},
  load(){const d=this.defaults(),r=this.getJSON('save',{});
    if(r&&typeof r=='object')for(const k in d)if(typeof r[k]==typeof d[k]&&Array.isArray(r[k])==Array.isArray(d[k]))d[k]=r[k];
    d.unlocked=Math.max(1,Math.min(12,d.unlocked|0));d.credits=Math.max(0,+d.credits||0);if(!d.ships.includes('interceptor'))d.ships.push('interceptor');return d},
  save(){this.setJSON('save',SW.data)},
  addScore(e){if(typeof Store!=='undefined'&&Store.saveScore)Store.saveScore('spacewar',e.score);const s=SW.data.scores;s.push(e);s.sort((a,b)=>b.score-a.score);s.length=Math.min(s.length,10);this.save()}
};
SW.data=SW.Storage.load();
