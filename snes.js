(()=>{
'use strict';
const W=256,H=224,buf=document.createElement('canvas');buf.width=W;buf.height=H;const g=buf.getContext('2d');g.imageSmoothingEnabled=false;
let S;
const trees=[{x:34,y:78},{x:61,y:70},{x:208,y:67},{x:228,y:88},{x:34,y:177},{x:218,y:176},{x:190,y:194}];
const pots=[{x:115,y:121,alive:true},{x:137,y:120,alive:true}];
function reset(){S={p:{x:127,y:148,vx:0,vy:0,dir:1,hp:8,step:0,inv:0},atk:0,charge:0,spin:0,en:[{x:78,y:119,vx:25,vy:15,t:0,hp:3},{x:186,y:132,vx:-18,vy:22,t:1,hp:3}],waterT:0}}
const clamp=RE.util.clamp;
function solid(x,y){if(x<10||x>246||y<42||y>215)return true;for(const t of trees)if(Math.hypot(x-t.x,y-(t.y+10))<13)return true;if(x>8&&x<70&&y>100&&y<142)return true;return false}
function moveEntity(p,dx,dy){let nx=p.x+dx,ny=p.y;if(!solid(nx,ny))p.x=nx;nx=p.x;ny=p.y+dy;if(!solid(nx,ny))p.y=ny}
function swordTip(p,r=19){const dirs=[[1,0],[0,1],[-1,0],[0,-1]];let d=dirs[p.dir];return{x:p.x+d[0]*r,y:p.y+d[1]*r}}
function update(dt,I){let p=S.p,a=I.axis();S.waterT+=dt;S.atk=Math.max(0,S.atk-dt);S.spin=Math.max(0,S.spin-dt);p.inv=Math.max(0,p.inv-dt);
 const accel=500,fric=Math.pow(.001,dt);let tx=a.x*82,ty=a.y*82;p.vx+=(tx-p.vx)*Math.min(1,accel*dt/Math.max(1,Math.abs(tx-p.vx)));p.vy+=(ty-p.vy)*Math.min(1,accel*dt/Math.max(1,Math.abs(ty-p.vy)));if(Math.abs(a.x)<.05)p.vx*=fric;if(Math.abs(a.y)<.05)p.vy*=fric;
 if(a.m>.12){const ang=Math.atan2(a.y,a.x);let q=Math.round(ang/(Math.PI/2));p.dir=((q+4)%4);p.step+=dt*a.m*7}
 moveEntity(p,p.vx*dt,p.vy*dt);
 if(I.a()){S.charge=Math.min(1.2,S.charge+dt);if(I.pressA())S.atk=.18}else if(S.charge>0){if(S.charge>.55)S.spin=.48;else S.atk=.18;S.charge=0}
 if(I.pressB()){const near=pots.find(q=>q.alive&&Math.hypot(q.x-p.x,q.y-p.y)<18);if(near)near.alive=false}
 for(const e of S.en){e.x+=e.vx*dt;e.y+=e.vy*dt;if(solid(e.x,e.y)){e.vx*=-1;e.vy*=-1;e.x+=e.vx*dt*2;e.y+=e.vy*dt*2}e.hit=Math.max(0,(e.hit||0)-dt);
   let hit=false;if(S.spin>0&&Math.hypot(e.x-p.x,e.y-p.y)<27)hit=true;else if(S.atk>0){let t=swordTip(p);hit=Math.hypot(e.x-t.x,e.y-t.y)<14}
   if(hit&&e.hit<=0){e.hp--;e.hit=.24;let d=Math.hypot(e.x-p.x,e.y-p.y)||1;e.x+=(e.x-p.x)/d*12;e.y+=(e.y-p.y)/d*12}
   if(p.inv<=0&&Math.hypot(e.x-p.x,e.y-p.y)<13){p.hp=Math.max(0,p.hp-1);p.inv=.8;let d=Math.hypot(e.x-p.x,e.y-p.y)||1;moveEntity(p,(p.x-e.x)/d*12,(p.y-e.y)/d*12)}
 }
 S.en=S.en.filter(e=>e.hp>0);
}
function grassTile(x,y,v=0){g.fillStyle=v?'#699b4b':'#75a64f';g.fillRect(x,y,16,16);g.fillStyle='#4c7d39';for(const [a,b] of [[2,3],[10,4],[6,11],[14,8]]){g.fillRect(x+a,y+b,1,3);g.fillRect(x+a-1,y+b+2,3,1)}g.fillStyle='#91bd64';g.fillRect(x+4,y+6,1,1);g.fillRect(x+12,y+13,1,1)}
function pathTile(x,y){g.fillStyle='#c2a66a';g.fillRect(x,y,16,16);g.fillStyle='#aa8c57';g.fillRect(x+2,y+4,2,1);g.fillRect(x+9,y+11,3,1);g.fillStyle='#d2bb7e';g.fillRect(x+6,y+2,2,1)}
function waterTile(x,y,t){g.fillStyle='#3a7f91';g.fillRect(x,y,16,16);g.fillStyle='#69aabc';let o=(t>>2)&3;g.fillRect(x+o,y+4,7,1);g.fillRect(x+9-o,y+11,6,1);g.fillStyle='#2e6777';g.fillRect(x+2,y+15,12,1)}
function tree(x,y){g.fillStyle='#30351f';g.fillRect(x-10,y+10,20,5);g.fillStyle='#6d4a2c';g.fillRect(x-4,y+2,8,17);g.fillStyle='#8a6236';g.fillRect(x-2,y+3,3,15);g.fillStyle='#1f572f';g.fillRect(x-15,y-15,30,24);g.fillStyle='#2f7139';g.fillRect(x-12,y-20,24,25);g.fillStyle='#488744';g.fillRect(x-8,y-22,16,24);g.fillStyle='#70a552';g.fillRect(x-5,y-18,5,5);g.fillRect(x+4,y-9,4,4);g.fillStyle='#173f27';g.fillRect(x-12,y+2,24,5)}
function pot(x,y){g.fillStyle='#583921';g.fillRect(x-5,y+4,10,5);g.fillStyle='#a86737';g.fillRect(x-6,y-4,12,10);g.fillStyle='#d28f4b';g.fillRect(x-4,y-3,8,4);g.fillStyle='#6d421f';g.fillRect(x-7,y-6,14,3);g.fillStyle='#e1ad6c';g.fillRect(x-4,y-5,4,1)}
function hero(x,y,dir,frame,flash=false){if(flash)return;g.fillStyle='#274525';g.fillRect(x-7,y+7,14,3);const bob=frame?0:1; // boots
 g.fillStyle='#59391f';g.fillRect(x-6,y+3+bob,5,8);g.fillRect(x+1,y+3-bob,5,8);g.fillStyle='#8a5c30';g.fillRect(x-7,y+3+bob,6,3);g.fillRect(x+1,y+3-bob,6,3);
 // tunic and belt
 g.fillStyle='#326c3b';g.fillRect(x-7,y-9,14,14);g.fillStyle='#4b8a49';g.fillRect(x-5,y-9,10,10);g.fillStyle='#d6c56c';g.fillRect(x-7,y,14,2);g.fillStyle='#774727';g.fillRect(x-2,y,4,2);
 // head, hair, hood/cap
 g.fillStyle='#d79a54';g.fillRect(x-6,y-18,12,7);g.fillStyle='#f0c184';g.fillRect(x-5,y-17,10,8);g.fillStyle='#7b4b28';g.fillRect(x-6,y-19,11,4);g.fillRect(x+3,y-17,4,6);g.fillStyle='#3c743f';g.fillRect(x-7,y-21,12,4);g.fillRect(x-5,y-24,10,4);g.fillRect(x+4,y-22,6,3);g.fillStyle='#23542f';g.fillRect(x+7,y-21,5,2);
 // eyes / directional face cue
 g.fillStyle='#1e2520';if(dir===0){g.fillRect(x-3,y-14,2,2);g.fillRect(x+3,y-14,2,2)}else if(dir===3)g.fillRect(x+4,y-14,2,2);else if(dir===1)g.fillRect(x-4,y-14,2,2);
 // shield
 g.fillStyle='#56371f';if(dir!==2){let sx=dir===3?x-9:x+6;g.fillRect(sx,y-7,6,10);g.fillStyle='#c9aa56';g.fillRect(sx+1,y-5,4,6);g.fillStyle='#3c743f';g.fillRect(sx+2,y-4,2,4)}
}
function enemy(e){if(e.hit&&((performance.now()/45)|0)%2)return;if(e.t===0){g.fillStyle='#4b2838';g.fillRect(e.x-8,e.y-6,16,11);g.fillStyle='#7a3d54';g.fillRect(e.x-6,e.y-9,12,9);g.fillStyle='#d2b36b';g.fillRect(e.x-4,e.y-10,3,3);g.fillRect(e.x+1,e.y-10,3,3);g.fillStyle='#221b21';g.fillRect(e.x-4,e.y-4,2,2);g.fillRect(e.x+3,e.y-4,2,2);g.fillStyle='#3a2430';g.fillRect(e.x-7,e.y+5,5,4);g.fillRect(e.x+2,e.y+5,5,4)}else{g.fillStyle='#2c476d';g.fillRect(e.x-7,e.y-7,14,14);g.fillStyle='#5079a7';g.fillRect(e.x-5,e.y-10,10,12);g.fillStyle='#b8d1dc';g.fillRect(e.x-2,e.y-7,4,4);g.fillStyle='#20354d';g.fillRect(e.x-8,e.y,4,4);g.fillRect(e.x+4,e.y,4,4)}}
function hud(){g.fillStyle='#d4c59e';g.fillRect(0,0,256,26);g.fillStyle='#5a4d36';g.fillRect(0,24,256,2);g.fillStyle='#192619';g.font='7px monospace';g.fillText('EMBER  053',35,9);g.fillText('B',9,9);g.fillText('A',18,9);g.fillText('LIFE',179,8);for(let i=0;i<8;i++){g.fillStyle=i<S.p.hp?'#cf4138':'#76524e';let x=180+i*9,y=14;g.fillRect(x,y,3,3);g.fillRect(x+4,y,3,3);g.fillRect(x+2,y+3,3,3)}g.fillStyle='#2d6f3b';g.fillRect(8,12,9,9);g.fillStyle='#d7c66b';g.fillRect(11,14,3,5)}
function render(){for(let y=26;y<224;y+=16)for(let x=0;x<256;x+=16)grassTile(x,y,((x+y)>>4)&1);for(let y=26;y<224;y+=16)pathTile(112,y);
 for(let y=96;y<144;y+=16)for(let x=0;x<80;x+=16)waterTile(x,y,(S.waterT*12)|0);
 // bridge
 g.fillStyle='#8e6538';g.fillRect(64,106,48,22);g.fillStyle='#c08a4e';for(let x=65;x<111;x+=7)g.fillRect(x,107,5,20);g.fillStyle='#624329';g.fillRect(64,105,48,3);g.fillRect(64,127,48,3);
 trees.forEach(t=>tree(t.x,t.y));pots.forEach(p=>{if(p.alive)pot(p.x,p.y)});S.en.forEach(enemy);
 const p=S.p;hero(p.x|0,p.y|0,p.dir,Math.floor(p.step)&1,p.inv&&((performance.now()/60)|0)%2);
 if(S.atk>0||S.spin>0){g.strokeStyle='#f7f0c7';g.lineWidth=2;g.beginPath();if(S.spin>0)g.arc(p.x,p.y-5,20,0,Math.PI*2);else{const d=[[0,1],[-1,0],[0,-1],[1,0]][p.dir];g.moveTo(p.x+d[0]*6,p.y-4+d[1]*6);g.lineTo(p.x+d[0]*23,p.y-4+d[1]*23)}g.stroke()}
 if(S.charge>.15){g.strokeStyle='#e4cf67';g.beginPath();g.arc(p.x,p.y-5,13+(S.charge*2|0),0,Math.PI*2);g.stroke()}
 hud();RE.present(buf);RE.setHUD('SNES · 256×224 · layered 16-bit field','8-direction analog movement · acceleration/friction · sword charge & spin · animated water · trees/pots/water collision');
}
RE.register(2,{enter:reset,update,render});
})();