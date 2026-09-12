(()=>{
'use strict';
const W=256,H=240,buf=document.createElement('canvas');buf.width=W;buf.height=H;const g=buf.getContext('2d');g.imageSmoothingEnabled=false;
const pal=['rgba(0,0,0,0)','#111','#e9c36b','#4d8b3e','#25552f','#b74735','#d98a53','#ddd7bd','#6581c1','#7e4f2d','#f2f2f2','#a66b31'];
function ds(rows,x,y,flip=false){for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<rows[yy].length;xx++){const n=parseInt(rows[yy][xx],36);if(!n)continue;g.fillStyle=pal[n]||'#fff';g.fillRect((flip?x+rows[yy].length-1-xx:x+xx)|0,(y+yy)|0,1,1)}}
const stand=[
"0000333300000000","0003333330000000","0033366660000000","0033666666000000",
"0033661616000000","0003666660000000","0000333300000000","0000222000000000",
"0003333300000000","0033333330000000","0033933339000000","0033333330000000",
"0003333300000000","0003999300000000","0003333300000000","0003333300000000",
"0003333300000000","0003333300000000","0003999300000000","0003333300000000",
"0003333300000000","0003999300000000","0009999900000000","0009999900000000",
"0009909900000000","0009909900000000","0009909900000000","0099000990000000",
"0099000990000000","0099000990000000","0000000000000000","0000000000000000"];
const walk1=stand.map((r,i)=>i===27?"0009900990000000":i===28?"0099000090000000":i===29?"0990000000000000":r);
const walk2=stand.map((r,i)=>i===27?"0099009900000000":i===28?"0009009900000000":i===29?"0000000990000000":r);
const crouch=[
"0000000000000000","0000000000000000","0000333300000000","0003333330000000",
"0033366660000000","0033661616000000","0003666660000000","0000333300000000",
"0003333300000000","0033333330000000","0033933339000000","0033333330000000",
"0003999300000000","0009999900000000","0009909900000000","0099000990000000"];
const iron=[
"0000888800000000","0008888880000000","0088877788000000","0088777778000000",
"0088711788000000","0008777780000000","0000888800000000","0008aaaa80000000",
"008aaaaaa8000000","08aa9aa9aa800000","08aaaaaaaa800000","08aaaaaaaa800000",
"008aaaaaa8000000","000aaaaaa0000000","000a99aa00000000","000aaaaaa0000000",
"000aaaaaa0000000","000aaaaaa0000000","000a99aa00000000","000aaaaaa0000000",
"000aaaaaa0000000","000a99aa00000000","0009999900000000","0009999900000000",
"0009909900000000","0009909900000000","0009909900000000","0099000990000000",
"0099000990000000","0099000990000000","0000000000000000","0000000000000000"];
let S;
const platforms=[{x:0,y:205,w:256,h:35},{x:42,y:164,w:46,h:8},{x:126,y:142,w:54,h:8},{x:198,y:176,w:40,h:8}];
function reset(){S={p:{x:24,y:173,vx:0,vy:0,face:1,on:true,crouch:false,hp:6,walk:0,inv:0},enemy:{x:188,y:173,vx:-26,hp:4,face:-1,hit:0},atk:0,scroll:0}}
function rectHit(px,py,pw,ph,r){return px<r.x+r.w&&px+pw>r.x&&py<r.y+r.h&&py+ph>r.y}
function groundResolve(p,oldY){p.on=false;let h=p.crouch?16:32;for(const r of platforms){if(p.vy>=0&&p.x+6>r.x&&p.x-6<r.x+r.w&&oldY<=r.y&&p.y+h>=r.y){p.y=r.y-h;p.vy=0;p.on=true}}}
function update(dt,I){const p=S.p,a=I.axis();S.atk=Math.max(0,S.atk-dt);S.enemy.hit=Math.max(0,S.enemy.hit-dt);p.inv=Math.max(0,p.inv-dt);
 p.crouch=a.y>.55&&p.on;let accel=p.on?520:260,target=a.x*72;if(p.crouch)target*=.35;p.vx+=Math.sign(target-p.vx)*Math.min(Math.abs(target-p.vx),accel*dt);if(Math.abs(a.x)<.08&&p.on)p.vx*=Math.pow(.0008,dt);if(Math.abs(p.vx)>.6){p.face=Math.sign(p.vx);p.walk+=dt*9}
 if(I.pressA()&&p.on&&!p.crouch){p.vy=-190;p.on=false}if(I.pressB())S.atk=.19;p.vy+=430*dt;let oldY=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;groundResolve(p,oldY);p.x=Math.max(7,p.x);
 if(p.x>245){S.scroll+=1;p.x=12;S.enemy.x=192}if(p.y>235){p.x=24;p.y=173;p.vx=p.vy=0}
 const e=S.enemy;e.x+=e.vx*dt;if(e.x<130||e.x>232){e.vx*=-1;e.face=Math.sign(e.vx)}
 if(S.atk>0){const ay=p.crouch?p.y+8:p.y+14,ax=p.x+p.face*15;if(Math.abs(e.x-ax)<13&&Math.abs((e.y+16)-ay)<18&&e.hit<=0){e.hp--;e.hit=.25;e.x+=p.face*9}}
 if(p.inv<=0&&Math.abs(e.x-p.x)<13&&Math.abs(e.y-p.y)<25){p.hp=Math.max(0,p.hp-1);p.inv=.8;p.vx=-Math.sign(e.x-p.x)*95;p.vy=-80}
}
function brick(x,y,w,h,c1='#7d3d33',c2='#c2694b'){g.fillStyle=c1;g.fillRect(x,y,w,h);g.fillStyle=c2;for(let yy=y;yy<y+h;yy+=8){for(let xx=x+((yy/8)%2?8:0);xx<x+w;xx+=16){g.fillRect(xx,yy,14,2);g.fillRect(xx,yy+2,2,5)}}}
function render(){g.fillStyle='#101018';g.fillRect(0,0,W,H);g.fillStyle='#15152d';g.fillRect(0,36,W,169);
 g.fillStyle='#46244f';for(let x=0;x<W;x+=32){g.fillRect(x,42,28,10);g.fillStyle='#7f4b8f';g.fillRect(x+2,44,24,3);g.fillStyle='#46244f'}
 for(const r of platforms){brick(r.x,r.y,r.w,r.h)}
 for(let x=12;x<256;x+=52){g.fillStyle='#512c2d';g.fillRect(x,60,8,145);g.fillStyle='#a95f49';g.fillRect(x+2,60,2,145)}
 const p=S.p;let rows=p.crouch?crouch:(p.on?(Math.floor(p.walk)%2?walk1:walk2):stand);if(!(p.inv&&((performance.now()/70)|0)%2))ds(rows,(p.x-8)|0,(p.y)|0,p.face<0);
 const e=S.enemy;if(!(e.hit&&((performance.now()/50)|0)%2))ds(iron,(e.x-8)|0,(e.y)|0,e.face<0);
 if(S.atk>0){g.fillStyle='#eee6b7';const yy=p.crouch?p.y+9:p.y+15;if(p.face>0){g.fillRect(p.x+5,yy,20,2);g.fillRect(p.x+23,yy-1,3,4)}else{g.fillRect(p.x-25,yy,20,2);g.fillRect(p.x-26,yy-1,3,4)}}
 g.fillStyle='#050505';g.fillRect(0,0,256,34);g.fillStyle='#f4f4f4';g.font='8px monospace';g.fillText('MAGIC',22,9);g.fillText('LIFE',86,9);g.fillText('NEXT',170,9);for(let i=0;i<8;i++){g.fillStyle=i<5?'#5b63ce':'#2a2a52';g.fillRect(18+i*8,15,6,7);g.fillStyle=i<S.p.hp?'#d34339':'#4a2020';g.fillRect(82+i*8,15,6,7)}g.fillStyle='#fff';g.fillText(String(120+S.scroll*18).padStart(4,'0')+'/0200',172,21);
 RE.present(buf);RE.setHUD('NES II · 256×240 · 16×32 actor','Acceleration/friction · gravity/jump arc · crouch stab · air control · side-view contact knockback');
}
RE.register(1,{enter:reset,update,render});
})();