// main.js — boot file. Runs once the page is ready: connects the modules, sizes the canvas, wires window events, and shows the main menu.
(function(){
  const cv=document.getElementById('game'),hud=document.getElementById('hud');
  // Keep the 600x800 canvas fully visible with the right proportions at any window size (and put the HUD exactly over it).
  function resize(){const s=Math.min(innerWidth/600,innerHeight/800),w=Math.floor(600*s),h=Math.floor(800*s);cv.style.width=w+'px';cv.style.height=h+'px';
    const l=Math.round((innerWidth-w)/2),t=Math.round((innerHeight-h)/2);hud.style.inset='auto';hud.style.left=l+'px';hud.style.top=t+'px';hud.style.width=w+'px';hud.style.height=h+'px'}
  addEventListener('resize',resize);addEventListener('orientationchange',resize);resize();
  SW.Controls.init(cv);SW.UI.init();SW.Game.init(cv);
  // Pause automatically when the tab is hidden or the window loses focus (can be turned off in Settings).
  document.addEventListener('visibilitychange',()=>{if(document.hidden)SW.Game.autoPause()});addEventListener('blur',()=>SW.Game.autoPause());
  document.addEventListener('fullscreenchange',()=>{SW.Settings.v.fullscreen=!!document.fullscreenElement;SW.Storage.setJSON('settings',SW.Settings.v)});
  // Browsers block audio until a user gesture: the first click/key resumes it.
  ['pointerdown','keydown'].forEach(e=>addEventListener(e,()=>SW.Audio.resume(),{once:true}));
  SW.UI.show('main');
})();
