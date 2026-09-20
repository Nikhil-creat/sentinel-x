/* Interactive 3D architecture stack with layer details. */
(function(){
'use strict';
var SX=window.SX;
var LAYERS=SX.LAYERS=[
 {id:'agents',name:'Agent orchestrator',color:'#e0509c',text:'A team of agents (Monitor, Planner, Analyst, Reasoner, Responder, Reporter) coordinated as a state machine. Each agent can call only allow-listed tools, and risky actions wait for human approval.',tech:'Python, FastAPI, httpx (LangGraph-ready)',io:['Takes: alerts, evidence, policies','Produces: plans, actions, incident reports']},
 {id:'llm',name:'LLM reasoning',color:'#6a74f0',text:'An instruction-tuned language model reads the evidence from the CNN and RAG layers, maps behaviour to MITRE ATT&CK, and returns a risk score with a plain-language explanation. Without a model, a rule engine takes over.',tech:'Open-weight model through Ollama (optional), rule-based fallback',io:['Takes: alert plus retrieved context','Produces: verdict, risk score, rationale']},
 {id:'rag',name:'RAG knowledge',color:'#2aa7e0',text:'Threat intelligence is split into chunks and indexed. Retrieval fetches the best evidence, and every answer carries citations. Questions with no supporting evidence are refused instead of guessed.',tech:'TF-IDF retrieval today, embeddings and vector database as the upgrade path',io:['Takes: a question or alert','Produces: ranked, cited knowledge chunks']},
 {id:'cnn',name:'CNN vision',color:'#e08a1e',text:'Files are rendered as grayscale byte images and classified into malware families. A region heatmap shows where the model looked, so analysts can check the decision.',tech:'NumPy classifier by default, PyTorch CNN through the optional training script',io:['Takes: file bytes as a 2D image','Produces: family probabilities, heatmap']},
 {id:'ingest',name:'Data ingestion',color:'#12b394',text:'Logs, network flows and endpoint telemetry are collected, normalised into one event schema and streamed to the analysis layers. Raw evidence is kept for later investigation.',tech:'Syslog, Zeek, Suricata as sources; REST ingestion in the gateway',io:['Takes: logs, PCAP, endpoint events','Produces: normalised event stream']},
 {id:'docker',name:'Docker runtime',color:'#5b8aa6',text:'Every service is a separate container on segmented networks with non-root users, read-only filesystems, health checks, resource limits and mounted secrets. One command starts the whole platform.',tech:'Docker Compose, nginx, health checks',io:['Takes: images and configuration','Produces: an isolated, reproducible deployment']}
];
function init(){
  var list=SX.$('#layerList'),detail=SX.$('#layerDetail');if(!list)return;
  var btns=[];
  LAYERS.forEach(function(l,i){
    var b=document.createElement('button');b.className='layer';b.setAttribute('aria-pressed','false');
    var sw=document.createElement('i');sw.style.background=l.color;b.appendChild(sw);b.appendChild(document.createTextNode(l.name));
    b.addEventListener('click',function(){select(i)});list.appendChild(b);btns.push(b);
  });
  var meshes=[],edges=[],target=[];
  function select(i){
    btns.forEach(function(b,j){b.setAttribute('aria-pressed',j===i)});
    var l=LAYERS[i];detail.replaceChildren();
    var h=document.createElement('h3');h.textContent=l.name;var p=document.createElement('p');p.textContent=l.text;
    var dl=document.createElement('dl');
    [['Technology',l.tech],['Data',l.io.join('. ')]].forEach(function(r){var dt=document.createElement('dt');dt.textContent=r[0];var dd=document.createElement('dd');dd.textContent=r[1];dl.append(dt,dd)});
    detail.append(h,p,dl);
    meshes.forEach(function(m,j){target[j]=j===i?1:0});
  }
  SX.commands.push({label:'Show CNN layer details',hint:'Architecture',run:function(){SX.goto('#architecture');select(3)}});
  SX.commands.push({label:'Show agent layer details',hint:'Architecture',run:function(){SX.goto('#architecture');select(0)}});
  if(!window.THREE){select(0);return}
  var canvas=SX.$('#stackCanvas'),renderer=SX.makeRenderer(canvas);
  if(!renderer){select(0);return}
  var scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,100);cam.position.set(0,4.2,11.5);cam.lookAt(0,.2,0);
  var group=new THREE.Group();scene.add(group);var tex=SX.dotTexture(),n=LAYERS.length,gap=.95;
  LAYERS.forEach(function(l,i){
    var col=new THREE.Color(l.color),y=(n-1-i)*gap-((n-1)*gap)/2;
    var geo=new THREE.BoxGeometry(4.4,.1,4.4);
    var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.14,depthWrite:false}));
    m.position.y=y;m.userData.i=i;
    var e=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:.6}));
    m.add(e);
    var pp=[];for(var k=0;k<26;k++)pp.push(new THREE.Vector3((Math.random()-.5)*3.8,.09,(Math.random()-.5)*3.8));
    m.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pp),new THREE.PointsMaterial({color:col,size:.13,map:tex,transparent:true,depthWrite:false})));
    group.add(m);meshes.push(m);edges.push(e);target.push(0);
  });
  var vy=(n-1)*gap/2+.3,vl=[];[[-2.2,-2.2],[2.2,-2.2],[2.2,2.2],[-2.2,2.2]].forEach(function(c){vl.push(new THREE.Vector3(c[0],-vy,c[1]),new THREE.Vector3(c[0],vy,c[1]))});
  var vlMat=new THREE.LineBasicMaterial({transparent:true,opacity:.3});
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vl),vlMat));
  var fN=30,fPos=new Float32Array(fN*3),fd=[];
  for(var f=0;f<fN;f++){fd.push({x:(Math.random()-.5)*3.6,z:(Math.random()-.5)*3.6,y:Math.random(),v:.08+Math.random()*.12})}
  var fGeo=new THREE.BufferGeometry();fGeo.setAttribute('position',new THREE.BufferAttribute(fPos,3));
  var fMat=new THREE.PointsMaterial({size:.16,map:tex,transparent:true,depthWrite:false});
  group.add(new THREE.Points(fGeo,fMat));
  function paint(){vlMat.color.set(SX.cssVar('--muted'));fMat.color.set(SX.cssVar('--threat'))}
  paint();SX.recolors.push(paint);
  var rotY=.6,vel=0,drag=false,moved=0,lx=0,vis=true,last=performance.now();
  function resize(){var w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
  addEventListener('resize',resize);resize();
  canvas.addEventListener('pointerdown',function(e){drag=true;moved=0;lx=e.clientX;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing'});
  canvas.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-lx;lx=e.clientX;moved+=Math.abs(dx);rotY+=dx*.010;vel=dx*.010});
  canvas.addEventListener('pointerup',function(e){
    drag=false;canvas.style.cursor='grab';
    if(moved<5){
      var r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1),cam);
      var hit=ray.intersectObjects(meshes,false)[0];if(hit)select(hit.object.userData.i);
    }
  });
  SX.whenVisible(canvas,function(v){vis=v});
  var cur=meshes.map(function(){return 0});
  function frame(now){
    requestAnimationFrame(frame);if(!vis||document.hidden)return;
    var dt=Math.min((now-last)/1000,.05);last=now;
    if(!drag){rotY+=vel;vel*=.94;if(!SX.reduce)rotY+=dt*.18}
    group.rotation.y=rotY;
    meshes.forEach(function(m,i){
      cur[i]+=(target[i]-cur[i])*.12;
      m.material.opacity=.14+cur[i]*.36;edges[i].material.opacity=.6+cur[i]*.4;
      m.scale.setScalar(1+cur[i]*.07);
    });
    if(!SX.reduce){
      fd.forEach(function(p,i){p.y=(p.y+dt*p.v)%1;fPos[i*3]=p.x;fPos[i*3+1]=-vy+p.y*vy*2;fPos[i*3+2]=p.z});
      fGeo.attributes.position.needsUpdate=true;
    }
    renderer.render(scene,cam);
  }
  requestAnimationFrame(frame);select(0);
}
SX.inits.push(init);
})();
