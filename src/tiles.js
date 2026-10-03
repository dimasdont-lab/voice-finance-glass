/* ===== 7. Скляні віджети: окремий WebGL-шар під текстом. Малює фон із сіткою й плитки з заломленням сітки ===== */
var TGC=document.getElementById('glt'),tgl=null,TGU={},TL=[],tlStale=[],tgSig='',tgW=0,tgH=0,tgS=0,tgOK=false,tgShown=false,TMAX=24;
var tgR=new Float32Array(TMAX*4),tgQ=new Float32Array(TMAX),tgHt=new Float32Array(TMAX);
var TILE_R={tile:28,tick:23,srch:24};
var TFS=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_res;uniform vec2 u_vp;uniform float u_s;uniform float u_n;uniform float u_br;uniform vec4 u_r[24];uniform float u_q[24];uniform float u_h[24];',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
GLSL_BG,
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);vec2 p=px/u_s;',
' float dm=1e5;vec4 R=vec4(0.);float Q=1.;float H=0.;',
' for(int i=0;i<24;i++){if(float(i)>=u_n)break;float d=sdRB(px-u_r[i].xy,u_r[i].zw,u_q[i]);if(d<dm){dm=d;R=u_r[i];Q=u_q[i];H=u_h[i];}}',
' vec3 base=gradBg(p);float sw=26.*u_s;',
' if(dm>sw){gl_FragColor=vec4(base,1.);return;}',
' float sh=dm>0.?1.-clamp(dm/sw,0.,1.):0.;vec3 oc=base*(1.-.30*sh*sh);',
' if(dm>1.5*u_s){gl_FragColor=vec4(oc,1.);return;}',
' float m=36.*u_s;float t=clamp(-dm/(.6*m),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-R.xy,R.zw,Q)-sdRB(px-vec2(e,0.)-R.xy,R.zw,Q),sdRB(px+vec2(0.,e)-R.xy,R.zw,Q)-sdRB(px-vec2(0.,e)-R.xy,R.zw,Q))+1e-5);',
' vec2 of=n*pow(1.-t,2.2)*.6*m;float ab=.07*(.35+pow(1.-t,1.5));',
' vec3 ci=vec3(gradBg((px-of*(1.+ab))/u_s).r,gradBg((px-of)/u_s).g,gradBg((px-of*(1.-ab))/u_s).b);',
' ci=ci*.88+vec3(.045)+H*vec3(.17,.04,.055);',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);',
' ci+=vec3(rim*(.02+.09*sp));ci*=u_br;',
' float w=clamp(-dm/(1.5*u_s)+.5,0.,1.);gl_FragColor=vec4(mix(oc,ci,w),1.);}'].join('\n');
(function(){
 try{tgl=TGC.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});}catch(e){}
 if(!tgl)return;
 function cs(t,q){var o=tgl.createShader(t);tgl.shaderSource(o,q);tgl.compileShader(o);if(!tgl.getShaderParameter(o,tgl.COMPILE_STATUS)){console.error(tgl.getShaderInfoLog(o));return null;}return o;}
 var v=cs(tgl.VERTEX_SHADER,VS),f=cs(tgl.FRAGMENT_SHADER,TFS);if(!v||!f)return;
 var p=tgl.createProgram();tgl.attachShader(p,v);tgl.attachShader(p,f);tgl.bindAttribLocation(p,0,'p');tgl.linkProgram(p);
 if(!tgl.getProgramParameter(p,tgl.LINK_STATUS)){console.error(tgl.getProgramInfoLog(p));return;}
 tgl.useProgram(p);
 var b=tgl.createBuffer();tgl.bindBuffer(tgl.ARRAY_BUFFER,b);tgl.bufferData(tgl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),tgl.STATIC_DRAW);
 tgl.enableVertexAttribArray(0);tgl.vertexAttribPointer(0,2,tgl.FLOAT,false,0,0);
 ['u_res','u_vp','u_s','u_n','u_br','u_r','u_q','u_h'].forEach(function(n){TGU[n]=tgl.getUniformLocation(p,n);});
 tgOK=true;
})();
function tileRadius(el){for(var k in TILE_R)if(el.classList.contains(k))return TILE_R[k];return 0;}
function tlMeasure(i){
 var ch=inn[i].children,list=[];
 for(var k=0;k<ch.length;k++){var el=ch[k],r=tileRadius(el);if(!r)continue;
  list.push({l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight,r:r,hot:el.classList.contains('hot')?1:0});}
 TL[i]=list;tlStale[i]=0;
}
function tlAllStale(){for(var i=0;i<NP;i++)tlStale[i]=1;}
window.addEventListener('resize',tlAllStale);
setTimeout(tlAllStale,1200);setTimeout(tlAllStale,3500);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(tlAllStale);
function drawTiles(){
 if(!VW||!VH)return;
 var rp=rec.pg,v=rp.v>.003?rp.v:0,k=v?kOf(v):1,n=0,sig=[ca.toFixed(3),VW,VH,S,v.toFixed(3),rp.ox.toFixed(1),rp.oy.toFixed(1),rp.tx.toFixed(1),rp.ty.toFixed(1)],i,j;
 for(i=0;i<NP&&n<TMAX;i++){
  var o=i-ca;if(Math.abs(o)>=1)continue;
  if(tlStale[i]||!TL[i])tlMeasure(i);
  var yy=sy[i];sig.push(i,yy.toFixed(2));
  var list=TL[i];
  for(j=0;j<list.length&&n<TMAX;j++){
   var t=list[j],cx=t.l+t.w/2+o*VW,cy=t.t+t.h/2-yy,hw=t.w/2,hh=t.h/2,rr=t.r;
   if(v){cx=rp.ox+rp.tx*v+k*(cx-rp.ox);cy=rp.oy+rp.ty*v+k*(cy-rp.oy);hw*=k;hh*=k;rr*=k;}
   if(cx+hw<-40||cx-hw>VW+40||cy+hh<-40||cy-hh>VH+40)continue;
   tgR[n*4]=cx*S;tgR[n*4+1]=cy*S;tgR[n*4+2]=hw*S;tgR[n*4+3]=hh*S;tgQ[n]=Math.min(rr*S,hw*S,hh*S);tgHt[n]=t.hot;n++;
   sig.push(cx.toFixed(1),cy.toFixed(1),hw.toFixed(1),hh.toFixed(1));
  }
 }
 var key=sig.join(',');
 if(key===tgSig&&tgW)return;
 tgSig=key;
 var W=Math.round(VW*S),H=Math.round(VH*S);
 if(W!==tgW||H!==tgH||S!==tgS){tgW=W;tgH=H;tgS=S;TGC.width=W;TGC.height=H;tgl.viewport(0,0,W,H);}
 tgl.uniform2f(TGU.u_res,W,H);tgl.uniform2f(TGU.u_vp,VW,VH);tgl.uniform1f(TGU.u_s,S);tgl.uniform1f(TGU.u_n,n);tgl.uniform1f(TGU.u_br,1-RD*v);
 tgl.uniform4fv(TGU.u_r,tgR);tgl.uniform1fv(TGU.u_q,tgQ);tgl.uniform1fv(TGU.u_h,tgHt);
 tgl.drawArrays(tgl.TRIANGLE_STRIP,0,4);
 if(!tgShown){tgShown=true;TGC.style.display='block';document.documentElement.classList.add('gt');}
}
