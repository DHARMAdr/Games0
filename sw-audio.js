// audio.js — all sound is generated with the Web Audio API (oscillators + noise). No audio files needed.
// The AudioContext is only created after a user gesture (browser rule), and each sound is throttled so we never create hundreds of nodes.
SW.Audio={
  ctx:null,out:null,mg:null,sg:null,noise:null,last:{},live:0,timer:null,step:0,world:0,
  // SFX recipes: [wave, startHz, endHz, seconds, volume]; wave 'noise' uses filtered noise (startHz = filter cutoff). cat = which on/off toggle controls it.
  SFX:{laser:[['sawtooth',900,250,.09,.1]],missile:[['noise',900,200,.25,.12],['sine',200,500,.2,.08]],hit:[['square',220,90,.05,.08]],explode:[['noise',1400,80,.45,.22]],
    hurt:[['sawtooth',300,60,.3,.2]],shield:[['sine',400,1200,.3,.15]],pickup:[['sine',600,1300,.12,.14],['sine',900,1700,.12,.1]],dash:[['noise',2500,400,.2,.12]],
    emp:[['sine',900,60,.6,.25],['noise',3000,200,.5,.15]],bossArrive:[['sawtooth',70,40,1.4,.3],['square',90,50,1.4,.15]],bossHit:[['square',140,60,.08,.12]],
    bossDie:[['noise',900,40,1.6,.35],['sawtooth',200,30,1.6,.2]],complete:[['sine',523,523,.15,.15],['sine',659,659,.15,.15],['sine',784,1047,.4,.15]],
    ui:[['square',700,900,.05,.07]],victory:[['sine',523,784,.4,.15],['sine',659,988,.5,.15],['sine',784,1319,.7,.15]],defeat:[['sawtooth',300,40,1.2,.2]]},
  CAT:{laser:'sfxLaser',missile:'sfxLaser',hit:'sfxExplosion',explode:'sfxExplosion',hurt:'sfxExplosion',bossHit:'sfxExplosion',pickup:'sfxPickup',ui:'sfxUI'},
  init(){if(this.ctx)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx=new A();this.out=this.ctx.createGain();this.mg=this.ctx.createGain();this.sg=this.ctx.createGain();
    this.mg.connect(this.out);this.sg.connect(this.out);this.out.connect(this.ctx.destination);
    const n=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=n;this.vols()}catch(e){this.ctx=null}},
  resume(){this.init();if(this.ctx&&this.ctx.state=='suspended')this.ctx.resume();this.musicToggle()},
  vols(){if(!this.ctx)return;const s=SW.Settings;this.out.gain.value=s.get('mute')?0:s.get('master');this.mg.gain.value=s.get('music')*.5;this.sg.gain.value=s.get('sfx')},
  sfx(name){const c=this.ctx;if(!c||SW.Settings.get('mute'))return;const cat=this.CAT[name];if(cat&&!SW.Settings.get(cat))return;
    const now=c.currentTime;if(now-(this.last[name]||0)<.04||this.live>20)return;this.last[name]=now;
    for(const [w,f0,f1,dur,vol] of this.SFX[name]||[]){this.live++;const g=c.createGain();g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+dur);let o;
      if(w=='noise'){o=c.createBufferSource();o.buffer=this.noise;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(f0,now);f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),now+dur);o.connect(f);f.connect(g)}
      else{o=c.createOscillator();o.type=w;o.frequency.setValueAtTime(f0,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),now+dur);o.connect(g)}
      g.connect(this.sg);o.start(now);o.stop(now+dur+.02);o.onended=()=>{this.live--}}},
  // Procedural ambient music: a slow arpeggio on a minor scale (different root per world) + bass pulse, scheduled with setInterval.
  musicToggle(){const on=this.ctx&&SW.Settings.get('musicOn')&&!SW.Settings.get('mute');if(on&&!this.timer)this.timer=setInterval(()=>this.tick(),260);if(!on&&this.timer){clearInterval(this.timer);this.timer=null}},
  setWorld(w){this.world=w|0},
  tick(){const c=this.ctx;if(!c||this.paused)return;const root=[55,49,46,41][this.world]||55,sc=[0,3,5,7,10,12,15],i=this.step++,now=c.currentTime;
    const note=(f,t,d,v,w)=>{const o=c.createOscillator(),g=c.createGain();o.type=w;o.frequency.value=f;g.gain.setValueAtTime(v,now);g.gain.exponentialRampToValueAtTime(.001,now+d);o.connect(g);g.connect(this.mg);o.start(now);o.stop(now+d+.02)};
    note(root*2*Math.pow(2,sc[(i*3+(i>>3))%7]/12),0,.5,.1,'triangle');if(i%4==0)note(root,0,.9,.18,'sine')},
  pause(p){this.paused=p;if(this.ctx)this.mg.gain.value=p?SW.Settings.get('music')*.15:SW.Settings.get('music')*.5}
};
