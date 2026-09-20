/* Sentinel Copilot: chat over the knowledge base with tool intents, voice input and read-aloud. */
(function(){
'use strict';
var SX=window.SX;
var SCEN_WORDS={phishing:/phish/i,ransom:/ransom/i,sqli:/sql/i,brute:/brute|spray/i,beacon:/beacon|botnet|c2/i,deepfake:/deepfake|voice/i};
var speak=false;
function init(){
  var msgs=SX.$('#msgs');if(!msgs)return;
  var input=SX.$('#chatIn');
  function add(text,who,small){
    var d=document.createElement('div');d.className='msg '+who;d.textContent=text;
    if(small){var s=document.createElement('small');s.textContent=small;d.appendChild(s)}
    msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
    if(who==='ai'&&speak&&window.speechSynthesis){try{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(text))}catch(e){}}
    return d;
  }
  add('Hello, I am Sentinel Copilot. Ask me about an attack, paste a link to check it, or say "run ransomware" to start an incident response demo.','ai');
  function reply(q){
    var url=q.match(/https?:\/\/\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*/i);
    if(url&&/scan|check|safe|phish|legit|url|link/i.test(q)){
      var r=SX.tools.scanUrl(url[0]);
      if(r&&!r.error){
        add(r.verdict+' ('+r.score+' of 100) for '+r.host+'.\n'+r.reasons.slice(0,4).map(function(x){return '- '+x.text}).join('\n'),'ai','URL scanner, checked locally without visiting the site');
        if(r.score>=20)SX.mitre.hit('T1566');return;
      }
    }
    if(/\b(run|start|simulate|launch)\b/i.test(q)){
      var k=Object.keys(SCEN_WORDS).filter(function(x){return SCEN_WORDS[x].test(q)})[0];
      if(k&&SX.agents){add('Starting the "'+SX.SCENARIOS[k].name+'" incident in the Agentic AI section. Six agents will triage it.','ai');SX.goto('#agents');setTimeout(function(){SX.agents.play(k)},600);return}
    }
    if(/^(help|what can you do)/i.test(q.trim())){
      add('I can: answer security questions with citations, scan a URL ("is https://... safe?"), and start incident demos ("run phishing", "run ransomware", "run sql injection").','ai');return;
    }
    var wait=add('Searching the knowledge base...','ai');
    SX.rag.ask(q).then(function(res){
      wait.remove();
      if(res.none){add('I could not find supporting evidence for that in the knowledge base, so I will not guess. Try asking about phishing, ransomware, SQL injection, brute force, beaconing, prompt injection or deepfake scams.','ai');return}
      var txt=res.answer.map(function(x){return x.text+' ['+x.cite+']'}).join(' ');
      add(txt,'ai','Sources: '+res.hits.map(function(h,i){return '['+(i+1)+'] '+h.id+' '+h.title}).join('; '));
    });
  }
  function send(){var q=input.value.trim();if(!q)return;input.value='';add(q,'me');reply(q)}
  SX.$('#chatSend').addEventListener('click',send);
  input.addEventListener('keydown',function(e){if(e.key==='Enter')send()});
  SX.$$('[data-ask]').forEach(function(b){b.addEventListener('click',function(){input.value=b.dataset.ask;send()})});
  var tts=SX.$('#ttsBtn');
  if(window.speechSynthesis){tts.addEventListener('click',function(){speak=!speak;tts.setAttribute('aria-pressed',speak);tts.textContent=speak?'Read aloud: on':'Read aloud: off';if(!speak)speechSynthesis.cancel()})}
  else tts.hidden=true;
  var mic=SX.$('#micBtn'),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR){
    var rec=new SR();rec.lang='en-US';rec.interimResults=false;
    rec.onresult=function(e){input.value=e.results[0][0].transcript;send()};
    rec.onend=function(){mic.textContent='Speak'};
    rec.onerror=function(){mic.textContent='Speak';SX.toast('Voice input is not available here')};
    mic.addEventListener('click',function(){try{rec.start();mic.textContent='Listening...'}catch(e){}});
  }else mic.hidden=true;
  SX.commands.push({label:'Ask Sentinel Copilot',hint:'Chat',run:function(){SX.goto('#copilot');setTimeout(function(){input.focus()},400)}});
}
SX.inits.push(init);
})();
