// controls.js — ONE place that turns keyboard / mouse / touch / gamepad into game actions.
// The game never asks "is W pressed?"; it asks held('up') or pressed('special'). That makes remapping easy.
SW.Controls={
  // [action id, label shown in Controls screen, default key codes]
  ACTIONS:[['up','Move up',['KeyW','ArrowUp']],['down','Move down',['KeyS','ArrowDown']],['left','Move left',['KeyA','ArrowLeft']],['right','Move right',['KeyD','ArrowRight']],
   ['fire','Primary fire',['Space']],['secondary','Secondary weapon (homing missiles)',['KeyE']],['special','Special ability',['KeyQ']],['dash','Dash / evade',['ShiftLeft']],
   ['pause','Pause / resume',['Escape']],['auto','Toggle auto-fire',['KeyF']],['switchW','Cycle weapon',['KeyR']],['switchA','Cycle special ability',['KeyC']],['confirm','Confirm menu selection',['Enter']]],
  map:{},keys:{},virt:{},edge:{},joy:{x:0,y:0},mouse:{x:300,y:600,on:false},capture:null,pad:{x:0,y:0},padPrev:{},
  loadMap(){const d={};this.ACTIONS.forEach(a=>d[a[0]]=a[2].slice());const r=SW.Storage.getJSON('keys',{});
    for(const a of this.ACTIONS){const x=r[a[0]];if(Array.isArray(x)&&x.length&&x.every(s=>typeof s=='string'&&s.length<24))d[a[0]]=x.slice(0,2)}this.map=d},
  saveMap(){SW.Storage.setJSON('keys',this.map)},
  resetMap(){SW.Storage.setJSON('keys',{});this.loadMap()},
  // rebind(): returns the name of an action already using this key (duplicate) or '' on success. Duplicates are rejected.
  rebind(id,code){for(const a of this.ACTIONS)if(a[0]!=id&&this.map[a[0]].includes(code))return a[1];this.map[id]=[code];this.saveMap();return''},
  held(a){return !!(this.virt[a]||(a=='fire'&&this.padFire)||(this.map[a]||[]).some(k=>this.keys[k]))},
  pressed(a){const e=this.edge[a];this.edge[a]=false;return !!e},
  clear(){this.keys={};this.virt={};this.edge={};this.joy.x=this.joy.y=0},
  // move(): combined direction from keys, touch joystick, mouse-aim and gamepad, each axis in -1..1.
  move(p){let x=(this.held('right')?1:0)-(this.held('left')?1:0),y=(this.held('down')?1:0)-(this.held('up')?1:0);
    x+=this.joy.x+this.pad.x;y+=this.joy.y+this.pad.y;
    const S=SW.Settings;if(S.get('mouseAim')&&this.mouse.on&&p){const dx=this.mouse.x-p.x,dy=(this.mouse.y-p.y)*(S.get('invertAim')?-1:1),d=Math.hypot(dx,dy),k=Math.min(1,d/(30/S.get('mouseSens')));if(d>4){x+=dx/d*k;y+=dy/d*k}}
    const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}return{x,y}},
  poll(){if(!SW.Settings.get('gamepad')||!navigator.getGamepads)return;const g=[...navigator.getGamepads()].find(x=>x);if(!g){this.pad.x=this.pad.y=0;return}
    const dz=v=>Math.abs(v)<.2?0:v;this.pad.x=dz(g.axes[0]||0);this.pad.y=dz(g.axes[1]||0);const b=i=>g.buttons[i]&&g.buttons[i].pressed;
    this.padFire=b(0);
    [[1,'secondary'],[2,'special'],[5,'dash'],[9,'pause'],[3,'switchW']].forEach(([i,a])=>{const n=b(i);if(n&&!this.padPrev[i])this.edge[a]=true;this.padPrev[i]=n})},
  // init(): registers every listener ONCE for the whole page life (menus and game share them), so restarting a level never duplicates listeners.
  init(cv){this.loadMap();const gameKeys=()=>SW.Game&&(SW.Game.state=='playing'||SW.Game.state=='paused');
    addEventListener('keydown',e=>{if(this.capture){e.preventDefault();const cb=this.capture;this.capture=null;cb(e.code);return}
      const bound=this.ACTIONS.some(a=>this.map[a[0]].includes(e.code));
      if(gameKeys()&&(bound||e.code.startsWith('Arrow')||e.code=='Space'))e.preventDefault();
      if(e.repeat)return;this.keys[e.code]=true;for(const a of this.ACTIONS)if(this.map[a[0]].includes(e.code))this.edge[a[0]]=true;
      if(SW.Audio)SW.Audio.resume();if(SW.Game)SW.Game.onKey(e.code)});
    addEventListener('keyup',e=>{this.keys[e.code]=false});addEventListener('blur',()=>this.clear());
    const toWorld=e=>{const r=cv.getBoundingClientRect();this.mouse.x=(e.clientX-r.left)/r.width*600;this.mouse.y=(e.clientY-r.top)/r.height*800};
    cv.addEventListener('pointermove',e=>{if(e.pointerType=='mouse'){this.mouse.on=true;toWorld(e)}});
    cv.addEventListener('pointerdown',e=>{if(SW.Audio)SW.Audio.resume();if(e.pointerType!='mouse')return;toWorld(e);if(e.button==0)this.virt.fire=true;if(e.button==2)this.virt.secondary=true});
    addEventListener('pointerup',e=>{if(e.button==0)this.virt.fire=false;if(e.button==2)this.virt.secondary=false});
    cv.addEventListener('contextmenu',e=>e.preventDefault());cv.addEventListener('wheel',e=>{if(SW.Game.state=='playing'){e.preventDefault();this.edge.switchW=true}},{passive:false});
    this.initTouch()},
  // Touch: a floating joystick on the left + big buttons on the right. Pointer Events + setPointerCapture allow moving and firing at the same time.
  initTouch(){const z=document.getElementById('joyZone'),k=document.getElementById('joyKnob');let id=null,ox=0,oy=0;
    z.addEventListener('pointerdown',e=>{id=e.pointerId;z.setPointerCapture(id);ox=e.clientX;oy=e.clientY;k.style.display='block';k.style.left=ox-35+'px';k.style.top=oy-35+'px';if(SW.Audio)SW.Audio.resume()});
    z.addEventListener('pointermove',e=>{if(e.pointerId!=id)return;let dx=e.clientX-ox,dy=e.clientY-oy;const d=Math.hypot(dx,dy),m=55;if(d>m){dx*=m/d;dy*=m/d}this.joy.x=dx/m;this.joy.y=dy/m;k.style.left=ox+dx-35+'px';k.style.top=oy+dy-35+'px'});
    const end=e=>{if(e.pointerId!=id)return;id=null;this.joy.x=this.joy.y=0;k.style.display='none'};z.addEventListener('pointerup',end);z.addEventListener('pointercancel',end);
    [['bFire','fire',0],['bSec','secondary',0],['bSpecial','special',1],['bDash','dash',1]].forEach(([el,a,edge])=>{const b=document.getElementById(el);
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(edge)this.edge[a]=true;else this.virt[a]=true});
      const up=()=>{this.virt[a]=false};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)})}
};
