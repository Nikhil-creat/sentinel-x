/* Sentinel-X core: namespace, helpers, theme, navigation, command palette, PWA.
   Designed and developed by Nikhil Chary Sriramoju */
(function(){
'use strict';
window.SX=window.SX||{};
var SX=window.SX;
SX.$=function(s,r){return (r||document).querySelector(s)};
SX.$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
SX.reduce=(typeof matchMedia==='function')&&matchMedia('(prefers-reduced-motion: reduce)').matches;
SX.sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
SX.cssVar=function(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()};
SX.recolors=[];SX.inits=[];SX.commands=[];
SX.recolor=function(){SX.recolors.forEach(function(f){try{f()}catch(e){}})};
SX.store={
  get:function(k,d){try{var v=localStorage.getItem('sx-'+k);return v===null?d:v}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem('sx-'+k,v)}catch(e){}}
};

/* toast */
SX.toast=function(msg){
  var t=SX.$('#toast');if(!t)return;t.textContent=msg;t.classList.add('on');
  clearTimeout(SX.toast._t);SX.toast._t=setTimeout(function(){t.classList.remove('on')},2200);
};
/* file download (works on GitHub Pages and locally) */
SX.download=function(name,text,mime){
  var b=new Blob([text],{type:mime||'text/plain'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
  SX.toast('Downloaded '+name);
};
/* 3D helpers */
SX.dotTexture=function(){
  var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d');
  var gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'#fff');gr.addColorStop(.45,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
};
SX.makeRenderer=function(canvas){
  try{var r=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));return r}
  catch(e){canvas.style.display='none';return null}
};
SX.whenVisible=function(el,cb){
  if(!('IntersectionObserver' in window)){cb(true);return}
  new IntersectionObserver(function(en){cb(en[0].isIntersecting)},{threshold:0}).observe(el);
};
SX.goto=function(id){var el=SX.$(id);if(el)el.scrollIntoView({behavior:SX.reduce?'auto':'smooth',block:'start'})};

/* theme */
function effectiveTheme(){
  var t=document.documentElement.getAttribute('data-theme');if(t)return t;
  return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
SX.toggleTheme=function(){
  var n=effectiveTheme()==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',n);SX.store.set('theme',n);setTimeout(SX.recolor,30);
};
(function early(){var t=SX.store.get('theme',null);if(t)document.documentElement.setAttribute('data-theme',t)})();
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){setTimeout(SX.recolor,30)})}catch(e){}

/* command palette */
function initPalette(){
  var dlg=SX.$('#palette');if(!dlg)return;
  var input=SX.$('#palIn'),list=SX.$('#palList'),idx=0,shown=[];
  function render(){
    var q=input.value.toLowerCase().trim();
    shown=SX.commands.filter(function(c){return !q||(c.label+' '+(c.hint||'')).toLowerCase().indexOf(q)>-1});
    idx=Math.min(idx,Math.max(0,shown.length-1));list.replaceChildren();
    shown.forEach(function(c,i){
      var li=document.createElement('li');li.setAttribute('role','option');li.setAttribute('aria-selected',i===idx);
      var a=document.createElement('span');a.textContent=c.label;var b=document.createElement('small');b.textContent=c.hint||'';li.append(a,b);
      li.addEventListener('click',function(){run(c)});list.appendChild(li);
    });
    if(!shown.length){var e=document.createElement('li');e.textContent='No matching command';list.appendChild(e)}
  }
  function run(c){dlg.close();setTimeout(function(){c.run()},60)}
  function open(){input.value='';idx=0;render();if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');input.focus()}
  input.addEventListener('input',function(){idx=0;render()});
  input.addEventListener('keydown',function(e){
    if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,shown.length-1);render()}
    else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,0);render()}
    else if(e.key==='Enter'&&shown[idx]){e.preventDefault();run(shown[idx])}
  });
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close()});
  document.addEventListener('keydown',function(e){
    var typing=/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||'');
    if((e.key==='k'&&(e.ctrlKey||e.metaKey))||(e.key==='/'&&!typing)){e.preventDefault();open()}
  });
  var b=SX.$('#palBtn');if(b)b.addEventListener('click',open);
  SX.openPalette=open;
}

/* navigation, theme button, install prompt, service worker */
function initChrome(){
  var menuBtn=SX.$('#menuBtn'),links=SX.$('#links');
  if(menuBtn){
    menuBtn.addEventListener('click',function(){var o=links.classList.toggle('open');menuBtn.setAttribute('aria-expanded',o)});
    links.addEventListener('click',function(e){if(e.target.tagName==='A'){links.classList.remove('open');menuBtn.setAttribute('aria-expanded','false')}});
  }
  var tb=SX.$('#themeBtn');if(tb)tb.addEventListener('click',SX.toggleTheme);
  var deferred=null,ib=SX.$('#installBtn');
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;if(ib)ib.hidden=false});
  if(ib)ib.addEventListener('click',function(){if(deferred){deferred.prompt();deferred=null;ib.hidden=true}});
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }
  var y=SX.$('#year');if(y)y.textContent=new Date().getFullYear();
  /* base commands */
  var sections=[['architecture','Architecture (3D stack)'],['globe','Global threat globe'],['soc','Live security console'],['mitre','MITRE ATT&CK coverage'],['vision','CNN lab'],['rag','RAG search'],['agents','Agentic AI incident response'],['tools','Security toolkit'],['copilot','Sentinel Copilot'],['docker','Docker and backend'],['trust','Trust and security'],['roadmap','Roadmap']];
  sections.forEach(function(s){SX.commands.push({label:'Go to '+s[1],hint:'Navigate',run:function(){SX.goto('#'+s[0])}})});
  SX.commands.push({label:'Toggle light and dark theme',hint:'Appearance',run:SX.toggleTheme});
}
SX.inits.push(initChrome,initPalette);
document.addEventListener('DOMContentLoaded',function(){SX.inits.forEach(function(f){try{f()}catch(e){console.error(e)}})});
})();
