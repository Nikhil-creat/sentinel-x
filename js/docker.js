/* Docker section: compose file viewer, service table and copy button. */
(function(){
'use strict';
var SX=window.SX;
function init(){
  var src=SX.$('#composeSrc'),out=SX.$('#compose');if(!src||!out)return;
  var text=src.textContent.replace(/^\n/,'');out.textContent=text;
  [['web','nginx (unprivileged)','edge','Serves the dashboard, proxies /api'],['gateway','FastAPI','edge, core','API key, rate limits, routing'],['vision','FastAPI, NumPy, optional PyTorch','core','Malware triage'],['rag','FastAPI, TF-IDF','core','Cited answers'],['agents','FastAPI, httpx','core','Incident-response agents'],['llm (optional)','Ollama','core, egress','Local model, profile "llm"']].forEach(function(r){
    var tr=document.createElement('tr');r.forEach(function(c,i){var td=document.createElement('td');td.textContent=c;if(i===0)td.style.fontWeight=600;tr.appendChild(td)});SX.$('#svcRows').appendChild(tr);
  });
  SX.$('#copy').addEventListener('click',function(e){
    var b=e.target,done=function(ok){b.textContent=ok?'Copied':'Select the text to copy';setTimeout(function(){b.textContent='Copy'},1800)};
    try{navigator.clipboard.writeText(text).then(function(){done(true)},function(){done(false)})}catch(x){done(false)}
  });
  SX.$('#dlCompose').addEventListener('click',function(){SX.download('docker-compose.yml',text,'text/yaml')});
}
SX.inits.push(init);
})();
