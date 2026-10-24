// WHY: ONE storage layer shared by hub AND games, so cloud sync later = change one object.
// HOW: `Store.backend` exposes get/set that return Promises (so a cloud backend can be async). Default = browser localStorage (no server).
// Written with plain Promises (no async/await) so it also runs on older browsers.  IMPROVE: write a cloud backend and do `Store.backend=cloud`.
const Store={
  backend:{get(k){var v=null;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch(e){}return Promise.resolve(v)},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}return Promise.resolve()}},
  // PIN hashing (SHA-256 when available, small fallback hash otherwise). IMPROVE: salt + server-side hashing; 6-digit PINs are weak.
  hash(p){var fb=function(){var h=0,t='gh:'+p;for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return 'f'+h};
    try{if(window.crypto&&crypto.subtle&&window.TextEncoder)return crypto.subtle.digest('SHA-256',new TextEncoder().encode('gh:'+p)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2)}).join('')},function(){return fb()})}catch(e){}
    return Promise.resolve(fb())},
  users(){return this.backend.get('gh_users').then(function(u){return u||{}})},
  user(){return localStorage.getItem('gh_session')},
  signUp(id,pin){var self=this;id=id.trim().toLowerCase();if(!id||!/^\d{6}$/.test(pin))return Promise.resolve('Need a name/email and a 6-digit PIN');
    return self.users().then(function(u){if(u[id])return 'Name already used';return self.hash(pin).then(function(h){u[id]={pin:h,hist:{}};return self.backend.set('gh_users',u).then(function(){localStorage.setItem('gh_session',id);return ''})})})},
  signIn(id,pin){var self=this;id=id.trim().toLowerCase();return self.users().then(function(u){if(!u[id])return 'Wrong name or PIN';return self.hash(pin).then(function(h){if(u[id].pin!==h)return 'Wrong name or PIN';localStorage.setItem('gh_session',id);return ''})})},
  signOut(){localStorage.removeItem('gh_session')},
  // Games call this at game over: keeps best + last 20 plays per game for the profile history.
  saveScore(game,score){var self=this,id=self.user();if(!id)return Promise.resolve();return self.users().then(function(u){if(!u[id])return;var h=u[id].hist[game]||(u[id].hist[game]={best:0,plays:[]});h.best=Math.max(h.best,score);h.plays.unshift({s:score,t:Date.now()});h.plays.length=Math.min(h.plays.length,20);return self.backend.set('gh_users',u)})}
};

// ===== SHARED DIFFICULTY. WHY: ONE setting (chosen in the hub or any game menu) changes speed, trap density, spacing, damage and lives in every game.
// HOW: Store.diff() returns the numbers of the chosen level. spd=speed x, spawn=trap density x, gap=spacing x, dmg=damage x, lives, chase=guard window (frames), ko=1-hit KO, sw=lane-switching trains, missile=homing-missile interval (frames, 0=off).
// IMPROVE: per-game overrides, custom difficulty sliders, unlockable "Insane" tier.
Store.DIFFS={easy:{n:'EASY',spd:.85,spawn:.75,gap:1.25,dmg:.7,lives:7,chase:300,ko:false,sw:false,missile:0},
 normal:{n:'NORMAL',spd:1,spawn:1,gap:1,dmg:1,lives:5,chase:480,ko:false,sw:false,missile:0},
 hard:{n:'HARD',spd:1.15,spawn:1.3,gap:.85,dmg:1.3,lives:4,chase:720,ko:false,sw:true,missile:480},
 nightmare:{n:'NIGHTMARE',spd:1.3,spawn:1.6,gap:.7,dmg:2,lives:3,chase:0,ko:true,sw:true,missile:300}};
Store.diffKey=()=>{const k=localStorage.getItem('gh_diff');return Store.DIFFS[k]?k:'normal'};
Store.diff=()=>Store.DIFFS[Store.diffKey()];
Store.setDiff=k=>{if(Store.DIFFS[k])localStorage.setItem('gh_diff',k)};
