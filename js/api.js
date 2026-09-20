/* Optional backend connection. When a gateway URL is saved and reachable, the
   RAG search and CNN lab use the Docker services; otherwise everything runs in the browser. */
(function(){
'use strict';
var SX=window.SX;
var api=SX.api={base:'',enabled:false,key:''};
function clean(u){return (u||'').trim().replace(/\/+$/,'')}
api.headers=function(extra){var h=extra||{};if(api.key)h['X-API-Key']=api.key;return h};
api.get=function(path){return fetch(api.base+path,{headers:api.headers()}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})};
api.post=function(path,body){return fetch(api.base+path,{method:'POST',headers:api.headers({'Content-Type':'application/json'}),body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})};
api.postFile=function(path,file){var f=new FormData();f.append('file',file);return fetch(api.base+path,{method:'POST',headers:api.headers(),body:f}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})};
function setStatus(state,text){var s=SX.$('#apiStatus');if(!s)return;s.className='status '+state;s.replaceChildren();s.appendChild(document.createElement('i'));s.appendChild(document.createTextNode(text))}
api.test=function(){
  var raw=SX.$('#apiUrl').value.trim();api.key=SX.$('#apiKey').value.trim();
  api.base=raw==='/'?'':clean(raw);
  if(!raw){api.enabled=false;setStatus('','Not connected (running fully in your browser)');SX.store.set('api','');return Promise.resolve(false)}
  setStatus('','Testing connection');
  return api.get('/health').then(function(j){
    api.enabled=true;setStatus('on','Connected to '+(raw==='/'?'this server':api.base)+(j&&j.services?' ('+Object.keys(j.services).length+' services, status '+j.status+')':''));SX.store.set('api',raw);SX.toast('Backend connected');return true;
  }).catch(function(){
    api.enabled=false;setStatus('bad','Could not reach the backend. Using in-browser mode.');return false;
  });
};
function init(){
  var u=SX.$('#apiUrl');if(!u)return;
  var saved=SX.store.get('api','');if(saved){u.value=saved;api.test()}
  SX.$('#apiTest').addEventListener('click',api.test);
}
SX.inits.push(init);
})();
