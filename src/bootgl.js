/* ===== Заставка на WebGL: логотип намальований кодом (долар і графіки на тлі), скляна куля — наш шейдер скла, реалістичні тріщини
   (полярна діаграма Вороного + дрібні тріщини), світло з тріщин і промені-годреї з пилинками, частинки з шлейфом.
   Працює поверх старого 2D-варіанта: якщо WebGL недоступний, лишається 2D-заставка. ===== */
function bfxIcon(){
 if(!BFX_IM.complete||!BFX_IM.naturalWidth)return null;
 var cv0=document.createElement('canvas');cv0.width=cv0.height=512;var x0=cv0.getContext('2d'),rc0=512*.224;x0.beginPath();x0.moveTo(rc0,0);x0.arcTo(512,0,512,512,rc0);x0.arcTo(512,512,0,512,rc0);x0.arcTo(0,512,0,0,rc0);x0.arcTo(0,0,512,0,rc0);x0.closePath();x0.clip();x0.drawImage(BFX_IM,0,0,512,512);return cv0;
}
function bfxIconCode(){
 var s=512,cv=document.createElement('canvas');cv.width=cv.height=s;var x=cv.getContext('2d'),rc=s*.224,i;
 x.beginPath();x.moveTo(rc,0);x.arcTo(s,0,s,s,rc);x.arcTo(s,s,0,s,rc);x.arcTo(0,s,0,0,rc);x.arcTo(0,0,s,0,rc);x.closePath();x.clip();
 var g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,'#2b060b');g.addColorStop(.47,'#0d0508');g.addColorStop(.53,'#04100a');g.addColorStop(1,'#042412');x.fillStyle=g;x.fillRect(0,0,s,s);
 var r1=x.createRadialGradient(s*.5,s*.02,0,s*.5,s*.02,s*.6);r1.addColorStop(0,'rgba(255,40,50,.5)');r1.addColorStop(1,'rgba(255,40,50,0)');x.fillStyle=r1;x.fillRect(0,0,s,s);
 var r2=x.createRadialGradient(s*.5,s*.98,0,s*.5,s*.98,s*.6);r2.addColorStop(0,'rgba(40,255,110,.55)');r2.addColorStop(1,'rgba(40,255,110,0)');x.fillStyle=r2;x.fillRect(0,0,s,s);
 x.lineWidth=1;for(i=1;i<16;i++){x.strokeStyle=i<8?'rgba(255,70,80,.10)':'rgba(70,255,140,.10)';x.beginPath();x.moveTo(i*s/16,0);x.lineTo(i*s/16,s);x.stroke();x.beginPath();x.moveTo(0,i*s/16);x.lineTo(s,i*s/16);x.stroke();}
 var sd=7;function rnd(){sd=(sd*16807)%2147483647;return sd/2147483647;}
 function chart(top,col,fill){   /* ламана графіка: випадкове блукання, світіння, заливка до лінії горизонту */
  var pts=[],n=26,y=top?.34:.66,dir=top?-1:1;
  for(i=0;i<=n;i++){var u=i/n;y+=(rnd()-.5)*.09+dir*(rnd()-.45)*.02;y=Math.max(top?.08:.54,Math.min(top?.46:.92,y));pts.push([u*s,y*s]);}
  var f=x.createLinearGradient(0,top?0:s,0,s/2);f.addColorStop(0,fill);f.addColorStop(1,'rgba(0,0,0,0)');
  x.beginPath();x.moveTo(0,s/2);pts.forEach(function(p){x.lineTo(p[0],p[1]);});x.lineTo(s,s/2);x.closePath();x.fillStyle=f;x.fill();
  x.shadowColor=col;x.shadowBlur=14;x.strokeStyle=col;x.lineWidth=5;x.lineJoin='round';x.beginPath();pts.forEach(function(p,j){j?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]);});x.stroke();
  x.shadowBlur=0;x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.6;x.beginPath();pts.forEach(function(p,j){j?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]);});x.stroke();
  for(i=0;i<n;i+=2){var q=pts[i],cd=(rnd()-.5)*34;x.fillStyle=col;x.globalAlpha=.55;x.fillRect(q[0]-3,Math.min(q[1],q[1]+cd),6,Math.abs(cd)+4);x.globalAlpha=1;}
 }
 chart(1,'#ff4a55','rgba(255,60,70,.38)');chart(0,'#3dff86','rgba(60,255,130,.4)');
 var hl=x.createLinearGradient(0,0,s,0);hl.addColorStop(0,'rgba(255,70,80,0)');hl.addColorStop(.2,'rgba(255,90,100,.9)');hl.addColorStop(.5,'rgba(255,255,255,.95)');hl.addColorStop(.8,'rgba(90,255,150,.9)');hl.addColorStop(1,'rgba(90,255,150,0)');
 x.fillStyle=hl;x.shadowColor='rgba(255,255,255,.7)';x.shadowBlur=10;x.fillRect(0,s/2-1.5,s,3);x.shadowBlur=0;
 var dg=x.createLinearGradient(0,s*.22,0,s*.78);dg.addColorStop(0,'#9dffbf');dg.addColorStop(.5,'#2bef72');dg.addColorStop(1,'#0aa84a');
 x.font='900 330px -apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';
 x.shadowColor='rgba(60,255,120,.95)';x.shadowBlur=46;x.fillStyle=dg;x.fillText('$',s/2,s*.53);x.shadowBlur=18;x.fillText('$',s/2,s*.53);x.shadowBlur=0;
 x.strokeStyle='rgba(255,255,255,.45)';x.lineWidth=2;x.strokeText('$',s/2,s*.53);
 x.strokeStyle='rgba(255,255,255,.16)';x.lineWidth=3;x.beginPath();x.moveTo(rc,1.5);x.arcTo(s-1.5,1.5,s-1.5,s-1.5,rc);x.arcTo(s-1.5,s-1.5,1.5,s-1.5,rc);x.arcTo(1.5,s-1.5,1.5,1.5,rc);x.arcTo(1.5,1.5,s-1.5,1.5,rc);x.closePath();x.stroke();
 return cv;
}
var BFXG_VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var BFXG_FS=['precision highp float;',
'uniform vec2 u_res;uniform float u_dpr;uniform vec2 u_c;uniform float u_S,u_R,u_t,u_ia,u_sa,u_E,u_diag,u_fl,u_cn,u_hot,u_blink;uniform vec2 u_dot;',
'uniform vec4 u_cr[6];uniform vec4 u_ray[10];uniform sampler2D u_icon;',
'float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}',
'vec2 h22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}',
'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=h11(i.x+i.y*57.),b=h11(i.x+1.+i.y*57.),c=h11(i.x+(i.y+1.)*57.),d=h11(i.x+1.+(i.y+1.)*57.);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
/* тріщини скла від точки удару: радіальні тріщини з нерівними кутами, звивистістю й різною довжиною + часткові концентричні кільця; c = (удар x, y, вік, зерно) */
'vec4 crk(vec2 rel,vec4 c){float age=c.z;if(age<0.)return vec4(0.);vec2 q=rel-c.xy;float r=length(q),a=atan(q.y,q.x);',
' float reach=(.9+.8*h11(c.w*3.3))*(1.-exp(-age*4.));if(r>reach+.05)return vec4(0.);float rm=1.-smoothstep(reach-.2,reach,r);',
' float NA=7.,f=(a/6.2831853+.5)*NA,dmin=9.,sid=0.;',
' for(int k=0;k<4;k++){float bi=floor(f)+float(k)-1.;float bm=mod(bi+NA,NA);float bj=bi+(h11(bm*3.7+c.w*5.)-.5)*.75;',
'  float wg=(n2(vec2(r*4.+bm*5.1,c.w*7.+bm))-.5)*.16/(1.+r*1.2);float ff=f+wg;float d1=abs(ff-bj);d1=min(d1,min(abs(ff-bj+NA),abs(ff-bj-NA)));',
'  float arc=d1/NA*6.2831853*max(r,.02);float len=.3+1.1*h11(bm*1.7+c.w*3.1);float on=smoothstep(len,len-.18,r);arc=arc+(1.-on)*9.;if(arc<dmin){dmin=arc;}}',
' for(int j=0;j<3;j++){float fj=float(j);float rj=.16+.13*fj*(1.+.25*fj)+(h11(fj*9.3+c.w)-.5)*.07;float wgr=(n2(vec2(a*2.+fj*4.,c.w*5.+fj))-.5)*.03;float dr=abs(r-rj+wgr);',
'  float ex=h11(floor(f)*5.1+fj*13.+c.w)>.78?0.:9.;if(dr+ex<dmin)dmin=dr+ex;if(rj<r)sid+=1.;}',
' float wd=(.006+.012*smoothstep(0.,.9,age))*(1.4/(1.+r*1.6));float line=(1.-smoothstep(wd*.3,wd,dmin))*rm;float glow=(1.-smoothstep(wd*.4,wd*2.6,dmin))*rm*.6;',
' float imp=exp(-dot(q,q)*70.)*smoothstep(0.,.15,age)*(.3+.7*exp(-age*3.))*.6;',
' return vec4(line,glow+imp,rm,h11(floor(f)*7.+sid*3.+c.w));}',
'void main(){',
' vec2 P=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y)/u_dpr;vec2 d=P-u_c;float rr=length(d),th=atan(d.y,d.x);',
/* промені: bright core + широке гало, смуги шумом, видовжуються з віком; q.w<0 — спереду, >0 — ззаду */
' vec3 rb=vec3(0.),rf=vec3(0.);',
' for(int i=0;i<10;i++){vec4 q=u_ray[i];if(q.y<0.)continue;float da=abs(mod(th-q.x+3.14159265,6.2831853)-3.14159265);',
'  float on=smoothstep(0.,.04,q.y)*(1.-smoothstep(.2,.85,q.y));float core=exp(-da*da/.0007),halo=exp(-da*da/.011);',
'  float st=.45+.55*n2(vec2(th*38.+float(i)*11.,rr*.035-u_t*2.2));',
'  float Lq=u_diag*.8*(1.-pow(1.-clamp(q.y/.13,0.,1.),3.));float fall=smoothstep(u_R*.5,u_R*1.0,rr)*clamp(1.-rr/Lq,0.,1.)/(1.+rr/(u_S*1.8));',
'  vec3 cl=q.z>.5?vec3(.24,1.,.55):vec3(1.,.2,.28);vec3 L=(cl*(halo*.55*st+core*1.7)+vec3(1.)*core*core*1.1)*fall*on*abs(q.w);if(q.w<0.)rf+=L;else rb+=L;}',
/* пилинки в променях: дві сітки, кожна мерехтить у своєму ритмі */
' float lum=dot(rb+rf,vec3(.33));vec3 dust=vec3(0.);',
' if(lum>.01){for(int l=0;l<2;l++){float cs=l==0?15.:9.;vec2 g=floor(P/cs);vec2 o=h22(g+float(l)*31.)*.8+.1;float hh=h11(g.x*3.+g.y*17.+float(l)*5.);',
'   float tw=pow(max(0.,sin(u_t*(2.+hh*5.)+hh*40.)),5.);float m=smoothstep(2.4,0.,length(P-(g+o)*cs))*tw;dust+=vec3(1.,.82,.78)*m*clamp(lum*5.,0.,1.)*(l==0?1.2:.8);}}',
/* значок + скляна куля */
' vec2 uv=d/u_S+.5;float di=sdRB(d,vec2(u_S*.5),u_S*.224);float ia=u_ia*clamp(.5-di,0.,1.);',
' vec4 ic=texture2D(u_icon,clamp(uv,0.,1.))*step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);',
' vec3 col=ic.rgb*ia;float al=ia*ic.a;',
' vec2 rel=d/u_R;float r2=dot(rel,rel);vec3 emis=vec3(0.);float sa=0.;',
' if(r2<1.08&&u_sa>.001){',
'  float z=sqrt(max(0.,1.-r2));vec3 n=vec3(rel,z);float rm=sqrt(r2);float edge=smoothstep(1.,.985,rm);',
/* тріщини: сума з усіх ударів */
'  float line=0.,gl=0.;vec3 gcol=vec3(0.);vec2 sh=vec2(0.);',
'  for(int i=0;i<6;i++){vec4 k=crk(rel,u_cr[i]);if(k.z>0.){line=max(line,k.x);gl=max(gl,k.y);float ag=u_cr[i].z;vec3 cc=(i==1||i==4)?vec3(.3,1.,.6):vec3(1.,.3,.38);float it=smoothstep(0.,.12,ag)*(.7+.6*exp(-ag*5.));gcol+=cc*k.y*it;sh+=(vec2(k.w,h11(k.w*77.))-.5)*.05*smoothstep(0.,.5,ag)*k.z;}}',
'  float mag=mix(1.,.56+1.15*pow(rm,2.2),smoothstep(.06,.3,rm));vec2 src=d*mag+sh*u_R*2.;float ab=.022+.05*rm*rm;',
'  vec2 u0=src/u_S+.5;vec4 sa4=texture2D(u_icon,clamp(src*(1.+ab)/u_S+.5,0.,1.)),sb4=texture2D(u_icon,clamp(u0,0.,1.)),sc4=texture2D(u_icon,clamp(src*(1.-ab)/u_S+.5,0.,1.));',
'  vec3 gc=vec3(sa4.r,sb4.g,sc4.b)*(.92+.1*z)+vec3(.02,.035,.06)*(1.-z);',
'  float fr=pow(1.-z,3.2);float s1=pow(max(dot(n,normalize(vec3(-.42,-.5,.75))),0.),64.)*.95+pow(max(dot(n,normalize(vec3(-.35,-.45,.8))),0.),9.)*.14;float s2=pow(max(dot(n,normalize(vec3(.55,.62,.55))),0.),28.)*.3;',
'  gc+=vec3(fr*.55);gc*=1.-.5*smoothstep(.82,1.,rm)*(1.-fr);',
'  float hot=.3+.7*u_cn+.9*u_hot;vec3 em=gcol*hot*(.8+.2*sin(u_t*40.));em+=vec3(1.,.93,.9)*line*(.25+.5*u_cn+1.0*u_hot)*.8;em+=vec3(1.)*pow(line,4.)*.5;',
'  gc*=1.-.35*gl*(1.-line);gc+=em;',
'  col=mix(col,gc,u_sa*edge);al=mix(al,1.,u_sa*edge);sa=edge;',
'  emis=gcol*hot*.35*(1.-edge);',
' }',
' vec3 res=rb*(1.-al)+col+emis*.0;float a2=max(al,clamp(max(res.r,max(res.g,res.b)),0.,1.));',
' res+=rf+dust;',
/* світло зсередини просочується за межі кулі: м'яке свічення навколо */
' float halo=exp(-max(rr-u_R,0.)/(u_R*.55))*smoothstep(0.,.9,u_cn+u_hot)*u_sa*(1.-sa);res+=vec3(1.,.28,.34)*halo*(.5*u_cn+.8*u_hot)+vec3(.3,1.,.55)*halo*.18*u_cn;',
' if(u_E>=0.){float f=clamp(u_E/.9,0.,1.);float rad=(1.-pow(1.-f,3.))*u_diag*.6;float tk=3.+12.*(1.-f);float rg=exp(-pow((rr-rad)/tk,2.))*(1.-f);res+=vec3(1.,.9,.88)*rg*.8;}',
' res+=vec3(1.,.96,.94)*u_fl+vec3(1.,.9,.9)*u_blink;',
' if(u_dot.y>0.){float r=max(u_dot.x,1.);res+=(vec3(1.)*exp(-rr/(r*.45))+vec3(1.,.47,.5)*exp(-rr/(r*1.2))*.6)*u_dot.y;}',
' a2=clamp(max(a2,max(res.r,max(res.g,res.b))),0.,1.);',
' gl_FragColor=vec4(min(res,vec3(1.)),a2);}'].join('\n');
var BFXP_VS=['attribute vec4 a_a;attribute vec4 a_b;attribute vec3 a_c;',
'uniform vec2 u_res;uniform float u_dpr,u_mode,u_el,u_k,u_D,u_S2,u_cell,u_alpha,u_toff,u_diag,u_u,u_CE,u_S,u_cell2;uniform vec2 u_c;varying vec3 v_c;varying float v_a;',
'float eo(float x){x=clamp(x,0.,1.);return 1.-pow(1.-x,3.);}float io(float x){x=clamp(x,0.,1.);return x<.5?4.*x*x*x:1.-pow(-2.*x+2.,3.)/2.;}',
'void main(){vec2 pos;float z;',
' if(u_mode<.5){float el=u_el-u_toff;float q=clamp((el-a_b.w*u_k)/u_D,0.,1.);float a=q<.16?eo(q/.16):1.-io((q-.16)/.84);float th=a_b.x*(1.-q);float cs=cos(th),sn=sin(th);',
'  vec2 v=a_a.zw*u_S2*a;pos=u_c+a_a.xy*u_S2+vec2(v.x*cs-v.y*sn,v.x*sn+v.y*cs);z=u_cell*a_b.y*(1.05-.5*a);}',
' else{float uu=u_u-u_toff;float e=eo(uu/.5),w=io((uu-.5)/u_CE);float ln=max(length(a_a.xy),.001);float dist=a_b.z*u_diag*.5;vec2 r=a_a.xy*u_S+(a_a.xy/ln)*dist*e;',
'  float sg=a_b.x>0.?1.:-1.;float a1=e*.7*sg+w*3.4*sg;float c1=cos(a1),s1=sin(a1);float k2=1.-w;pos=u_c+vec2(r.x*c1-r.y*s1,r.x*s1+r.y*c1)*k2;z=u_cell2*a_b.y*(.9+.7*(1.-e))*(1.-w*.88);}',
' v_c=a_c;v_a=u_alpha;vec2 vp=u_res/u_dpr;gl_Position=vec4(pos.x/vp.x*2.-1.,1.-pos.y/vp.y*2.,0.,1.);gl_PointSize=max(1.5,z*u_dpr*1.35);}'].join('\n');
var BFXP_FS='precision mediump float;varying vec3 v_c;varying float v_a;void main(){float d=length(gl_PointCoord*2.-1.);float a=smoothstep(1.,.1,d);a*=a;gl_FragColor=vec4(v_c*a*v_a*.8,a*v_a*.8);}';
function bfxGLInit(){
 try{
  var cv=document.createElement('canvas');cv.id='bfxg';cv.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3';
  var gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:false});if(!gl)return 0;
  function mkS(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error('bfx',gl.getShaderInfoLog(o));return null;}return o;}
  function mkP(vs,fs,attrs){var a=mkS(gl.VERTEX_SHADER,vs),b=mkS(gl.FRAGMENT_SHADER,fs);if(!a||!b)return null;var p=gl.createProgram();gl.attachShader(p,a);gl.attachShader(p,b);attrs.forEach(function(n,i){gl.bindAttribLocation(p,i,n);});gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error('bfx',gl.getProgramInfoLog(p));return null;}return p;}
  var pq=mkP(BFXG_VS,BFXG_FS,['p']),pp=mkP(BFXP_VS,BFXP_FS,['a_a','a_b','a_c']);if(!pq||!pp)return 0;
  function U(p,names){var o={};names.forEach(function(n){o[n]=gl.getUniformLocation(p,n);});return o;}
  var uq=U(pq,['u_res','u_dpr','u_c','u_S','u_R','u_t','u_ia','u_sa','u_E','u_diag','u_fl','u_cn','u_hot','u_blink','u_dot','u_cr','u_ray','u_icon']);
  var up=U(pp,['u_res','u_dpr','u_mode','u_el','u_k','u_D','u_S2','u_cell','u_alpha','u_toff','u_diag','u_u','u_CE','u_S','u_cell2','u_c']);
  var qb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,qb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,BFX.icon);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  var P=BFX.P,n=P.length,data=new Float32Array(n*11),i;
  for(i=0;i<n;i++){var p=P[i],o=i*11;data[o]=p.tx;data[o+1]=p.ty;data[o+2]=p.sx;data[o+3]=p.sy;data[o+4]=p.spin;data[o+5]=p.sz;data[o+6]=p.sp;data[o+7]=p.dl;data[o+8]=p.cr;data[o+9]=p.cg;data[o+10]=p.cb;}
  var pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  boot.el.appendChild(cv);
  BFX.g={tex:tex,cv:cv,gl:gl,pq:pq,pp:pp,uq:uq,up:up,qb:qb,pb:pb,n:n,w:0,h:0,crA:new Float32Array(24),rayA:new Float32Array(40)};
  return 1;
 }catch(e){LG('boot','WebGL-заставка недоступна: '+e);return 0;}
}
function bfxGLDraw(t,el){
 var G=BFX.g,gl=G.gl,k=BFX.k,ph=boot.phase,A=BFX.A*k,dpr=Math.min(2,window.devicePixelRatio||1),br=boot.el.getBoundingClientRect(),w=Math.max(1,Math.round(br.width)),h=Math.max(1,Math.round(br.height));
 if(G.w!==w||G.h!==h||G.dpr!==dpr){G.w=w;G.h=h;G.dpr=dpr;G.cv.width=Math.round(w*dpr);G.cv.height=Math.round(h*dpr);}
 var wr=boot.wrap.getBoundingClientRect(),cx=wr.left-br.left,cy=wr.top-br.top,diag=Math.hypot(w,h);
 boot.logo.style.opacity='0';
 gl.viewport(0,0,G.cv.width,G.cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 var rgrow=1,S=116*BFX.sc,ia=0,sa=0,E=-1,fl=0,cn=0,hot=0,blink=0,dot=[0,0],drawQuad=false,pMode=-1,pAlpha=0,pu=0,i,CR=BFX.cr,C=BFX.C,Et=BFX.E,tau=0;
 var crA=G.crA,rayA=G.rayA;for(i=0;i<24;i++)crA[i]=0;for(i=0;i<6;i++)crA[i*4+2]=-1;for(i=0;i<10;i++){rayA[i*4]=0;rayA[i*4+1]=-1;rayA[i*4+2]=0;rayA[i*4+3]=0;}
 if(ph===0){
  if(el<A){
   var D=Math.max(.35,A-1.0*k),fo=bfxS(A-.45*k,A-.05*k,el);S=116*2.4;
   if(el>A-.45*k&&BFX.ba){boot.el.classList.remove('ba');BFX.ba=0;}
   ia=fo;sa=0;drawQuad=fo>.002;pMode=0;pAlpha=Math.min(1,el/.1)*(1-fo);G.D=D;
  }else{if(BFX.ba){boot.el.classList.remove('ba');BFX.ba=0;}ia=1;rgrow=BFX.skip?1:Math.max(.002,bfxEO((el-A)/(.9*k)));sa=1;drawQuad=true;}
 }else if(ph===1){
  tau=(t-boot.t1)/1000/k;
  if(/[?&]bfxfz=/.test(location.search)){tau=+location.search.match(/bfxfz=([0-9.]+)/)[1];boot.t1=t-tau*k*1000;BFX.frz=1;}   /* налагодження: заморозити момент заставки */
  if(BFX.skip&&!BFX.sk1){BFX.sk1=1;boot.t1=Math.min(boot.t1,t-(C*k-.3)*1000);tau=(t-boot.t1)/1000/k;}
  var sc1=BFX.sc/1.15;
  if(tau<Et){
   var nc=0,imp=0,i2;
   for(i2=0;i2<CR.length;i2++){var c0=CR[i2];if(c0.br)continue;var a0=tau-c0.ev;if(a0>=0){nc++;imp=Math.max(imp,Math.exp(-a0*9));}}
   var prog=nc/BFX.NP;hot=bfxS(Et-.5,Et,tau);cn=prog;
   BFX.jx=(Math.random()-.5)*2*(1+5*prog)*imp*sc1;BFX.jy=(Math.random()-.5)*2*(1+5*prog)*imp*sc1;
   BFX.zs=1+.014*imp-.05*bfxS(Et-.22,Et,tau);
   S=116*BFX.sc*BFX.zs;cx+=BFX.jx;cy+=BFX.jy;
   var mi=0,ri=0;
   for(i2=0;i2<CR.length;i2++){var cr=CR[i2];if(cr.br)continue;var ag=tau-cr.ev;
    if(mi<6){crA[mi*4]=cr.ix;crA[mi*4+1]=cr.iy;crA[mi*4+2]=ag>=0?ag:-1;crA[mi*4+3]=cr.seed;mi++;}
    if(ri<10&&ag>=0&&ag<.9){rayA[ri*4]=cr.a;rayA[ri*4+1]=ag;rayA[ri*4+2]=(i2%3===0)?1:0;rayA[ri*4+3]=cr.back?1:-1;ri++;}}
   ia=1;sa=1;drawQuad=true;blink=imp>.02?.05*imp:0;
  }else{
   if(!BFX.ex){BFX.ex=1;BFX.jx=BFX.jy=0;BFX.zs=1;boot.wrap.classList.add('p1');LG('boot','вибух сфери');}
   S=116*BFX.sc;E=tau-Et;fl=Math.pow(1-bfxS(Et,Et+.38,tau),1.6);drawQuad=true;pMode=1;pAlpha=.95;pu=tau-Et;
   var wq=bfxIO((tau-Et-.5)/(C-Et-.5));if(tau>Et+.5){dot=[4+24*wq,wq];}
  }
 }else if(ph===2){
  var up=(t-boot.t2)/1000,f2=bfxS(0,.55,up);
  if(up>.6){BFX.on=0;G.cv.style.display='none';return;}
  dot=[30*(1-f2),1-f2];drawQuad=true;
 }
 var R=S*.41*rgrow;
 if(drawQuad){
  gl.useProgram(G.pq);gl.disable(gl.BLEND);gl.bindBuffer(gl.ARRAY_BUFFER,G.qb);gl.enableVertexAttribArray(0);gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  var q=G.uq;gl.uniform2f(q.u_res,G.cv.width,G.cv.height);gl.uniform1f(q.u_dpr,dpr);gl.uniform2f(q.u_c,cx,cy);gl.uniform1f(q.u_S,S);gl.uniform1f(q.u_R,R);gl.uniform1f(q.u_t,(t/1000)%1000);
  gl.uniform1f(q.u_ia,ia);gl.uniform1f(q.u_sa,sa);gl.uniform1f(q.u_E,E);gl.uniform1f(q.u_diag,diag);gl.uniform1f(q.u_fl,fl);gl.uniform1f(q.u_cn,cn);gl.uniform1f(q.u_hot,hot);gl.uniform1f(q.u_blink,blink);gl.uniform2f(q.u_dot,dot[0],dot[1]);
  gl.uniform4fv(q.u_cr,crA);gl.uniform4fv(q.u_ray,rayA);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,G.tex);gl.uniform1i(q.u_icon,0);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
 if(pMode>=0&&pAlpha>.003){
  gl.useProgram(G.pp);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,G.pb);
  gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(0,4,gl.FLOAT,false,44,0);gl.vertexAttribPointer(1,4,gl.FLOAT,false,44,16);gl.vertexAttribPointer(2,3,gl.FLOAT,false,44,32);
  var u=G.up;gl.uniform2f(u.u_res,G.cv.width,G.cv.height);gl.uniform1f(u.u_dpr,dpr);gl.uniform2f(u.u_c,cx,cy);gl.uniform1f(u.u_mode,pMode);gl.uniform1f(u.u_el,el);gl.uniform1f(u.u_k,k);gl.uniform1f(u.u_D,G.D||1);
  gl.uniform1f(u.u_S2,116*2.4);gl.uniform1f(u.u_cell,116*2.4/BFX.G);gl.uniform1f(u.u_diag,diag);gl.uniform1f(u.u_u,pu);gl.uniform1f(u.u_CE,C-Et-.5);gl.uniform1f(u.u_S,S);gl.uniform1f(u.u_cell2,S/BFX.G);
  var tr=[[0,1],[.022,.5],[.05,.22]];
  for(i=0;i<tr.length;i++){gl.uniform1f(u.u_toff,tr[i][0]);gl.uniform1f(u.u_alpha,pAlpha*tr[i][1]);gl.drawArrays(gl.POINTS,0,G.n);}
  gl.disable(gl.BLEND);
 }
}
