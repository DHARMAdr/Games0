/* compat.js — makes every page friendlier on ALL devices (desktop, laptop, tablet, phone AND button/keypad phones).
   WHY: older browsers (e.g. KaiOS/Firefox 48, old iOS) lack newer features, and keypad phones have no mouse, touch or full keyboard.
   HOW: (1) GH.LITE flag for weak devices  (2) a visible error banner instead of a silent blank page  (3) KEYPAD MAP: 2/4/6/8 = arrows, 5 = Enter/Jump, 0 = Space,
        soft-left / Back / * = Esc (pause), soft-right = Enter, # = R(restart)  (4) arrow-key focus navigation in menus  (5) GH.hold(): press-and-hold buttons that work with Pointer Events OR touch+mouse.
   Plain ES6 only (no async/await, no ?. , no object spread) so it runs on old engines.   IMPROVE: add more key layouts, a gamepad->keys bridge. */
(function(){
  var UA=navigator.userAgent||'',GH=window.GH=window.GH||{};
  GH.LITE=/KaiOS|Opera Mini|Nokia|Series ?40|Symbian|UCBrowser|NetFront|MIDP|Maemo/i.test(UA)||(Math.min(screen.width||999,screen.height||999)<=360&&!('ontouchstart' in window));
  // ---- (2) error banner: tell the user what is wrong instead of showing nothing
  window.addEventListener('error',function(e){var b=document.getElementById('gh-err');if(!b){b=document.createElement('div');b.id='gh-err';b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#500;color:#fff;font:12px monospace;padding:6px;text-align:center';(document.body||document.documentElement).appendChild(b)}
    b.textContent='Warning: '+(e.message||'script error')+' - please use an up-to-date browser (Chrome, Firefox, Safari or Edge).'});
  // ---- (3) keypad / old-browser key translation
  var CODE={37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter',27:'Escape',32:'Space',16:'ShiftLeft',8:'Backspace'};
  function codeOf(e){if(e.code)return e.code;if(CODE[e.keyCode])return CODE[e.keyCode];if(e.keyCode>=65&&e.keyCode<=90)return 'Key'+String.fromCharCode(e.keyCode);if(e.keyCode>=48&&e.keyCode<=57)return 'Digit'+(e.keyCode-48);if(e.keyCode>=96&&e.keyCode<=105)return 'Numpad'+(e.keyCode-96);return''}
  function overlayOpen(){var ids=['ov','ui','screen','frame'];for(var i=0;i<ids.length;i++){var el=document.getElementById(ids[i]);if(el&&el.offsetWidth>0&&getComputedStyle(el).display!=='none'&&!el.classList.contains('hidden')&&!el.classList.contains('hide'))return el}return null}
  GH.overlayOpen=overlayOpen;
  var KEYPAD={'2':'ArrowUp','8':'ArrowDown','4':'ArrowLeft','6':'ArrowRight','0':'Space','#':'KeyR','*':'Escape','SoftLeft':'Escape','SoftRight':'Enter','Backspace':'Escape','EndCall':'Escape'};
  var KP=GH.LITE||(window.matchMedia&&matchMedia('(pointer:none)').matches)||/[?&]keypad=1/.test(location.search);try{if(localStorage.getItem('gh_keypad')==='1')KP=true}catch(x){}
  GH.keypad=KP;try{var hc=document.documentElement;hc.className+=(KP?' kp':'')+(GH.LITE?' lite':'')}catch(x){}   // keypad mode: auto on for keypad phones, or switch it on in the hub profile panel (gh_keypad)
  function target(e){var k=e.key,c=codeOf(e),tag=(e.target&&e.target.tagName)||'',typing=/^(INPUT|TEXTAREA|SELECT)$/.test(tag),isNum=/^Numpad[0-9]$/.test(c);
    if(typing&&k!=='SoftLeft'&&k!=='SoftRight')return null;      // never steal typing in text boxes
    if(isNum)k=c.charAt(6);                                       // numpad digits always work (2/4/6/8/5)
    var digit=/^[0-9]$/.test(k);if(digit&&!(KP||isNum))return null;
    if((k==='*'||k==='#'||k==='Backspace'||k==='EndCall')&&!KP)return null;
    if(k==='5')return overlayOpen()?'Enter':'Space';
    return KEYPAD[k]||null}
  function synth(type,code,orig){var ev;try{ev=new KeyboardEvent(type,{key:code.indexOf('Key')===0?code.slice(3).toLowerCase():code,code:code,bubbles:true,cancelable:true})}catch(x){return}
    try{Object.defineProperty(ev,'__gh',{value:1})}catch(x){}window.dispatchEvent(ev)}
  function onKey(e){if(e.__gh)return;var t=target(e);
    if(t){e.stopImmediatePropagation();e.preventDefault();if(e.repeat&&e.type==='keydown')return;synth(e.type,t,e);return}
    if(!e.code){var c=codeOf(e);if(c){e.stopImmediatePropagation();synth(e.type,c,e)}}}
  window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);
  // ---- (4) menu focus navigation with arrows (keypad D-pad). Games keep their own arrow handling; this only moves the focus ring in open menus.
  function visible(el){return el.offsetWidth>0&&el.offsetHeight>0&&!el.disabled}
  function list(root){var a=root.querySelectorAll('button,a[href],input,select,[tabindex]'),out=[];for(var i=0;i<a.length;i++)if(visible(a[i]))out.push(a[i]);return out}
  window.addEventListener('keydown',function(e){var c=e.code;if(c!=='ArrowUp'&&c!=='ArrowDown'&&c!=='ArrowLeft'&&c!=='ArrowRight')return;
    var ov=overlayOpen(),root=ov||(document.body.hasAttribute('data-nav')?document.body:null);if(!root)return;
    var ae=document.activeElement;if(ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)&&(c==='ArrowLeft'||c==='ArrowRight'))return;
    var items=list(root);if(!items.length)return;var i=items.indexOf(ae);var d=(c==='ArrowDown'||c==='ArrowRight')?1:-1;i=i<0?(d>0?0:items.length-1):(i+d+items.length)%items.length;items[i].focus();e.preventDefault&&e.preventDefault()},false);
  // ---- (5) press/hold helpers that work with Pointer Events (modern) or touch+mouse (old iOS/Android)
  GH.hold=function(el,down,up){if(!el)return;var on=function(e){if(e.cancelable)e.preventDefault();down(e)},off=function(e){if(up)up(e)};
    if(window.PointerEvent){el.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(function(t){el.addEventListener(t,off)})}
    else{el.addEventListener('touchstart',on);el.addEventListener('touchend',off);el.addEventListener('touchcancel',off);el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off)}};
  GH.xy=function(e){var t=(e.changedTouches&&e.changedTouches[0])||(e.touches&&e.touches[0])||e;return{x:t.clientX,y:t.clientY}};
  // base64(UTF-8) -> string for embedded pages (works in old browsers too)
  GH.b64=function(b){return decodeURIComponent(escape(atob(b)))};
})();
