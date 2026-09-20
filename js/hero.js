/* Hero 3D scene: defended network globe with AI core and threat packets. */
(function(){
'use strict';
var SX=window.SX;
function init(){
  if(!window.THREE)return;
  var canvas=SX.$('#heroCanvas'),hero=SX.$('#top');if(!canvas)return;
  var renderer=SX.makeRenderer(canvas);if(!renderer)return;
  var scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(50,1,.1,100);cam.position.set(0,0,10);
  var world=new THREE.Group();scene.add(world);
  var tex=SX.dotTexture(),mobile=innerWidth<720,N=mobile?70:140,R=3,i;
  var pts=[];
  for(i=0;i<N;i++){var y=1-(i/(N-1))*2,r=Math.sqrt(1-y*y),th=i*2.399963;pts.push(new THREE.Vector3(Math.cos(th)*r*R,y*R,Math.sin(th)*r*R))}
  var nodeMat=new THREE.PointsMaterial({size:.16,map:tex,transparent:true,depthWrite:false,opacity:.95});
  world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts),nodeMat));
  var seg=[],seen={};
  pts.forEach(function(p,a){
    pts.map(function(q,b){return [p.distanceToSquared(q),b]}).sort(function(x,y){return x[0]-y[0]}).slice(1,4).forEach(function(d){
      var b=d[1],k=a<b?a+'-'+b:b+'-'+a;if(!seen[k]){seen[k]=1;seg.push(p,pts[b])}
    });
  });
  var lineMat=new THREE.LineBasicMaterial({transparent:true,opacity:.3});
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg),lineMat));
  var coreMat=new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:.9});
  var core=new THREE.Mesh(new THREE.IcosahedronGeometry(1.25,1),coreMat);
  var innerMat=new THREE.MeshBasicMaterial({transparent:true,opacity:.8});
  var inner=new THREE.Mesh(new THREE.SphereGeometry(.55,24,24),innerMat);
  world.add(core,inner);
  var ringMat=new THREE.MeshBasicMaterial({transparent:true,opacity:.55});
  var ring1=new THREE.Mesh(new THREE.TorusGeometry(3.9,.014,6,160),ringMat);ring1.rotation.x=Math.PI/2.4;
  var ring2=new THREE.Mesh(new THREE.TorusGeometry(4.2,.014,6,160),ringMat);ring2.rotation.set(Math.PI/1.7,0,.6);
  world.add(ring1,ring2);
  var tIdx=[];while(tIdx.length<7){var k=Math.floor(Math.random()*N);if(tIdx.indexOf(k)<0)tIdx.push(k)}
  var tMat=new THREE.PointsMaterial({size:.34,map:tex,transparent:true,depthWrite:false,opacity:1});
  world.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(tIdx.map(function(n){return pts[n]})),tMat));
  var packets=tIdx.map(function(n){return {from:pts[n],t:Math.random(),v:.22+Math.random()*.2}});
  var pPos=new Float32Array(packets.length*3),pGeo=new THREE.BufferGeometry();
  pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  var pMat=new THREE.PointsMaterial({size:.24,map:tex,transparent:true,depthWrite:false});
  world.add(new THREE.Points(pGeo,pMat));
  function paint(){
    var d=new THREE.Color(SX.cssVar('--def')),a=new THREE.Color(SX.cssVar('--ai')),t=new THREE.Color(SX.cssVar('--threat'));
    nodeMat.color.copy(d);lineMat.color.copy(d);coreMat.color.copy(a);innerMat.color.copy(a);ringMat.color.copy(a);tMat.color.copy(t);pMat.color.copy(t);
  }
  paint();SX.recolors.push(paint);
  var vis=true,last=performance.now(),pulse=0,mx=0,my=0,cx=0,cy=0,base=0;
  function resize(){
    var w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
    var wide=w/h>1.15;base=wide?Math.min(3.6,w/h*1.7):0;world.scale.setScalar(wide?1:.72);world.position.x=base;
  }
  addEventListener('resize',resize);resize();
  hero.addEventListener('pointermove',function(e){var r=hero.getBoundingClientRect();mx=((e.clientX-r.left)/r.width-.5)*2;my=((e.clientY-r.top)/r.height-.5)*2});
  SX.whenVisible(hero,function(v){vis=v});
  function frame(now){
    requestAnimationFrame(frame);
    if(!vis||document.hidden)return;
    var dt=Math.min((now-last)/1000,.05);last=now;
    if(!SX.reduce){
      world.rotation.y+=dt*.12;ring1.rotation.z+=dt*.2;ring2.rotation.y-=dt*.15;core.rotation.x+=dt*.3;core.rotation.y+=dt*.4;
      packets.forEach(function(p,n){
        p.t+=dt*p.v;if(p.t>=1){p.t=0;pulse=1}
        pPos[n*3]=p.from.x*(1-p.t);pPos[n*3+1]=p.from.y*(1-p.t);pPos[n*3+2]=p.from.z*(1-p.t);
      });
      pGeo.attributes.position.needsUpdate=true;
      tMat.size=.32+.08*Math.sin(now/300);
      pulse=Math.max(0,pulse-dt*2.2);core.scale.setScalar(1+pulse*.16);
      cx+=(mx-cx)*.05;cy+=(my-cy)*.05;world.rotation.x=cy*.22;world.position.x=base+cx*.25;
    }
    renderer.render(scene,cam);
  }
  requestAnimationFrame(frame);
}
SX.inits.push(init);
})();
