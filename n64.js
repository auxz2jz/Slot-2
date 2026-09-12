import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';
const RE=window.RE;
const host=RE.threeHost;
let renderer,scene,camera,hero,enemy,clockState,entered=false;
let parts={},state={},mat={};
function M(c){return new THREE.MeshLambertMaterial({color:c,flatShading:true})}
function pixelTexture(kind){
 const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 if(kind==='grass'){x.fillStyle='#527a3e';x.fillRect(0,0,32,32);x.fillStyle='#416a35';for(let i=0;i<28;i++){let a=(i*13)%32,b=(i*7)%32;x.fillRect(a,b,1,3);x.fillRect(a-1,b+2,3,1)}x.fillStyle='#6f9453';for(let i=0;i<14;i++)x.fillRect((i*9)%32,(i*17)%32,2,1)}
 if(kind==='dirt'){x.fillStyle='#9a8057';x.fillRect(0,0,32,32);x.fillStyle='#806943';for(let i=0;i<20;i++)x.fillRect((i*11)%32,(i*19)%32,2,1);x.fillStyle='#b49a69';for(let i=0;i<10;i++)x.fillRect((i*7)%32,(i*13)%32,1,1)}
 if(kind==='wood'){x.fillStyle='#89643b';x.fillRect(0,0,32,32);x.fillStyle='#5d4029';for(let y=0;y<32;y+=8)x.fillRect(0,y,32,1);for(let i=0;i<10;i++)x.fillRect((i*13)%32,0,1,32);x.fillStyle='#ae8050';for(let y=3;y<32;y+=8)x.fillRect(1,y,29,1)}
 if(kind==='stone'){x.fillStyle='#73786e';x.fillRect(0,0,32,32);x.fillStyle='#555c55';for(let y=0;y<32;y+=8){x.fillRect(0,y,32,1);let off=(y/8)%2?8:0;for(let q=off;q<32;q+=16)x.fillRect(q,y,1,8)}x.fillStyle='#8d9288';for(let i=0;i<8;i++)x.fillRect((i*9)%32,(i*5)%32,3,1)}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.colorSpace=THREE.SRGBColorSpace;return t
}
function box(w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.castShadow=o.receiveShadow=true;return o}
function cyl(r1,r2,h,n,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);o.castShadow=o.receiveShadow=true;return o}
function sph(r,w,h,m){const o=new THREE.Mesh(new THREE.SphereGeometry(r,w,h),m);o.castShadow=o.receiveShadow=true;return o}
function addPivot(parent,x,y,z){const p=new THREE.Group();p.position.set(x,y,z);parent.add(p);return p}
function buildHero(){
 const root=new THREE.Group();root.scale.setScalar(.82);
 mat.skin=M(0xe0a36c);mat.green=M(0x376f3c);mat.green2=M(0x24522e);mat.leather=M(0x704528);mat.boot=M(0x4a2d1d);mat.metal=M(0xc8c7b2);mat.gold=M(0xb99b4f);mat.hair=M(0xa86c31);mat.white=M(0xd8d2bc);
 parts.pelvis=box(.42,.22,.30,mat.green2);parts.pelvis.position.y=1.02;root.add(parts.pelvis);
 parts.torso=box(.56,.68,.32,mat.green);parts.torso.position.y=.44;parts.pelvis.add(parts.torso);
 const belt=box(.58,.08,.34,mat.leather);belt.position.y=-.20;parts.torso.add(belt);
 const strap=box(.08,.76,.035,mat.leather);strap.position.set(.05,0,.18);strap.rotation.z=-.38;parts.torso.add(strap);
 const neck=addPivot(parts.torso,0,.45,0);
 parts.head=sph(.25,7,5,mat.skin);parts.head.scale.set(1,.92,.95);parts.head.position.y=.22;neck.add(parts.head);
 const hair=box(.39,.12,.28,mat.hair);hair.position.set(0,.15,.01);parts.head.add(hair);
 const nose=box(.07,.07,.08,mat.skin);nose.position.set(0,-.01,.24);parts.head.add(nose);
 const eyeM=M(0x18251a);for(const sx of [-1,1]){let e=sph(.023,5,4,eyeM);e.position.set(sx*.075,.035,.245);parts.head.add(e)}
 const earGeo=new THREE.ConeGeometry(.08,.23,3);for(const sx of [-1,1]){let e=new THREE.Mesh(earGeo,mat.skin);e.position.set(sx*.27,.01,0);e.rotation.z=sx*Math.PI/2;parts.head.add(e)}
 const hood=cyl(.24,.34,.34,7,mat.green2);hood.rotation.x=Math.PI/2;hood.position.set(0,.15,-.20);parts.head.add(hood);
 const cap=new THREE.Mesh(new THREE.ConeGeometry(.22,.55,7),mat.green);cap.position.set(0,.29,-.15);cap.rotation.x=-.72;parts.head.add(cap);
 function arm(side){
   let s=side==='L'?-1:1,should=addPivot(parts.torso,s*.38,.24,0);let upper=cyl(.09,.105,.48,6,mat.white);upper.position.y=-.24;should.add(upper);
   let elbow=addPivot(should,0,-.49,0),fore=cyl(.075,.09,.42,6,mat.leather);fore.position.y=-.21;elbow.add(fore);
   let hand=addPivot(elbow,0,-.44,0);hand.add(sph(.085,6,4,mat.skin));return{should,elbow,hand}
 }
 parts.LA=arm('L');parts.RA=arm('R');
 function leg(side){let s=side==='L'?-1:1,hip=addPivot(parts.pelvis,s*.13,-.12,0);let thigh=cyl(.105,.12,.53,6,mat.white);thigh.position.y=-.265;hip.add(thigh);
   let knee=addPivot(hip,0,-.54,0),shin=cyl(.09,.105,.50,6,mat.leather);shin.position.y=-.25;knee.add(shin);
   let foot=addPivot(knee,0,-.52,.06),boot=box(.20,.18,.32,mat.boot);boot.position.z=.08;foot.add(boot);return{hip,knee,foot}}
 parts.LL=leg('L');parts.RL=leg('R');
 // sword
 const sword=parts.RA.hand;let blade=box(.07,.72,.035,mat.metal);blade.position.y=-.42;sword.add(blade);let guard=box(.34,.055,.08,mat.gold);guard.position.y=-.08;sword.add(guard);let pom=box(.08,.16,.08,mat.leather);pom.position.y=.03;sword.add(pom);
 // shield
 let sh=new THREE.Group();sh.rotation.x=Math.PI/2;sh.position.set(-.15,-.22,.02);parts.LA.elbow.add(sh);let disk=cyl(.29,.29,.07,12,mat.leather);sh.add(disk);let face=cyl(.21,.21,.078,12,mat.green);sh.add(face);let boss=cyl(.045,.045,.085,8,mat.gold);sh.add(boss);
 return root
}
function buildEnemy(){let root=new THREE.Group(),red=M(0x863c31),dark=M(0x472420),horn=M(0xd8c077);let body=box(.7,.65,.55,red);body.position.y=.65;root.add(body);let head=sph(.30,6,4,red);head.position.set(0,1.15,.02);root.add(head);for(const sx of [-1,1]){let h=new THREE.Mesh(new THREE.ConeGeometry(.09,.4,5),horn);h.position.set(sx*.25,1.35,0);h.rotation.z=sx*.65;root.add(h)}let club=box(.13,.85,.13,dark);club.position.set(.48,.62,0);club.rotation.z=-.35;root.add(club);return root}
function buildWorld(){
 const grassTex=pixelTexture('grass');grassTex.repeat.set(18,18);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40,16,16),new THREE.MeshLambertMaterial({map:grassTex,color:0xffffff,flatShading:true}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 // path
 let dirtTex=pixelTexture('dirt');dirtTex.repeat.set(2,1);let pathM=new THREE.MeshLambertMaterial({map:dirtTex,color:0xffffff,flatShading:true});for(let z=-10;z<9;z+=1.1){let p=box(2.2,.025,1.0,pathM);p.position.set(0,.015,z);p.receiveShadow=true;scene.add(p)}
 function tree(x,z,s=1){let trunk=cyl(.18,.26,1.4,6,M(0x684226));trunk.position.set(x,.7,z);scene.add(trunk);let top1=new THREE.Mesh(new THREE.ConeGeometry(.95*s,1.55*s,7),M(0x2d6236));top1.position.set(x,1.9*s,z);top1.castShadow=true;scene.add(top1);let top2=new THREE.Mesh(new THREE.ConeGeometry(.68*s,1.25*s,7),M(0x3f7b42));top2.position.set(x,2.65*s,z);top2.castShadow=true;scene.add(top2)}
 [[-4,-5,1.1],[4.2,-4.5,1],[5,1.5,.9],[-5.2,1,.95],[-4.4,5.2,1.05],[4.8,5.4,1]].forEach(a=>tree(...a));
 // hut
 let woodTex=pixelTexture('wood');woodTex.repeat.set(3,2);let hut=box(3,1.8,2.6,new THREE.MeshLambertMaterial({map:woodTex,color:0xffffff,flatShading:true}));hut.position.set(-4, .9,-8);scene.add(hut);let roof=new THREE.Mesh(new THREE.ConeGeometry(2.5,1.35,4),M(0x493421));roof.position.set(-4,2.35,-8);roof.rotation.y=Math.PI/4;scene.add(roof);
 let door=box(.65,1.15,.05,M(0x3c2a1b));door.position.set(-4,.58,-6.67);scene.add(door);
 // stones and fence
 for(const [x,z] of [[2.9,-1.5],[3.7,-.9],[-3.2,2.6],[2.8,3.7]]){let stoneTex=pixelTexture('stone');let r=sph(.35,5,3,new THREE.MeshLambertMaterial({map:stoneTex,color:0xffffff,flatShading:true}));r.scale.y=.65;r.position.set(x,.2,z);scene.add(r)}
 for(let x=-3;x<=3;x+=.7){let f=box(.12,.75,.12,M(0x6c472b));f.position.set(x,.38,7);scene.add(f)}
}
function init(){
 if(renderer)return;
 renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x7899ad);scene.fog=new THREE.Fog(0x7899ad,12,24);
 camera=new THREE.PerspectiveCamera(52,4/3,.08,50);
 let amb=new THREE.HemisphereLight(0xbfd4d2,0x354b2e,1.25);scene.add(amb);let sun=new THREE.DirectionalLight(0xffe5bd,1.8);sun.position.set(-5,9,4);sun.castShadow=true;sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;scene.add(sun);
 buildWorld();hero=buildHero();scene.add(hero);enemy=buildEnemy();enemy.position.set(0,0,-3.5);scene.add(enemy);
 state={px:0,pz:2.8,vx:0,vz:0,yaw:Math.PI,hp:8,phase:0,attack:0,combo:0,roll:0,evadeX:0,evadeZ:0,lock:true,enemyHP:6,enemyHit:0,camYaw:0,camLook:new THREE.Vector3()};
}
function enter(){init();entered=true;resize(host.clientWidth,host.clientHeight,1)}
function exit(){entered=false}
function resize(w,h){if(!renderer)return;let rw=Math.max(320,Math.floor(w*.72)),rh=Math.max(240,Math.floor(h*.72));renderer.setSize(rw,rh,false);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';camera.aspect=w/h;camera.updateProjectionMatrix()}
function update(dt,I){if(!entered)return;const a=I.axis(),s=state;s.attack=Math.max(0,s.attack-dt);s.roll=Math.max(0,s.roll-dt);s.enemyHit=Math.max(0,s.enemyHit-dt);
 let dx=enemy.position.x-s.px,dz=enemy.position.z-s.pz,ed=Math.hypot(dx,dz),targetYaw=Math.atan2(dx,dz);
 if(s.lock&&ed<7){
   s.yaw+=angleDiff(s.yaw,targetYaw)*Math.min(1,dt*12);
   let rx=Math.cos(targetYaw),rz=-Math.sin(targetYaw),fx=Math.sin(targetYaw),fz=Math.cos(targetYaw);
   let tx=(rx*a.x+fx*a.y)*2.25,tz=(rz*a.x+fz*a.y)*2.25;
   s.vx+=(tx-s.vx)*Math.min(1,dt*8);s.vz+=(tz-s.vz)*Math.min(1,dt*8)
 }else{
   if(a.m>.08){let ang=Math.atan2(a.x,a.y)+s.camYaw;s.yaw+=angleDiff(s.yaw,ang)*Math.min(1,dt*10);let tx=Math.sin(ang)*2.6*a.m,tz=Math.cos(ang)*2.6*a.m;s.vx+=(tx-s.vx)*Math.min(1,dt*7);s.vz+=(tz-s.vz)*Math.min(1,dt*7)}else{s.vx*=Math.pow(.02,dt);s.vz*=Math.pow(.02,dt)}
 }
 if(I.pressB()){
   if(a.m>.15){s.roll=.42;s.evadeX=Math.sin(s.yaw)*4.5;s.evadeZ=Math.cos(s.yaw)*4.5}else if(s.lock){s.roll=.48;s.evadeX=-Math.sin(s.yaw)*4.2;s.evadeZ=-Math.cos(s.yaw)*4.2}
 }
 if(s.roll>0){s.vx=s.evadeX;s.vz=s.evadeZ}
 if(I.pressA()){if(s.attack>.01&&s.attack<.17)s.combo=(s.combo+1)%3;else s.combo=0;s.attack=.32}
 s.px+=s.vx*dt;s.pz+=s.vz*dt;s.px=RE.util.clamp(s.px,-7,7);s.pz=RE.util.clamp(s.pz,-8,8);s.phase+=dt*Math.hypot(s.vx,s.vz)*4.5;
 hero.position.set(s.px,0,s.pz);hero.rotation.y=s.yaw;
 animateHero(dt);
 // sword hit window
 if(s.attack>.10&&s.attack<.23&&ed<1.25&&s.enemyHit<=0){s.enemyHP=Math.max(0,s.enemyHP-1);s.enemyHit=.28;enemy.position.x+=dx/(ed||1)*.45;enemy.position.z+=dz/(ed||1)*.45}
 // simple enemy movement
 if(s.enemyHP>0){dx=s.px-enemy.position.x;dz=s.pz-enemy.position.z;let d=Math.hypot(dx,dz);enemy.rotation.y=Math.atan2(dx,dz);if(d>1.35&&d<6&&s.enemyHit<=0){enemy.position.x+=dx/d*.55*dt;enemy.position.z+=dz/d*.55*dt}enemy.visible=true}else enemy.visible=false;
 // camera
 let desiredYaw=s.lock&&ed<7?targetYaw:s.yaw;s.camYaw+=angleDiff(s.camYaw,desiredYaw)*Math.min(1,dt*3.5);
 let backX=-Math.sin(s.camYaw)*5.2,backZ=-Math.cos(s.camYaw)*5.2;let targetPos=new THREE.Vector3(s.px+backX,3.0,s.pz+backZ);camera.position.lerp(targetPos,1-Math.pow(.002,dt));s.camLook.set(s.px,.95,s.pz);camera.lookAt(s.camLook);
}
function angleDiff(a,b){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return d<-Math.PI?d+Math.PI*2:d}
function animateHero(dt){let s=state,m=Math.hypot(s.vx,s.vz),sw=Math.sin(s.phase),run=Math.min(1,m/2.3);
 parts.LL.hip.rotation.x=sw*.72*run;parts.RL.hip.rotation.x=-sw*.72*run;parts.LL.knee.rotation.x=Math.max(0,-sw)*.55*run;parts.RL.knee.rotation.x=Math.max(0,sw)*.55*run;
 parts.LA.should.rotation.x=-sw*.45*run;parts.RA.should.rotation.x=sw*.45*run;parts.LA.elbow.rotation.x=-.2;parts.RA.elbow.rotation.x=-.2;parts.RA.should.rotation.z=0;parts.RA.elbow.rotation.z=0;
 parts.pelvis.position.y=1.02+(run*Math.abs(Math.sin(s.phase))*.035);
 if(s.roll>0){let t=1-s.roll/.48;hero.rotation.x=Math.sin(t*Math.PI)*.7;parts.LA.should.rotation.x=-1;parts.RA.should.rotation.x=-1}else hero.rotation.x=0;
 if(s.attack>0){let t=1-s.attack/.32,phase=Math.sin(Math.min(1,t)*Math.PI);parts.RA.should.rotation.z=-.4-phase*(1.15+s.combo*.22);parts.RA.should.rotation.x=-.75+Math.cos(t*Math.PI)*.35;parts.RA.elbow.rotation.z=-.35-phase*.55}
}
function render(){if(!entered)return;renderer.render(scene,camera);let s=state;RE.setHUD(`N64 3D · LOW-POLY LIT WORLD\n♥ ${s.hp}   TARGET ${s.enemyHP>0?s.enemyHP:'DOWN'}   LOCK ${s.lock?'ON':'OFF'}`,'Analog acceleration · camera follow · target-facing strafe · rolling/back evade · 3-step sword timing · low-poly flat-shaded actors')}
RE.register(3,{is3D:true,enter,exit,resize,update,render});