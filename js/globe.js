/* 3D global threat globe: simulated attack arcs between monitored sites. */
(function(){
'use strict';
var SX=window.SX;
var SITES=[['New York',40.7,-74],['San Francisco',37.8,-122.4],['Sao Paulo',-23.5,-46.6],['London',51.5,-.1],['Frankfurt',50.1,8.7],['Johannesburg',-26.2,28],['Dubai',25.2,55.3],['Mumbai',19.1,72.9],['Hyderabad',17.4,78.5],['Singapore',1.35,103.8],['Tokyo',35.7,139.7],['Sydney',-33.9,151.2]];
var KINDS=['DDoS flood','Phishing campaign','Brute-force login','SQL injection','Malware beacon','Port scan'];
function ll(lat,lon,R){
  var p=(90-lat)*Math.PI/180,t=(lon+180)*Math.PI/180;
  return new THREE.Vector3(-R*Math.sin(p)*Math.cos(t),R*Math.cos(p),R*Math.sin(p)*Math.sin(t));
}
function init(){
  var canvas=SX.$('#globeCanvas');if(!canvas||!window.THREE)return;
  var renderer=SX.makeRenderer(canvas);if(!renderer)return;
  var scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(38,1,.1,100);cam.position.set(0,0,9.2);
  var group=new THREE.Group();scene.add(group);group.rotation.x=.35;
  var R=2.4,tex=SX.dotTexture(),mobile=innerWidth<720;
  var wire=new THREE.Mesh(new THREE.SphereGeometry(R-.02,32,20),new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:.08}));
  group.add(wire);
  /* stylised land: procedural blobs, not real geography */
  var land=[],n=mobile?900:1800,i;
  for(i=0;i<n;i++){
    var y=1-(i/(n-1))*2,r=Math.sqrt(1-y*y),th=i*2.399963,lat=Math.asin(y),lon=Math.atan2(Math.sin(th)*r,Math.cos(th)*r);
    var v=Math.sin(lon*1.7+1)*Math.cos(lat*2.1)+Math.sin(lon*3.3-lat*1.3)*.5;
    if(v>.15)land.push(new THREE.Vector3(Math.cos(th)*r*R,y*R,Math.sin(th)*r*R));
  }
  var landMat=new THREE.PointsMaterial({size:.05,map:tex,transparent:true,depthWrite:false,opacity:.8});
  group.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(land),landMat));
  var sitePos=SITES.map(function(s){return ll(s[1],s[2],R)});
  var siteMat=new THREE.PointsMaterial({size:.2,map:tex,transparent:true,depthWrite:false});
  group.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(sitePos),siteMat));
  var arcMat=new THREE.LineBasicMaterial({transparent:true,opacity:.9});
  var headMat=new THREE.PointsMaterial({size:.22,map:tex,transparent:true,depthWrite:false});
  var MAX=16,arcs=[],headPos=new Float32Array(MAX*3),headGeo=new THREE.BufferGeometry();
  headGeo.setAttribute('position',new THREE.BufferAttribute(headPos,3));
  var heads=new THREE.Points(headGeo,headMat);heads.frustumCulled=false;group.add(heads);
  function paint(){
    var d=new THREE.Color(SX.cssVar('--def')),t=new THREE.Color(SX.cssVar('--threat'));
    landMat.color.copy(d);siteMat.color.copy(new THREE.Color(SX.cssVar('--ink')));arcMat.color.copy(t);headMat.color.copy(t);
    wire.material.color.copy(d);
  }
  paint();SX.recolors.push(paint);
  var list=SX.$('#attacks'),count=0;
  function spawn(){
    if(arcs.length>=MAX)return;
    var a=Math.floor(Math.random()*SITES.length),b;do{b=Math.floor(Math.random()*SITES.length)}while(b===a);
    var pa=sitePos[a],pb=sitePos[b],mid=pa.clone().add(pb).multiplyScalar(.5),d=pa.distanceTo(pb);
    mid.setLength(R+d*.32);
    var curve=new THREE.QuadraticBezierCurve3(pa,mid,pb),pts=curve.getPoints(48);
    var g=new THREE.BufferGeometry().setFromPoints(pts);g.setDrawRange(0,0);
    var m=arcMat.clone();var line=new THREE.Line(g,m);group.add(line);
    arcs.push({curve:curve,line:line,mat:m,t:0,hold:0,speed:.35+Math.random()*.3});
    if(list){
      var kind=KINDS[Math.floor(Math.random()*KINDS.length)],li=document.createElement('li');
      var s1=document.createElement('span');s1.textContent=SITES[a][0]+' to '+SITES[b][0];var s2=document.createElement('span');s2.textContent=kind;li.append(s1,s2);
      list.insertBefore(li,list.firstChild);while(list.children.length>7)list.removeChild(list.lastChild);
    }
    count++;var c=SX.$('#globeCount');if(c)c.textContent=count;
  }
  var spin=SX.$('#globeSpin'),rate=SX.$('#globeRate');
  var rotY=0,rotX=.35,vel=0,drag=false,lx=0,ly=0,vis=true,last=performance.now(),acc=0;
  function resize(){var w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
  addEventListener('resize',resize);resize();
  canvas.addEventListener('pointerdown',function(e){drag=true;lx=e.clientX;ly=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing'});
  canvas.addEventListener('pointermove',function(e){if(!drag)return;rotY+=(e.clientX-lx)*.008;vel=(e.clientX-lx)*.008;rotX=Math.max(-.9,Math.min(.9,rotX+(e.clientY-ly)*.004));lx=e.clientX;ly=e.clientY});
  canvas.addEventListener('pointerup',function(){drag=false;canvas.style.cursor='grab'});
  SX.whenVisible(canvas,function(v){vis=v});
  SX.commands.push({label:'Send a burst of simulated attacks on the globe',hint:'Globe',run:function(){SX.goto('#globe');for(var k=0;k<8;k++)setTimeout(spawn,k*180)}});
  for(i=0;i<5;i++)spawn();
  function frame(now){
    requestAnimationFrame(frame);if(!vis||document.hidden)return;
    var dt=Math.min((now-last)/1000,.05);last=now;
    if(!drag){rotY+=vel;vel*=.94;if(!SX.reduce&&spin&&spin.checked)rotY+=dt*.15}
    group.rotation.y=rotY;group.rotation.x=rotX;
    acc+=dt*(rate?+rate.value:3)*.35;while(acc>=1){acc-=1;spawn()}
    var k;
    for(k=arcs.length-1;k>=0;k--){
      var a=arcs[k];
      if(a.t<1){a.t=Math.min(1,a.t+dt*a.speed);a.line.geometry.setDrawRange(0,Math.floor(a.t*49))}
      else{a.hold+=dt;a.mat.opacity=Math.max(0,.9-a.hold*.9)}
      if(a.hold>1.05){group.remove(a.line);a.line.geometry.dispose();a.mat.dispose();arcs.splice(k,1)}
    }
    for(k=0;k<MAX;k++){
      var ar=arcs[k];
      if(ar&&ar.t<1){var p=ar.curve.getPoint(ar.t);headPos[k*3]=p.x;headPos[k*3+1]=p.y;headPos[k*3+2]=p.z}
      else{headPos[k*3]=headPos[k*3+2]=0;headPos[k*3+1]=9999}
    }
    headGeo.attributes.position.needsUpdate=true;
    renderer.render(scene,cam);
  }
  requestAnimationFrame(frame);
}
SX.inits.push(init);
})();
