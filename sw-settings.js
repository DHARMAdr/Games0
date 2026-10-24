// settings.js — every option lives in SW.SCHEMA: [group, key, label, type, options, default]. The Settings screen is generated from this table,
// so adding a setting = adding one line here (and reading SW.Settings.get('key') where you need it).
SW.SCHEMA=[
 ['Gameplay','difficulty','Difficulty (hub = follow the hub setting)','select',['hub','easy','normal','hard','insane'],'hub'],
 ['Gameplay','aimAssist','Aim assistance (shots bend to targets)','toggle',0,true],['Gameplay','autoFire','Auto-fire','toggle',0,false],
 ['Gameplay','shake','Screen shake','toggle',0,true],['Gameplay','dmgNumbers','Damage numbers','toggle',0,true],['Gameplay','showFps','Show FPS','toggle',0,false],
 ['Gameplay','tutorial','Tutorial prompts','toggle',0,true],['Gameplay','mouseAim','Mouse aiming (ship follows pointer)','toggle',0,false],
 ['Gameplay','invertAim','Invert vertical aiming','toggle',0,false],['Gameplay','reduceFx','Reduced visual effects','toggle',0,false],['Gameplay','touch','Touch controls','select',['auto','on','off'],'auto'],
 ['Audio','master','Master volume','range',[0,1,.05],.8],['Audio','music','Music volume','range',[0,1,.05],.5],['Audio','sfx','Sound effects volume','range',[0,1,.05],.8],
 ['Audio','mute','Mute all audio','toggle',0,false],['Audio','musicOn','Background music','toggle',0,true],
 ['Audio','sfxLaser','SFX: weapons','toggle',0,true],['Audio','sfxExplosion','SFX: explosions & hits','toggle',0,true],['Audio','sfxPickup','SFX: pickups','toggle',0,true],['Audio','sfxUI','SFX: menus','toggle',0,true],
 ['Graphics','quality','Graphics quality','select',['low','medium','high'],'high'],['Graphics','particles','Particle density','range',[.2,1.5,.1],1],['Graphics','glow','Glow intensity','range',[0,1,.1],.8],
 ['Graphics','stars','Background star density','range',[.3,1.5,.1],1],['Graphics','shakeAmt','Screen shake intensity','range',[0,1.5,.1],1],
 ['Graphics','fullscreen','Fullscreen','toggle',0,false],['Graphics','crt','CRT scanlines','toggle',0,false],['Graphics','reduceFlash','Flash reduction','toggle',0,false],
 ['Controls','mouseSens','Mouse sensitivity','range',[.5,2,.1],1],['Controls','gamepad','Gamepad support','toggle',0,true],['Controls','fireMode','Fire mode','select',['hold','toggle'],'hold'],
 ['Accessibility','uiScale','UI scaling','range',[.8,1.4,.1],1],['Accessibility','highContrast','High-contrast mode','toggle',0,false],['Accessibility','colorblind','Color-blind projectile indicators (shapes)','toggle',0,false],
 ['Accessibility','reduceMotion','Reduced motion','toggle',0,false],['Accessibility','largeText','Larger text','toggle',0,false],['Accessibility','pauseBlur','Pause when tab loses focus','toggle',0,true]];
SW.Settings={
  v:{},
  defaults(){const d={};SW.SCHEMA.forEach(s=>d[s[1]]=s[5]);return d},
  // Load + VALIDATE: wrong types / out-of-range numbers / unknown options fall back to defaults.
  load(){const d=this.defaults(),r=SW.Storage.getJSON('settings',{});
    SW.SCHEMA.forEach(([g,k,l,t,o,def])=>{const x=r&&r[k];if(t=='toggle'&&typeof x=='boolean')d[k]=x;else if(t=='range'&&typeof x=='number'&&isFinite(x))d[k]=Math.min(o[1],Math.max(o[0],x));else if(t=='select'&&o.includes(x))d[k]=x});
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches&&!r.reduceMotion)d.reduceMotion=true;this.v=d;this.apply()},
  get(k){return this.v[k]},
  set(k,val){this.v[k]=val;SW.Storage.setJSON('settings',this.v);this.apply(k)},
  reset(){this.v=this.defaults();SW.Storage.setJSON('settings',this.v);this.apply()},
  // apply(): pushes settings into the page immediately (classes, CSS variable, audio volumes, fullscreen).
  apply(k){const v=this.v,b=document.body,c=(n,on)=>b.classList.toggle(n,!!on);
    c('hc',v.highContrast);c('big',v.largeText);c('noMotion',v.reduceMotion);c('crt',v.crt);c('noFlash',v.reduceFlash);
    document.documentElement.style.setProperty('--ui',v.uiScale);
    if(SW.Audio)SW.Audio.vols();if(SW.UI&&SW.UI.touchVis)SW.UI.touchVis();
    if(k=='fullscreen'||k===undefined&&false){try{if(v.fullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen();else if(!v.fullscreen&&document.fullscreenElement)document.exitFullscreen()}catch(e){}}
    if(k=='musicOn'&&SW.Audio)SW.Audio.musicToggle()},
  // Effective particle budget from quality + density + reduced-effects options.
  fxScale(){const q={low:.35,medium:.7,high:1}[this.v.quality]||1;return this.v.reduceFx?q*.25:q*this.v.particles}
};
SW.Settings.load();
