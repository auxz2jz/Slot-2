import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';

// Relic of Emberwood N64 mode.
// Original geometry/art; movement tuning is independently reimplemented from observed
// behavior and documented constants in the zeldaret/oot decompilation.
const RE=window.RE;
const host=RE.threeHost;
let renderer,scene,camera,hero,enemy,entered=false;
let parts={},state={},mat={},reticle;

const OOT={
  // z_player_lib.c Kokiri boots: R_RUN_SPEED_LIMIT=600, R_DECELERATE_RATE=800.
  // Player code uses /100, yielding 6.0 and 8.0 game-speed units.
  RUN_SPEED:6.0,
  DECEL_STEP:8.0,
  CHILD_RUN_SPEED:5.5,
  // Player_ProcessControlStick classifies forward/side/back directions above magnitude 55.
  STICK_DIR_THRESHOLD:55/80,
  LOCK_LEASH:7.0,
  TURN_FREE:10.5,
  TURN_LOCK:15.0,
  ROLL_TIME:0.46,
  ROLL_SPEED:7.0,
  BACKFLIP_TIME:0.50,
  BACKFLIP_SPEED:6.2,
  SIDESTEP_TIME:0.38,
  SIDESTEP_SPEED:5.4,
  ATTACK_TIME:0.34,
};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function angleDiff(a,b){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return d<-Math.PI?d+Math.PI*2:d}
function moveToward(v,t,step){return v<t?Math.min(t,v+step):Math.max(t,v-step)}
function M(c){return new THREE.MeshLambertMaterial({color:c,flatShading:true})}
function box(w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.castShadow=o.receiveShadow=true;return o}
function cyl(r1,r2,h,n,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);o.castShadow=o.receiveShadow=true;return o}
function sph(r,w,h,m){const o=new THREE.Mesh(new THREE.SphereGeometry(r,w,h),m);o.castShadow=o.receiveShadow=true;return o}
function pivot(parent,x,y,z){const p=new THREE.Group();p.position.set(x,y,z);parent.add(p);return p}

function pixelTexture(kind){
  const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  if(kind==='grass'){
    x.fillStyle='#537b3f';x.fillRect(0,0,32,32);x.fillStyle='#3e6533';
    for(let i=0;i<30;i++){let a=(i*13)%32,b=(i*7)%32;x.fillRect(a,b,1,3);x.fillRect((a+1)%32,(b+2)%32,2,1)}
    x.fillStyle='#739554';for(let i=0;i<14;i++)x.fillRect((i*9)%32,(i*17)%32,2,1);
  }else if(kind==='dirt'){
    x.fillStyle='#9c8157';x.fillRect(0,0,32,32);x.fillStyle='#7c6643';
    for(let i=0;i<24;i++)x.fillRect((i*11)%32,(i*19)%32,2,1);x.fillStyle='#baa06d';for(let i=0;i<10;i++)x.fillRect((i*7)%32,(i*13)%32,1,1);
  }else if(kind==='wood'){
    x.fillStyle='#88623a';x.fillRect(0,0,32,32);x.fillStyle='#5d4029';for(let y=0;y<32;y+=8)x.fillRect(0,y,32,1);
    for(let i=0;i<10;i++)x.fillRect((i*13)%32,0,1,32);x.fillStyle='#ad8050';for(let y=3;y<32;y+=8)x.fillRect(1,y,29,1);
  }else{
    x.fillStyle='#74796f';x.fillRect(0,0,32,32);x.fillStyle='#555c55';
    for(let y=0;y<32;y+=8){x.fillRect(0,y,32,1);let off=(y/8)%2?8:0;for(let q=off;q<32;q+=16)x.fillRect(q,y,1,8)}
    x.fillStyle='#90958a';for(let i=0;i<8;i++)x.fillRect((i*9)%32,(i*5)%32,3,1);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  // N64-like soft low-res texture sampling rather than crisp modern textures.
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.colorSpace=THREE.SRGBColorSpace;return t;
}

function buildHero(){
  const root=new THREE.Group();root.scale.setScalar(.84);
  mat.skin=M(0xe1a56f);mat.green=M(0x39713d);mat.green2=M(0x25532f);mat.leather=M(0x70462a);
  mat.boot=M(0x4a2e1e);mat.metal=M(0xc9c8b7);mat.gold=M(0xb99a4f);mat.hair=M(0xa66a31);mat.white=M(0xd7d0b9);mat.dark=M(0x172118);

  parts.pelvis=box(.44,.24,.31,mat.green2);parts.pelvis.position.y=1.02;root.add(parts.pelvis);
  parts.torso=box(.58,.70,.34,mat.green);parts.torso.position.y=.45;parts.pelvis.add(parts.torso);
  let belt=box(.60,.09,.36,mat.leather);belt.position.y=-.22;parts.torso.add(belt);
  let buckle=box(.10,.10,.025,mat.gold);buckle.position.set(0,-.22,.19);parts.torso.add(buckle);
  let strap=box(.085,.80,.036,mat.leather);strap.position.set(.06,0,.19);strap.rotation.z=-.40;parts.torso.add(strap);

  const neck=pivot(parts.torso,0,.47,0);
  parts.head=sph(.26,7,5,mat.skin);parts.head.scale.set(1,.94,.96);parts.head.position.y=.22;neck.add(parts.head);
  let hair=box(.40,.13,.29,mat.hair);hair.position.set(0,.15,.0);parts.head.add(hair);
  let nose=box(.065,.07,.09,mat.skin);nose.position.set(0,-.01,.245);parts.head.add(nose);
  for(const sx of [-1,1]){let eye=sph(.023,5,4,mat.dark);eye.position.set(sx*.078,.035,.248);parts.head.add(eye)}
  const earGeo=new THREE.ConeGeometry(.085,.24,3);for(const sx of [-1,1]){let e=new THREE.Mesh(earGeo,mat.skin);e.position.set(sx*.28,.01,0);e.rotation.z=sx*Math.PI/2;parts.head.add(e)}
  let hood=cyl(.24,.34,.35,7,mat.green2);hood.rotation.x=Math.PI/2;hood.position.set(0,.15,-.20);parts.head.add(hood);
  let cap=new THREE.Mesh(new THREE.ConeGeometry(.22,.58,7),mat.green);cap.position.set(0,.30,-.16);cap.rotation.x=-.74;parts.head.add(cap);

  function arm(side){let s=side==='L'?-1:1,should=pivot(parts.torso,s*.39,.25,0);let upper=cyl(.092,.108,.49,6,mat.white);upper.position.y=-.245;should.add(upper);
    let elbow=pivot(should,0,-.50,0),fore=cyl(.076,.091,.43,6,mat.leather);fore.position.y=-.215;elbow.add(fore);
    let hand=pivot(elbow,0,-.45,0);hand.add(sph(.088,6,4,mat.skin));return{should,elbow,hand}}
  parts.LA=arm('L');parts.RA=arm('R');
  function leg(side){let s=side==='L'?-1:1,hip=pivot(parts.pelvis,s*.135,-.13,0);let thigh=cyl(.108,.122,.55,6,mat.white);thigh.position.y=-.275;hip.add(thigh);
    let knee=pivot(hip,0,-.56,0),shin=cyl(.092,.107,.51,6,mat.leather);shin.position.y=-.255;knee.add(shin);
    let foot=pivot(knee,0,-.53,.06),boot=box(.21,.19,.34,mat.boot);boot.position.z=.09;foot.add(boot);return{hip,knee,foot}}
  parts.LL=leg('L');parts.RL=leg('R');

  let blade=box(.072,.76,.038,mat.metal);blade.position.y=-.44;parts.RA.hand.add(blade);
  let guard=box(.36,.058,.085,mat.gold);guard.position.y=-.08;parts.RA.hand.add(guard);
  let grip=box(.085,.17,.085,mat.leather);grip.position.y=.03;parts.RA.hand.add(grip);

  let sh=new THREE.Group();sh.rotation.x=Math.PI/2;sh.position.set(-.15,-.23,.02);parts.LA.elbow.add(sh);
  sh.add(cyl(.30,.30,.072,12,mat.leather));let face=cyl(.225,.225,.080,12,mat.green);face.position.y=.005;sh.add(face);let boss=cyl(.048,.048,.09,8,mat.gold);boss.position.y=.008;sh.add(boss);
  return root;
}

function buildEnemy(){
  const root=new THREE.Group(),red=M(0x873d32),dark=M(0x45231f),horn=M(0xd7bf77),eye=M(0xf3d56e);
  let body=box(.72,.68,.57,red);body.position.y=.68;root.add(body);let head=sph(.31,6,4,red);head.position.set(0,1.18,.02);root.add(head);
  for(const sx of [-1,1]){let h=new THREE.Mesh(new THREE.ConeGeometry(.09,.42,5),horn);h.position.set(sx*.26,1.38,0);h.rotation.z=sx*.65;root.add(h);let e=sph(.035,5,3,eye);e.position.set(sx*.11,1.22,.29);root.add(e)}
  let club=box(.14,.88,.14,dark);club.position.set(.50,.63,0);club.rotation.z=-.36;root.add(club);return root;
}

function buildWorld(){
  const grass=pixelTexture('grass');grass.repeat.set(22,22);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(48,48,20,20),new THREE.MeshLambertMaterial({map:grass,flatShading:true}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  const dirt=pixelTexture('dirt');dirt.repeat.set(2,1);const dirtM=new THREE.MeshLambertMaterial({map:dirt,flatShading:true});for(let z=-13;z<12;z+=1.1){let p=box(2.5,.025,1.0,dirtM);p.position.set(0,.015,z);scene.add(p)}
  function tree(x,z,s=1){let trunk=cyl(.18,.27,1.45,6,M(0x684327));trunk.position.set(x,.72,z);scene.add(trunk);let a=new THREE.Mesh(new THREE.ConeGeometry(.98*s,1.60*s,7),M(0x2c6135));a.position.set(x,1.95*s,z);a.castShadow=true;scene.add(a);let b=new THREE.Mesh(new THREE.ConeGeometry(.70*s,1.28*s,7),M(0x407b42));b.position.set(x,2.72*s,z);b.castShadow=true;scene.add(b)}
  [[-5,-6,1.1],[5,-5,1],[5.8,1.5,.9],[-5.7,1,.95],[-5,6,1.05],[5.4,6.1,1],[-7,-1,.8],[7,-2,.8]].forEach(a=>tree(...a));
  const wood=pixelTexture('wood');wood.repeat.set(3,2);let hut=box(3.2,1.9,2.8,new THREE.MeshLambertMaterial({map:wood,flatShading:true}));hut.position.set(-5,.95,-9);scene.add(hut);
  let roof=new THREE.Mesh(new THREE.ConeGeometry(2.7,1.45,4),M(0x493421));roof.position.set(-5,2.48,-9);roof.rotation.y=Math.PI/4;scene.add(roof);
  let door=box(.70,1.2,.05,M(0x3c2a1b));door.position.set(-5,.60,-7.57);scene.add(door);
  for(const [x,z] of [[3,-1.7],[3.9,-1],[-3.4,2.8],[3,4.0]]){const st=pixelTexture('stone');let r=sph(.37,5,3,new THREE.MeshLambertMaterial({map:st,flatShading:true}));r.scale.y=.65;r.position.set(x,.21,z);scene.add(r)}
  for(let x=-3.5;x<=3.5;x+=.7){let f=box(.12,.78,.12,M(0x6c472b));f.position.set(x,.39,8.2);scene.add(f)}
}

function makeReticle(){
  const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xffdd66,transparent:true,opacity:.9,depthTest:false});
  for(let i=0;i<4;i++){let bar=box(.22,.035,.025,m);bar.position.x=.28;bar.rotation.z=i*Math.PI/2;g.add(bar)}
  g.renderOrder=20;return g;
}

function init(){
  if(renderer)return;
  renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x7899ad);scene.fog=new THREE.Fog(0x7899ad,13,27);camera=new THREE.PerspectiveCamera(54,4/3,.08,60);
  scene.add(new THREE.HemisphereLight(0xc2d6d1,0x344a2e,1.18));let sun=new THREE.DirectionalLight(0xffe4b9,1.7);sun.position.set(-5,9,4);sun.castShadow=true;sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
  buildWorld();hero=buildHero();scene.add(hero);enemy=buildEnemy();enemy.position.set(0,0,-4.2);scene.add(enemy);reticle=makeReticle();scene.add(reticle);
  state={px:0,pz:3.3,vx:0,vz:0,speed:0,yaw:Math.PI,hp:8,phase:0,attack:0,combo:0,dodge:0,dodgeType:'',dodgeX:0,dodgeZ:0,invuln:0,lock:true,enemyHP:6,enemyHit:0,camYaw:Math.PI,camLook:new THREE.Vector3(),walkBlend:0};
}
function enter(){init();entered=true;resize(host.clientWidth,host.clientHeight)}
function exit(){entered=false}
function resize(w,h){if(!renderer)return;const rw=Math.max(320,Math.floor(w*.55)),rh=Math.max(240,Math.floor(h*.55));renderer.setSize(rw,rh,false);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';camera.aspect=w/h;camera.updateProjectionMatrix()}

function beginDodge(s,a,targetYaw){
  if(s.dodge>0)return;
  // Forward roll requires a strong forward stick direction in the original controller logic.
  if(a.m>=OOT.STICK_DIR_THRESHOLD && a.y>.25){
    s.dodge=OOT.ROLL_TIME;s.dodgeType='roll';s.dodgeX=Math.sin(s.yaw)*OOT.ROLL_SPEED;s.dodgeZ=Math.cos(s.yaw)*OOT.ROLL_SPEED;
  }else if(s.lock&&a.m>=.35&&Math.abs(a.x)>.45){
    const side=Math.sign(a.x);s.dodge=OOT.SIDESTEP_TIME;s.dodgeType='side';
    s.dodgeX=Math.cos(targetYaw)*side*OOT.SIDESTEP_SPEED;s.dodgeZ=-Math.sin(targetYaw)*side*OOT.SIDESTEP_SPEED;
  }else if(s.lock){
    s.dodge=OOT.BACKFLIP_TIME;s.dodgeType='back';s.dodgeX=-Math.sin(s.yaw)*OOT.BACKFLIP_SPEED;s.dodgeZ=-Math.cos(s.yaw)*OOT.BACKFLIP_SPEED;
  }
  if(s.dodge>0)s.invuln=Math.max(s.invuln,s.dodge*.72);
}

function update(dt,I){
  if(!entered)return;const a=I.axis(),s=state;
  s.attack=Math.max(0,s.attack-dt);s.dodge=Math.max(0,s.dodge-dt);s.invuln=Math.max(0,s.invuln-dt);s.enemyHit=Math.max(0,s.enemyHit-dt);
  let dx=enemy.position.x-s.px,dz=enemy.position.z-s.pz,ed=Math.hypot(dx,dz),targetYaw=Math.atan2(dx,dz);s.lock=s.enemyHP>0&&ed<OOT.LOCK_LEASH;

  if(I.pressB())beginDodge(s,a,targetYaw);
  if(I.pressA()&&s.dodge<=0){if(s.attack>.02&&s.attack<.17)s.combo=(s.combo+1)%3;else s.combo=0;s.attack=OOT.ATTACK_TIME}

  if(s.dodge>0){s.vx=s.dodgeX;s.vz=s.dodgeZ;s.speed=Math.hypot(s.vx,s.vz)}
  else if(s.lock){
    s.yaw+=angleDiff(s.yaw,targetYaw)*Math.min(1,dt*OOT.TURN_LOCK);
    // Lock-on: forward/back relative to target and lateral strafe around it.
    const rightX=Math.cos(targetYaw),rightZ=-Math.sin(targetYaw),frontX=Math.sin(targetYaw),frontZ=Math.cos(targetYaw);
    const strafeSpeed=OOT.RUN_SPEED*.56,fbSpeed=OOT.RUN_SPEED*.48;
    const tx=rightX*a.x*strafeSpeed+frontX*a.y*fbSpeed,tz=rightZ*a.x*strafeSpeed+frontZ*a.y*fbSpeed;
    if(a.m>.06){s.vx=moveToward(s.vx,tx,dt*18);s.vz=moveToward(s.vz,tz,dt*18)}else{s.vx=moveToward(s.vx,0,dt*30);s.vz=moveToward(s.vz,0,dt*30)}
    s.speed=Math.hypot(s.vx,s.vz);
  }else if(a.m>.06){
    const ang=Math.atan2(a.x,a.y)+s.camYaw;s.yaw+=angleDiff(s.yaw,ang)*Math.min(1,dt*OOT.TURN_FREE);
    const targetSpeed=OOT.RUN_SPEED*clamp((a.m-.06)/.94,0,1);s.speed=moveToward(s.speed,targetSpeed,dt*13);
    s.vx=Math.sin(ang)*s.speed;s.vz=Math.cos(ang)*s.speed;
  }else{
    // OOT's R_DECELERATE_RATE is greater than its run-speed cap, so neutral-stick braking is intentionally sharp.
    s.speed=Math.max(0,s.speed-OOT.DECEL_STEP*Math.min(1,dt*20));s.vx=Math.sin(s.yaw)*s.speed;s.vz=Math.cos(s.yaw)*s.speed;
  }

  s.px+=s.vx*dt;s.pz+=s.vz*dt;s.px=clamp(s.px,-9,9);s.pz=clamp(s.pz,-11,11);s.phase+=dt*Math.max(.2,s.speed)*4.2;
  hero.position.set(s.px,0,s.pz);hero.rotation.y=s.yaw;animateHero();

  // Re-evaluate target distance after movement.
  dx=enemy.position.x-s.px;dz=enemy.position.z-s.pz;ed=Math.hypot(dx,dz);
  if(s.attack>.10&&s.attack<.24&&ed<1.45&&s.enemyHit<=0){s.enemyHP=Math.max(0,s.enemyHP-1);s.enemyHit=.27;enemy.position.x+=dx/(ed||1)*.48;enemy.position.z+=dz/(ed||1)*.48}
  if(s.enemyHP>0){dx=s.px-enemy.position.x;dz=s.pz-enemy.position.z;let d=Math.hypot(dx,dz);enemy.rotation.y=Math.atan2(dx,dz);if(d>1.45&&d<6.5&&s.enemyHit<=0){enemy.position.x+=dx/(d||1)*.62*dt;enemy.position.z+=dz/(d||1)*.62*dt}enemy.visible=true}else enemy.visible=false;

  // Target reticle floats above the enemy and follows lock state.
  reticle.visible=s.lock&&s.enemyHP>0;if(reticle.visible){reticle.position.copy(enemy.position);reticle.position.y=1.65;reticle.rotation.z+=dt*1.8;reticle.lookAt(camera.position)}

  // OOT-like camera intent: behind free-running Link, shared player-target composition while locked.
  const desiredYaw=s.lock?targetYaw:s.yaw;s.camYaw+=angleDiff(s.camYaw,desiredYaw)*Math.min(1,dt*(s.lock?4.8:3.2));
  let centerX=s.px,centerZ=s.pz;if(s.lock){centerX=(s.px+enemy.position.x)*.5;centerZ=(s.pz+enemy.position.z)*.5}
  const camDist=s.lock?6.2:5.7,camHeight=s.lock?3.0:2.75;
  const targetPos=new THREE.Vector3(centerX-Math.sin(s.camYaw)*camDist,camHeight,centerZ-Math.cos(s.camYaw)*camDist);
  camera.position.lerp(targetPos,1-Math.pow(.0015,dt));s.camLook.set(centerX,s.lock?1.0:.92,centerZ);camera.lookAt(s.camLook);
}

function animateHero(){
  const s=state,m=Math.hypot(s.vx,s.vz),sw=Math.sin(s.phase),run=clamp(m/OOT.RUN_SPEED,0,1);
  parts.LL.hip.rotation.x=sw*.78*run;parts.RL.hip.rotation.x=-sw*.78*run;parts.LL.knee.rotation.x=Math.max(0,-sw)*.62*run;parts.RL.knee.rotation.x=Math.max(0,sw)*.62*run;
  parts.LA.should.rotation.x=-sw*.48*run;parts.RA.should.rotation.x=sw*.48*run;parts.LA.elbow.rotation.x=-.22;parts.RA.elbow.rotation.x=-.22;parts.RA.should.rotation.z=0;parts.RA.elbow.rotation.z=0;
  parts.pelvis.position.y=1.02+run*Math.abs(Math.sin(s.phase))*.038;hero.rotation.x=0;hero.rotation.z=0;
  if(s.dodge>0){
    const total=s.dodgeType==='roll'?OOT.ROLL_TIME:s.dodgeType==='back'?OOT.BACKFLIP_TIME:OOT.SIDESTEP_TIME,t=1-s.dodge/total;
    if(s.dodgeType==='roll')hero.rotation.x=Math.sin(t*Math.PI)*1.15;
    else if(s.dodgeType==='back')hero.rotation.x=-Math.sin(t*Math.PI)*.95;
    else hero.rotation.z=Math.sin(t*Math.PI)*.35*Math.sign(s.dodgeX||1);
    parts.LA.should.rotation.x=-1.0;parts.RA.should.rotation.x=-1.0;
  }
  if(s.attack>0){const t=1-s.attack/OOT.ATTACK_TIME,arc=Math.sin(clamp(t,0,1)*Math.PI);parts.RA.should.rotation.z=-.35-arc*(1.25+s.combo*.24);parts.RA.should.rotation.x=-.75+Math.cos(t*Math.PI)*.36;parts.RA.elbow.rotation.z=-.32-arc*.62}
}

function render(){
  if(!entered)return;renderer.render(scene,camera);const s=state;
  RE.setHUD(`N64 3D · OOT-SOURCE-TUNED\n♥ ${s.hp}   TARGET ${s.enemyHP>0?s.enemyHP:'DOWN'}   Z-LOCK ${s.lock?'ON':'OFF'}`,
    'Original Emberwood art · low-res textured polygons · source-referenced 6.0 run cap / sharp deceleration · forward roll / side hop / backflip · target-facing strafe · follow/lock camera');
}
RE.register(3,{is3D:true,enter,exit,resize,update,render});