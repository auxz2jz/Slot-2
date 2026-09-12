import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';

/*
 Relic of Emberwood — N64 fidelity lab.
 Original art/geometry. Controller/camera/combat architecture is an independent browser
 reimplementation informed by the public zeldaret/oot decompilation.
*/
const RE=window.RE, host=RE.threeHost;
let renderer,scene,camera,hero,enemy,reticle,entered=false;
let parts={},enemyParts={},mat={},state={},world={},bars=null;

const SRC={
  RUN_CAP:6.0,          // Kokiri boots R_RUN_SPEED_LIMIT 600 / 100
  CHILD_RUN_CAP:5.5,    // child Kokiri boots 550 / 100
  ACCEL_STEP:2.0,       // REG(19)=200 -> /100 in Math_AsymStepToF
  DECEL_TARGET:1.5,     // func_8083DF68 asymmetric decrease step
  STOP_STEP:8.0,        // R_DECELERATE_RATE 800 / 100
  STICK_DIR:55/80,      // direction classification threshold
  CURVE_DEAD:20/80,     // SPEED_MODE_CURVED dead zone
  ROLL_SCALE:1.5,       // Player_TryRoll: normal target speed * 1.5
  ROLL_MIN:3.0,
  FREE_FOV:60,          // Normal0 / CAM_MODE_NORMAL
  BATTLE_FOV:50,        // Normal0 / hostile Z target
  FREE_EYE:200,
  BATTLE_EYE:180,
  CAM_XZ_RATE:.05,
  CAM_Y_RATE:.05,
  CAM_FOV_RATE:.05,
  LOGIC_HZ:20
};
// Animation lengths below are tuned for this original model; source structure, not copied animation data.
const TUNE={ROLL:.46,SIDE:.34,BACK:.48,ATTACK:.34,LOCK_RANGE:8.6,HIT_R:0.48};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const expLerp=(rate,dt)=>1-Math.exp(-rate*dt);
function angleDiff(a,b){let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI;return d<-Math.PI?d+Math.PI*2:d}
function M(c,opts={}){return new THREE.MeshLambertMaterial({color:c,flatShading:true,...opts})}
function box(w,h,d,m){let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.castShadow=o.receiveShadow=true;return o}
function cyl(a,b,h,n,m){let o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,n),m);o.castShadow=o.receiveShadow=true;return o}
function sph(r,w,h,m){let o=new THREE.Mesh(new THREE.SphereGeometry(r,w,h),m);o.castShadow=o.receiveShadow=true;return o}
function pivot(p,x,y,z){let g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g}

function tex(kind,size=32){
  const c=document.createElement('canvas'); c.width=c.height=size;
  const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
  const fill=(v)=>{x.fillStyle=v;x.fillRect(0,0,size,size)};
  if(kind==='grass'){
    fill('#537a3f'); x.fillStyle='#3e6232';
    for(let i=0;i<42;i++){let a=(i*13)%size,b=(i*7)%size;x.fillRect(a,b,1,3);x.fillRect((a+1)%size,(b+2)%size,2,1)}
    x.fillStyle='#769757';for(let i=0;i<18;i++)x.fillRect((i*9)%size,(i*17)%size,2,1);
  }else if(kind==='dirt'){
    fill('#9d8258');x.fillStyle='#7b6644';for(let i=0;i<28;i++)x.fillRect((i*11)%size,(i*19)%size,2,1);
    x.fillStyle='#bca272';for(let i=0;i<13;i++)x.fillRect((i*7)%size,(i*13)%size,1,1);
  }else if(kind==='cloth'){
    fill('#3e743e');x.fillStyle='#315f35';for(let y=0;y<size;y+=4)x.fillRect(0,y,size,1);
    x.fillStyle='#4d8449';for(let q=2;q<size;q+=8)x.fillRect(q,0,1,size);
  }else if(kind==='wood'){
    fill('#89623a');x.fillStyle='#5c4029';for(let y=0;y<size;y+=8)x.fillRect(0,y,size,1);
    for(let i=0;i<10;i++)x.fillRect((i*13)%size,0,1,size);x.fillStyle='#ad8050';for(let y=3;y<size;y+=8)x.fillRect(1,y,size-3,1);
  }else{
    fill('#74796f');x.fillStyle='#555c55';for(let y=0;y<size;y+=8){x.fillRect(0,y,size,1);for(let q=((y/8)&1)*8;q<size;q+=16)x.fillRect(q,y,1,8)}
    x.fillStyle='#91968b';for(let i=0;i<10;i++)x.fillRect((i*9)%size,(i*5)%size,3,1);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  // N64-style low-res soft sampling.
  t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.colorSpace=THREE.SRGBColorSpace;
  return t;
}

function buildHero(){
  parts={};
  const root=new THREE.Group(); root.scale.setScalar(.84);
  const cloth=tex('cloth',16);cloth.repeat.set(2,2);
  mat.skin=M(0xe1a56f);mat.green=new THREE.MeshLambertMaterial({map:cloth,color:0xffffff,flatShading:true});
  mat.greenDark=M(0x24522e);mat.leather=M(0x70462a);mat.boot=M(0x462b1d);
  mat.metal=M(0xc9c8b7);mat.gold=M(0xb99a4f);mat.hair=M(0x9b612d);mat.sleeve=M(0xd8d0b8);mat.eye=M(0x142018);
  mat.white=M(0xeee7d0);mat.red=M(0x8f342f);

  parts.pelvis=box(.44,.23,.32,mat.greenDark);parts.pelvis.position.y=1.05;root.add(parts.pelvis);
  parts.torso=box(.60,.69,.35,mat.green);parts.torso.position.y=.43;parts.pelvis.add(parts.torso);
  const skirt=cyl(.36,.47,.42,6,mat.green);skirt.position.y=-.43;parts.torso.add(skirt);
  const belt=box(.61,.085,.37,mat.leather);belt.position.y=-.20;parts.torso.add(belt);
  const buckle=box(.105,.105,.025,mat.gold);buckle.position.set(0,-.20,.20);parts.torso.add(buckle);
  const strap=box(.075,.81,.035,mat.leather);strap.position.set(.07,.02,.19);strap.rotation.z=-.42;parts.torso.add(strap);

  parts.neck=pivot(parts.torso,0,.46,0);
  parts.head=sph(.265,8,6,mat.skin);parts.head.scale.set(1,.96,.97);parts.head.position.y=.22;parts.neck.add(parts.head);
  const hairTop=box(.42,.14,.30,mat.hair);hairTop.position.set(0,.15,-.015);parts.head.add(hairTop);
  for(const sx of [-1,1]){let lock=cyl(.045,.06,.26,5,mat.hair);lock.position.set(sx*.19,-.12,-.10);lock.rotation.z=sx*.17;parts.head.add(lock)}
  const nose=box(.07,.075,.09,mat.skin);nose.position.set(0,-.015,.25);parts.head.add(nose);
  parts.eyeL=sph(.025,5,3,mat.eye);parts.eyeR=sph(.025,5,3,mat.eye);
  parts.eyeL.position.set(-.078,.038,.25);parts.eyeR.position.set(.078,.038,.25);parts.head.add(parts.eyeL,parts.eyeR);
  parts.mouth=box(.105,.018,.014,mat.red);parts.mouth.position.set(0,-.105,.254);parts.head.add(parts.mouth);
  const ears=new THREE.ConeGeometry(.085,.25,3);
  for(const sx of [-1,1]){let e=new THREE.Mesh(ears,mat.skin);e.position.set(sx*.285,.01,0);e.rotation.z=sx*Math.PI/2;parts.head.add(e)}
  const hood=cyl(.25,.35,.35,7,mat.greenDark);hood.rotation.x=Math.PI/2;hood.position.set(0,.15,-.21);parts.head.add(hood);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.225,.60,7),mat.green);cap.position.set(0,.30,-.17);cap.rotation.x=-.76;parts.head.add(cap);

  function arm(side){
    const s=side==='L'?-1:1, shoulder=pivot(parts.torso,s*.39,.24,0);
    let shoulderPad=sph(.115,6,4,mat.green);shoulderPad.scale.y=.78;shoulder.add(shoulderPad);
    let upper=cyl(.092,.11,.48,6,mat.sleeve);upper.position.y=-.24;shoulder.add(upper);
    const elbow=pivot(shoulder,0,-.49,0);let fore=cyl(.076,.092,.43,6,mat.leather);fore.position.y=-.215;elbow.add(fore);
    const hand=pivot(elbow,0,-.445,0);hand.add(sph(.09,6,4,mat.skin));return{shoulder,elbow,hand};
  }
  parts.LA=arm('L');parts.RA=arm('R');
  function leg(side){
    const s=side==='L'?-1:1,hip=pivot(parts.pelvis,s*.14,-.12,0);let thigh=cyl(.11,.125,.55,6,mat.sleeve);thigh.position.y=-.275;hip.add(thigh);
    const knee=pivot(hip,0,-.56,0);let shin=cyl(.092,.108,.51,6,mat.leather);shin.position.y=-.255;knee.add(shin);
    const foot=pivot(knee,0,-.53,.06);let boot=box(.22,.19,.36,mat.boot);boot.position.z=.10;foot.add(boot);return{hip,knee,foot};
  }
  parts.LL=leg('L');parts.RL=leg('R');

  parts.swordRoot=pivot(parts.RA.hand,0,0,0);
  let grip=box(.085,.18,.085,mat.leather);grip.position.y=.035;parts.swordRoot.add(grip);
  let guard=box(.37,.06,.085,mat.gold);guard.position.y=-.09;parts.swordRoot.add(guard);
  let blade=box(.075,.78,.038,mat.metal);blade.position.y=-.49;parts.swordRoot.add(blade);
  parts.swordTip=pivot(parts.swordRoot,0,-.90,0);
  parts.swordBase=pivot(parts.swordRoot,0,-.13,0);

  const shield=pivot(parts.LA.elbow,-.15,-.23,.02);shield.rotation.x=Math.PI/2;
  shield.add(cyl(.31,.31,.075,12,mat.leather));let sf=cyl(.235,.235,.083,12,M(0x315f39));sf.position.y=.005;shield.add(sf);
  let sb=cyl(.05,.05,.093,8,mat.gold);sb.position.y=.009;shield.add(sb);
  for(let r=0;r<3;r++){let gem=box(.06,.05,.025,mat.gold);gem.position.set((r-1)*.10,.09,.045);shield.add(gem)}
  return root;
}

function buildEnemy(){
  enemyParts={};
  const root=new THREE.Group(),bone=M(0xd1bea0),iron=M(0x5e6261),dark=M(0x342b27),cloth=M(0x7e3c31),eye=M(0xe6b23f);
  enemyParts.pelvis=box(.48,.23,.34,dark);enemyParts.pelvis.position.y=1.02;root.add(enemyParts.pelvis);
  enemyParts.torso=box(.66,.70,.39,cloth);enemyParts.torso.position.y=.45;enemyParts.pelvis.add(enemyParts.torso);
  const head=sph(.27,7,5,bone);head.position.set(0,.55,.01);enemyParts.torso.add(head);
  for(const sx of [-1,1]){let e=sph(.03,5,3,eye);e.position.set(sx*.085,.57,.255);enemyParts.torso.add(e)}
  function arm(s){let sh=pivot(enemyParts.torso,s*.44,.25,0),up=cyl(.09,.11,.48,6,bone);up.position.y=-.24;sh.add(up);let el=pivot(sh,0,-.49,0),fr=cyl(.075,.09,.42,6,iron);fr.position.y=-.21;el.add(fr);return{sh,el}}
  enemyParts.LA=arm(-1);enemyParts.RA=arm(1);
  function leg(s){let h=pivot(enemyParts.pelvis,s*.14,-.12,0),th=cyl(.10,.12,.53,6,bone);th.position.y=-.265;h.add(th);let k=pivot(h,0,-.54,0),lo=cyl(.085,.10,.48,6,iron);lo.position.y=-.24;k.add(lo);return{h,k}}
  enemyParts.LL=leg(-1);enemyParts.RL=leg(1);
  enemyParts.weapon=pivot(enemyParts.RA.el,0,-.43,0);let sword=box(.09,.76,.045,iron);sword.position.y=-.41;enemyParts.weapon.add(sword);
  enemyParts.shield=pivot(enemyParts.LA.el,0,-.35,.12);enemyParts.shield.rotation.x=Math.PI/2;enemyParts.shield.add(cyl(.31,.31,.08,8,iron));
  return root;
}

function terrainHeight(x,z){
  // Gentle analytic terrain: enough slope information to exercise floor response without copying a Nintendo map.
  const hill=.75*Math.exp(-((x-5.2)**2+(z-3.8)**2)/13);
  const swell=.28*Math.exp(-((x+5.5)**2+(z+1.0)**2)/18);
  return hill+swell;
}
function terrainSlope(x,z){
  const e=.08,h=terrainHeight(x,z);
  return {x:(terrainHeight(x+e,z)-h)/e,z:(terrainHeight(x,z+e)-h)/e};
}
function addCircle(x,z,r,type){world.obstacles.push({kind:'circle',x,z,r,type})}
function addBox(x,z,hx,hz,type){world.obstacles.push({kind:'box',x,z,hx,hz,type})}

function buildWorld(){
  world={obstacles:[],trees:[],surface:'grass'};
  const g=tex('grass');g.repeat.set(24,24);
  const geo=new THREE.PlaneGeometry(48,48,32,32);geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i)));p.needsUpdate=true;geo.computeVertexNormals();
  const ground=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map:g,color:0xffffff,flatShading:false}));ground.receiveShadow=true;scene.add(ground);

  const dirt=tex('dirt');dirt.repeat.set(2,1);const dm=new THREE.MeshLambertMaterial({map:dirt});
  for(let z=-13;z<12;z+=1.05){let q=box(2.35,.025,.96,dm);q.position.set(0,terrainHeight(0,z)+.018,z);scene.add(q)}

  function tree(x,z,s=1){
    let trunk=cyl(.19,.28,1.45,6,M(0x684327));trunk.position.set(x,terrainHeight(x,z)+.72,z);scene.add(trunk);
    let a=new THREE.Mesh(new THREE.ConeGeometry(.98*s,1.60*s,7),M(0x2b6035));a.position.set(x,terrainHeight(x,z)+1.95*s,z);a.castShadow=true;scene.add(a);
    let b=new THREE.Mesh(new THREE.ConeGeometry(.70*s,1.28*s,7),M(0x407b42));b.position.set(x,terrainHeight(x,z)+2.72*s,z);b.castShadow=true;scene.add(b);
    addCircle(x,z,.42*s,'tree');
  }
  [[-5,-6,1.1],[5,-5,1],[5.8,1.5,.9],[-5.7,1,.95],[-5,6,1.05],[5.4,6.1,1],[-7,-1,.8],[7,-2,.8]].forEach(a=>tree(...a));

  const wood=tex('wood');wood.repeat.set(3,2);let hut=box(3.2,1.9,2.8,new THREE.MeshLambertMaterial({map:wood}));
  hut.position.set(-5,terrainHeight(-5,-9)+.95,-9);scene.add(hut);addBox(-5,-9,1.7,1.5,'hut');
  let roof=new THREE.Mesh(new THREE.ConeGeometry(2.7,1.45,4),M(0x493421));roof.position.set(-5,hut.position.y+1.53,-9);roof.rotation.y=Math.PI/4;scene.add(roof);
  let door=box(.70,1.2,.05,M(0x3c2a1b));door.position.set(-5,terrainHeight(-5,-7.57)+.60,-7.57);scene.add(door);

  for(const [x,z] of [[3,-1.7],[3.9,-1],[-3.4,2.8],[3,4.0]]){
    const st=tex('stone');let r=sph(.37,5,3,new THREE.MeshLambertMaterial({map:st}));r.scale.y=.65;r.position.set(x,terrainHeight(x,z)+.21,z);scene.add(r);addCircle(x,z,.36,'rock');
  }
  for(let x=-3.5;x<=3.5;x+=.7){let f=box(.12,.78,.12,M(0x6c472b));f.position.set(x,terrainHeight(x,8.2)+.39,8.2);scene.add(f);addCircle(x,8.2,.11,'fence')}
}

function makeReticle(){
  const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color:0xffd75f,transparent:true,opacity:.95,depthTest:false});
  for(let i=0;i<4;i++){let b=box(.22,.035,.025,m);b.position.x=.30;b.rotation.z=i*Math.PI/2;g.add(b)}
  g.renderOrder=30;return g;
}
function makeBars(){
  const top=document.createElement('div'),bottom=document.createElement('div');
  for(const e of [top,bottom]){Object.assign(e.style,{position:'absolute',left:'0',right:'0',height:'0px',background:'#000',zIndex:'25',pointerEvents:'none',transition:'height 90ms linear'});host.appendChild(e)}
  top.style.top='0';bottom.style.bottom='0';return{top,bottom};
}

function init(){
  if(renderer)return;
  renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x7899ad);scene.fog=new THREE.Fog(0x7899ad,12,25);
  camera=new THREE.PerspectiveCamera(SRC.FREE_FOV,4/3,.08,60);
  scene.add(new THREE.HemisphereLight(0xc3d5d0,0x354a2f,1.14));
  let sun=new THREE.DirectionalLight(0xffe4ba,1.65);sun.position.set(-6,9,4);sun.castShadow=true;sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);

  buildWorld();hero=buildHero();scene.add(hero);enemy=buildEnemy();scene.add(enemy);reticle=makeReticle();scene.add(reticle);bars=makeBars();
  state={
    px:0,pz:3.3,py:terrainHeight(0,3.3),speed:0,yaw:Math.PI,hp:8,
    visual:new THREE.Vector3(0,0,3.3),phase:0,blink:0,blinkNext:2.4,
    action:'free',actionT:0,attackIndex:0,queuedAttack:false,invuln:0,
    lock:false,parallel:0,camYaw:Math.PI,camLook:new THREE.Vector3(),camDist:5.8,
    prevTip:new THREE.Vector3(),prevBase:new THREE.Vector3(),weaponReady:false,
    enemy:{x:0,z:-4.2,hp:8,state:'idle',t:.5,strafe:1,hit:0,attackHit:false},
    surface:'grass'
  };
  enemy.position.set(state.enemy.x,terrainHeight(state.enemy.x,state.enemy.z),state.enemy.z);
}
function enter(){init();entered=true;resize(host.clientWidth,host.clientHeight)}
function exit(){entered=false;if(bars){bars.top.style.height='0px';bars.bottom.style.height='0px'}}
function resize(w,h){
  if(!renderer)return;
  // Original game presentation is 320x240; keep 4:3 and scale it as one surface.
  renderer.setSize(320,240,false);
  const cssW=Math.min(w,h*4/3),cssH=cssW*3/4;
  renderer.domElement.style.width=cssW+'px';renderer.domElement.style.height=cssH+'px';
  renderer.domElement.style.position='absolute';renderer.domElement.style.left=((w-cssW)/2)+'px';renderer.domElement.style.top=((h-cssH)/2)+'px';
  camera.aspect=4/3;camera.updateProjectionMatrix();
}

function curvedStickSpeed(m){
  let raw=clamp(m,0,1)*80;
  raw-=20;if(raw<=0)return 0;
  // Math_CosS(angle) equivalent: s16 angle units have a full turn of 65536.
  const temp=1-Math.cos((raw*450)*(Math.PI*2/65536));
  return Math.min(SRC.RUN_CAP,((temp*temp*30)+7)*.14);
}
function surfaceAt(x,z){return Math.abs(x)<1.25?'dirt':'grass'}

function collidePoint(x,z,r=.28){
  for(const o of world.obstacles){
    if(o.kind==='circle'){
      let dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),min=o.r+r;if(d<min)return {hit:true,nx:dx/(d||1),nz:dz/(d||1),push:min-d};
    }else{
      const cx=clamp(x,o.x-o.hx,o.x+o.hx),cz=clamp(z,o.z-o.hz,o.z+o.hz),dx=x-cx,dz=z-cz,d=Math.hypot(dx,dz);
      if(d<r)return {hit:true,nx:dx/(d||1),nz:dz/(d||1),push:r-d};
    }
  }
  return null;
}
function movePlayer(dx,dz){
  const s=state;
  let nx=clamp(s.px+dx,-10,10),nz=s.pz,hit=collidePoint(nx,nz);if(hit)nx+=hit.nx*hit.push;s.px=nx;
  nz=clamp(s.pz+dz,-12,12);hit=collidePoint(s.px,nz);if(hit)nz+=hit.nz*hit.push;s.pz=nz;
  s.py=terrainHeight(s.px,s.pz);s.surface=surfaceAt(s.px,s.pz);
}
function nearestTarget(){return state.enemy.hp>0?state.enemy:null}

function toggleTarget(){
  const s=state,t=nearestTarget();if(s.lock){s.lock=false;s.parallel=.35;return}
  if(t&&Math.hypot(t.x-s.px,t.z-s.pz)<=TUNE.LOCK_RANGE)s.lock=true;else s.parallel=.35;
}
function startDodge(a,targetYaw){
  const s=state;if(s.action!=='free')return;
  if(s.lock){
    if(a.m>=.30&&Math.abs(a.x)>.42){s.action='side';s.actionT=TUNE.SIDE;s.dodgeSide=Math.sign(a.x)||1}
    else if(a.y<-.18||a.m<.25){s.action='back';s.actionT=TUNE.BACK}
    else {s.action='roll';s.actionT=TUNE.ROLL;s.rollSpeed=Math.max(SRC.ROLL_MIN,curvedStickSpeed(a.m)*SRC.ROLL_SCALE)}
  }else if(a.m>=SRC.STICK_DIR){
    // In free movement the character turns into the stick direction, so a strong movement input
    // is the browser equivalent of the source's forward-stick roll requirement.
    s.action='roll';s.actionT=TUNE.ROLL;s.rollSpeed=Math.max(SRC.ROLL_MIN,curvedStickSpeed(a.m)*SRC.ROLL_SCALE);
  }
  s.invuln=Math.max(s.invuln,s.actionT*.70);
}
function startAttack(){
  const s=state;
  if(s.action.startsWith('attack')){s.queuedAttack=true;return}
  if(s.action!=='free')return;
  s.attackIndex=0;s.action='attack1';s.actionT=TUNE.ATTACK;s.queuedAttack=false;s.weaponReady=false;
}
function nextAttack(){
  const s=state;s.attackIndex=(s.attackIndex+1)%3;s.action='attack'+(s.attackIndex+1);s.actionT=TUNE.ATTACK;s.queuedAttack=false;s.weaponReady=false;
}

function playerLogic(dt,a){
  const s=state,t=s.enemy; s.invuln=Math.max(0,s.invuln-dt);s.parallel=Math.max(0,s.parallel-dt);
  if(s.lock&&(!t||t.hp<=0||Math.hypot(t.x-s.px,t.z-s.pz)>TUNE.LOCK_RANGE*1.28))s.lock=false;
  const targetYaw=t&&t.hp>0?Math.atan2(t.x-s.px,t.z-s.pz):s.yaw;

  if(s.actionT>0)s.actionT=Math.max(0,s.actionT-dt);
  if(s.action==='roll'){
    movePlayer(Math.sin(s.yaw)*s.rollSpeed*dt,Math.cos(s.yaw)*s.rollSpeed*dt);
  }else if(s.action==='side'){
    const side=s.dodgeSide||1,sp=5.2;movePlayer(Math.cos(targetYaw)*side*sp*dt,-Math.sin(targetYaw)*side*sp*dt);s.yaw=targetYaw;
  }else if(s.action==='back'){
    const sp=5.6;movePlayer(-Math.sin(targetYaw)*sp*dt,-Math.cos(targetYaw)*sp*dt);s.yaw=targetYaw;
  }else if(s.action.startsWith('attack')){
    s.speed=approach(s.speed,0,SRC.DECEL_TARGET*SRC.LOGIC_HZ*dt);s.yaw=s.lock?targetYaw:s.yaw;
  }else{
    const target=curvedStickSpeed(a.m);
    if(s.lock){
      s.yaw+=angleDiff(s.yaw,targetYaw)*Math.min(1,dt*15);
      const rightX=Math.cos(targetYaw),rightZ=-Math.sin(targetYaw),frontX=Math.sin(targetYaw),frontZ=Math.cos(targetYaw);
      const moveMag=target/SRC.RUN_CAP;
      const vx=(rightX*a.x*.62+frontX*a.y*.52)*SRC.RUN_CAP*moveMag;
      const vz=(rightZ*a.x*.62+frontZ*a.y*.52)*SRC.RUN_CAP*moveMag;
      movePlayer(vx*dt,vz*dt);s.speed=Math.hypot(vx,vz);
    }else if(target>0){
      const ang=Math.atan2(a.x,a.y)+s.camYaw;s.yaw+=angleDiff(s.yaw,ang)*Math.min(1,dt*11);
      const slope=terrainSlope(s.px,s.pz),uphill=Math.max(0,Math.sin(ang)*slope.x+Math.cos(ang)*slope.z);
      const adjusted=Math.max(0,target-8*Math.min(.6,uphill)**2);
      const step=(adjusted>=s.speed?SRC.ACCEL_STEP:SRC.DECEL_TARGET)*SRC.LOGIC_HZ*dt;s.speed=approach(s.speed,adjusted,step);
      movePlayer(Math.sin(ang)*s.speed*dt,Math.cos(ang)*s.speed*dt);
    }else{
      s.speed=approach(s.speed,0,SRC.STOP_STEP*SRC.LOGIC_HZ*dt);
      if(s.speed>0)movePlayer(Math.sin(s.yaw)*s.speed*dt,Math.cos(s.yaw)*s.speed*dt);
    }
  }
  if(s.action!=='free'&&s.actionT<=0){
    if(s.action.startsWith('attack')&&s.queuedAttack)nextAttack();else{s.action='free';s.queuedAttack=false;s.weaponReady=false}
  }
}

function enemyLogic(dt){
  const s=state,e=s.enemy;if(e.hp<=0){e.state='dead';enemy.visible=false;return}enemy.visible=true;
  e.hit=Math.max(0,e.hit-dt);e.t=Math.max(0,e.t-dt);
  let dx=s.px-e.x,dz=s.pz-e.z,d=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);enemy.rotation.y=yaw;
  if(e.hit>0){e.state='hurt';return}
  if(e.state==='idle'&&d<6.8){e.state='approach';e.t=.7}
  if(e.state==='approach'){
    if(d>2.0){e.x+=Math.sin(yaw)*1.25*dt;e.z+=Math.cos(yaw)*1.25*dt}
    else{e.state='strafe';e.t=.65+Math.random()*.55;e.strafe=Math.random()<.5?-1:1}
  }else if(e.state==='strafe'){
    e.x+=Math.cos(yaw)*e.strafe*.95*dt;e.z-=Math.sin(yaw)*e.strafe*.95*dt;
    if(s.action.startsWith('attack')&&d<1.9&&Math.random()<.10){e.state='block';e.t=.42}
    else if(e.t<=0){e.state=d<1.75?'windup':'approach';e.t=e.state==='windup'?.32:.5;e.attackHit=false}
  }else if(e.state==='windup'){
    if(e.t<=0){e.state='attack';e.t=.30;e.attackHit=false}
  }else if(e.state==='attack'){
    if(!e.attackHit&&e.t<.20&&e.t>.08&&d<1.38){e.attackHit=true;if(s.invuln<=0){s.hp=Math.max(0,s.hp-1);s.invuln=.7;s.speed=0}}
    if(e.t<=0){e.state='recover';e.t=.40}
  }else if(e.state==='block'){
    if(e.t<=0){e.state='strafe';e.t=.5}
  }else if(e.state==='recover'&&e.t<=0){e.state='strafe';e.t=.55}
  enemy.position.set(e.x,terrainHeight(e.x,e.z),e.z);
}

function pointSegDist(px,pz,ax,az,bx,bz){
  const vx=bx-ax,vz=bz-az,wx=px-ax,wz=pz-az,c2=vx*vx+vz*vz,t=c2?clamp((wx*vx+wz*vz)/c2,0,1):0;
  return Math.hypot(px-(ax+vx*t),pz-(az+vz*t));
}
function weaponHitCheck(){
  const s=state,e=s.enemy;if(!s.action.startsWith('attack')||e.hp<=0)return;
  const total=TUNE.ATTACK,t=1-s.actionT/total;
  if(t<.28||t>.68)return;
  hero.updateMatrixWorld(true);
  const tip=new THREE.Vector3(),base=new THREE.Vector3();parts.swordTip.getWorldPosition(tip);parts.swordBase.getWorldPosition(base);
  if(!s.weaponReady){s.prevTip.copy(tip);s.prevBase.copy(base);s.weaponReady=true;return}
  const d1=pointSegDist(e.x,e.z,base.x,base.z,tip.x,tip.z);
  const d2=pointSegDist(e.x,e.z,s.prevTip.x,s.prevTip.z,tip.x,tip.z);
  s.prevTip.copy(tip);s.prevBase.copy(base);
  if(Math.min(d1,d2)<TUNE.HIT_R&&e.hit<=0){
    if(e.state==='block'){e.state='strafe';e.t=.45;s.actionT=Math.min(s.actionT,.16);return}
    e.hp--;e.hit=.28;e.state='hurt';e.t=.28;const a=Math.atan2(e.x-s.px,e.z-s.pz);e.x+=Math.sin(a)*.48;e.z+=Math.cos(a)*.48;
  }
}

function pose(dt){
  const s=state,a=s.action,moving=s.speed>0.1||['roll','side','back'].includes(a);
  s.phase+=dt*Math.max(.2,s.speed)*4.4;
  const sw=Math.sin(s.phase),run=clamp(s.speed/SRC.RUN_CAP,0,1);
  const target={
    lh:sw*.78*run,rh:-sw*.78*run,lk:Math.max(0,-sw)*.62*run,rk:Math.max(0,sw)*.62*run,
    la:-sw*.48*run,ra:sw*.48*run,le:-.22,re:-.22,raz:0,rez:0,rx:0,rz:0,bob:run*Math.abs(sw)*.038
  };
  if(a==='roll'){let t=1-s.actionT/TUNE.ROLL;target.rx=Math.sin(t*Math.PI)*1.18;target.la=target.ra=-1}
  if(a==='back'){let t=1-s.actionT/TUNE.BACK;target.rx=-Math.sin(t*Math.PI)*1.02;target.la=target.ra=-.8}
  if(a==='side'){let t=1-s.actionT/TUNE.SIDE;target.rz=Math.sin(t*Math.PI)*.40*(s.dodgeSide||1)}
  if(a.startsWith('attack')){
    let t=1-s.actionT/TUNE.ATTACK,arc=Math.sin(clamp(t,0,1)*Math.PI),idx=s.attackIndex;
    target.raz=-.32-arc*(1.15+idx*.28);target.ra=-.72+Math.cos(t*Math.PI)*.42;target.rez=-.25-arc*.70;
  }
  const k=expLerp(18,dt),set=(obj,key,v)=>obj.rotation[key]+=(v-obj.rotation[key])*k;
  set(parts.LL.hip,'x',target.lh);set(parts.RL.hip,'x',target.rh);set(parts.LL.knee,'x',target.lk);set(parts.RL.knee,'x',target.rk);
  set(parts.LA.shoulder,'x',target.la);set(parts.RA.shoulder,'x',target.ra);set(parts.LA.elbow,'x',target.le);set(parts.RA.elbow,'x',target.re);
  set(parts.RA.shoulder,'z',target.raz);set(parts.RA.elbow,'z',target.rez);
  hero.rotation.x+=(target.rx-hero.rotation.x)*k;hero.rotation.z+=(target.rz-hero.rotation.z)*k;
  parts.pelvis.position.y+=(1.05+target.bob-parts.pelvis.position.y)*k;

  s.blink+=dt;if(s.blink>s.blinkNext){s.blink=-.11;s.blinkNext=2.1+Math.random()*2.7}
  const blink=s.blink<0;parts.eyeL.scale.y=parts.eyeR.scale.y=blink?.12:1;
  parts.mouth.scale.x=a.startsWith('attack')?1.25:1;
}

function segmentCircleBlock(ax,az,bx,bz,o,pad=.15){
  return pointSegDist(o.x,o.z,ax,az,bx,bz)<o.r+pad;
}
function cameraBlocked(ax,az,bx,bz){
  for(const o of world.obstacles){
    if(o.kind==='circle'&&segmentCircleBlock(ax,az,bx,bz,o,.22))return true;
    if(o.kind==='box'){
      // Cheap but stable sample test against the building footprint.
      for(let i=1;i<10;i++){let t=i/10,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(x>o.x-o.hx-.2&&x<o.x+o.hx+.2&&z>o.z-o.hz-.2&&z<o.z+o.hz+.2)return true}
    }
  }return false;
}
function cameraUpdate(dt){
  const s=state,e=s.enemy,locked=s.lock&&e.hp>0;
  let focusX=s.px,focusZ=s.pz,desiredYaw=s.yaw;
  if(locked){focusX=(s.px+e.x)*.5;focusZ=(s.pz+e.z)*.5;desiredYaw=Math.atan2(e.x-s.px,e.z-s.pz)}
  else if(s.parallel>0)desiredYaw=s.yaw;
  s.camYaw+=angleDiff(s.camYaw,desiredYaw)*expLerp(locked?7:4.5,dt);
  const sourceEye=locked?SRC.BATTLE_EYE:SRC.FREE_EYE,dist=sourceEye*(5.8/SRC.FREE_EYE);
  let camDist=dist;
  for(let q=0;q<8;q++){let bx=focusX-Math.sin(s.camYaw)*camDist,bz=focusZ-Math.cos(s.camYaw)*camDist;if(!cameraBlocked(focusX,focusZ,bx,bz))break;camDist-=.45}
  camDist=Math.max(2.25,camDist);s.camDist+=(camDist-s.camDist)*expLerp(7,dt);
  const focusY=terrainHeight(focusX,focusZ)+(locked?1.00:.92),cx=focusX-Math.sin(s.camYaw)*s.camDist,cz=focusZ-Math.cos(s.camYaw)*s.camDist;
  const minY=terrainHeight(cx,cz)+.55,cy=Math.max(minY,focusY+(locked?2.35:2.55));
  const desired=new THREE.Vector3(cx,cy,cz);camera.position.lerp(desired,expLerp(8,dt));
  s.camLook.lerp(new THREE.Vector3(focusX,focusY,focusZ),expLerp(10,dt));camera.lookAt(s.camLook);
  const wantFov=locked?SRC.BATTLE_FOV:SRC.FREE_FOV;camera.fov+=(wantFov-camera.fov)*expLerp(5,dt);camera.updateProjectionMatrix();
  if(bars){const h=locked?Math.max(5,host.clientHeight*.035):0;bars.top.style.height=h+'px';bars.bottom.style.height=h+'px'}
}

function animateEnemy(dt){
  const e=state.enemy,sp=performance.now()*.005,walk=(e.state==='approach'||e.state==='strafe')?1:0,k=expLerp(12,dt);
  const sw=Math.sin(sp)*.55*walk;
  enemyParts.LL.h.rotation.x+=(sw-enemyParts.LL.h.rotation.x)*k;enemyParts.RL.h.rotation.x+=(-sw-enemyParts.RL.h.rotation.x)*k;
  let arm=0;if(e.state==='windup')arm=-1.0;if(e.state==='attack')arm=.9;if(e.state==='block')enemyParts.LA.sh.rotation.x+=(-1.1-enemyParts.LA.sh.rotation.x)*k;
  else enemyParts.LA.sh.rotation.x+=(0-enemyParts.LA.sh.rotation.x)*k;
  enemyParts.RA.sh.rotation.x+=(arm-enemyParts.RA.sh.rotation.x)*k;
}

function update(dt,I){
  if(!entered)return;
  const s=state,a=I.axis();
  if(I.pressZ())toggleTarget();
  // Holding Z with no actor target enters the source-style parallel camera state.
  if(I.z()&&!s.lock)s.parallel=Math.max(s.parallel,.08);
  if(I.pressA())startDodge(a,s.enemy.hp>0?Math.atan2(s.enemy.x-s.px,s.enemy.z-s.pz):s.yaw);
  if(I.pressB())startAttack();

  playerLogic(dt,a);enemyLogic(dt);
  const y=state.py;state.visual.lerp(new THREE.Vector3(s.px,y,s.pz),expLerp(20,dt));hero.position.copy(state.visual);hero.rotation.y=s.yaw;
  pose(dt);animateEnemy(dt);weaponHitCheck();

  const e=s.enemy;reticle.visible=s.lock&&e.hp>0;
  if(reticle.visible){reticle.position.set(e.x,terrainHeight(e.x,e.z)+1.75,e.z);reticle.rotation.z+=dt*2.2;reticle.lookAt(camera.position)}
  cameraUpdate(dt);
}
function render(){
  if(!entered)return;renderer.render(scene,camera);const s=state,e=s.enemy;
  RE.setHUD(
    `N64 · OOT-SYSTEM AUDIT BUILD\n♥ ${s.hp}   ENEMY ${e.hp>0?e.hp:'DOWN'}   Z ${s.lock?'LOCK':'FREE'}\n${s.surface.toUpperCase()}   ${s.action.toUpperCase()}`,
    '320×240 render · curved analog response · source-tuned acceleration/deceleration · A roll/hop/backflip · B sword · Z target · swept weapon collision · slope/floor + camera obstruction response'
  );
}
RE.register(3,{is3D:true,enter,exit,resize,update,render});
