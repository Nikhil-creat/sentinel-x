/* Security toolkit: phishing URL scanner, password strength checker, log forensics.
   All analysis runs locally in the browser. */
(function(){
'use strict';
var SX=window.SX;

/* ---------- URL scanner ---------- */
var RISKY_TLD=['zip','mov','xyz','top','tk','ml','ga','cf','gq','click','work','support','country','kim','loan','icu','buzz','rest'];
var KEYWORDS=['login','signin','verify','secure','account','update','bank','wallet','password','confirm','billing','suspend','unlock','invoice','payment','otp','kyc'];
var BRANDS=['google','paypal','microsoft','apple','amazon','facebook','instagram','netflix','whatsapp','linkedin','github','sbi','hdfc','icici','paytm','flipkart','binance','coinbase'];
var SHORT=['bit.ly','tinyurl.com','t.co','goo.gl','is.gd','cutt.ly','rebrand.ly','ow.ly'];
var MULTI=['co.uk','com.au','co.in','com.br','co.jp','co.za'];
function scanUrl(raw){
  var s=(raw||'').trim();if(!s)return null;
  var explicit=/^[a-z][a-z0-9+.-]*:\/\//i.test(s);
  var u;try{u=new URL(explicit?s:'https://'+s)}catch(e){return {error:'That does not look like a valid URL.'}}
  var host=u.hostname.toLowerCase(),reasons=[],score=0;
  function add(p,t){score+=p;reasons.push({points:p,text:t})}
  if(u.protocol==='http:')add(15,'Uses plain HTTP, so traffic is not encrypted');
  if(/^\d{1,3}(\.\d{1,3}){3}$/.test(host))add(30,'The host is a raw IP address instead of a domain name');
  if(u.username||u.password)add(25,'Contains a user-info part (@) that can disguise the real destination');
  var labels=host.split('.');
  if(labels.length>4)add(15,'Unusually many subdomains ('+labels.length+' parts)');
  if(host.indexOf('xn--')>-1)add(25,'Punycode (xn--) can imitate letters from other alphabets');
  var tld=labels[labels.length-1];
  if(RISKY_TLD.indexOf(tld)>-1)add(15,'Top-level domain .'+tld+' is frequently abused');
  var text=(host+u.pathname+u.search).toLowerCase(),kw=KEYWORDS.filter(function(k){return text.indexOf(k)>-1});
  if(kw.length)add(Math.min(20,kw.length*6),'Contains pressure or account keywords: '+kw.slice(0,4).join(', '));
  if((host.match(/-/g)||[]).length>=3)add(10,'Many hyphens in the domain name');
  if(s.length>75)add(10,'Very long URL ('+s.length+' characters)');
  if(!/^\d/.test(host)&&(host.replace(/[^0-9]/g,'').length/host.length)>.3)add(10,'A large share of the domain is digits');
  var norm=host.replace(/0/g,'o').replace(/1/g,'l').replace(/3/g,'e').replace(/5/g,'s').replace(/\$/g,'s');
  var last2=labels.slice(-2).join('.'),sld=MULTI.indexOf(last2)>-1?labels[labels.length-3]:labels[labels.length-2];
  BRANDS.some(function(b){if(norm.indexOf(b)>-1&&sld!==b){add(35,'Imitates "'+b+'" but is not its official domain');return true}return false});
  if(/[?&](url|redirect|next|return|goto)=https?/i.test(s))add(15,'Contains a redirect to another URL');
  if(SHORT.indexOf(host)>-1)add(15,'URL shortener hides the final destination');
  score=Math.min(100,score);
  if(!reasons.length)reasons.push({points:0,text:'No common phishing indicators found'});
  return {host:host,score:score,verdict:score<20?'Low risk':score<45?'Suspicious':'High risk',reasons:reasons};
}

/* ---------- password strength ---------- */
var COMMON=['password','123456','qwerty','abc123','letmein','111111','iloveyou','admin','welcome','monkey','dragon','football','login','passw0rd','master','sunshine','princess','india'];
function humanTime(sec){
  if(sec<1)return 'instantly';
  var u=[['second','seconds',60],['minute','minutes',60],['hour','hours',24],['day','days',365],['year','years',100],['century','centuries',1e9]],v=sec,i;
  for(i=0;i<u.length;i++){
    if(v<u[i][2]||i===u.length-1){var n=Math.floor(v);if(n>1e6)return 'billions of years';return n+' '+(n===1?u[i][0]:u[i][1])}
    v/=u[i][2];
  }
}
function wordBits(p){
  /* Words, names and simple substitutions are tried first by attackers, so they are far weaker than random characters. */
  var leet={'0':'o','1':'l','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s'},norm='',leetUsed=false,i,c;
  for(i=0;i<p.length;i++){c=p[i].toLowerCase();if(leet[c]){norm+=leet[c];leetUsed=true}else norm+=c}
  var letters=norm.replace(/[^a-z]/g,'');
  if(letters.length<6||letters.length<.6*p.length)return null;
  var vr=(letters.match(/[aeiou]/g)||[]).length/letters.length;
  if(vr<.28||vr>.6)return null;
  var words=0;norm.split(/[^a-z]+/).forEach(function(t){if(t.length>=3)words+=Math.max(1,Math.round(t.length/6))});
  var other=(p.match(/[^A-Za-z \-_]/g)||[]).length;
  return words*13+other*5+(leetUsed?4:0)+(/[A-Z]/.test(p)?2:0);
}
function assessPassword(p){
  if(!p)return null;
  var pool=0,notes=[];
  if(/[a-z]/.test(p))pool+=26;if(/[A-Z]/.test(p))pool+=26;if(/\d/.test(p))pool+=10;if(/[^A-Za-z0-9]/.test(p))pool+=33;
  var bits=p.length*Math.log2(pool||1),low=p.toLowerCase(),wb=wordBits(p);
  if(wb!==null&&wb<bits){bits=wb;notes.push('Looks like words or a name, possibly with simple substitutions. Attackers try these first')}
  if(COMMON.some(function(c){return low.indexOf(c)>-1})){bits=Math.min(bits,22);notes.push('Contains a very common password or word')}
  if(/(.)\1{2,}/.test(p)){bits-=6;notes.push('Repeated characters')}
  if(/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|wer|ert|asd|sdf)/i.test(p)){bits-=8;notes.push('Keyboard or alphabet sequence')}
  if(p.length<12)notes.push('Use at least 12 characters, or a passphrase of 4 or more random words');
  bits=Math.max(0,bits);
  var seconds=Math.pow(2,bits)/2/1e10;
  var label=bits<28?'Very weak':bits<36?'Weak':bits<60?'Fair':bits<80?'Strong':'Very strong';
  return {bits:bits,seconds:seconds,time:humanTime(seconds),label:label,notes:notes,length:p.length};
}

/* ---------- log forensics ---------- */
var RULES=[
 {id:'sqli',name:'SQL injection',sev:'crit',mitre:'T1190',re:/(union(\s|%20|\+)+select|(\'|%27)\s*or\s*(\'|%27)?\d|\bor\s+1=1|sleep\(\d|information_schema|xp_cmdshell)/i},
 {id:'xss',name:'Cross-site scripting',sev:'high',mitre:'T1190',re:/(<script|%3cscript|onerror\s*=|onload\s*=|javascript:)/i},
 {id:'traversal',name:'Path traversal',sev:'high',mitre:'T1190',re:/(\.\.\/|\.\.%2f|%2e%2e%2f|\/etc\/passwd|boot\.ini)/i},
 {id:'cmdi',name:'Command injection',sev:'crit',mitre:'T1059',re:/((;|\||`|\$\()\s*(cat|ls|wget|curl|nc|bash|sh|powershell)\b|cmd\.exe|\/bin\/(ba)?sh)/i},
 {id:'ps',name:'Encoded PowerShell',sev:'high',mitre:'T1059',re:/(powershell.*-enc|-encodedcommand|frombase64string|downloadstring)/i},
 {id:'scanner',name:'Scanner or attack tool',sev:'med',mitre:'T1046',re:/(sqlmap|nikto|nmap|masscan|acunetix|dirbuster|gobuster|wpscan)/i},
 {id:'authfail',name:'Failed login',sev:'med',mitre:'T1110',re:/(failed password|authentication failure|invalid user|login failed|(\s|")401\s)/i}
];
var SAMPLE_LOG=[
'203.0.113.7 - - [19/Sep/2026:10:01:02 +0000] "GET /index.html HTTP/1.1" 200 1523 "-" "Mozilla/5.0"',
'198.51.100.23 - - [19/Sep/2026:10:01:05 +0000] "GET /products?id=1\' OR 1=1-- HTTP/1.1" 500 312 "-" "sqlmap/1.7"',
'198.51.100.23 - - [19/Sep/2026:10:01:06 +0000] "GET /products?id=1 UNION SELECT username,password FROM users HTTP/1.1" 200 4021 "-" "sqlmap/1.7"',
'192.0.2.44 - - [19/Sep/2026:10:02:11 +0000] "GET /search?q=<script>alert(1)</script> HTTP/1.1" 200 800 "-" "Mozilla/5.0"',
'192.0.2.44 - - [19/Sep/2026:10:02:19 +0000] "GET /download?file=../../../../etc/passwd HTTP/1.1" 404 190 "-" "curl/8.0"',
'Sep 19 10:03:01 srv sshd[221]: Failed password for invalid user admin from 198.51.100.99 port 50211 ssh2',
'Sep 19 10:03:03 srv sshd[221]: Failed password for invalid user root from 198.51.100.99 port 50213 ssh2',
'Sep 19 10:03:05 srv sshd[221]: Failed password for invalid user test from 198.51.100.99 port 50215 ssh2',
'Sep 19 10:03:07 srv sshd[221]: Failed password for invalid user oracle from 198.51.100.99 port 50217 ssh2',
'Sep 19 10:03:09 srv sshd[221]: Failed password for invalid user ubuntu from 198.51.100.99 port 50219 ssh2',
'Sep 19 10:03:11 srv sshd[221]: Failed password for root from 198.51.100.99 port 50221 ssh2',
'203.0.113.7 - - [19/Sep/2026:10:04:20 +0000] "GET /api/health HTTP/1.1" 200 15 "-" "kube-probe"',
'10.0.0.15 - - [19/Sep/2026:10:05:44 +0000] "POST /cgi-bin/run?cmd=;cat /etc/shadow HTTP/1.1" 500 0 "-" "Mozilla/5.0"',
'WIN-SRV1 EventID=4688 CommandLine="powershell.exe -nop -w hidden -EncodedCommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA" ParentImage=winword.exe'
].join('\n');
var SEVW={crit:25,high:15,med:8};
function analyzeLogs(text){
  var lines=(text||'').split(/\r?\n/).filter(function(l){return l.trim()}),found={},ips={},fails={},suspicious=0;
  lines.forEach(function(l){
    var m=l.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/),ip=m?m[1]:null,hit=false;
    RULES.forEach(function(r){
      if(r.re.test(l)){
        hit=true;var f=found[r.id]||(found[r.id]={name:r.name,sev:r.sev,mitre:r.mitre,count:0,example:l.length>120?l.slice(0,117)+'...':l});f.count++;
        if(ip){if(r.id==='authfail')fails[ip]=(fails[ip]||0)+1;ips[ip]=(ips[ip]||0)+1}
      }
    });
    if(hit)suspicious++;
  });
  var findings=Object.keys(found).map(function(k){return found[k]});
  Object.keys(fails).forEach(function(ip){if(fails[ip]>=5)findings.push({name:'Brute-force pattern from '+ip,sev:'high',mitre:'T1110',count:fails[ip],example:fails[ip]+' failed logins from one address'})});
  var order={crit:0,high:1,med:2};findings.sort(function(a,b){return order[a.sev]-order[b.sev]||b.count-a.count});
  var score=Math.min(100,findings.reduce(function(s,f){return s+SEVW[f.sev]+Math.min(10,f.count)},0));
  var offenders=Object.keys(ips).map(function(ip){return [ip,ips[ip]]}).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
  return {lines:lines.length,suspicious:suspicious,findings:findings,offenders:offenders,score:score};
}
SX.tools={scanUrl:scanUrl,assessPassword:assessPassword,analyzeLogs:analyzeLogs,humanTime:humanTime,SAMPLE_LOG:SAMPLE_LOG};

/* ---------- UI ---------- */
function li(main,small,badge,cls){
  var e=document.createElement('li'),a=document.createElement('span');a.textContent=main;
  if(small){var s=document.createElement('small');s.style.display='block';s.textContent=small;a.appendChild(s)}
  e.appendChild(a);
  if(badge){var b=document.createElement('span');b.className='badge '+(cls||'');b.textContent=badge;e.appendChild(b)}
  return e;
}
function sevClass(s){return s==='crit'?'s-crit':s==='high'?'s-high':'s-med'}
function scoreColor(sc){return sc>=45?'var(--crit)':sc>=20?'var(--threat)':'var(--def)'}
function init(){
  var tabs=SX.$('#toolTabs');if(!tabs)return;
  function show(id){
    SX.$$('#toolTabs [data-tab]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.tab===id)});
    SX.$$('.tabpanel').forEach(function(p){p.classList.toggle('on',p.id==='tab-'+id)});
  }
  tabs.addEventListener('click',function(e){var t=e.target.dataset&&e.target.dataset.tab;if(t)show(t)});
  show('url');
  /* URL */
  var uIn=SX.$('#urlIn'),uOut=SX.$('#urlOut');
  function runUrl(){
    var r=scanUrl(uIn.value);uOut.replaceChildren();if(!r)return;
    if(r.error){uOut.textContent=r.error;return}
    var h=document.createElement('h3');h.textContent=r.verdict+' ('+r.score+' of 100)';h.style.color=scoreColor(r.score);
    var m=document.createElement('div');m.className='meter';var i=document.createElement('i');i.style.width=r.score+'%';i.style.background=scoreColor(r.score);m.appendChild(i);
    var ul=document.createElement('ul');ul.className='findings';
    r.reasons.forEach(function(x){ul.appendChild(li(x.text,null,x.points?'+'+x.points:''))});
    var n=document.createElement('p');n.className='note';n.textContent='Heuristic check of the address only. The page is never visited. A low score does not prove a site is safe.';
    uOut.append(h,m,ul,n);
    if(r.score>=20)SX.mitre.hit('T1566');
  }
  SX.$('#urlBtn').addEventListener('click',runUrl);uIn.addEventListener('keydown',function(e){if(e.key==='Enter')runUrl()});
  SX.$$('[data-url]').forEach(function(b){b.addEventListener('click',function(){uIn.value=b.dataset.url;runUrl()})});
  /* password */
  var pIn=SX.$('#pwIn'),pOut=SX.$('#pwOut');
  pIn.addEventListener('input',function(){
    var r=assessPassword(pIn.value);pOut.replaceChildren();if(!r)return;
    var pct=Math.min(100,r.bits/100*100),col=r.bits<36?'var(--crit)':r.bits<60?'var(--threat)':'var(--def)';
    var h=document.createElement('h3');h.textContent=r.label;h.style.color=col;
    var m=document.createElement('div');m.className='meter';var i=document.createElement('i');i.style.width=pct+'%';i.style.background=col;m.appendChild(i);
    var k=document.createElement('div');k.className='kpis';
    [['Entropy',r.bits.toFixed(0)+' bits'],['Length',r.length],['Offline crack time',r.time]].forEach(function(x){var s=document.createElement('span');s.textContent=x[0]+': ';var b=document.createElement('b');b.textContent=x[1];s.appendChild(b);k.appendChild(s)});
    pOut.append(h,m,k);
    if(r.notes.length){var ul=document.createElement('ul');ul.className='findings';r.notes.forEach(function(n){ul.appendChild(li(n))});pOut.appendChild(ul)}
  });
  var showPw=SX.$('#pwShow');showPw.addEventListener('change',function(){pIn.type=showPw.checked?'text':'password'});
  /* logs */
  var lIn=SX.$('#logIn'),lOut=SX.$('#logOut'),lastLog=null;
  function runLogs(){
    var r=analyzeLogs(lIn.value);lastLog=r;lOut.replaceChildren();
    if(!r.lines){lOut.textContent='Paste some log lines first, or load the sample.';return}
    var k=document.createElement('div');k.className='kpis';
    [['Lines',r.lines],['Suspicious lines',r.suspicious],['Findings',r.findings.length],['Risk score',r.score+' of 100']].forEach(function(x){var s=document.createElement('span');s.textContent=x[0]+': ';var b=document.createElement('b');b.textContent=x[1];s.appendChild(b);k.appendChild(s)});
    var ul=document.createElement('ul');ul.className='findings';
    if(!r.findings.length)ul.appendChild(li('No known attack patterns found in these lines.'));
    r.findings.forEach(function(f){var e=li(f.name+' ('+f.count+')',f.mitre+' | '+f.example,f.sev,sevClass(f.sev));ul.appendChild(e);SX.mitre.hit(f.mitre)});
    lOut.append(k,ul);
    if(r.offenders.length){var p=document.createElement('p');p.className='note';p.textContent='Top sources: '+r.offenders.map(function(o){return o[0]+' ('+o[1]+')'}).join(', ');lOut.appendChild(p)}
    SX.$('#logDl').hidden=false;
  }
  SX.$('#logBtn').addEventListener('click',runLogs);
  SX.$('#logSample').addEventListener('click',function(){lIn.value=SAMPLE_LOG;runLogs()});
  SX.$('#logDl').addEventListener('click',function(){if(lastLog)SX.download('log-analysis.json',JSON.stringify(lastLog,null,2),'application/json')});
  SX.$('#logFile').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;f.slice(0,500000).text().then(function(t){lIn.value=t;runLogs()})});
  SX.commands.push({label:'Scan a URL for phishing',hint:'Toolkit',run:function(){SX.goto('#tools');show('url');setTimeout(function(){uIn.focus()},400)}});
  SX.commands.push({label:'Check password strength',hint:'Toolkit',run:function(){SX.goto('#tools');show('pw');setTimeout(function(){pIn.focus()},400)}});
  SX.commands.push({label:'Analyse security logs',hint:'Toolkit',run:function(){SX.goto('#tools');show('log')}});
}
SX.inits.push(init);
})();
