(()=>{
'use strict';
const canvas=document.getElementById('game2d'),ctx=canvas.getContext('2d',{alpha:false});
const threeHost=document.getElementById('threeHost'),hud=document.getElementById('hud'),caption=document.getElementById('caption');
const stage=document.getElementById('stage');
const keys=new Set(), touch={x:0,y:0,a:false,b:false}, edge={a:false,b:false};
let prevA=false,prevB=false, modeIndex=0,current=null,last=performance.now(),CW=640,CH=400,DPR=Math.min(2,devicePixelRatio||1);
const modes=[];
function resize(){
  const r=stage.getBoundingClientRect(); CW=Math.max(320,r.width); CH=Math.max(220,r.height);
  canvas.width=Math.floor(CW*DPR);canvas.height=Math.floor(CH*DPR);
  canvas.style.width=CW+'px';canvas.style.height=CH+'px';ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false;
  if(current&&current.resize)current.resize(CW,CH,DPR);
}
addEventListener('resize',resize);resize();
const input={
 axis(){
   let x=touch.x,y=touch.y;
   x+=(keys.has('ArrowRight')||keys.has('KeyD'))?1:0;x-=(keys.has('ArrowLeft')||keys.has('KeyA'))?1:0;
   y+=(keys.has('ArrowDown')||keys.has('KeyS'))?1:0;y-=(keys.has('ArrowUp')||keys.has('KeyW'))?1:0;
   const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}return{x,y,m:Math.min(1,m)};
 },
 a(){return touch.a||keys.has('Space')||keys.has('Enter')},
 b(){return touch.b||keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('KeyB')},
 pressA(){if(edge.a){edge.a=false;return true}return false},
 pressB(){if(edge.b){edge.b=false;return true}return false}
};
function updateEdges(){const a=input.a(),b=input.b();if(a&&!prevA)edge.a=true;if(b&&!prevB)edge.b=true;prevA=a;prevB=b}
addEventListener('keydown',e=>{keys.add(e.code);if(/^Digit[1-4]$/.test(e.code))setMode(+e.code.at(-1)-1);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});
addEventListener('keyup',e=>keys.delete(e.code));
const pad=document.getElementById('pad'),knob=document.getElementById('knob');let pid=null;
function joy(e){const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,R=r.width*.33,m=Math.hypot(dx,dy);if(m>R){dx*=R/m;dy*=R/m}touch.x=dx/R;touch.y=dy/R;knob.style.transform=`translate(${dx}px,${dy}px)`}
pad.addEventListener('pointerdown',e=>{pid=e.pointerId;pad.setPointerCapture(pid);joy(e)});
pad.addEventListener('pointermove',e=>{if(e.pointerId===pid)joy(e)});
function joyEnd(e){if(e.pointerId!==pid)return;pid=null;touch.x=touch.y=0;knob.style.transform=''}
pad.addEventListener('pointerup',joyEnd);pad.addEventListener('pointercancel',joyEnd);
for(const [id,k] of [['aBtn','a'],['bBtn','b']]){const el=document.getElementById(id);el.addEventListener('pointerdown',e=>{touch[k]=true;el.setPointerCapture(e.pointerId);e.preventDefault()});el.addEventListener('pointerup',()=>touch[k]=false);el.addEventListener('pointercancel',()=>touch[k]=false)}
document.querySelectorAll('.mode').forEach((b,i)=>b.addEventListener('click',()=>setMode(i)));
function register(i,m){modes[i]=m;if(i===0&&!current)setMode(0)}
function setMode(i){
 if(!modes[i])return; if(current&&current.exit)current.exit();
 modeIndex=i;current=modes[i];edge.a=edge.b=false;prevA=input.a();prevB=input.b();
 document.querySelectorAll('.mode').forEach((b,n)=>b.classList.toggle('active',n===i));
 const is3=!!current.is3D;canvas.style.display=is3?'none':'block';threeHost.style.display=is3?'block':'none';
 if(current.enter)current.enter();resize();
}
function present(buf){
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,CW,CH);ctx.imageSmoothingEnabled=false;
 const scale=Math.min(CW/buf.width,CH/buf.height),dw=Math.floor(buf.width*scale),dh=Math.floor(buf.height*scale),dx=Math.floor((CW-dw)/2),dy=Math.floor((CH-dh)/2);
 ctx.drawImage(buf,0,0,buf.width,buf.height,dx,dy,dw,dh);
}
function setHUD(a,b=''){hud.textContent=a;caption.textContent=b}
function loop(now){
 const dt=Math.min(.034,(now-last)/1000);last=now;updateEdges();
 if(current){current.update?.(dt,input);current.render?.();}requestAnimationFrame(loop)
}
window.RE={register,setMode,input,present,setHUD,threeHost,stage,util:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t}};
requestAnimationFrame(loop);
})();