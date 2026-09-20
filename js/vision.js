/* CNN lab: byte-plot images and a lightweight in-browser stand-in classifier. */
(function(){
'use strict';
var SX=window.SX;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function genSample(kind,seed){
  var r=mulberry(seed*7919+13),a=new Uint8Array(1024),pal=[0,0,0,32,64,72,101,116,128,144],y,x,i;
  function benignRow(row){
    if(row>0&&r()<.55){for(var i=0;i<32;i++)a[row*32+i]=a[(row-1)*32+i];return}
    var i=0;while(i<32){var len=3+Math.floor(r()*8),v=pal[Math.floor(r()*pal.length)];for(var k=0;k<len&&i<32;k++,i++)a[row*32+i]=v}
  }
  if(kind==='benign'){for(y=0;y<32;y++)benignRow(y)}
  else if(kind==='ransomware'){for(i=0;i<1024;i++)a[i]=Math.floor(r()*256)}
  else if(kind==='trojan'){for(y=0;y<14;y++)benignRow(y);for(i=448;i<1024;i++)a[i]=Math.floor(r()*256)}
  else{var t=[];for(i=0;i<64;i++)t.push(Math.floor(r()*256));for(y=0;y<32;y++)for(x=0;x<32;x++)a[y*32+x]=r()<.04?Math.floor(r()*256):t[(y%8)*8+(x%8)]}
  return a;
}
function corr(a,lag){
  var n=a.length-lag,sx=0,sy=0,i;for(i=0;i<n;i++){sx+=a[i];sy+=a[i+lag]}sx/=n;sy/=n;
  var c=0,vx=0,vy=0;for(i=0;i<n;i++){var x=a[i]-sx,y=a[i+lag]-sy;c+=x*y;vx+=x*x;vy+=y*y}
  return vx>0&&vy>0?Math.max(0,c/Math.sqrt(vx*vy)):0;
}
function entropyBits(a){var h=new Array(256).fill(0),i,H=0;for(i=0;i<a.length;i++)h[a[i]]++;for(i=0;i<256;i++)if(h[i]){var p=h[i]/a.length;H-=p*Math.log2(p)}return H}
function feats(a){
  var h=new Array(32).fill(0),H=0,i;for(i=0;i<a.length;i++)h[a[i]>>3]++;
  for(i=0;i<32;i++)if(h[i]){var p=h[i]/a.length;H-=p*Math.log2(p)}
  return [H/5,corr(a,1),corr(a,8),corr(a,256)];
}
var KINDS=['benign','trojan','ransomware','botnet'];
var KNAME={benign:'Benign program',trojan:'Trojan',ransomware:'Ransomware',botnet:'Botnet'};
var KWHY={
  benign:'Low-entropy, structured bytes that resemble ordinary code and data sections.',
  trojan:'A structured code section followed by a dense high-entropy region, typical of a packed payload attached to a normal program.',
  ransomware:'Uniformly high entropy from start to end, consistent with encrypted or heavily packed content.',
  botnet:'Byte patterns that repeat at fixed intervals, typical of templated bot components.'
};
var PROTO={};
KINDS.forEach(function(k){var s=[0,0,0,0];for(var i=0;i<30;i++){feats(genSample(k,i+1)).forEach(function(v,j){s[j]+=v/30})}PROTO[k]=s});
function classify(f){
  var l=KINDS.map(function(k){return -Math.sqrt(PROTO[k].reduce(function(s,v,j){return s+Math.pow(v-f[j],2)},0))/.12});
  var m=Math.max.apply(null,l),e=l.map(function(x){return Math.exp(x-m)}),z=e.reduce(function(a,b){return a+b});
  var p=e.map(function(x){return x/z}),top=p.indexOf(Math.max.apply(null,p));
  return {probs:p,top:KINDS[top],conf:p[top]};
}
function toImage(u){
  var img=new Uint8Array(1024),n=u.length;
  for(var r=0;r<32;r++){var off=n>32?Math.floor(r*(n-32)/31):0;for(var c=0;c<32;c++)img[r*32+c]=off+c<n?u[off+c]:0}
  return img;
}
SX.vision={KINDS:KINDS,KNAME:KNAME,genSample:genSample,feats:feats,classify:classify,entropyBits:entropyBits,toImage:toImage,
  cnnScan:function(kind){return classify(feats(genSample(kind,500+Math.floor(Math.random()*400))))}};

function init(){
  var cv=SX.$('#byteCanvas');if(!cv)return;
  var ctx=cv.getContext('2d'),off=document.createElement('canvas');off.width=off.height=32;
  var octx=off.getContext('2d'),probs=SX.$('#probs'),verdict=SX.$('#verdict'),vstats=SX.$('#vstats'),heat=SX.$('#heat');
  var state=null,rows={};
  KINDS.forEach(function(k){
    var d=document.createElement('div');d.className='prob';
    var r=document.createElement('div');r.className='row';var a=document.createElement('span');a.textContent=KNAME[k];var b=document.createElement('span');b.textContent='0%';r.append(a,b);
    var t=document.createElement('div');t.className='track';var f=document.createElement('div');f.className='fill';t.appendChild(f);d.append(r,t);probs.appendChild(d);rows[k]={pct:b,fill:f};
  });
  function draw(bytes){
    var im=octx.createImageData(32,32),i;
    for(i=0;i<1024;i++){var v=bytes[i];im.data[i*4]=v;im.data[i*4+1]=v;im.data[i*4+2]=v;im.data[i*4+3]=255}
    octx.putImageData(im,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,256,256);ctx.drawImage(off,0,0,256,256);
    if(heat.checked){
      var bs=8,by,bx,y,x,vals,mean,sd,sds=[];
      for(by=0;by<32;by+=bs)for(bx=0;bx<32;bx+=bs){
        vals=[];for(y=0;y<bs;y++)for(x=0;x<bs;x++)vals.push(bytes[(by+y)*32+bx+x]);
        mean=vals.reduce(function(a,b){return a+b},0)/vals.length;sd=Math.sqrt(vals.reduce(function(a,b){return a+(b-mean)*(b-mean)},0)/vals.length);sds.push([bx,by,sd]);
      }
      var mx=Math.max.apply(null,sds.map(function(s){return s[2]}))||1;
      ctx.fillStyle=SX.cssVar('--threat');
      sds.forEach(function(s){ctx.globalAlpha=Math.pow(s[2]/mx,2)*.6;ctx.fillRect(s[0]*8,s[1]*8,64,64)});ctx.globalAlpha=1;
    }
  }
  function show(bytes,label,fullBytes,isFile,remote){
    state={bytes:bytes};draw(bytes);
    var res=remote||classify(feats(bytes));
    KINDS.forEach(function(k,i){var p=res.probs[i];rows[k].pct.textContent=Math.round(p*100)+'%';rows[k].fill.style.width=(p*100)+'%';rows[k].fill.className='fill'+(k===res.top?' top':'')});
    verdict.replaceChildren();
    var b=document.createElement('b');b.textContent=(res.top==='benign'?'Looks benign':'Likely '+KNAME[res.top].toLowerCase())+' ('+Math.round(res.conf*100)+'% confidence)';
    var p=document.createElement('p');p.textContent=KWHY[res.top]+(isFile?' Compressed formats such as zip, jpg or mp4 also have high entropy, so treat this as a triage signal, not a verdict.':'')+(remote?' Scored by the vision container.':'');
    verdict.append(b,p);
    var H=entropyBits(fullBytes),f=feats(bytes);
    vstats.replaceChildren();
    [label,'Shannon entropy '+H.toFixed(2)+' of 8 bits per byte','Repetition score '+f[2].toFixed(2)].forEach(function(t){var s=document.createElement('span');s.textContent=t;vstats.appendChild(s)});
    if(res.top!=='benign'){SX.mitre.hit(res.top==='ransomware'?'T1486':res.top==='botnet'?'T1071':'T1204')}
  }
  function sample(kind){var b=genSample(kind,Math.floor(Math.random()*1e6)+600);show(b,KNAME[kind]+' sample (1 KB)',b,false)}
  SX.$$('[data-kind]').forEach(function(c){c.addEventListener('click',function(){
    SX.$$('[data-kind]').forEach(function(x){x.setAttribute('aria-pressed',x===c)});sample(c.dataset.kind);
  })});
  heat.addEventListener('change',function(){if(state)draw(state.bytes)});
  SX.$('#fileIn').addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;
    SX.$$('[data-kind]').forEach(function(x){x.setAttribute('aria-pressed','false')});
    f.slice(0,262144).arrayBuffer().then(function(buf){
      var u=new Uint8Array(buf),img=toImage(u),label=f.name.slice(0,40)+' ('+(f.size>1024?Math.round(f.size/1024)+' KB':f.size+' B')+')';
      if(SX.api&&SX.api.enabled){
        SX.api.postFile('/api/vision/scan',f).then(function(j){
          var order=KINDS.map(function(k){return j.probs[k]||0});
          show(img,label,u,true,{probs:order,top:j.top,conf:j.confidence});
        }).catch(function(){show(img,label,u,true)});
      }else show(img,label,u,true);
    }).catch(function(){verdict.textContent='This file could not be read. Try another one.'});
  });
  SX.recolors.push(function(){if(state)draw(state.bytes)});
  SX.commands.push({label:'Analyse a file in the CNN lab',hint:'Vision',run:function(){SX.goto('#vision');setTimeout(function(){SX.$('#fileIn').click()},400)}});
  sample('benign');
}
SX.inits.push(init);
})();
