(()=>{
'use strict';
const W=256,H=240,buf=document.createElement('canvas');buf.width=W;buf.height=H;const g=buf.getContext('2d');g.imageSmoothingEnabled=false;
const P=['rgba(0,0,0,0)','#151515','#f2d36b','#4f8a3b','#245a35','#a44334','#df8b53','#d8d4b2','#5871b5','#7d4e2f','#e8e8e8'];
function spr(rows,pal=P){return{rows,pal}}
function ds(s,x,y,flip=false){for(let yy=0;yy<s.rows.length;yy++){const row=s.rows[yy];for(let xx=0;xx<row.length;xx++){let n=parseInt(row[xx],36);if(!n)continue;g.fillStyle=s.pal[n]||'#fff';g.fillRect((flip?x+row.length-1-xx:x+xx)|0,(y+yy)|0,1,1)}}}
const heroFront=[
"0002222200000000","0022222220000000","0026666620000000","0266666662000000",
"0266161662000000","0026666620000000","0002332000000000","0033333300000000",
"0333333330000000","0393339330000000","0333333330000000","0033333300000000",
"0039003900000000","0099000990000000","0099000990000000","0000000000000000"];
const heroBack=[
"0003333300000000","0033333330000000","0333333333000000","0333333333000000",
"0333333333000000","0033333330000000","0002992000000000","0033333300000000",
"0333333330000000","0393339330000000","0333333330000000","0033333300000000",
"0039003900000000","0099000990000000","0099000990000000","0000000000000000"];
const heroSide1=[
"0003330000000000","0033333000000000","0033322200000000","0333266620000000",
"0332666120000000","0032666200000000","0002332000000000","0033333300000000",
"0333333990000000","0333333990000000","0033333300000000","0033333300000000",
"0039003900000000","0099000990000000","0009900990000000","0000000000000000"];
const heroSide2=heroSide1.map((r,i)=>i===13?"0009900990000000":i===14?"0099000990000000":r);
const blob=[
"0000055500000000","0005555550000000","0055555555000000","0555555555500000",
"0556565655500000","5555555555550000","5555555555550000","5555555555550000",
"5555555555550000","0555555555500000","0055555555000000","0005555550000000",
"0000555500000000","0005000500000000","0050000050000000","0000000000000000"];
const knight=[
"0000088000000000","0000888800000000","0008877880000000","0088777788000000",
"0088711788000000","0008777800000000","0000880000000000","0008888800000000",
"0088888880000000","0888988888000000","0888888888000000","0088888880000000",
"0088008800000000","0880000880000000","0880000880000000","0000000000000000"];
function grassTile(x,y){g.fillStyle='#6aa84f';g.fillRect(x,y,16,16);g.fillStyle='#4b7e3d';for(const [a,b] of [[2,3],[11,2],[6,9],[14,12],[3,14]]){g.fillRect(x+a,y+b,1,2);g.fillRect(x+a-1,y+b+1,3,1)}}
function rockTile(x,y){g.fillStyle='#617a43';g.fillRect(x,y,16,16);g.fillStyle='#9b9b78';g.fillRect(x+2,y+5,12,8);g.fillStyle='#c8c8a0';g.fillRect(x+4,y+4,8,2);g.fillStyle='#575744';g.fillRect(x+3,y+12,10,2)}
function bushTile(x,y){g.fillStyle='#6aa84f';g.fillRect(x,y,16,16);g.fillStyle='#173e2a';g.fillRect(x+2,y+5,12,8);g.fillStyle='#2d6b37';g.fillRect(x+1,y+3,6,7);g.fillRect(x+6,y+1,7,9);g.fillRect(x+10,y+5,5,7);g.fillStyle='#73a84f';g.fillRect(x+4,y+4,2,2);g.fillRect(x+9,y+3,2,2);g.fillRect(x+7,y+9,2,2);g.fillStyle='#142c1e';g.fillRect(x+3,y+12,10,2)}
function waterTile(x,y,t){g.fillStyle='#2f5c9e';g.fillRect(x,y,16,16);g.fillStyle='#85a5d7';let o=(t>>3)&3;g.fillRect(x+1+o,y+4,7,1);g.fillRect(x+8-o,y+10,7,1)}
let S;
function reset(){S={p:{x:120,y:144,dir:3,walk:0,hp:6,inv:0},atk:0,roomX:0,roomY:0,transition:0,invul:0,enemies:[{x:72,y:100,type:0,vx:22,vy:0},{x:178,y:122,type:1,vx:0,vy:18},{x:196,y:184,type:0,vx:-20,vy:0}],shots:[]}}
function solid(x,y){if(y<64||x<16||x>239||y>223)return true;const tx=(x/16)|0,ty=(y/16)|0;if((tx===3&&ty===6)||(tx===11&&ty===8)||(tx===7&&ty===11))return true;return false}
function hitSword(e){if(S.atk<=0)return false;const p=S.p;let ax=p.x,ay=p.y;if(p.dir===0)ax+=15;if(p.dir===2)ax-=15;if(p.dir===1)ay+=15;if(p.dir===3)ay-=15;return Math.abs(e.x-ax)<13&&Math.abs(e.y-ay)<13}
function update(dt,I){const p=S.p;S.invul=Math.max(0,S.invul-dt);S.atk=Math.max(0,S.atk-dt);let a=I.axis(),dx=0,dy=0,spd=62;if(Math.abs(a.x)>Math.abs(a.y)&&Math.abs(a.x)>.14){dx=Math.sign(a.x)*spd;p.dir=dx>0?0:2}else if(Math.abs(a.y)>.14){dy=Math.sign(a.y)*spd;p.dir=dy>0?1:3}if(dx||dy){p.walk+=dt*8;let nx=p.x+dx*dt,ny=p.y+dy*dt;if(!solid(nx,ny)) {p.x=nx;p.y=ny}}if(I.pressA())S.atk=.18;
 for(const e of S.enemies){e.x+=e.vx*dt;e.y+=e.vy*dt;if(solid(e.x,e.y)){e.x-=e.vx*dt;e.y-=e.vy*dt;e.vx*=-1;e.vy*=-1}if(hitSword(e)){e.x+=Math.sign(e.x-p.x)*12;e.y+=Math.sign(e.y-p.y)*12;e.hit=.13}e.hit=Math.max(0,(e.hit||0)-dt);if(S.invul<=0&&Math.abs(e.x-p.x)<11&&Math.abs(e.y-p.y)<11){p.hp=Math.max(0,p.hp-1);S.invul=.85;p.x-=Math.sign(e.x-p.x)*9;p.y-=Math.sign(e.y-p.y)*9}}
 if(p.x<18){p.x=236;S.roomX--;S.transition=.12}if(p.x>238){p.x=20;S.roomX++;S.transition=.12}if(p.y<66){p.y=216;S.roomY--;S.transition=.12}if(p.y>222){p.y=68;S.roomY++;S.transition=.12}
 S.transition=Math.max(0,S.transition-dt);
}
function hud(){g.fillStyle='#050505';g.fillRect(0,0,256,48);g.fillStyle='#eee';g.font='8px monospace';g.fillText('EMBERWOOD',8,10);g.fillStyle='#b5b5b5';g.fillRect(8,17,64,22);g.fillStyle='#1d1d1d';g.fillRect(11,20,58,16);g.fillStyle='#6fa342';g.fillRect(38+(S.roomX%5)*4,27+(S.roomY%3)*3,3,3);g.fillStyle='#fff';g.fillText('B',97,12);g.fillText('A',130,12);g.strokeStyle='#4261a8';g.strokeRect(90,15,22,24);g.strokeRect(122,15,22,24);g.fillStyle='#d9c166';g.fillRect(131,21,3,13);g.fillStyle='#d94c43';g.fillText('LIFE',166,12);for(let i=0;i<6;i++){g.fillStyle=i<S.p.hp?'#d6423b':'#4b1d1d';g.fillRect(164+i*13,21,5,5);g.fillRect(170+i*13,21,5,5);g.fillRect(167+i*13,26,5,5)}}
function render(){g.fillStyle='#6aa84f';g.fillRect(0,48,256,192);for(let y=48;y<240;y+=16)for(let x=0;x<256;x+=16)grassTile(x,y);
 for(let x=0;x<256;x+=16){bushTile(x,48);bushTile(x,224)}for(let y=64;y<224;y+=16){bushTile(0,y);bushTile(240,y)}
 for(const [tx,ty] of [[3,6],[11,8],[7,11]])rockTile(tx*16,ty*16);for(let x=80;x<144;x+=16)waterTile(x,80,(performance.now()/40)|0);
 for(const e of S.enemies){if(e.hit&&((performance.now()/50)|0)%2)continue;ds(spr(e.type?knight:blob),e.x-8,e.y-8)}
 const p=S.p;if(!(S.invul&&((performance.now()/65)|0)%2)){let rows=p.dir===1?heroFront:p.dir===3?heroBack:(Math.floor(p.walk)%2?heroSide2:heroSide1);ds(spr(rows),p.x-8,p.y-8,p.dir===2)}
 if(S.atk>0){g.fillStyle='#eee7b0';if(p.dir===0)g.fillRect(p.x+7,p.y-2,14,3);if(p.dir===2)g.fillRect(p.x-21,p.y-2,14,3);if(p.dir===1)g.fillRect(p.x-1,p.y+7,3,14);if(p.dir===3)g.fillRect(p.x-1,p.y-21,3,14)}
 hud();if(S.transition>0){g.fillStyle=`rgba(0,0,0,${S.transition/.12*.35})`;g.fillRect(0,48,256,192)}
 RE.present(buf);RE.setHUD('NES I · 256×240 · 16×16 sprites','4-direction room movement · tile collision · sword thrust · enemy knockback · screen transitions');
}
RE.register(0,{enter:reset,update,render});
})();