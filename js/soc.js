/* Live security console (simulated events) and MITRE ATT&CK coverage matrix. */
(function(){
'use strict';
var SX=window.SX;
var TACTICS=[
 ['Initial Access',[['T1566','Phishing'],['T1190','Exploit public app']]],
 ['Execution',[['T1059','Scripting'],['T1204','User execution']]],
 ['Persistence',[['T1078','Valid accounts']]],
 ['Credential Access',[['T1110','Brute force'],['T1003','Credential dumping']]],
 ['Discovery',[['T1046','Network scan']]],
 ['Command and Control',[['T1071','Web protocols']]],
 ['Impact',[['T1498','Denial of service'],['T1486','Data encrypted']]]
];
var cells={},hits={};
SX.mitre={
  hit:function(id,n){
    if(!cells[id])return;hits[id]=(hits[id]||0)+(n||1);
    var c=cells[id];c.n.textContent=hits[id];c.el.style.setProperty('--h',Math.min(.55,.08+hits[id]*.03));
  },
  counts:function(){return JSON.parse(JSON.stringify(hits))}
};
function initMatrix(){
  var m=SX.$('#matrix');if(!m)return;
  TACTICS.forEach(function(t){
    var col=document.createElement('div');col.className='tac';var h=document.createElement('h4');h.textContent=t[0];col.appendChild(h);
    t[1].forEach(function(x){
      var el=document.createElement('div');el.className='tech';
      var n=document.createElement('span');n.className='n';n.textContent='0';
      var inner=document.createElement('span');var b=document.createElement('b');b.textContent=x[0];inner.appendChild(b);inner.appendChild(document.createTextNode(x[1]));
      el.append(inner,n);col.appendChild(el);cells[x[0]]={el:el,n:n};
    });
    m.appendChild(col);
  });
}
var TYPES=[['Brute-force login attempts','high','T1110'],['Phishing link clicked','high','T1566'],['SQL injection attempt','crit','T1190'],['Port scan from external host','low','T1046'],['Beaconing to rare domain','med','T1071'],['CNN flagged trojan sample','crit','T1204'],['Suspicious PowerShell command','med','T1059'],['Impossible-travel login','med','T1078'],['Traffic spike on API gateway','high','T1498'],['File scanned and cleared by CNN','info','none'],['Ransomware-like file renames','crit','T1486'],['Credential dumping alert','crit','T1003'],['Routine certificate renewal','info','none']];
var W={crit:90,high:70,med:45,low:20,info:5};
var recent=[],state={total:0,blocked:0,esc:0,risk:0};
SX.soc={snapshot:function(){return {generated:new Date().toISOString(),counters:{events:state.total,contained:state.blocked,escalated:state.esc,riskIndex:Math.round(state.risk)},mitreHits:SX.mitre.counts(),recentEvents:recent.slice(0,50),note:'Simulated data from the Sentinel-X demo.'}}};
function initSoc(){
  var feed=SX.$('#feed'),spark=SX.$('#spark');if(!feed)return;
  var sctx=spark.getContext('2d'),data=[],paused=false,surge=0;
  function rip(){return (10+Math.floor(Math.random()*200))+'.'+Math.floor(Math.random()*255)+'.'+Math.floor(Math.random()*255)+'.'+(1+Math.floor(Math.random()*254))}
  function addEvent(){
    var t=TYPES[Math.floor(Math.random()*TYPES.length)],sev=t[1],action;
    if(sev==='crit')action=Math.random()<.7?'Contained':'Escalated';else if(sev==='high')action=Math.random()<.75?'Contained':'Escalated';else if(sev==='med')action='Queued';else action='Logged';
    if(action==='Contained')state.blocked++;if(action==='Escalated')state.esc++;
    state.risk=state.risk*.92+W[sev]*.08;state.total++;SX.mitre.hit(t[2]);
    var ip=rip();recent.unshift({time:new Date().toISOString(),severity:sev,event:t[0],source:ip,technique:t[2],action:action});if(recent.length>100)recent.pop();
    var row=document.createElement('div');row.className='ev';
    var s=document.createElement('span');s.className='sev s-'+sev;s.textContent=sev;
    var m=document.createElement('span');m.className='m';m.textContent=t[0]+' ';var sm=document.createElement('small');sm.textContent=ip+' | '+t[2];m.appendChild(sm);
    var a=document.createElement('span');a.className='act';a.textContent=action;row.append(s,m,a);
    feed.insertBefore(row,feed.firstChild);while(feed.children.length>7)feed.removeChild(feed.lastChild);
  }
  function drawSpark(){
    var dpr=window.devicePixelRatio||1,w=spark.clientWidth,h=spark.clientHeight;if(!w)return;
    if(spark.width!==Math.round(w*dpr)){spark.width=Math.round(w*dpr);spark.height=Math.round(h*dpr)}
    sctx.setTransform(dpr,0,0,dpr,0,0);sctx.clearRect(0,0,w,h);
    var mx=Math.max(6,Math.max.apply(null,data)),step=w/47,def=SX.cssVar('--def');
    sctx.beginPath();data.forEach(function(v,i){var x=i*step,y=h-6-(v/mx)*(h-16);i?sctx.lineTo(x,y):sctx.moveTo(x,y)});
    sctx.strokeStyle=def;sctx.lineWidth=2;sctx.stroke();
    sctx.lineTo((data.length-1)*step,h);sctx.lineTo(0,h);sctx.closePath();sctx.globalAlpha=.14;sctx.fillStyle=def;sctx.fill();sctx.globalAlpha=1;
  }
  function paintCounters(){
    SX.$('#cTotal').textContent=state.total;SX.$('#cBlocked').textContent=state.blocked;SX.$('#cEsc').textContent=state.esc;SX.$('#cRisk').textContent=Math.round(state.risk);
    var h=SX.$('#heroCount');if(h)h.textContent=state.total;
  }
  function tick(){
    if(paused)return;
    var n=surge>0?6+Math.floor(Math.random()*5):1+Math.floor(Math.random()*2);if(surge>0)surge--;
    for(var i=0;i<n;i++)addEvent();
    data.push(n);if(data.length>48)data.shift();paintCounters();drawSpark();
  }
  var i;for(i=0;i<48;i++)data.push(0);for(i=0;i<6;i++)addEvent();
  setInterval(tick,1100);tick();addEventListener('resize',drawSpark);SX.recolors.push(drawSpark);
  var doSurge=function(){surge=8;SX.toast('Attack surge started')};
  SX.$('#surge').addEventListener('click',doSurge);
  var togglePause=function(){paused=!paused;SX.$('#pause').textContent=paused?'Resume stream':'Pause stream';SX.$('#socState').textContent=paused?'Paused':'Running'};
  SX.$('#pause').addEventListener('click',togglePause);
  SX.$('#exportSoc').addEventListener('click',function(){SX.download('sentinel-x-soc-snapshot.json',JSON.stringify(SX.soc.snapshot(),null,2),'application/json')});
  SX.commands.push({label:'Simulate an attack surge',hint:'Console',run:function(){SX.goto('#soc');doSurge()}});
  SX.commands.push({label:'Pause or resume the event stream',hint:'Console',run:togglePause});
  SX.commands.push({label:'Export security console snapshot (JSON)',hint:'Download',run:function(){SX.$('#exportSoc').click()}});
}
SX.inits.push(initMatrix,initSoc);
})();
