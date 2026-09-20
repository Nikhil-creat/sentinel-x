/* RAG: TF-IDF retrieval over the threat-intelligence knowledge base, grounded and cited answers. */
(function(){
'use strict';
var SX=window.SX;
var STOP=new Set('the and for with that this from are was were has have had how what when where which who why can could should would you your not but all any use used using into over than then they them their its our out too via one two about does did do is it in on of to as at by an be or if so we my me i a'.split(' '));
function tok(s){return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(function(w){return w.length>2&&!STOP.has(w)}).map(function(w){return w.length>4?w.replace(/(ing|ed|es|s)$/,''):w})}
var idf=null,docVecs=null,KB=null;
function build(){
  KB=SX.KB||[];idf={};var df={},N=KB.length;
  KB.forEach(function(d){d.toks=tok(d.title+' '+d.title+' '+d.text);new Set(d.toks).forEach(function(t){df[t]=(df[t]||0)+1})});
  Object.keys(df).forEach(function(t){idf[t]=Math.log(1+N/df[t])});
  docVecs=KB.map(function(d){return vec(d.toks)});
}
function vec(toks){
  var tf={},v={},n=0,t;toks.forEach(function(x){tf[x]=(tf[x]||0)+1});
  for(t in tf){if(idf[t]){v[t]=tf[t]*idf[t];n+=v[t]*v[t]}}
  n=Math.sqrt(n)||1;for(t in v)v[t]/=n;return v;
}
function search(q){
  if(!idf)build();
  var qv=vec(tok(q));
  return KB.map(function(d,i){var s=0,t;for(t in qv){if(docVecs[i][t])s+=qv[t]*docVecs[i][t]}return {doc:d,score:s}}).sort(function(a,b){return b.score-a.score}).slice(0,3);
}
function sentences(t){return t.match(/[^.!?]+[.!?]+/g)||[t]}
function query(q){
  var hits=search(q).filter(function(h){return h.score>.02});
  if(!hits.length||hits[0].score<.08)return {none:true,answer:[],hits:[]};
  var qt=new Set(tok(q)),top=hits[0].score;
  function pick(h,k){
    var ss=sentences(h.doc.text).map(function(s,i){return {s:s.trim(),i:i,o:tok(s).filter(function(w){return qt.has(w)}).length}});
    return ss.slice().sort(function(a,b){return b.o-a.o||a.i-b.i}).slice(0,k).sort(function(a,b){return a.i-b.i});
  }
  var ans=pick(hits[0],2).map(function(x){return {text:x.s,cite:1}});
  if(hits[1]&&hits[1].score>.6*top)pick(hits[1],1).forEach(function(x){ans.push({text:x.s,cite:2})});
  return {none:false,answer:ans,hits:hits.map(function(h){return {id:h.doc.id,title:h.doc.title,text:h.doc.text,score:h.score}})};
}
function ask(q){
  if(SX.api&&SX.api.enabled)return SX.api.post('/api/rag/query',{query:q}).catch(function(){return query(q)});
  return Promise.resolve(query(q));
}
SX.rag={tok:tok,search:search,query:query,ask:ask,size:function(){if(!idf)build();return KB.length},
  top:function(q){var h=search(q)[0];return {id:h.doc.id,title:h.doc.title,score:h.score}}};

function render(res){
  var ans=SX.$('#ans'),srcs=SX.$('#srcs');ans.replaceChildren();srcs.replaceChildren();
  var box=document.createElement('div');box.className='answer';
  if(res.none){
    box.classList.add('none');box.textContent='No supported answer. The knowledge base has nothing relevant to this question, so Sentinel-X declines to guess. Try asking about a specific attack, such as phishing, ransomware or brute force.';
    ans.appendChild(box);return;
  }
  var lab=document.createElement('b');lab.textContent='Answer';box.appendChild(lab);box.appendChild(document.createTextNode(' '));
  res.answer.forEach(function(x){box.appendChild(document.createTextNode(x.text+' '));var s=document.createElement('sup');s.textContent='['+x.cite+'] ';box.appendChild(s)});
  ans.appendChild(box);
  var top=res.hits[0].score||1;
  res.hits.forEach(function(h,i){
    var li=document.createElement('li'),t=document.createElement('div');t.className='t';
    var a=document.createElement('span');a.textContent='['+(i+1)+'] '+h.title;var b=document.createElement('span');b.textContent=h.id+' | similarity '+h.score.toFixed(2);t.append(a,b);
    var tr=document.createElement('div');tr.className='track';var f=document.createElement('div');f.className='fill';f.style.width=Math.min(100,h.score/top*100)+'%';tr.appendChild(f);
    var p=document.createElement('p');p.style.marginTop='8px';p.textContent=h.text;li.append(t,tr,p);srcs.appendChild(li);
  });
}
function init(){
  var input=SX.$('#q');if(!input)return;
  var chips=SX.$('#qchips');
  SX.$('#kbInfo').textContent=SX.rag.size()+' knowledge chunks indexed.';
  ['How do I detect ransomware?','What does SQL injection look like in logs?','How to stop password spraying?','Signs of malware beaconing','How do I defend an LLM against prompt injection?','How do I spot a deepfake voice scam?','Best pizza in town'].forEach(function(t){
    var c=document.createElement('button');c.className='chip';c.textContent=t;c.addEventListener('click',function(){input.value=t;go()});chips.appendChild(c);
  });
  function go(){var q=input.value.trim();if(!q)return;ask(q).then(render)}
  SX.$('#ask').addEventListener('click',go);
  input.addEventListener('keydown',function(e){if(e.key==='Enter')go()});
  SX.commands.push({label:'Search the threat knowledge base',hint:'RAG',run:function(){SX.goto('#rag');setTimeout(function(){input.focus()},400)}});
}
SX.inits.push(init);
})();
