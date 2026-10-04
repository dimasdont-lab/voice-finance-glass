var cv=document.getElementById('gl');
var gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:'high-performance'})||cv.getContext('experimental-webgl');
LG('gl',gl?'WebGL ok':'WebGL НЕ доступний');
var ISL=0;   /* оновлюється щокадру з живої безпечної зони */
/* Причина збоїв запуску на iPhone (за діагностикою): iOS у застосунку з іконки інколи лишає сторінку «прокрученою» на висоту статус-бару (scrollY=-62, visualViewport.offsetTop=-62).
   Тоді getBoundingClientRect() закріплених елементів зсунутий на +62 відносно того, де вони намальовані: скло дока опинялось нижче кнопок, крапля вилітала нижче логотипа.
   Тому: 1) повертаємо scroll у 0; 2) усі виміри закріплених елементів ідуть через frect(), яка компенсує зсув; 3) безпечні зони читаються наживо. */
var spT=document.createElement('div'),spB=document.createElement('div'),SAFE={t:0,b:0},SO=0;
spT.style.cssText='position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
spB.style.cssText='position:fixed;left:0;top:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
document.body.appendChild(spT);document.body.appendChild(spB);
var spL=document.createElement('div'),LV=0;spL.style.cssText='position:fixed;left:0;top:0;width:0;height:100lvh;visibility:hidden;pointer-events:none';document.body.appendChild(spL);
function lvCheck(){if(!navigator.standalone)return;var lv=spL.offsetHeight||0,ih=innerHeight,st=document.documentElement;
 if(!LV&&lv>ih+1){LV=1;st.classList.add('lv');st.style.setProperty('--appH',lv+'px');LG('lv','iOS урізав вікно ('+ih+' з '+lv+'): документ розтягнуто до '+lv+', шари з fixed на absolute');}
 else if(LV&&!LV.full&&ih>=lv-1){LV={full:1};LG('lv','iOS віддав повну висоту вікна ('+ih+'): смуги немає; режим лишається ввімкненим (без нього вікно знову стане коротким)');}
 else if(LV&&lv>(parseFloat(st.style.getPropertyValue('--appH'))||0)+1){st.style.setProperty('--appH',lv+'px');LG('lv','висота документа → '+lv);}}   /* режим не вимикаємо: інакше вікно 812↔874 перемикається щокадру (блимання) */
function liveEnv(){SAFE.t=spT.offsetHeight||0;SAFE.b=spB.offsetHeight||0;ISL=(SAFE.t>=40||/[?&]island/.test(location.search))?1:0;var y=window.scrollY||window.pageYOffset||0;SO=y<0?y:0;var k=SAFE.t+'/'+SAFE.b+'/'+SO+'/'+ISL;if(k!==liveEnv.k){liveEnv.k=k;LG('env','safe '+SAFE.t+'/'+SAFE.b+' scrollY-зсув '+SO+' island '+ISL);}}
function frect(el){liveEnv();var r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height,top:r.top+SO,bottom:r.bottom+SO};}
var GRID_CELL=45;   /* ≈5 мм на iPhone (CSS-пікселі) */
var GLSL_BG=['vec3 blob(vec3 c,vec2 n,vec2 ce,vec2 r,vec3 col){float a=clamp(1.-length((n-ce)/r)/0.7,0.,1.);return mix(c,col,a);}',
 'float gridL(vec2 p){vec2 q=abs(fract(p/u_cell+.5)-.5)*u_cell;return 1.-smoothstep(.0,1.,min(q.x,q.y));}',

 'vec2 gridWarp(vec2 p,float k){vec2 c=u_vp*.5;vec2 q0=p-c;vec2 o=p;float d=sdRB(q0,c,62.);',
 ' if(d>-80.){float t=clamp(-d/80.,0.,1.);vec2 q=abs(q0)-c+62.;vec2 n=(q.x>0.&&q.y>0.)?normalize(q):(q.x>q.y?vec2(1.,0.):vec2(0.,1.));o-=n*sign(q0)*pow(1.-t,2.2)*46.*k;}',
 ' if(u_isl>.5){vec2 qi=p-vec2(c.x,29.5);vec2 ib=vec2(63.,18.5);float di=sdRB(qi,ib,18.5);if(di<34.){float ti=clamp(di/34.,0.,1.);vec2 qq=abs(qi)-ib+18.5;vec2 ni=(qq.x>0.&&qq.y>0.)?normalize(qq):(qq.x>qq.y?vec2(1.,0.):vec2(0.,1.));o+=ni*sign(qi)*pow(1.-ti,2.2)*26.*k;}}',
 ' return o;}',
 'vec3 gradBg(vec2 p){',
 ' vec3 c=vec3(.0196,.0196,.0275);',
 ' vec3 g=vec3(gridL(gridWarp(p,1.)+u_go-u_vp*.5),gridL(gridWarp(p,1.22)+u_go-u_vp*.5),gridL(gridWarp(p,1.44)+u_go-u_vp*.5));return mix(c,u_gcol,.17*g);}'].join('\n');
var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec4 u_tk;uniform sampler2D u_tt;uniform float u_th;uniform sampler2D u_tb0;uniform sampler2D u_tb1;uniform sampler2D u_tb2;uniform float u_bm;uniform float u_bs;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform vec3 u_gcol;uniform float u_gb2;uniform vec2 u_res;uniform vec2 u_org;uniform vec2 u_vp;uniform sampler2D u_t0;uniform sampler2D u_t1;uniform sampler2D u_t2;uniform vec4 u_p0;uniform vec4 u_p1;uniform vec4 u_p2;uniform vec3 u_w;uniform float u_scrim;uniform vec4 u_g;uniform float u_gr;uniform float u_gv;uniform vec4 u_a;uniform vec4 u_b;uniform vec4 u_c;uniform float u_cv;uniform float u_nk;uniform vec4 u_k;uniform float u_kv;uniform float u_bl;uniform float u_s;uniform vec4 u_rp;uniform vec4 u_rs;uniform float u_rb;uniform float u_gm;uniform float u_gd;uniform float u_gbl;uniform vec4 u_g2;uniform float u_gr2;uniform float u_gv2;uniform float u_sho;uniform vec4 u_rt;uniform float u_ord;',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
'float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*0.25;}',
'float sdBar(vec2 x){float a=sdRB(x-u_a.xy,u_a.zw,min(u_a.z,u_a.w));if(u_kv<.01)return a;return smin(a,sdRB(x-u_k.xy,u_k.zw,min(u_k.z,u_k.w)),17.*u_s);}',
'float sdInd(vec2 x){return sdRB(x-u_b.xy,u_b.zw,min(u_b.z,u_b.w));}',
'float sdC(vec2 x){return sdRB(x-u_c.xy,u_c.zw,min(u_c.z,u_c.w));}',
GLSL_BG,
'vec4 pageS(sampler2D tx,vec4 P,float W0,vec2 p){',
' vec2 uv=vec2((p.x-P.x)/W0,(p.y+P.y)/P.z);',
' float m=P.w*step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);',
' return texture2D(tx,clamp(uv,0.,1.))*m;}',
'vec2 rt(vec2 p,vec4 R,vec2 T){return R.xy+(p-R.xy-T)/R.z;}','float gNS=0.;',
'vec3 bg(vec2 xpx){',
' vec2 p=u_org+xpx/u_s;vec3 c=gradBg(p);vec2 pp=rt(p,u_rp,u_rt.xy);',
' vec4 a=pageS(u_t0,u_p0,u_w.x,pp);a.rgb*=u_rp.w;c=c*(1.-a.a)+a.rgb;',
' vec4 b=pageS(u_t1,u_p1,u_w.y,pp);b.rgb*=u_rp.w;c=c*(1.-b.a)+b.rgb;',
' c*=(1.-u_scrim);',
' if(gNS<.5){if(u_gv2>.01){float ds=sdRB(xpx-u_g2.xy,u_g2.zw,u_gr2);c*=mix(1.,.5,clamp(-ds/(1.5*u_s)+.5,0.,1.));}',
'  vec4 o=pageS(u_t2,u_p2,u_w.z,rt(p,u_rs,u_rt.zw));o.rgb*=u_rs.w;c=c*(1.-o.a)+o.rgb;}',
' return c;}',
'vec4 tbS(sampler2D tx,vec2 pp){vec2 uv=vec2(pp.x/u_vp.x,1.-pp.y/u_vp.y);float m=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);return texture2D(tx,clamp(uv,0.,1.))*m;}',
'vec3 bgBl(vec2 xpx){',
' vec2 p=u_org+xpx/u_s;vec3 c=texture2D(u_tb2,clamp(p/u_vp,0.,1.)).rgb;vec2 pp=rt(p,u_rp,u_rt.xy);',
' vec4 a=tbS(u_tb0,pp);a.rgb*=u_rp.w;c=c*(1.-a.a)+a.rgb;',
' c*=(1.-u_scrim);',
' if(gNS<.5){if(u_gv2>.01){float ds=sdRB(xpx-u_g2.xy,u_g2.zw,u_gr2);c*=mix(1.,.5,clamp(-ds/(1.5*u_s)+.5,0.,1.));}',
'  vec4 o=tbS(u_tb1,rt(p,u_rs,u_rt.zw))*u_p2.w;o.rgb*=u_rs.w;c=c*(1.-o.a)+o.rgb;}',
' return c;}',
'vec3 bgG(vec2 x){return u_bm>.003?mix(bg(x),bgBl(x),u_bm):bg(x);}',
'float sdU(vec2 x){float a=sdBar(x);if(u_cv<.5)return a;return smin(a,sdC(x),max(u_nk,0.001));}',
'float mU(vec2 x){float mb=min(u_a.z,u_a.w);if(u_cv<.5)return mb;float a=sdBar(x),b=sdC(x);float wb=clamp(.5+.5*(a-b)/max(u_nk,0.001),0.,1.);return mix(mb,min(u_c.z,u_c.w),wb);}',
'float hsh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
'vec3 bgB(vec2 p,float r){r+=u_rb;if(r<.5)return bg(p);vec3 s=bg(p);float a0=hsh(gl_FragCoord.xy)*6.2832;for(int i=0;i<12;i++){float fi=float(i)+.5;float a=a0+fi*2.39996;s+=bg(p+vec2(cos(a),sin(a))*r*sqrt(fi/12.));}return s/13.;}',
'vec3 bgS(vec2 p,float r){r+=u_rb;if(r<.5)return bg(p);vec3 s=bg(p);float a0=hsh(gl_FragCoord.yx+7.)*6.2832;for(int i=0;i<4;i++){float fi=float(i)+.5;float a=a0+fi*2.39996;s+=bg(p+vec2(cos(a),sin(a))*r*sqrt(fi/4.));}return s/5.;}',
'vec3 barColor(vec2 x){',
' float d=sdU(x);vec3 col=bgG(x);',
' if(d<1.5*u_s){float m=mU(x);float t=clamp(-d/(0.6*m),0.,1.);float e=1.5;',
'  vec2 n=normalize(vec2(sdU(x+vec2(e,0.))-sdU(x-vec2(e,0.)),sdU(x+vec2(0.,e))-sdU(x-vec2(0.,e)))+1e-5);',
'  float wd=(u_cv>.5&&u_bl>.01)?clamp(.5+.5*(sdBar(x)-sdC(x))/max(u_nk,.001),0.,1.):0.;',
'  vec2 of=n*pow(1.-t,2.2)*0.6*m;float br=u_bl*wd;float ab=0.10*(0.35+pow(1.-t,1.5));',
'  vec3 ci=(br>.01?vec3(bgS(x-of*(1.+ab),br).r,bgB(x-of,br).g,bgS(x-of*(1.-ab),br).b):vec3(bgG(x-of*(1.+ab)).r,bgG(x-of).g,bgG(x-of*(1.-ab)).b))*0.75;float rim=pow(1.-t,3.);',
'  float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
'  ci+=vec3(rim*(0.009+0.045*sp));col=mix(col,ci,clamp(-d/(1.5*u_s)+0.5,0.,1.));}',
' return col;}',
'vec4 glassPx(vec2 px,vec4 G,float GR,float GV,float dg,float gd,float gbl,float ring){',
' float mm=(ring>.5?130.:36.)*u_s;float t=clamp(-dg/(0.6*mm),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-G.xy,G.zw,GR)-sdRB(px-vec2(e,0.)-G.xy,G.zw,GR),sdRB(px+vec2(0.,e)-G.xy,G.zw,GR)-sdRB(px-vec2(0.,e)-G.xy,G.zw,GR))+1e-5);',
' vec2 of=n*pow(1.-t,ring>.5?1.7:2.2)*(ring>.5?1.25:0.6)*mm;float ab=(ring>.5?.24:.10)*(0.35+pow(1.-t,1.5));float br=gbl*u_s*GV;',
' vec3 ci=vec3(bgG(px-of*(1.+ab)).r,bgG(px-of).g,bgG(px-of*(1.-ab)).b)*gd;float rim=pow(1.-t,3.);',
' float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
' ci+=vec3(rim*(0.0105+0.051*sp));float w=clamp(-dg/(1.5*u_s)+0.5,0.,1.)*clamp(GV*1.4,0.,1.);if(ring>.5)w*=1.-smoothstep(.7,1.,t);',
' return vec4(ci,w);}',
'vec3 bgT(vec2 xpx){vec2 p=u_org+xpx/u_s;vec3 c=texture2D(u_tt,vec2(clamp(p.x/u_vp.x,0.,1.),clamp(p.y/u_th,0.,1.))).rgb;vec2 pp=rt(p,u_rp,u_rt.xy);',
' vec4 a=pageS(u_t0,u_p0,u_w.x,pp);a.rgb*=u_rp.w;c=c*(1.-a.a)+a.rgb;vec4 b=pageS(u_t1,u_p1,u_w.y,pp);b.rgb*=u_rp.w;c=c*(1.-b.a)+b.rgb;return c*(1.-u_scrim);}',
'float sdBand(vec2 px){float W=u_vp.x*u_s,cy=u_tk.x+u_tk.y*.5;return sdRB(px-vec2(W*.5,cy),vec2(W*.5+90.*u_s,u_tk.y*.5),u_tk.y*.5);}',
'float sdTick(vec2 px){float W=u_vp.x*u_s,cy=u_tk.x+u_tk.y*.5;float band=sdBand(px);',
' float sl=sdRB(px-vec2(-70.*u_s,cy),vec2(70.*u_s,500.*u_s),0.);float sr=sdRB(px-vec2(W+70.*u_s,cy),vec2(70.*u_s,500.*u_s),0.);return smin(band,min(sl,sr),u_tk.z);}',
'vec2 tickN(vec2 px){float e=1.5;return normalize(vec2(sdTick(px+vec2(e,0.))-sdTick(px-vec2(e,0.)),sdTick(px+vec2(0.,e))-sdTick(px-vec2(0.,e)))+1e-5);}',
'vec4 tickGlass(vec2 px,float d){float m=26.*u_s;float t=clamp(-d/(.6*m),0.,1.);vec2 n=tickN(px);',
' vec2 of=n*pow(1.-t,2.2)*.7*m;float ab=.08*(.35+pow(1.-t,1.5));vec3 ci=vec3(bgT(px-of*(1.+ab)).r,bgT(px-of).g,bgT(px-of*(1.-ab)).b)*.78;',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);ci+=vec3(rim*(.01+.042*sp));',
' return vec4(ci,clamp(-d/(1.5*u_s)+.5,0.,1.));}',
'vec4 tickOut(vec2 px,float d){float sg=12.*u_s;float g=exp(-d*d/(sg*sg));float e=1.5;vec2 bn=normalize(vec2(sdBand(px+vec2(e,0.))-sdBand(px-vec2(e,0.)),sdBand(px+vec2(0.,e))-sdBand(px-vec2(0.,e)))+1e-5);vec2 q=px-bn*(10.*u_s*g*(d/sg));return vec4(bgT(q)+vec3(.035*g),smoothstep(.02,.3,g));}',
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);',
' float dtk=u_tk.w>.5?sdTick(px):1e5;',
' float d=sdU(px);float di=sdInd(px);float dg=u_gv>.01?sdRB(px-u_g.xy,u_g.zw,u_gr):1e5;float dg2=u_gv2>.01?sdRB(px-u_g2.xy,u_g2.zw,u_gr2):1e5;',
' float dm=min(min(d,dg),dg2);float sh=dm>0.?1.-clamp(dm/(30.*u_s),0.,1.):0.;float as=0.3*sh*sh;',
' if(d>1.5*u_s&&di>1.5*u_s&&dg>1.5*u_s&&dg2>1.5*u_s&&dtk>30.*u_s){gl_FragColor=vec4(0.,0.,0.,as);return;}',
' vec3 bc=barColor(px);float aBar=clamp(-d/(1.5*u_s)+.5,0.,1.);',
' vec3 rgb=bc*aBar;float a=aBar+as*(1.-aBar);',
' if(di<1.5*u_s){float m=min(u_b.z,u_b.w);float t=clamp(-di/(0.6*m),0.,1.);float e=1.5;',
'  vec2 n=normalize(vec2(sdInd(px+vec2(e,0.))-sdInd(px-vec2(e,0.)),sdInd(px+vec2(0.,e))-sdInd(px-vec2(0.,e)))+1e-5);',
'  vec3 ci=barColor(px-n*pow(1.-t,2.2)*0.6*m)*0.84;float rim=pow(1.-t,3.);',
'  float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
'  ci+=vec3(rim*(0.0075+0.039*sp));float w=clamp(-di/(1.5*u_s)+0.5,0.,1.);rgb=rgb*(1.-w)+ci*w;a=a*(1.-w)+w;}',
' vec4 g1=vec4(0.),g2=vec4(0.);',
' if(dg<1.5*u_s){if(u_ord>.5)gNS=1.;g1=glassPx(px,u_g,u_gr,u_gv,dg,u_gd,u_gbl,u_gm);gNS=0.;}',
' if(dg2<1.5*u_s){gNS=1.;g2=glassPx(px,u_g2,u_gr2,u_gv2,dg2,.5,u_gb2,0.);gNS=0.;',
'  if(u_sho>.5){vec2 pc=u_org+px/u_s;vec2 rq=rt(pc,u_rs,u_rt.zw);vec4 o=mix(pageS(u_t2,u_p2,u_w.z,rq),tbS(u_tb1,rq)*u_p2.w,u_bs);o.rgb*=u_rs.w;g2.rgb=g2.rgb*(1.-o.a)+o.rgb;}}',
' if(u_ord>.5){rgb=rgb*(1.-g1.a)+g1.rgb*g1.a;a=a*(1.-g1.a)+g1.a;rgb=rgb*(1.-g2.a)+g2.rgb*g2.a;a=a*(1.-g2.a)+g2.a;}',
' else{rgb=rgb*(1.-g2.a)+g2.rgb*g2.a;a=a*(1.-g2.a)+g2.a;rgb=rgb*(1.-g1.a)+g1.rgb*g1.a;a=a*(1.-g1.a)+g1.a;}',
' if(dtk<1.5*u_s){vec4 tg=tickGlass(px,dtk);rgb=rgb*(1.-tg.a)+tg.rgb*tg.a;a=a*(1.-tg.a)+tg.a;}',
' else if(sdBand(px)<30.*u_s){vec4 tg=tickOut(px,sdBand(px));rgb=rgb*(1.-tg.a)+tg.rgb*tg.a;a=a*(1.-tg.a)+tg.a;}',
' gl_FragColor=vec4(rgb,a);}'].join('\n');
function sh(t,q){var o=gl.createShader(t);gl.shaderSource(o,q);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;}
var pr=gl.createProgram(),MP=pr;gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);gl.useProgram(pr);
var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
var U={};['u_tk','u_tt','u_th','u_tb2','u_gcol','u_cell','u_isl','u_tb0','u_tb1','u_bm','u_bs','u_go','u_gb2','u_res','u_org','u_vp','u_t0','u_t1','u_t2','u_p0','u_p1','u_p2','u_scrim','u_rp','u_rs','u_rb','u_gm','u_gd','u_gbl','u_g2','u_gr2','u_gv2','u_sho','u_rt','u_ord','u_g','u_gr','u_gv','u_w','u_a','u_b','u_c','u_cv','u_nk','u_k','u_kv','u_bl','u_s'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);});
gl.uniform1i(U.u_t0,0);gl.uniform1i(U.u_t1,1);gl.uniform1i(U.u_t2,2);gl.uniform1i(U.u_tb0,3);gl.uniform1i(U.u_tb1,4);gl.uniform1i(U.u_tb2,5);gl.uniform1i(U.u_tt,6);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
gl.clearColor(0,0,0,0);
var MAXT=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE)||4096,8192);
function mkTex(w,h){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;}
var dummy=mkTex(1,1);

/* ===== розмиття фону під скляними вікнами: заздалегідь розмиті копії сторінок і аркуша (без шуму від випадкової вибірки) ===== */
var BKS=.5,BK={w:0,h:0,pg:null,sh:null,tmp:null};
var BKPREC=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif'];
var BKFS=BKPREC.concat(['uniform vec2 u_res;uniform vec2 u_vp;uniform sampler2D u_t0;uniform sampler2D u_t1;uniform sampler2D u_t2;uniform vec4 u_p0;uniform vec4 u_p1;uniform vec4 u_p2;uniform vec3 u_w;uniform float u_mode;',
'vec4 pageS(sampler2D tx,vec4 P,float W0,vec2 p){',
' vec2 uv=vec2((p.x-P.x)/W0,(p.y+P.y)/P.z);',
' float m=P.w*step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);',
' return texture2D(tx,clamp(uv,0.,1.))*m;}',
'void main(){vec2 pos=vec2(gl_FragCoord.x/u_res.x*u_vp.x,(1.-gl_FragCoord.y/u_res.y)*u_vp.y);',
' if(u_mode<.5){vec4 a=pageS(u_t0,u_p0,u_w.x,pos);vec4 b=pageS(u_t1,u_p1,u_w.y,pos);gl_FragColor=b+a*(1.-b.a);}',
' else gl_FragColor=pageS(u_t2,u_p2,u_w.z,pos);}']).join('\n');
var BLFS=BKPREC.concat(['uniform sampler2D u_src;uniform vec2 u_res;uniform vec2 u_dir;',
'void main(){vec2 uv=gl_FragCoord.xy/u_res;',
' gl_FragColor=texture2D(u_src,uv)*.570+(texture2D(u_src,uv+u_dir)+texture2D(u_src,uv-u_dir))*.205+(texture2D(u_src,uv+u_dir*2.)+texture2D(u_src,uv-u_dir*2.))*.0096;}']).join('\n');
function mkProg(fs){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);return p;}
var bkP=mkProg(BKFS),blP=mkProg(BLFS),BU={},BL={};
['u_res','u_vp','u_t0','u_t1','u_t2','u_p0','u_p1','u_p2','u_w','u_mode'].forEach(function(n){BU[n]=gl.getUniformLocation(bkP,n);});
['u_src','u_res','u_dir'].forEach(function(n){BL[n]=gl.getUniformLocation(blP,n);});
gl.useProgram(bkP);gl.uniform1i(BU.u_t0,0);gl.uniform1i(BU.u_t1,1);gl.uniform1i(BU.u_t2,2);
gl.useProgram(blP);gl.uniform1i(BL.u_src,0);
gl.useProgram(MP);
function bkMk(w,h){var t=mkTex(w,h),f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return{t:t,f:f};}
function bkEnsure(){
 var w=Math.max(8,Math.ceil(VW*BKS)),h=Math.max(8,Math.ceil(VH*BKS));
 if(BK.pg&&BK.w===w&&BK.h===h)return;
 ['pg','sh','tmp'].forEach(function(k){if(BK[k]){gl.deleteTexture(BK[k].t);gl.deleteFramebuffer(BK[k].f);}BK[k]=bkMk(w,h);});
 BK.w=w;BK.h=h;
}
function bake(which,mode,p0,p1,p2,w3){
 bkEnsure();
 gl.useProgram(bkP);gl.bindFramebuffer(gl.FRAMEBUFFER,BK[which].f);gl.viewport(0,0,BK.w,BK.h);
 gl.uniform2f(BU.u_res,BK.w,BK.h);gl.uniform2f(BU.u_vp,VW,VH);gl.uniform1f(BU.u_mode,mode);
 gl.uniform4f(BU.u_p0,p0[0],p0[1],p0[2],p0[3]);gl.uniform4f(BU.u_p1,p1[0],p1[1],p1[2],p1[3]);gl.uniform4f(BU.u_p2,p2[0],p2[1],p2[2],p2[3]);gl.uniform3f(BU.u_w,w3[0],w3[1],w3[2]);
 gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 gl.useProgram(blP);gl.uniform2f(BL.u_res,BK.w,BK.h);gl.activeTexture(gl.TEXTURE0);
 for(var it=0;it<3;it++){
  gl.bindFramebuffer(gl.FRAMEBUFFER,BK.tmp.f);gl.bindTexture(gl.TEXTURE_2D,BK[which].t);gl.uniform2f(BL.u_dir,2/BK.w,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.bindFramebuffer(gl.FRAMEBUFFER,BK[which].f);gl.bindTexture(gl.TEXTURE_2D,BK.tmp.t);gl.uniform2f(BL.u_dir,0,2/BK.h);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
}
var bkCv=document.createElement('canvas'),bkCx=bkCv.getContext('2d'),bkGT=null;
function bkGlt(){   /* зменшена копія шару скла віджетів (#glt) — основа розмитого фону під панелями */
 bkEnsure();if(bkCv.width!==BK.w||bkCv.height!==BK.h){bkCv.width=BK.w;bkCv.height=BK.h;}
 var ok=false;if(tgOK&&tgShown){try{bkCx.drawImage(TGC,0,0,BK.w,BK.h);ok=true;}catch(e){}}
 if(!ok){bkCx.fillStyle='#050507';bkCx.fillRect(0,0,BK.w,BK.h);}
 if(!bkGT){bkGT=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,bkGT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,bkGT);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bkCv);gl.activeTexture(gl.TEXTURE0);
}
var TKH=190,tkCv=document.createElement('canvas'),tkCx=tkCv.getContext('2d'),tkTex=null;
function tkCopy(){   /* верхня смуга шару плиток (#glt) — те, що тікер заломлює разом зі знімками сторінок */
 var k=1.5,w=Math.round(VW*k),h=Math.round(TKH*k);if(tkCv.width!==w||tkCv.height!==h){tkCv.width=w;tkCv.height=h;}
 try{tkCx.drawImage(TGC,0,0,TGC.width,TGC.height*TKH/VH,0,0,w,h);}catch(e){return;}
 if(!tkTex){tkTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tkTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,tkTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tkCv);gl.activeTexture(gl.TEXTURE0);
}
function bkEnd(A,Bt){
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);gl.useProgram(MP);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,A?A.tex:dummy);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,Bt?Bt.tex:dummy);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,SH.tex||dummy);
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,BK.pg?BK.pg.t:dummy);
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,BK.sh?BK.sh.t:dummy);
 gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,bkGT||dummy);
 gl.activeTexture(gl.TEXTURE0);
}

/* ===== 3. Інкрементальні знімки: кожен блок сторінки знімається окремо й один раз,
          перезнімається лише той блок, у якому змінився DOM (texSubImage2D) ===== */
function allSync(){var a=[];for(var q=0;q<NP;q++)a.push(1);return a;}
var S=1,VW=0,VH=0,R={x:0,y:0,w:0,h:0},DR={left:0,top:0,width:0,height:0};
var full=[],shown=false,T=[],B=[],needSync=[],busy=false,dirty=true,sel=0,ca=0,pstyle=[],lastKey='',ready=false;
var bgEl=document.getElementById('bg'),dock=document.getElementById('dock');
var FR=document.createElement('iframe'),FD=null,FC=null;
FR.style.cssText='position:fixed;left:0;top:0;width:10px;height:10px;border:0;opacity:0;pointer-events:none;z-index:-9';
document.body.appendChild(FR);
FD=FR.contentDocument;FD.open();
FD.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+[].map.call(document.querySelectorAll('style'),function(x){return x.textContent;}).join('\n')+'</style></head><body style="background:transparent;color:#fff"><div id="c"></div></body></html>');
FD.close();FC=FD.getElementById('c');
var P=[],failN=[],retryAt=[];
function mk(inr){
 var ts=Math.min(Math.min(S,1.25),MAXT/(inr.height+4),MAXT/(inr.width+4)),tw=Math.ceil(inr.width*ts)+4,th=Math.ceil(inr.height*ts)+4;
 return {tex:mkTex(tw,th),ph:inr.height,iw:inr.width,ts:ts,tw:tw,th:th,cw:tw/ts,ch:th/ts};
}
function drop(o){if(o)gl.deleteTexture(o.tex);}
function alloc(i,inr){
 var o=mk(inr);
 if(!T[i]){T[i]=o;}                       /* перший раз — одразу у показ (порожня прозора) */
 else{drop(P[i]);P[i]=o;}                 /* далі — будуємо поруч, старе не чіпаємо */
}
function sync(i){
 var inr=inn[i].getBoundingClientRect(),ch=inn[i].children,bl=B[i]||[],nb=[],k;
 var ref=P[i]||T[i];
 var chg=!ref||Math.abs(ref.ph-inr.height)>.5||Math.abs(ref.iw-inr.width)>.5||bl.length!==ch.length;
 for(k=0;k<ch.length;k++){
  var r=ch[k].getBoundingClientRect(),o=bl[k],n={el:ch[k],t:r.top-inr.top,l:r.left-inr.left,w:r.width,h:r.height,stale:o?o.stale:1,done:o?o.done:0};
  if(!o||Math.abs(o.t-n.t)>.5||Math.abs(o.h-n.h)>.5||Math.abs(o.w-n.w)>.5||Math.abs(o.l-n.l)>.5)chg=true;
  nb.push(n);
 }
 B[i]=nb;
 if(chg){alloc(i,inr);full[i]=0;failN[i]=0;nb.forEach(function(b){b.stale=0;b.done=1;});}
}
var asm=[];
function shot(el,w,h,ts){
 FC.innerHTML='';var n=FD.importNode(el,true);
 var src=el.querySelectorAll('input,textarea'),dst=n.querySelectorAll('input,textarea');
 for(var q=0;q<src.length;q++){if(src[q].tagName==='TEXTAREA')dst[q].textContent=src[q].value;else dst[q].setAttribute('value',src[q].value);}
 n.style.margin='0';n.style.filter='';n.style.opacity='';n.style.width=w+'px';n.style.transform='none';n.style.willChange='auto';FC.appendChild(n);
 FR.style.width=Math.ceil(w)+'px';FR.style.height=Math.ceil(h)+'px';
 return html2canvas(n,{backgroundColor:null,scale:ts,logging:false,windowWidth:Math.ceil(w),windowHeight:Math.ceil(h),imageTimeout:0});
}
function pump(t){
 if(busy||!window.html2canvas)return;
 if(SH.want&&SH.el){grabSheet();return;}
 for(var d=0;d<NP;d++)for(var sg=-1;sg<=1;sg+=2){
  var i=sel+sg*d;if(i<0||i>NP-1||(d===0&&sg===1))continue;
  var near=Math.abs(i-sel)<=1;
  if(i>2&&!near)continue;
  if(!B[i]||((near||i<3)&&needSync[i])){sync(i);needSync[i]=0;}
  if(!full[i]){grabPage(i);return;}            /* перший знімок: усі блоки сторінки збираються офскрін і заливаються разом */
  if((!near&&i>2)||P[i])continue;
  var bl=B[i],best=null,bs=1e9,cy=sy[i]+DR.top+DR.height/2;
  for(var k=0;k<bl.length;k++){var b=bl[k];
   if(b.stale){var d2=Math.abs(b.t+b.h/2-cy);if(d2<bs){bs=d2;best=b;}}}
  if(best){grab(i,best);return;}                /* далі — лише змінені блоки */
 }
}
function useP(i,tgt){if(P[i]===tgt){drop(T[i]);T[i]=tgt;P[i]=null;}}
function finish(i,a){
 asm[i]=null;
 if(P[i]!==a.tgt&&T[i]!==a.tgt){return;}                              /* розкладка змінилась — знімок застарів */
 gl.bindTexture(gl.TEXTURE_2D,a.tgt.tex);
 gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,a.c);
 useP(i,a.tgt);full[i]=1;dirty=true;
}
function grabPage(i){
 var tgt=P[i]||T[i],bl=B[i],a=asm[i];
 if(!a||a.tgt!==tgt){
  var cn=document.createElement('canvas');cn.width=tgt.tw;cn.height=tgt.th;
  a=asm[i]={tgt:tgt,c:cn,x:cn.getContext('2d'),q:bl.map(function(_,k){return k;}),fail:0};
  bl.forEach(function(b){b.stale=0;b.done=1;});
 }
 if(!a.q.length){finish(i,a);return;}
 var cy=sy[i]+DR.top+DR.height/2,bi=0,bs=1e9;
 a.q.forEach(function(k,qi){var b=bl[k],d2=Math.abs(b.t+b.h/2-cy);if(d2<bs){bs=d2;bi=qi;}});
 var k=a.q[bi],b=bl[k];
 busy=true;
 shot(b.el,b.w,b.h,tgt.ts).then(function(c){busy=false;
  if(asm[i]!==a)return;
  a.x.drawImage(c,Math.round(b.l*tgt.ts),Math.round(b.t*tgt.ts));
  a.q.splice(a.q.indexOf(k),1);
  if(!a.q.length)finish(i,a);})
 .catch(function(e){busy=false;console.error(e);
  if(asm[i]!==a)return;
  if(++a.fail>3){a.q.splice(a.q.indexOf(k),1);a.fail=0;if(!a.q.length)finish(i,a);}});
}
function grab(i,b){
 var t=T[i];if(!t)return;
 busy=true;b.stale=0;
 shot(b.el,b.w,b.h,t.ts).then(function(c){busy=false;if(T[i]!==t)return;
  gl.bindTexture(gl.TEXTURE_2D,t.tex);
  gl.texSubImage2D(gl.TEXTURE_2D,0,Math.round(b.l*t.ts),Math.round(b.t*t.ts),gl.RGBA,gl.UNSIGNED_BYTE,c);
  b.done=1;dirty=true;})
 .catch(function(e){busy=false;console.error(e);});
}
/* знімок відкритого аркуша (форми) — щоб скляні меню над ним заломлювали саме його */
var SH={tex:null,tw:0,th:0,ts:1,cw:1,ch:1,x:0,y:0,on:0,ready:0,want:0,el:null};
function grabSheet(){
 var el=SH.el;if(!el){SH.want=0;return;}
 var w=el.offsetWidth,h=el.offsetHeight;if(w<2||h<2){SH.want=0;return;}
 var ts=Math.min(Math.min(S,1.25),MAXT/(h+4)),tw=Math.ceil(w*ts)+4,th=Math.ceil(h*ts)+4;
 if(!SH.tex||SH.tw!==tw||SH.th!==th){if(SH.tex)gl.deleteTexture(SH.tex);SH.tex=mkTex(tw,th);SH.tw=tw;SH.th=th;SH.ts=ts;SH.cw=tw/ts;SH.ch=th/ts;}
 SH.want=0;busy=true;var tex=SH.tex;
 shot(el,w,h,ts).then(function(c){busy=false;if(SH.tex!==tex)return;
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,c);SH.ready=1;dirty=true;})
 .catch(function(e){busy=false;console.error(e);});
}
function sheetStale(){SH.want=1;}
var pendingSync=false;
new MutationObserver(function(recs){recs.forEach(function(r){
 var n=r.target.nodeType===3?r.target.parentNode:r.target,p=n&&n.closest?n.closest('.page'):null,i=pg.indexOf(p);if(i<0)return;
 needSync[i]=1;tlStale[i]=1;var c=n;while(c&&c.parentNode!==inn[i])c=c.parentNode;
 if(c&&B[i]){var k=[].indexOf.call(inn[i].children,c);if(B[i][k])B[i][k].stale=1;}
});}).observe(root,{childList:true,characterData:true,subtree:true});

/* ===== 4. Розміри (кешуються, не читаються щокадру) ===== */
var fullMode=false,wantFull=false;
function rootGrid(){var gc=gridCell(),st=document.documentElement.style;st.setProperty('--gc',gc.toFixed(2)+'px');st.setProperty('--gx',((VW/2)%gc).toFixed(2)+'px');st.setProperty('--gy',((VH/2)%gc).toFixed(2)+'px');}
function measure(){
 var pt=dock.style.transform;dock.style.transform='none';
 var d=frect(dock),b=bgEl.getBoundingClientRect(),M=34;
 dock.style.transform=pt;
 var S2=Math.min(window.devicePixelRatio||1,2),x0,y0,w,h;
 x0=0;y0=0;w=Math.ceil(b.width);h=Math.ceil(b.height);
 DR={left:d.left,top:d.top,width:d.width,height:d.height};
 var wChanged=Math.abs(b.width-VW)>.5;
 if(ready&&!wChanged&&S2===S&&Math.abs(b.height-VH)<.5&&x0===R.x&&y0===R.y&&w===R.w&&h===R.h)return;
 S=S2;VW=b.width;VH=b.height;R={x:x0,y:y0,w:w,h:h};
 cv.style.left=x0+'px';cv.style.width=w+'px';cv.style.height=h+'px';cv.style.zIndex=fullMode?'24':'';
 if(!fullMode&&!document.documentElement.style.getPropertyValue('--appH')){cv.style.top='auto';cv.style.bottom=(b.height-y0-h)+'px';}else{cv.style.bottom='auto';cv.style.top=y0+'px';}
 cv.width=Math.round(w*S);cv.height=Math.round(h*S);gl.viewport(0,0,cv.width,cv.height);
 if(wChanged){T.forEach(drop);P.forEach(drop);T=[];P=[];B=[];full=[];asm=[];needSync=allSync();}
 LG('measure','VW '+VW+' VH '+VH+' S '+S+' док '+Math.round(DR.top)+'+'+Math.round(DR.height)+' полотно '+R.y+'+'+R.h+(fullMode?' (повноекранне)':'')+' SO '+SO);
 dirty=true;ready=true;rootGrid();
}
window.addEventListener('resize',measure);window.addEventListener('orientationchange',function(){setTimeout(measure,250);});
if(window.visualViewport)window.visualViewport.addEventListener('resize',measure);
measure();
['pageshow','focus','visibilitychange'].forEach(function(n){window.addEventListener(n,measure);});
(function poll(){measure();setTimeout(poll,performance.now()<6000?250:1500);})();

/* ===== 5. Док (6 слотів, слот 3 — клавіатура): бульбашка-желе, перетягування, фізика ===== */
var btns=[].slice.call(document.querySelectorAll('#btns button')),inp=document.getElementById('inp');
var NS=5,KS=2,slotOf=[0,1,3,4];
var dockSel=2,sheetOn=0,menuA=0,x=null,v=0,j=0,jv=0,dir=1,last=0,drag=null,dragTarget=0,kbTap=null,kbClick=false;
var K=160,D=15,KJ=300,DJ=12,GJ=0.002;
function cells(){var pad=6,cw=(DR.width-2*pad)/NS;return{r:DR,cw:cw,cx:function(sl){return DR.left+pad+cw*(sl+.5);}};}
function slotAt(c,px){return Math.max(0,Math.min(NS-1,Math.round((px-c.cx(0))/c.cw)));}
function tabNear(c,px){var fs=(px-c.cx(0))/c.cw,bi=0,bd=1e9;for(var q=0;q<slotOf.length;q++){var dd=Math.abs(slotOf[q]-fs);if(dd<bd){bd=dd;bi=q;}}return bi;}
function setOn(i){btns.forEach(function(o,k){o.classList.toggle('on',k===slotOf[i]);});}

/* --- крапля-поле введення: вилітає з кнопки, стає полем над клавіатурою, при закритті падає назад --- */
var mode=0;                 /* 0 — немає, 1 — відкрито, 2 — повертається в панель */
var pill={x:0,y:0,hw:0,hh:0,vx:0,vy:0,vw:0,vh:0,van:0},hide=1,lastOff=-1,baseKbd=0,baseInner=0,lastKb=0,openAt=0,kbdSeen=false,kbNow=0,closeAt=0,pillShow=false,inpKey='';
var GAP=46,NK=44;     /* відступ над клавіатурою; ширина «перешийка» поверхневого натягу */
var touchDev=('ontouchstart' in window)||(navigator.maxTouchPoints>0);
function kbEstimate(){var w=Math.min(window.innerWidth,screen.width||window.innerWidth);return Math.round(336+(w-393)*0.27);}   /* висота клавіатури iPhone з рядком підказок */
function vvm(){var vv=window.visualViewport;return vv?{t:Math.max(0,vv.offsetTop),l:vv.offsetLeft,w:vv.width,h:vv.height}:{t:0,l:0,w:VW,h:VH};}
function hideOff(){return VH-DR.top+24;}
function pillTarget(){
 if(mode===1){
  var m=vvm(),hw=Math.min(m.w-24,460)/2,top=null;
  var kbVV=VH-(m.t+m.h)-baseKbd,kbIn=baseInner-window.innerHeight;
  if(kbVV>100){top=m.t+m.h;kbdSeen=true;lastKb=kbVV+baseKbd;}            /* Safari: visualViewport */
  else if(kbIn>100){top=VH;kbdSeen=true;lastKb=kbIn;}                    /* WebView: вікно стислось */
  else if(touchDev){top=VH-(lastKb||kbEstimate());}                      /* запасний варіант: відома висота клавіатури */
  kbNow=Math.max(kbVV,kbIn);
  return{x:m.l+m.w/2,y:top!==null?top-GAP-26:DR.top-14-26,hw:hw,hh:26};
 }
 var c=cells();
 return{x:c.cx(KS),y:DR.top+DR.height/2+hide*hideOff(),hw:22,hh:22};
}
function spr(o,a,b,tv,h,k,dm){var ac=k*(tv-o[a])-dm*o[b];o[b]+=ac*h;o[a]+=o[b]*h;}
function stepPill(dt){
 var t=pillTarget(),k=mode===1?180:125,dm=mode===1?15:12.5,n=3,h=dt/n;
 for(var q=0;q<n;q++){spr(pill,'x','vx',t.x,h,k,dm);spr(pill,'y','vy',t.y,h,k,dm);spr(pill,'hw','vw',t.hw,h,k,dm);spr(pill,'hh','vh',t.hh,h,k,dm);}
}
function placeInput(t){
 inp.style.width=(2*t.hw)+'px';inp.style.height=(2*t.hh)+'px';
 inp.style.transform='translate3d('+(t.x-t.hw)+'px,'+(t.y-t.hh)+'px,0)';
 var sb=document.getElementById('send');if(sb)sb.style.transform='translate3d('+(t.x+t.hw-44)+'px,'+(t.y-19)+'px,0)';
}
function openInput(){
 if(mode===1||!ready)return;
 var c=cells(),m=vvm(),was=mode;
 baseKbd=Math.max(0,VH-(m.t+m.h));baseInner=window.innerHeight;kbdSeen=false;kbNow=0;openAt=performance.now();
 if(!was){pill.x=c.cx(KS);pill.y=DR.top+DR.height/2;pill.hw=pill.hh=22;pill.vx=pill.vy=pill.vw=pill.vh=0;}
 pill.van=0;op.age=0;op.x0=pill.x;op.y0=pill.y;
 mode=1;pillShow=false;inp.classList.remove('show');
 var t=pillTarget();placeInput(t);inpKey=t.x+','+t.y+','+t.hw;
 inp.style.pointerEvents='auto';
 try{inp.focus({preventScroll:true});}catch(_){inp.focus();}   /* у тому ж жесті — інакше iOS не покаже клавіатуру */
 wantFull=true;dirty=true;   /* розмір полотна змінюється в кадрі перед малюванням — без миготіння */
}
var bump=0;
var cl={age:0,x0:0,y0:0,hw0:0,hh0:0},op={age:0,x0:0,y0:0},B1=.40,B2=.09,B3=.50,DROP=1.75,ZE=.78,HWS=1.7,HHS=.55;
var ps={l:0,r:0,vl:0,vr:0},atPrev=true;
var A1=.30,A2=.46;   /* фази згортання: звуження, падіння */
function closeInput(){
 if(mode!==1)return;
 mode=2;closeAt=performance.now();pill.van=0;cl.age=0;cl.x0=pill.x;cl.y0=pill.y;cl.hw0=pill.hw;cl.hh0=pill.hh;pill.vx=pill.vy=pill.vw=pill.vh=0;
 inp.classList.remove('show');document.getElementById('send').classList.remove('show');inp.style.pointerEvents='none';dirty=true;
 onDropClosed();
}
function blurClose(){if(sendDown)return;closeInput();}
inp.addEventListener('blur',blurClose);inp.addEventListener('focusout',blurClose);
inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();submitDrop();}});
root.addEventListener('pointerdown',function(){if(mode===1&&document.activeElement===inp)inp.blur();},true);

var TAB_IDS=['analytics','debts','home','more'];
function actTab(i){try{app.activateButton(TAB_IDS[i]);}catch(err){console.error(err);}}
dock.addEventListener('pointerdown',function(e){
 e.preventDefault();if(mode===1)return;
 kbClick=false;
 var c=cells(),px=e.clientX,grab=x!==null&&Math.abs(px-x)<c.cw/2+4,sl=slotAt(c,px);
 if(grab){drag={id:e.pointerId,off:x-px,start:x};dragTarget=x;try{dock.setPointerCapture(e.pointerId);}catch(_){}}
 else if(sl===KS){kbTap={id:e.pointerId,x:e.clientX,y:e.clientY};kbClick=true;}
 else{var i=sl>KS?sl-1:sl;if(i===dockSel&&i!==3)return;dir=(c.cx(slotOf[i])-x)>=0?1:-1;actTab(i);}
});
dock.addEventListener('pointermove',function(e){
 if(kbTap&&e.pointerId===kbTap.id&&Math.hypot(e.clientX-kbTap.x,e.clientY-kbTap.y)>12){kbTap=null;kbClick=false;}
 if(!drag||e.pointerId!==drag.id)return;e.preventDefault();var c=cells();
 dragTarget=Math.max(c.cx(0),Math.min(c.cx(NS-1),e.clientX+drag.off));setOn(tabNear(c,dragTarget));
});
function release(e){
 if(kbTap&&e.pointerId===kbTap.id){var ok=e.type==='pointerup';kbTap=null;if(ok)tapInput();return;}
 if(!drag||e.pointerId!==drag.id)return;var c=cells();
 var tab=tabNear(c,Math.max(c.cx(0),Math.min(c.cx(NS-1),x+v*0.12))),moved=Math.abs(dragTarget-drag.start)>10;
 drag=null;setOn(dockSel);
 if(tab!==dockSel)actTab(tab);else if(!moved&&tab===3)actTab(3);}
dock.addEventListener('pointerup',release);dock.addEventListener('pointercancel',function(e){kbTap=null;kbClick=false;release(e);});
dock.addEventListener('click',function(){   /* запасний шлях для iOS: фокус саме в click */
 if(kbClick){kbClick=false;if(mode!==1)tapInput();}
 if(mode===1&&document.activeElement!==inp)try{inp.focus({preventScroll:true});}catch(_){inp.focus();}
});
function step(h,target){
 var kk=drag?420:K,dd=drag?26:D,a=kk*(target-x)-dd*v;
 v+=a*h;x+=v*h;jv+=(-KJ*j-DJ*jv+GJ*a*dir)*h;j+=jv*h;
}

/* ---- власний скрол: позиція одна на DOM і на скло, оновлюються в одному rAF ---- */
var sy=[],ly=[],sv=0,sIdx=0,sMax=0,sp=null,lastMotion=0,scrimV=0,scrimT=0;
for(var qq=0;qq<NP;qq++)sy.push(0);
function maxScroll(i){return Math.max(0,inn[i].offsetHeight-VH);}
/* ---- перегортання вкладок дока свайпом: Аналітика ↔ Борги ↔ Дім → «Додатково». Сторінки їдуть за пальцем ---- */
var HS={on:0,ca:0,x0:0,vx:0,lx:0,lt:0},hsAt=0;
function tabSwipeOk(){return sel<=2&&!nav.getState().overlays.length&&mode!==1&&!boot.on&&!menu.on&&!sheetOn;}
function rbz(x){return x/(1+x*4)*.6;}   /* гумовий опір за крайніми вкладками */
function hsMove(e){
 var dx=e.clientX-HS.x0,c=sel-dx/VW;
 if(c<0)c=-rbz(-c);else if(c>2)c=2+rbz(c-2);
 HS.ca=c;var dt=Math.max(1,e.timeStamp-HS.lt);HS.vx=.6*HS.vx+.4*((e.clientX-HS.lx)/dt);HS.lx=e.clientX;HS.lt=e.timeStamp;
}
function hsEnd(cancel){
 var dx=HS.lx-HS.x0,v=HS.vx,go=0;HS.on=0;hsAt=performance.now();
 if(!cancel){
  if(dx<-VW*.22||(dx<-30&&v<-.45))go=1;else if(dx>VW*.22||(dx>30&&v>.45))go=-1;
  if(go===1){if(sel<2)actTab(sel+1);else actTab(3);}       /* з «Дім» свайп ліворуч відкриває «Додатково» */
  else if(go===-1&&sel>0)actTab(sel-1);
 }
 LG('swipe','вкладки: dx '+Math.round(dx)+' v '+v.toFixed(2)+' → '+(go===1?'вперед':go===-1?'назад':'на місці'));
}
root.addEventListener('pointerdown',function(e){
 if(Math.abs(sel-ca)>0.02)return;
 sIdx=sel;sMax=maxScroll(sel);sv=0;sp={id:e.pointerId,x0:e.clientX,y:e.clientY,t:e.timeStamp,start:e.clientY,cap:false,h:false,tg:e.target};
});
root.addEventListener('pointermove',function(e){
 if(!sp||e.pointerId!==sp.id)return;
 if(sp.h){hsMove(e);return;}
 if(!sp.cap){
  var ddx=e.clientX-sp.x0,ddy=e.clientY-sp.start;
  if(Math.abs(ddx)>10&&Math.abs(ddx)>Math.abs(ddy)*1.3&&tabSwipeOk()&&!(e.target.closest&&e.target.closest('.mchart'))){
   sp.h=true;HS.on=1;HS.x0=e.clientX;HS.ca=sel;HS.vx=0;HS.lx=e.clientX;HS.lt=e.timeStamp;
   try{sp.tg.setPointerCapture(e.pointerId);}catch(_){}
   hsMove(e);return;
  }
  if(Math.abs(ddy)<6)return;sp.cap=true;try{sp.tg.setPointerCapture(e.pointerId);}catch(_){}
 }
 var i=sIdx,dy=e.clientY-sp.y,dt=Math.max(e.timeStamp-sp.t,1),y=sy[i];
 var o=y<0?-y:(y>sMax?y-sMax:0),f=(o>0&&((y<0&&dy>0)||(y>sMax&&dy<0)))?1/(1+o/60):1;
 sy[i]=y-dy*f;sv=0.6*sv+0.4*(-dy/dt*1000);sp.y=e.clientY;sp.t=e.timeStamp;
});
function spUp(e){if(sp&&e.pointerId===sp.id){if(sp.h)hsEnd(e.type==='pointercancel');sp=null;}}
root.addEventListener('pointerup',spUp);root.addEventListener('pointercancel',spUp);
root.addEventListener('click',function(e){if(performance.now()-hsAt<350){e.stopPropagation();e.preventDefault();}},true);   /* після свайпу клік не спрацьовує */
var WH={x:0,on:0,tm:0,ft:0};
root.addEventListener('wheel',function(e){
 e.preventDefault();
 var ax=Math.abs(e.deltaX),ay=Math.abs(e.deltaY);
 fd.on=true;fd.dx=Math.max(-160,Math.min(160,fd.dx-e.deltaX*.5));fd.dy=Math.max(-120,Math.min(120,fd.dy-e.deltaY*.3));
 clearTimeout(WH.ft);WH.ft=setTimeout(function(){fd.on=false;fd.dx=fd.dy=0;},180);
 if((WH.on||ax>ay*1.2)&&(WH.on||tabSwipeOk())){
  if(!WH.on){WH.on=1;WH.x=0;HS.on=1;HS.x0=0;HS.vx=0;}
  WH.x-=e.deltaX;var c=sel-WH.x/VW;if(c<0)c=-rbz(-c);else if(c>2)c=2+rbz(c-2);
  HS.ca=c;HS.lx=WH.x;HS.vx=.6*HS.vx+.4*(-e.deltaX/16);
  clearTimeout(WH.tm);WH.tm=setTimeout(function(){WH.on=0;hsEnd(false);},140);
  return;
 }
 sIdx=sel;sMax=maxScroll(sel);sy[sel]=Math.max(0,Math.min(sMax,sy[sel]+e.deltaY));sv=0;
},{passive:false});
function stepScroll(dt){
 var i=sIdx,y=sy[i],act=!!sp;
 if(!sp){
  if(y<0||y>sMax){var tg=y<0?0:sMax;sv+=(-140*(y-tg)-22*sv)*dt;y+=sv*dt;act=true;if(Math.abs(y-tg)<0.3&&Math.abs(sv)<8){y=tg;sv=0;}}
  else if(Math.abs(sv)>3){y+=sv*dt;sv*=Math.exp(-2.4*dt);act=true;}
  else sv=0;
  sy[i]=y;
 }
 for(var q=0;q<NP;q++)if(ly[q]!==sy[q]){ly[q]=sy[q];inn[q].style.transform='translate3d(0,'+(-sy[q])+'px,0)';}
 return act;
}
/* ---- скляне меню: Додатково / випадаючі списки ---- */
function gridCell(){var k=Math.max(1,Math.round((VW/2-6)/GRID_CELL));return(VW/2-6)/k;}   /* клітинка ≈0,75 см, крайні лінії на 6 pt (~1 мм) від країв */
var vpLastH=0,vpLastT=0,vpLog=[];
function vpSample(t){var h=innerHeight;if(h!==vpLastH){vpLastH=h;vpLastT=t;vpLog.push([Math.round(t),h,Math.round(window.visualViewport?window.visualViewport.height:0)]);if(vpLog.length>14)vpLog.shift();}}
var dockY=null,dkLast=0;
var GCOL=[.58,.58,.58],GC_UP=[.12,.62,.30],GC_DN=[.72,.10,.12],GC_NE=[.58,.58,.58];   /* лінії сітки: темно-зелені / темно-червоні / сірі за трендом балансу */
var BLS=4,gOX=0,gOY=0,fd={on:false,x0:0,y0:0,dx:0,dy:0};   /* fd — зсув пальця від точки дотику, сітка йде за ним */
document.addEventListener('pointerdown',function(e){fd.on=true;fd.x0=e.clientX;fd.y0=e.clientY;fd.dx=0;fd.dy=0;},true);
document.addEventListener('pointermove',function(e){if(fd.on){fd.dx=e.clientX-fd.x0;fd.dy=e.clientY-fd.y0;}},true);
['pointerup','pointercancel'].forEach(function(n){document.addEventListener(n,function(){fd.on=false;},true);});                              /* розмиття фону під вікнами (σ, px) і зсув сітки за скролом */
var KZ=.8;                                           /* зум шарів під верхнім вікном: −20% */
function kOf(v){return Math.pow(KZ,v);}
function mkPanel(el,o){return Object.assign({on:0,s:0,vs:0,tx:0,ty:0,tw:0,th:0,r:28,ax:0,ay:0,rise:0,mode:'grow',el:el,g:{cx:0,cy:0,hw:0,hh:0,r:1,v:0},
 def:{x:0,y:0,vx:0,vy:0,sx:0,sy:0,wx:0,wy:0},tgt:{x:0,y:0,sx:0,sy:0},dragging:0,cf:1,kind:''},o||{});}
var menu=mkPanel(document.getElementById('menu'),{shade:document.getElementById('menuShade')});
var sheetP=mkPanel(null,{r:62,mode:'rise'});
/* ---- «відступ» шарів під верхнім шаром: зсув до місця відкриття, зменшення, м'яке розмиття ---- */
var rec={pg:{v:0,ox:0,oy:0,tx:0,ty:0},mn:{v:0,ox:0,oy:0,tx:0,ty:0},sh:{v:0,ox:0,oy:0,tx:0,ty:0}},recMoving=false,RB=0,RD=.1;
var pagesEl=document.getElementById('pages'),sheetsEl2=document.getElementById('sheets');
var refAt=[0,0,0];
function refreshTabs(t){      /* неактивні сторінки-вкладки перезнімаються у випадковий момент протягом ~хвилини */
 if(boot.on)return;
 for(var i=0;i<3;i++){
  if(i===sel){continue;}
  if(!refAt[i]){refAt[i]=t+Math.random()*60000;continue;}
  if(t>refAt[i]){refAt[i]=t+40000+Math.random()*40000;
   if(B[i]){B[i].forEach(function(b){b.stale=1;});needSync[i]=1;}}
 }
}
var edgeEl=document.getElementById('edge');
function recStep(dt){
 var dd=(menu.on&&menu.kind==='dd')?1:0,mo=(menu.on&&menu.kind==='more')?1:0,sh=sheetOn?1:0;
 var tg={pg:Math.min(2,dd+mo+sh),mn:sh,sh:dd&&sh?1:0};
 var top={ox:VW/2,oy:0,tx:0,ty:-.05*VH},ul={ox:0,oy:0,tx:-.045*VW,ty:-.04*VH},mv=false;
 /* налаштування над «Додатково»: шари розходяться — екран тягнеться до лівого краю, панель до правого кута */
 var ulS={ox:0,oy:0,tx:-.07*VW,ty:-.05*VH},trc={ox:VW,oy:0,tx:.05*VW,ty:-.05*VH};
 var L={pg:sh?ulS:dd?top:ul,mn:dd?top:trc,sh:top};   /* меню-випадайка (dd) ділить шар mn і мусить рухатись разом із аркушем */
 ['pg','mn','sh'].forEach(function(k){
  var o=rec[k],d=tg[k]-o.v;
  if(Math.abs(d)>.0015){o.v+=d*(1-Math.exp(-dt*5.5));mv=true;}else if(d!==0){o.v=tg[k];mv=true;}
  var P=L[k];
  if(o.v<.003&&tg[k]===0){o.ox=P.ox;o.oy=P.oy;o.tx=P.tx;o.ty=P.ty;}
  else{var f=1-Math.exp(-dt*8);o.ox+=(P.ox-o.ox)*f;o.oy+=(P.oy-o.oy)*f;o.tx+=(P.tx-o.tx)*f;o.ty+=(P.ty-o.ty)*f;}
 });
 recMoving=mv;
 applyRec(pagesEl,rec.pg);
 var bsx=Math.min(1,rec.pg.v),bsv=bsx>.003?'blur('+(bsx*BLS).toFixed(1)+'px)':'';
 if(TGC._f!==bsv){TGC._f=bsv;TGC.style.filter=bsv;}
 if(tickerEl._f!==bsv){tickerEl._f=bsv;tickerEl.style.filter=bsv;}
 var ev=Math.min(1,rec.pg.v).toFixed(3);if(edgeEl._ev!==ev){edgeEl._ev=ev;edgeEl.style.opacity=ev;}
}
function applyRec(el,o){
 var st='';
 if(o.v>.003){st='o'+o.ox.toFixed(1)+','+o.oy.toFixed(1)+','+o.v.toFixed(3)+','+o.tx.toFixed(1)+','+o.ty.toFixed(1);}
 if(el._rk===st)return;el._rk=st;
 if(!st){el.style.transform='';el.style.filter='';return;}
 el.style.transformOrigin=o.ox.toFixed(1)+'px '+o.oy.toFixed(1)+'px';
 el.style.transform='translate('+(o.tx*o.v).toFixed(2)+'px,'+(o.ty*o.v).toFixed(2)+'px) scale('+kOf(o.v).toFixed(4)+')';
 el.style.filter='blur('+(Math.min(1,o.v)*BLS).toFixed(1)+'px) brightness('+(1-RD*o.v).toFixed(3)+')';
}
/* ---- екран завантаження ---- */
var boot={on:1,hold:1,phase:0,t0:0,t1:0,t2:0,p:0,cx:0,cy:0,rmax:0,r:0,r0:0,DUR:(/[?&]slowboot/.test(location.search)?14:2.4),MIN:1.8,warm:0,
 el:document.getElementById('boot'),bar:document.querySelector('#boot .bbar i'),wrap:document.querySelector('#boot .bwrap'),logo:document.querySelector('#boot .blogo'),ring:document.querySelector('#boot .bring')};
function rrPts(cx,cy,hw,hh,r,n){
 var p=[],k,i,a,cs=[[cx+hw-r,cy-hh+r,-90],[cx+hw-r,cy+hh-r,0],[cx-hw+r,cy+hh-r,90],[cx-hw+r,cy-hh+r,180]];
 for(k=0;k<4;k++)for(i=0;i<=n;i++){a=(cs[k][2]+90*i/n)*Math.PI/180;p.push((cs[k][0]+r*Math.cos(a)).toFixed(1)+'px '+(cs[k][1]+r*Math.sin(a)).toFixed(1)+'px');}
 return p;
}
function smooth01(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
var fontsOK=!(document.fonts&&document.fonts.ready);
if(!fontsOK)document.fonts.ready.then(function(){fontsOK=true;});
function bootGate(el,t){
 if(boot.lay)return;
 var stable=t-vpLastT>900;
 var gk=(stable?'стабільне':'змінюється')+' '+innerHeight;if(gk!==bootGate.k){bootGate.k=gk;LG('gate','вікно '+gk+' (екран '+screen.height+', lvh-режим '+(LV?1:0)+')');}
 if((stable||el>5.5)&&(fontsOK||el>5.5)&&ready&&el>.6){measure();tlAllStale();boot.lay=1;LG('gate','готово: вихід із завантаження');}
}
function bootStep(t,dt){
 if(!boot.on)return;
 if(!boot.t0)boot.t0=t;
 var el=(t-boot.t0)/1000;
 if(boot.phase<2){
  var h=window.__h2c,real=(h===1?.25:0)+.75*((full[0]?1:0)+(full[1]?1:0)+(full[2]?1:0))/3;
  if(h===-1&&el>2.5)real=1;
  bootGate(el,t);if(!boot.lay)real=Math.min(real,.92);
  var tgt=Math.min(real,el/boot.MIN);if(el>9)tgt=1;
  boot.p+=(tgt-boot.p)*(1-Math.exp(-dt*7));if(tgt>=1&&boot.p>.985)boot.p=1;
  var pp=Math.max(0,Math.min(1,boot.p)),sc=2.4*(1-Math.pow(pp,1.8));   /* логотип зменшується разом із завантаженням, наприкінці до нуля */
  boot.logo.style.transform='scale('+sc.toFixed(4)+')';var gsT=sc/2.4;if(boot.gs===undefined)boot.gs=gsT;boot.gs+=(gsT-boot.gs)*(1-Math.exp(-dt*14));if(gsT===0&&boot.gs<.01)boot.gs=0;
  var ws=boot.wrap.style;ws.setProperty('--gs',boot.gs.toFixed(3));ws.setProperty('--rs',(boot.gs*1.1).toFixed(3));ws.setProperty('--ro',Math.min(1,boot.gs*1.6).toFixed(3));ws.setProperty('--rr',(t*.012%360).toFixed(1)+'deg');
  if(el>.25&&!boot.lit){boot.lit=1;boot.el.classList.add('lit');}
  if(boot.phase===0&&boot.p>=1){boot.phase=1;boot.t1=t;LG('boot','фаза 1: логотип зник, '+Math.round(el*1000)+' мс від старту анімації');boot.wrap.classList.add('p1');boot.warm=1;dirty=true;}
  else if(boot.phase===1&&t-boot.t1>330){
   boot.phase=2;boot.t2=t;boot.wrap.classList.add('p2');
   var r=frect(boot.logo);boot.cx=r.left+r.width/2;boot.cy=r.top+r.height/2;introStart(t);LG('boot','фаза 2: розширення з '+Math.round(boot.cx)+','+Math.round(boot.cy)+' (SO '+SO+')');
   cv.style.opacity=1;dirty=true;
  }
 }
 if(boot.phase===2){
  var u=Math.min(1,(t-boot.t2)/1000/boot.DUR),e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;   /* плавний старт і плавне завершення */
  var s0=2+15*Math.min(1,u/.1);                                                        /* квадрат «вилітає» з точки й одразу має розмір логотипа */
  var hw=s0+(VW/2-s0)*e,hh=s0+(VH/2-s0)*e,cx=boot.cx+(VW/2-boot.cx)*e,cy=boot.cy+(VH/2-boot.cy)*e;
  var mn=Math.min(hw,hh),rr=Math.max(.5,Math.min(62,mn*(1-.552*smooth01(.06,.32,u))));                                /* від пропорцій логотипа до радіуса екрана 62 pt */
  var gw=Math.max(.5,hw-6*e),gh=Math.max(.5,hh-6*e);
  boot.g={cx:cx,cy:cy,hw:gw,hh:gh,r:Math.max(.5,Math.min(rr,gw,gh)),v:1-smooth01(.68,1,u)};
  var hp=rrPts(cx,cy,Math.max(.5,hw-1.5),Math.max(.5,hh-1.5),Math.max(.5,rr-1.5),12);
  boot.el.style.clipPath='polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,'+hp.join(',')+','+hp[0]+')';
  var ro=smooth01(.03,.09,u)*(1-smooth01(.6,1,u)),pad=12+18*e;
  if(boot.ring){var rs=boot.ring.style;rs.opacity=ro.toFixed(3);rs.left=(cx-gw-pad).toFixed(1)+'px';rs.top=(cy-gh-pad).toFixed(1)+'px';rs.width=(2*(gw+pad)).toFixed(1)+'px';rs.height=(2*(gh+pad)).toFixed(1)+'px';rs.borderRadius=(Math.min(gw,gh,rr)+pad).toFixed(1)+'px';}
  var ws2=boot.wrap.style;ws2.setProperty('--rs',(.5+4.2*e).toFixed(3));ws2.setProperty('--ro',(smooth01(.02,.1,u)*(1-smooth01(.45,.9,u))).toFixed(3));ws2.setProperty('--rr',(t*.012%360).toFixed(1)+'deg');
  if(u>=.55)boot.hold=0;
  if(u>=1){LG('boot','кінець завантаження');boot.on=0;boot.el.style.display='none';dirty=true;}
 }
}
/* ---- спільна фізика скляної панелі: пружина появи, деформація за пальцем, відступ під верхнім вікном ---- */
function panelStep(P,dt,L,k,dm,fade,bl){
 var tg=P.on?1:0,h=dt/2,q,d=P.def,t=P.tgt;
 for(q=0;q<2;q++){var a=k*(tg-P.s)-dm*P.vs;P.vs+=a*h;P.s+=P.vs*h;
  d.vx+=(300*(t.x-d.x)-21*d.vx)*h;d.x+=d.vx*h;d.vy+=(300*(t.y-d.y)-21*d.vy)*h;d.y+=d.vy*h;
  d.wx+=(340*(t.sx-d.sx)-20*d.wx)*h;d.sx+=d.wx*h;d.wy+=(340*(t.sy-d.sy)-20*d.wy)*h;d.sy+=d.wy*h;}
 var sc=Math.max(0,P.s),grow=P.mode==='grow',kk=kOf(L.v);
 var cx0=P.tx+P.tw/2,cy0=P.ty+P.th/2,Qx,Qy,Qs=grow?sc:1;
 if(grow){Qx=P.ax+(cx0-P.ax)*sc;Qy=P.ay+(cy0-P.ay)*sc;}else{Qx=cx0;Qy=cy0+(1-sc)*P.rise;}
 var cx=L.ox+kk*(Qx-L.ox)+L.tx*L.v+d.x,cy=L.oy+kk*(Qy-L.oy)+L.ty*L.v+d.y,s2=Qs*kk,sx=Math.max(1e-3,s2*(1+d.sx)),sy=Math.max(1e-3,s2*(1+d.sy));
 var hw=Math.max(.5,P.tw/2*sx),hh=Math.max(.5,P.th/2*sy),mn=Math.min(hw,hh);
 var rr=grow?Math.max(P.r*Math.min(sx,sy),mn*Math.max(0,1-s2*1.4)):P.r*Math.min(sx,sy);
 var cf=fade?1-Math.min(1,L.v*1.1):1,vis=(grow?Math.min(1,sc):Math.min(1,sc*3))*cf;
 var g=P.g;g.cx=cx;g.cy=cy;g.hw=hw;g.hh=hh;g.r=Math.max(.5,Math.min(rr,mn));g.v=Math.max(0,vis);
 var el=P.el;
 if(el){
  el.style.transformOrigin='0 0';
  el.style.transform='translate('+(cx-hw-P.tx).toFixed(2)+'px,'+(cy-hh-P.ty).toFixed(2)+'px) scale('+sx.toFixed(4)+','+sy.toFixed(4)+')';
  el.style.opacity=(grow?Math.max(0,Math.min(1,(sc-.35)/.55)):Math.max(0,Math.min(1,sc*4)))*cf;
  el.style.filter=(bl&&L.v>.02)?'blur('+(Math.min(1,L.v)*BLS).toFixed(1)+'px)':'';
 }
 if(!P.on&&P.s<.012&&Math.abs(P.vs)<.4&&Math.abs(d.x)+Math.abs(d.y)<.5){P.s=0;P.vs=0;d.x=d.y=d.vx=d.vy=d.sx=d.sy=0;P.tgt.x=P.tgt.y=P.tgt.sx=P.tgt.sy=0;g.v=0;return true;}
 return false;
}
function stepMenu(dt){
 var more=menu.kind==='more';
 if(panelStep(menu,dt,rec.mn,more?190:260,more?26:31,false,more)){menu.el.style.display='none';menu.shade.style.display='none';}
 var pe=(menu.on&&!(more&&sheetOn))?'auto':'none';menu.shade.style.pointerEvents=pe;menu.el.style.pointerEvents=pe;
 menuA=Math.max(0,menu.s);
 var cov=more&&sheetOn&&sheetP.g.v>.01;
 menu.el.style.zIndex=cov?28:'';
 var clip='';
 if(cov){var m=menu.g,sg=sheetP.g,k=menu.tw/Math.max(1,2*m.hw),x1=(sg.cx-sg.hw-(m.cx-m.hw))*k,x2=(sg.cx+sg.hw-(m.cx-m.hw))*k,y1=(sg.cy-sg.hh-(m.cy-m.hh))*k,y2=(sg.cy+sg.hh-(m.cy-m.hh))*k,W=menu.tw+60,H=menu.th+60;
  clip='polygon(evenodd,-30px -30px,'+W+'px -30px,'+W+'px '+H+'px,-30px '+H+'px,-30px -30px,'+x1.toFixed(1)+'px '+y1.toFixed(1)+'px,'+x1.toFixed(1)+'px '+y2.toFixed(1)+'px,'+x2.toFixed(1)+'px '+y2.toFixed(1)+'px,'+x2.toFixed(1)+'px '+y1.toFixed(1)+'px,'+x1.toFixed(1)+'px '+y1.toFixed(1)+'px)';}
 if(menu.el._cl!==clip){menu.el._cl=clip;menu.el.style.clipPath=clip;}
}
var sheetA=0,ghost=0;
function stepSheet(dt){
 if(panelStep(sheetP,dt,rec.sh,175,26,false,true)){if(sheetP.el)sheetP.el.style.display='none';}
 sheetA=Math.max(0,sheetP.s);
}
function frame(t){
 requestAnimationFrame(frame);
 vpSample(t);
 {liveEnv();lvCheck();if(SO<-.5&&mode!==1&&(frame.st||0)<6&&t>(frame.stn||0)){frame.st=(frame.st||0)+1;frame.stn=t+400;window.scrollTo(0,0);LG('fix','scrollTo(0,0) спроба '+frame.st+' → scrollY '+Math.round(window.scrollY||0));}
  var bgH=bgEl.getBoundingClientRect().height,dty=bgH-72-14-SAFE.b;
  if(Math.abs(dty-(frame.dt0===undefined?-1:frame.dt0))>.5){frame.dt0=dty;LG('dock','ціль top '+dty.toFixed(1)+' (висота '+Math.round(bgH)+', safe.b '+SAFE.b+')');}
  if(dockY===null)dockY=dty;
  if(Math.abs(dty-dockY)>.3)dockY+=(dty-dockY)*(1-Math.exp(-Math.min(.05,Math.max(.001,(t-dkLast)/1000))*9));else dockY=dty;
  dkLast=t;var dys=dockY.toFixed(2)+'px';if(dock._dy!==dys){dock._dy=dys;dock.style.setProperty('--dockTop',dys);}}
 {var bgR=bgEl.getBoundingClientRect(),dkR=frect(dock),ap=lastOff>.1?lastOff:0;
  if(Math.abs(bgR.height-VH)>.5||Math.abs(bgR.width-VW)>.5||Math.abs(dkR.top-ap-DR.top)>.6||Math.abs(dkR.left-DR.left)>.6)measure();}
 if(window.__lt){window.__fps=.9*(window.__fps||60)+.1*(1000/Math.max(1,t-window.__lt));}window.__lt=t;
 var dt=Math.min(Math.max((t-last)/1000,0),1/30);last=t;
 var da=sel-ca,moving=false,i;
 if(HS.on){ca=HS.ca;moving=true;}
 else if(Math.abs(da)>0.0005){ca+=da*(1-Math.exp(-dt*9));moving=true;}else if(da!==0){ca=sel;moving=true;}
 for(i=0;i<NP;i++){var o=i-ca,vis=Math.abs(o)<1,st=vis?'translate3d('+(o*100)+'%,0,0)':'none';
  if(pstyle[i]!==st){pstyle[i]=st;pg[i].style.visibility=vis?'visible':'hidden';inn[i].style.willChange=vis?'transform':'auto';if(vis)pg[i].style.transform=st;}}
 var fl=Math.max(0,Math.min(NP-1,Math.floor(ca))),f2=fl+1;
 var scrolling=stepScroll(dt);
 var fgx=fd.on?Math.max(-70,Math.min(70,-fd.dx*.25)):0,fgy=fd.on?Math.max(-50,Math.min(50,-fd.dy*.12)):0;
 var gcl=gridCell(),gtx=ca*(Math.max(1,Math.round(VW*.18/gcl))*gcl)+fgx,gty=(sy[sel]||0)*.28+fgy,gMov=false;
 if(Math.abs(gtx-gOX)+Math.abs(gty-gOY)>.04){var gf=1-Math.exp(-dt*9);gOX+=(gtx-gOX)*gf;gOY+=(gty-gOY)*gf;gMov=true;}else if(gtx!==gOX||gty!==gOY){gOX=gtx;gOY=gty;gMov=true;}
 {var gtc=BAL_TREND>0?GC_UP:BAL_TREND<0?GC_DN:GC_NE;
  if(frame.gk!==gtc){frame.gk=gtc;document.documentElement.style.setProperty('--glc','rgba('+Math.round(gtc[0]*255)+','+Math.round(gtc[1]*255)+','+Math.round(gtc[2]*255)+',.17)');LG('grid','колір сітки → '+(BAL_TREND>0?'зелений':BAL_TREND<0?'червоний':'сірий'));}
  for(var gq=0;gq<3;gq++){var gdd=gtc[gq]-GCOL[gq];if(Math.abs(gdd)>.002){GCOL[gq]+=gdd*(1-Math.exp(-dt*4));gMov=true;}else GCOL[gq]=gtc[gq];}}
 recStep(dt);
 refreshTabs(t);
 if(intro.on)introStep(t);
 if(tgOK)drawTiles();
 if(menu.s>0||menu.on)stepMenu(dt);
 if(sheetP.s>0||sheetP.on)stepSheet(dt);
 bootStep(t,dt);
 if(Math.abs(scrimV-scrimT)>.002){scrimV+=(scrimT-scrimV)*(1-Math.exp(-dt*10));dirty=true;}else if(scrimV!==scrimT){scrimV=scrimT;dirty=true;}
 if(pendingSync&&mode===0){pendingSync=false;syncUI();}
 var gh=(menu.on&&menu.kind==='dd'&&curSheetOn()&&SH.on&&SH.ready&&!SH.want)?1:0;
 if(gh!==ghost){ghost=gh;if(sheetP.el)sheetP.el.classList.toggle('ghost',!!gh);dirty=true;}
 if(menu.on&&menu.kind==='dd'&&SH.want&&SH.el&&!busy&&window.html2canvas)grabSheet();
 var key=Math.round(sy[fl]*100)+','+(f2<NP?Math.round(sy[f2]*100):0);
 if(key!==lastKey){lastKey=key;dirty=true;}
 var c=cells(),target=drag?dragTarget:c.cx(slotOf[dockSel]);
 if(x===null)x=target;
 if(drag&&Math.abs(v)>5)dir=v>=0?1:-1;
 var v0=v;
 for(var s=0;s<3;s++)step(dt/3,target);
 var atNow=!drag&&Math.abs(target-x)<3,edgeL=slotOf[sel]===0,edgeR=slotOf[sel]===NS-1;
 if(atNow&&!atPrev&&(edgeL||edgeR)){var imp=Math.min(240,Math.max(90,Math.abs(v0)*.22));if(edgeL)ps.vl+=imp;else ps.vr+=imp;}
 atPrev=atNow;
 if(ps.l||ps.r||ps.vl||ps.vr){for(var q=0;q<2;q++){var hq=dt/2;ps.vl+=(-260*ps.l-11*ps.vl)*hq;ps.l+=ps.vl*hq;ps.vr+=(-260*ps.r-11*ps.vr)*hq;ps.r+=ps.vr*hq;}
  ps.l=Math.max(-2,Math.min(13,ps.l));ps.r=Math.max(-2,Math.min(13,ps.r));
  if(Math.abs(ps.l)+Math.abs(ps.r)+Math.abs(ps.vl)+Math.abs(ps.vr)<.05){ps.l=ps.r=ps.vl=ps.vr=0;}dirty=true;}
 var settled=!drag&&Math.abs(target-x)<0.05&&Math.abs(v)<0.5&&Math.abs(j)<0.002&&Math.abs(jv)<0.05;
 if(settled){x=target;v=0;j=0;jv=0;}
 /* панель ховається під клавіатуру / повертається */
 var hT=((mode===1&&op.age>.14)||(mode===2&&cl.age<A1-.06)||sheetOn||boot.hold)?1:0;
 if(hide!==hT){hide+=(hT-hide)*(1-Math.exp(-dt*9));if(Math.abs(hT-hide)<.002)hide=hT;dirty=true;}
 var off=hide*hideOff();
 if(off!==lastOff){lastOff=off;dock.style.transform=off>.1?'translate3d(0,'+off+'px,0)':'';}
 /* крапля-поле */
 var pr=null;
 if(mode===1){
  var ax=0,ay=0,tq=pillTarget();op.age+=dt;
  var R0=22*DROP,tcy=tq.y-tq.hh,hwMax=Math.min(tq.hw,VW/2-4);
  var blOpen=0;
  if(op.age<B1){          /* фаза 1: крапля відривається, спершу тягнеться вгору, летить «вглиб» (менша й розмита) */
   var u=op.age/B1,e=Math.pow(u,1.7),g=u<.5?u*2:1,gs=g*g*(3-2*g),zz=1-(1-ZE)*(u*u*(3-2*u)),
       r=(22+(R0-22)*gs)*zz,st=1+.16*u*u+.22*Math.sin(Math.PI*Math.min(1,u/.4));
   var yE=tcy+R0*ZE*1.16,bq=Math.min(1,u*1.25);
   pill.x=op.x0+(tq.x-op.x0)*Math.min(1,e*1.2);pill.y=op.y0+(yE-op.y0)*e;pill.hw=r/Math.sqrt(st);pill.hh=r*st;
   blOpen=7*bq*bq*(3-2*bq);
   pill.vx=pill.vy=pill.vw=pill.vh=0;
  }else if(op.age<B1+B2){ /* фаза 2: удар об «стелю» — крапля вертається, сплющується, різкішає */
   var u2=(op.age-B1)/B2,e2=1-Math.pow(1-u2,2),h0=R0*ZE*1.16,w0=R0*ZE*.93,hh2=h0+(R0*HHS-h0)*e2,hw2=w0+(R0*HWS-w0)*e2;
   pill.x=tq.x;pill.hw=hw2;pill.hh=hh2;pill.y=tcy+hh2;blOpen=7*(1-e2);
   pill.vx=pill.vy=pill.vw=pill.vh=0;
  }else if(op.age<B1+B2+B3){ /* фаза 3: розтікається по стелі в поле — желейні коливання */
   var u3=(op.age-B1-B2)/B3,dm=Math.exp(-4.6*u3),w=1-dm*Math.cos(9.5*u3*Math.PI*.5),
       hwS=R0*HWS,hhS=R0*HHS,hh3=tq.hh+(hhS-tq.hh)*dm*Math.cos(8*u3)+9*dm*Math.sin(9*u3)*(1-u3);
   pill.x=tq.x;pill.hw=Math.min(tq.hw+10,hwS+(tq.hw-hwS)*w);pill.hh=Math.max(14,hh3);pill.y=tcy+pill.hh;
   pill.vx=pill.vy=pill.vw=pill.vh=0;
  }else stepPill(dt);
  var tt=pillTarget(),k2=tt.x+','+tt.y+','+tt.hw;
  if(k2!==inpKey){inpKey=k2;placeInput(tt);}
  var arr=Math.abs(pill.y-tt.y)<22&&pill.hw>tt.hw*.88;if(arr!==pillShow){pillShow=arr;inp.classList.toggle('show',arr);document.getElementById('send').classList.toggle('show',arr);}   /* текст видно лише коли крапля дісталась місця */
  if(kbdSeen&&kbNow<60&&document.activeElement===inp)inp.blur();     /* клавіатуру закрили жестом */
  if(t-openAt>600&&document.activeElement!==inp&&!sendDown)closeInput();        /* фокус пропав без події blur */
  pr={x:pill.x,y:pill.y,w:pill.hw*(1+ax-.5*ay),h:pill.hh*(1+ay-.5*ax),nk:NK,bl:blOpen};
 }else if(mode===2){
  cl.age+=dt;
  var c2=cells(),tx=c2.cx(KS),ty=DR.top+DR.height/2+hide*hideOff(),nk=NK,age=cl.age;
  pill.vx=pill.vy=pill.vw=pill.vh=0;var blC=0,zsC=1;
  if(age<A1){                                  /* 1) звужується по ширині, ледь підтягується вгору */
   var u=age/A1,e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
   pill.x=cl.x0+(tx-cl.x0)*e;pill.y=cl.y0-6*Math.sin(Math.PI*u);
   pill.hw=cl.hw0+(22-cl.hw0)*e;pill.hh=cl.hh0+(22-cl.hh0)*e+3*Math.sin(Math.PI*u);
  }else{                                       /* 2) капає вниз у панель: прискорюється, без перельоту */
   var u2=Math.min(1,(age-A1)/A2),e2=u2*u2;
   pill.x=tx;pill.y=cl.y0+(ty-cl.y0)*e2;
   pill.hw=22*(1-.16*u2);pill.hh=22*(1+.38*u2*(1-u2*.5));blC=6*Math.sin(Math.PI*u2);zsC=1-.22*Math.sin(Math.PI*u2);
   if(u2>=1){                                  /* 3) зливається з панеллю */
    pill.van=Math.min(1,pill.van+dt/.14);pill.y=ty;pill.hw=22;pill.hh=22;nk=NK*(1-pill.van);
    if(pill.van>=1){mode=0;wantFull=false;dirty=true;}
   }
  }
  if(age>2.4&&mode===2){mode=0;wantFull=false;dirty=true;}
  pr={x:pill.x,y:pill.y,w:pill.hw*zsC,h:pill.hh*zsC,nk:nk,bl:blC};
 }
 var bT=(mode===0&&hide<.02)?1:0;if(bump!==bT){bump+=(bT-bump)*(1-Math.exp(-dt*10));if(Math.abs(bT-bump)<.003)bump=bT;dirty=true;}
 wantFull=(mode!==0)||menuA>0.002||sheetA>0.002||(boot.on&&boot.phase===2);
 if(fullMode!==wantFull){fullMode=wantFull;document.documentElement.classList.toggle('fm',fullMode);measure();dirty=true;}
 if(dirty||gMov||moving||!settled||scrolling||mode||menuA>0.002||sheetA>0.002||recMoving||(boot.on&&boot.phase===2)||boot.warm===1){
  var e=Math.max(-0.25,Math.min(0.7,j+Math.abs(v)*0.00015));
  var IR=DR.height/2+3,hw=IR*1.3*(1+e),hh=IR/(1+e*0.7),cy=(DR.top+DR.height/2+off-R.y)*S;
  var A=T[fl],Bt=f2<NP?T[f2]:null;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,A?A.tex:dummy);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,Bt?Bt.tex:dummy);
  gl.uniform4f(U.u_p0,(fl-ca)*VW,sy[fl],A?A.ch:1,A?1:0);gl.uniform3f(U.u_w,A?A.cw:1,Bt?Bt.cw:1,SH.cw);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,SH.tex||dummy);gl.activeTexture(gl.TEXTURE0);
  gl.uniform4f(U.u_p2,SH.x,-SH.y,SH.ch,(SH.on&&SH.ready)?1:0);gl.uniform1f(U.u_scrim,scrimV);
  var G=menu.g,G2=sheetP.g,gm=0,gdk=.5,gbl=2*BLS*Math.min(1,rec.pg.v);
  if(boot.on&&boot.phase===2){G=boot.g;gm=1;gdk=.9;gbl=0;}
  gl.uniform1f(U.u_gm,gm);gl.uniform1f(U.u_gd,gdk);gl.uniform1f(U.u_gbl,gbl);gl.uniform1f(U.u_gb2,2*BLS*Math.min(1,rec.pg.v));gl.uniform2f(U.u_go,gOX,gOY);gl.uniform1f(U.u_isl,ISL);gl.uniform1f(U.u_cell,gridCell());gl.uniform3f(U.u_gcol,GCOL[0],GCOL[1],GCOL[2]);
  gl.uniform4f(U.u_rp,rec.pg.ox,rec.pg.oy,kOf(rec.pg.v),1-RD*rec.pg.v);gl.uniform4f(U.u_rs,rec.sh.ox,rec.sh.oy,kOf(rec.sh.v),1-RD*rec.sh.v);
  gl.uniform4f(U.u_g2,(G2.cx-R.x)*S,(G2.cy-R.y)*S,G2.hw*S,G2.hh*S);gl.uniform1f(U.u_gr2,G2.r*S);gl.uniform1f(U.u_gv2,sheetA>0.002?G2.v:0);gl.uniform1f(U.u_sho,ghost);
  gl.uniform1f(U.u_rb,0);gl.uniform4f(U.u_rt,rec.pg.tx*rec.pg.v,rec.pg.ty*rec.pg.v,rec.sh.tx*rec.sh.v,rec.sh.ty*rec.sh.v);gl.uniform1f(U.u_ord,(menu.on&&menu.kind==='more'&&sheetOn)?1:0);
  gl.uniform4f(U.u_g,(G.cx-R.x)*S,(G.cy-R.y)*S,G.hw*S,G.hh*S);gl.uniform1f(U.u_gr,G.r*S);gl.uniform1f(U.u_gv,(menuA>0.002||gm)?G.v:0);
  gl.uniform4f(U.u_p1,(f2-ca)*VW,f2<NP?sy[f2]:0,Bt?Bt.ch:1,Bt?1:0);
  gl.uniform2f(U.u_res,cv.width,cv.height);gl.uniform2f(U.u_org,R.x,R.y);gl.uniform2f(U.u_vp,VW,VH);gl.uniform1f(U.u_s,S);
  gl.uniform4f(U.u_a,(DR.left+DR.width/2+(ps.r-ps.l)/2-R.x)*S,cy,(DR.width/2+(ps.l+ps.r)/2)*S,(DR.height/2+.22*Math.max(ps.l,ps.r,0))*S);
  gl.uniform4f(U.u_b,(x-R.x)*S,cy,hw*S,hh*S);
  gl.uniform4f(U.u_k,(c.cx(KS)-R.x)*S,cy,27*S,(DR.height/2-12+bump*7.75)*S);gl.uniform1f(U.u_kv,bump);
  if(pr&&pr.w>.5&&pr.h>.5){gl.uniform4f(U.u_c,(pr.x-R.x)*S,(pr.y-R.y)*S,pr.w*S,pr.h*S);gl.uniform1f(U.u_cv,1);gl.uniform1f(U.u_nk,pr.nk*S);gl.uniform1f(U.u_bl,(pr.bl||0)*S);}
  else{gl.uniform4f(U.u_c,0,0,0,0);gl.uniform1f(U.u_cv,0);gl.uniform1f(U.u_bl,0);}
  var bmv=boot.on?0:Math.min(1,rec.pg.v*1.2),bsv=Math.min(1,rec.sh.v*1.2),shOK=(SH.on&&SH.ready)?1:0;
  if(bmv>.003||bsv>.003){
   var P0=[(fl-ca)*VW,sy[fl],A?A.ch:1,A?1:0],P1=[(f2-ca)*VW,f2<NP?sy[f2]:0,Bt?Bt.ch:1,Bt?1:0],P2=[SH.x,-SH.y,SH.ch,shOK],W3=[A?A.cw:1,Bt?Bt.cw:1,SH.cw];
   bkGlt();bake('pg',0,P0,P1,P2,W3);if(shOK)bake('sh',1,P0,P1,P2,W3);
   bkEnd(A,Bt);
  }
  gl.uniform1f(U.u_bm,bmv);gl.uniform1f(U.u_bs,bsv);
  var tkOn=(!fullMode&&tgOK&&tgShown&&tickerEl.classList.contains('on')&&tickerEl.offsetHeight>0)?1:0;
  if(tkOn)tkCopy();
  gl.uniform4f(U.u_tk,tickerEl.offsetTop*S,tickerEl.offsetHeight*S,28*S,tkOn);gl.uniform1f(U.u_th,TKH);
  gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);dirty=false;boot.warm=0;
 }
 if(!shown&&full[sel]){shown=true;cv.style.opacity=1;}
 if(moving||!settled||scrolling||mode||hide!==hT||menuA>0.002&&menuA<.999||sheetA>0.002&&sheetA<.999||recMoving||boot.on&&boot.phase===2||menu.dragging||sheetP.dragging)lastMotion=t;
 if(t-lastMotion>150)pump(t);   /* важкі знімки — тільки коли нічого не рухається */
}
