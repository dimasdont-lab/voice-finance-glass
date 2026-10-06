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
 ' if(u_isl>.5){vec2 qi=p-vec2(c.x,29.5);vec2 ib=vec2(63.,18.5);float di=sdRB(qi,ib,18.5);if(di<80.){float ti=clamp(di/80.,0.,1.);vec2 qq=abs(qi)-ib+18.5;vec2 ni=(qq.x>0.&&qq.y>0.)?normalize(qq):(qq.x>qq.y?vec2(1.,0.):vec2(0.,1.));o+=ni*sign(qi)*pow(1.-ti,1.9)*58.*k;}}',
 ' return o;}',
 'float gBoost=0.;',   /* підсвічування ліній сітки: хвилі, заряд, палець (задає лише фоновий прохід плиток) */
 'vec3 gradBg(vec2 p){',
 ' vec3 c=vec3(.0196,.0196,.0275);',
 ' vec3 g=vec3(gridL(gridWarp(p,1.)+u_go-u_vp*.5),gridL(gridWarp(p,1.22)+u_go-u_vp*.5),gridL(gridWarp(p,1.44)+u_go-u_vp*.5));vec3 gm=min(vec3(1.),.17*g*(1.+gBoost));return mix(c,u_gcol,gm)+u_gcol*g*gBoost*.05+fgAt(p)+auraAt(p);}'].join('\n');
var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
var FS_H=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec3 u_xs;uniform float u_atw;uniform vec4 u_ln[16];uniform vec4 u_lj[16];uniform vec4 u_fb[3];uniform vec4 u_fq[3];uniform sampler2D u_lt;uniform float u_lp;uniform vec4 u_bb[14];uniform vec4 u_bq[14];uniform vec4 u_bc[14];uniform float u_bn;uniform vec4 u_dk;uniform float u_dkv;uniform vec4 u_dki;uniform vec3 u_dkt;uniform vec4 u_tk;uniform sampler2D u_tx;uniform sampler2D u_tt;uniform float u_th;uniform vec4 u_tv;uniform vec4 u_tc;uniform vec4 u_tp;uniform vec2 u_tq;uniform vec4 u_tr;uniform vec2 u_tko;uniform sampler2D u_tb0;uniform sampler2D u_tb1;uniform sampler2D u_tb2;uniform float u_bm;uniform float u_bs;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform vec3 u_gcol;uniform float u_gb2;uniform vec2 u_res;uniform vec2 u_org;uniform vec2 u_vp;uniform sampler2D u_t0;uniform sampler2D u_t1;uniform sampler2D u_t2;uniform vec4 u_p0;uniform vec4 u_p1;uniform vec4 u_p2;uniform vec3 u_w;uniform float u_scrim;uniform vec4 u_g;uniform float u_gr;uniform float u_gv;uniform vec4 u_a;uniform vec4 u_b;uniform vec4 u_c;uniform float u_cv;uniform float u_nk;uniform vec4 u_k;uniform float u_kv;uniform float u_bl;uniform float u_s;uniform vec4 u_rp;uniform vec4 u_rs;uniform float u_rb;uniform float u_gm;uniform float u_gd;uniform float u_gbl;uniform vec4 u_g2;uniform float u_gr2;uniform float u_gv2;uniform float u_sho;uniform vec4 u_rt;uniform float u_ord;',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
'float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*0.25;}',
'float sdBar(vec2 x){float a=sdRB(x-u_a.xy,u_a.zw,min(u_a.z,u_a.w));if(u_kv<.01)return a;return smin(a,sdRB(x-u_k.xy,u_k.zw,min(u_k.z,u_k.w)),17.*u_s);}',
'float sdInd(vec2 x){return sdRB(x-u_b.xy,u_b.zw,min(u_b.z,u_b.w));}',
'float sdC(vec2 x){return sdRB(x-u_c.xy,u_c.zw,min(u_c.z,u_c.w));}',
'vec3 fgAt(vec2 p){return vec3(0.);}','vec3 auraAt(vec2 p){return vec3(0.);}',
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
' if(gNS<.5){',
'  vec4 o=pageS(u_t2,u_p2,u_w.z,rt(p,u_rs,u_rt.zw));o.rgb*=u_rs.w;c=c*(1.-o.a)+o.rgb;}',
' return c;}',
'vec4 tbS(sampler2D tx,vec2 pp){vec2 uv=vec2(pp.x/u_vp.x,1.-pp.y/u_vp.y);float m=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);return texture2D(tx,clamp(uv,0.,1.))*m;}',
'vec3 bgBl(vec2 xpx){',
' vec2 p=u_org+xpx/u_s;vec2 pp=rt(p,u_rp,u_rt.xy);vec2 tq=pp/u_vp;vec3 c=(tq.x<0.||tq.y<0.||tq.x>1.||tq.y>1.)?gradBg(p):texture2D(u_tb2,tq).rgb;',
' vec4 a=tbS(u_tb0,pp);a.rgb*=u_rp.w;c=c*(1.-a.a)+a.rgb;',
' c*=(1.-u_scrim);',
' if(gNS<.5){if(u_gv2>.01){float ds=sdRB(xpx-u_g2.xy,u_g2.zw,u_gr2);c*=mix(1.,.5,clamp(-ds/(1.5*u_s)+.5,0.,1.));}',
'  vec4 o=tbS(u_tb1,rt(p,u_rs,u_rt.zw))*u_p2.w;o.rgb*=u_rs.w;c=c*(1.-o.a)+o.rgb;}',
' return c;}',
'vec3 bgG(vec2 x){return u_bm>.997?bgBl(x):u_bm>.003?mix(bg(x),bgBl(x),u_bm):bg(x);}',
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
/* пасхалка: скляні лінзи-краплі (до 6; близькі зливаються гладко, як краплі). u_ln[i] = центр, радіус, видимість; u_lj[i] = розтяг, кут, тремтіння, час.
   Малюються окремим проходом ПІСЛЯ готового кадру: u_lt — копія кадру з доком, тікером і панелями, тож лінза заломлює все, що під нею */
'vec2 lnP(vec2 q,vec4 J){float c=cos(J.y),s=sin(J.y);vec2 p=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);return vec2(p.x/(1.+J.x),p.y*(1.+J.x));}',
'float sdLn(vec2 px,vec4 L,vec4 J){vec2 p=lnP(px-L.xy,J);float th=atan(p.y,p.x);float r=L.z*(1.+J.z*(.6*sin(3.*th+J.w*9.)+.4*sin(5.*th-J.w*13.)));return (length(p)-r)/(1.+abs(J.x));}',
'vec4 scAt(vec2 p){return texture2D(u_lt,vec2(p.x,u_res.y-p.y)/u_res);}',
'vec4 lnGlass(vec2 px,float d,vec4 L,vec4 J){float R=L.z;float t=clamp(-d/(R*.95),0.,1.);float h=1.-t;',
' vec2 q=px-L.xy;float lq=length(q);vec2 n=lq>.5?q/lq:vec2(0.);',
' vec2 zc=L.xy+q*(.62+.18*t);vec2 of=n*h*h*R*.42;float ab=.04+.1*h*h;',
' vec2 pa=zc-of*(1.+ab),pb=zc-of,pc=zc-of*(1.-ab);vec4 Ta=scAt(pa),Tb=scAt(pb),Tc=scAt(pc);',
' vec3 ci=vec3(Ta.r+bgG(pa).r*(1.-Ta.a),Tb.g+bgG(pb).g*(1.-Tb.a),Tc.b+bgG(pc).b*(1.-Tc.a))*.97+vec3(.012);',
' float fr=pow(h,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),5.)+.45*pow(max(dot(n,normalize(vec2(.65,.75))),0.),4.);',
' ci+=vec3(fr*(.05+.4*sp));',
' return vec4(ci,clamp(-d/(1.5*u_s)+.5,0.,1.)*L.w);}',
/* скло кнопок у вікнах — той самий рецепт, що й скло плиток (tiles.js glassAt, вкладений рівень): зсув, лупа, аберація, обідок */
'vec4 btnGlass(vec2 px,vec4 B,vec4 Q,vec4 K,float d){float m=18.*u_s;float t=clamp(-d/(.6*m),0.,1.);float e=1.5;bool rd=Q.z>.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-B.xy,B.zw,Q.x)-sdRB(px-vec2(e,0.)-B.xy,B.zw,Q.x),sdRB(px+vec2(0.,e)-B.xy,B.zw,Q.x)-sdRB(px-vec2(0.,e)-B.xy,B.zw,Q.x))+1e-5);',
' vec2 of=n*pow(1.-t,2.2)*.6*m;float ab=.07*(.35+pow(1.-t,1.5));float zm=rd?.55:.96;',
' vec2 za=B.xy+((px-of*(1.+ab))-B.xy)*zm,zb=B.xy+((px-of)-B.xy)*zm,zc=B.xy+((px-of*(1.-ab))-B.xy)*zm;',
' vec3 ci=vec3(bgG(za).r,bgG(zb).g,bgG(zc).b);',   /* під вікнами фон уже розмитий (bgBl), окреме розмиття не потрібне; більше викликів bgG роздуває компіляцію шейдера */
' if(rd)ci=mix(ci,vec3(1.,.27,.31),.45)*.9;else ci=ci*1.12+vec3(.035);',   /* на темному розмитому фоні вікна скло трохи світліше, інакше його не видно */
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);',
' ci+=vec3(rim*((rd?.04:.03)+.12*sp));',
' float clip=step(K.x,px.x)*step(px.x,K.z)*smoothstep(K.y,K.y+2.*u_s,px.y)*(1.-smoothstep(K.w-2.*u_s,K.w,px.y));',   /* обрізка видимою областю прокрутки */
' return vec4(ci,clamp(-d/(1.5*u_s)+.5,0.,1.)*Q.w*clip*(rd?.86:1.));}',
'vec4 glassPx(vec2 px,vec4 G,float GR,float GV,float dg,float gd,float gbl,float ring){',
' float mm=(ring>.5?130.:36.)*u_s;float t=clamp(-dg/(0.6*mm),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-G.xy,G.zw,GR)-sdRB(px-vec2(e,0.)-G.xy,G.zw,GR),sdRB(px+vec2(0.,e)-G.xy,G.zw,GR)-sdRB(px-vec2(0.,e)-G.xy,G.zw,GR))+1e-5);',
' vec2 of=n*pow(1.-t,ring>.5?1.7:2.2)*(ring>.5?1.25:0.6)*mm;float ab=(ring>.5?.24:.10)*(0.35+pow(1.-t,1.5));float br=gbl*u_s*GV;',
' vec3 ci;if(t<.97){float r=u_s*(.25+1.4*pow(1.-t,2.));vec2 ex=vec2(r,0.),ey=vec2(0.,r);vec2 q1=px-of*(1.+ab),q2=px-of,q3=px-of*(1.-ab);',
' ci=vec3((bgG(q1)+bgG(q1+ex+ey)).r,(bgG(q2)+bgG(q2-ex+ey)).g,(bgG(q3)+bgG(q3+ex-ey)).b)*.5*gd;}',
' else ci=bgG(px-of)*gd;float rim=pow(1.-t,3.);',
' float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
' ci+=vec3(rim*(0.0105+0.051*sp));float w=clamp(-dg/(1.5*u_s)+0.5,0.,1.)*clamp(GV*1.4,0.,1.);if(ring>.5)w*=1.-smoothstep(.7,1.,t);',
' return vec4(ci,w);}',
'vec3 bgT(vec2 xpx){vec2 p=u_org+xpx/u_s;vec2 q=p+u_tko;vec3 c=texture2D(u_tt,vec2(clamp((q.x-u_tr.x)/u_tr.z,0.,1.),clamp((q.y-u_tr.y)/u_tr.w,0.,1.))).rgb;vec2 pp=rt(p,u_rp,u_rt.xy);',
' vec4 a=pageS(u_t0,u_p0,u_w.x,pp);a.rgb*=u_rp.w;c=c*(1.-a.a)+a.rgb;vec4 b=pageS(u_t1,u_p1,u_w.y,pp);b.rgb*=u_rp.w;c=c*(1.-b.a)+b.rgb;return c*(1.-u_scrim);}',
'float sdBand(vec2 px){return sdRB(px-u_tc.xy,u_tc.zw,min(u_tc.z,u_tc.w));}',
'float sdTick(vec2 px){return sdBand(px);}',
'vec2 tickN(vec2 px){float e=1.5;return normalize(vec2(sdTick(px+vec2(e,0.))-sdTick(px-vec2(e,0.)),sdTick(px+vec2(0.,e))-sdTick(px-vec2(0.,e)))+1e-5);}',
'vec4 txS(vec2 x){vec2 d=u_org+x/u_s-u_tp.xy;if(u_tv.x>.5){float cr=d.x+28.,s=d.y+u_tq.x+u_tv.w;if(u_xs.z<1.||cr<0.||cr>56.)return vec4(0.);float L=u_tv.y*u_tv.z;s=s-floor(s/L)*L;float k=floor(s/u_tv.z);return texture2D(u_tx,vec2((k*56.+cr)*2./u_atw,(s-k*u_tv.z)*2./304.));}float mo=u_tp.z,sg=u_tp.w;float aa=d.x*(1.-mo)+sg*d.y*mo+u_vp.x*.5,cc=d.y*(1.-mo)-sg*d.x*mo;float yy=(cc+u_tq.y+12.)*2.;if(u_xs.z<1.||yy<0.||yy>160.||aa<0.||aa>u_vp.x)return vec4(0.);float sx=aa-u_xs.x+u_xs.y;sx=sx-floor(sx/u_xs.z)*u_xs.z;return texture2D(u_tx,vec2(sx*2./u_atw,yy/304.));}',
'vec4 dkS(vec2 x){if(u_dkv<.5)return vec4(0.);vec2 p=u_org+x/u_s-u_dk.xy;float mo=u_dki.z,Lm=u_dk.z,hh=u_dk.w,cw=u_dki.y;float ss=p.x*(1.-mo)+p.y*mo,cr=p.y*(1.-mo)+p.x*mo;if(abs(ss)>Lm*.5+6.||abs(cr)>mix(hh,36.,mo)*.5+6.)return vec4(0.);float kf=clamp(floor((ss+Lm*.5-6.)/cw),0.,4.);float au=-Lm*.5+6.+cw*(kf+.5);vec2 l=vec2(Lm*.5+au+p.x-au*(1.-mo),hh*.5+p.y-au*mo+u_dki.w*mo);if(mo>.5&&l.y>hh*.5+u_dki.w+13.)return vec4(0.);',
' vec2 uv=vec2(l.x*2./u_atw,(160.+l.y*2.)/304.),dd=vec2(8./u_atw,8./304.);float a0=(l.x<0.||l.y<0.||l.x>u_dk.z||l.y>u_dk.w)?0.:texture2D(u_tx,uv).a;',
' float w=clamp(1.-abs(ss-u_dki.x)/u_dki.y,0.,1.);w=w*w*(3.-2.*w);vec3 col=mix(vec3(1.),u_dkt,w);float a=a0*(.7+.3*w);',
' if(w>.02){float h=(texture2D(u_tx,uv+vec2(dd.x,0.)).a+texture2D(u_tx,uv-vec2(dd.x,0.)).a+texture2D(u_tx,uv+vec2(0.,dd.y)).a+texture2D(u_tx,uv-vec2(0.,dd.y)).a)*.25;float ga=h*.5*w*(1.-a);col=(col*a+u_dkt*ga)/max(a+ga,1e-4);a=a+ga;}',
' return vec4(col,a);}',
'vec3 bgTb(vec2 x,float r){vec3 s=bgT(x)*.25;for(int i=0;i<6;i++){float a=float(i)*1.0471976;s+=bgT(x+vec2(cos(a),sin(a))*r)*.125;}return s;}',
'vec4 tickGlass(vec2 px,float d){float m=mix(22.,12.,u_tp.z)*u_s;float t=clamp(-d/(.6*m),0.,1.);vec2 n=tickN(px);',
' vec2 of=n*pow(1.-t,2.2)*.4*m;float ab=.05*(.35+pow(1.-t,1.5));float br=5.*u_s;vec3 ci=bgTb(px-of,br)*.42;vec4 xa=txS(px-of*(1.+ab)),xb=txS(px-of),xc=txS(px-of*(1.-ab));ci=vec3(mix(ci.r,xa.r,xa.a),mix(ci.g,xb.g,xb.a),mix(ci.b,xc.b,xc.a));',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);ci+=vec3(rim*(.01+.042*sp));',
' return vec4(ci,clamp(-d/(1.5*u_s)+.5,0.,1.));}',
'vec4 tickOut(vec2 px,float d){float sg=12.*u_s;float g=exp(-d*d/(sg*sg));float e=1.5;vec2 bn=normalize(vec2(sdBand(px+vec2(e,0.))-sdBand(px-vec2(e,0.)),sdBand(px+vec2(0.,e))-sdBand(px-vec2(0.,e)))+1e-5);vec2 q=px-bn*(10.*u_s*g*(d/sg));return vec4(bgT(q)+vec3(.035*g),smoothstep(.02,.3,g));}',
].join('\n');
var FS_M1=['void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);',
' float dtk=u_tk.w>.5?sdTick(px):1e5;',
' float d=sdU(px);float di=sdInd(px);float dg=u_gv>.01?sdRB(px-u_g.xy,u_g.zw,u_gr):1e5;float dg2=u_gv2>.01?sdRB(px-u_g2.xy,u_g2.zw,u_gr2):1e5;',
' float dm=min(min(d,dg),dg2);float sh=dm>0.?1.-clamp(dm/(30.*u_s),0.,1.):0.;float as=0.3*sh*sh;',
' if(d>1.5*u_s&&di>1.5*u_s&&dg>1.5*u_s&&dg2>1.5*u_s&&dtk>1.5*u_s){gl_FragColor=vec4(0.,0.,0.,as);return;}',
' vec3 bc=barColor(px);float aBar=clamp(-d/(1.5*u_s)+.5,0.,1.);',
' vec3 rgb=bc*aBar;float a=aBar+as*(1.-aBar);',
' float wI=0.; if(di<1.5*u_s){float m=min(u_b.z,u_b.w);float t=clamp(-di/(0.6*m),0.,1.);float e=1.5;',
'  vec2 n=normalize(vec2(sdInd(px+vec2(e,0.))-sdInd(px-vec2(e,0.)),sdInd(px+vec2(0.,e))-sdInd(px-vec2(0.,e)))+1e-5);',
'  vec3 ci=barColor(px-n*pow(1.-t,2.2)*0.6*m)*0.84;float rim=pow(1.-t,3.);vec2 io=n*pow(1.-t,2.2)*0.6*m;vec4 ja=dkS(px-io*1.1),jb=dkS(px-io),jc=dkS(px-io*.9);vec3 jr=vec3(ja.r,jb.g,jc.b);float jal=(ja.a+jb.a+jc.a)/3.;ci=ci*(1.-jal)+jr*jal;',
'  float sp=pow(max(dot(n,normalize(vec2(-0.6,-0.8))),0.),3.)+0.5*pow(max(dot(n,normalize(vec2(0.6,0.8))),0.),3.);',
'  ci+=vec3(rim*(0.0075+0.039*sp));float w=clamp(-di/(1.5*u_s)+0.5,0.,1.);wI=w;rgb=rgb*(1.-w)+ci*w;a=a*(1.-w)+w;}',
' {vec4 i0=dkS(px);float k0=i0.a*(1.-wI);rgb=rgb*(1.-k0)+i0.rgb*k0;a=a*(1.-k0)+k0;}',
' vec4 g1=vec4(0.),g2=vec4(0.);',
' if(dg<1.5*u_s){if(u_ord>.5)gNS=1.;g1=glassPx(px,u_g,u_gr,u_gv,dg,u_gd,u_gbl,u_gm);gNS=0.;}',
' if(dg2<1.5*u_s){gNS=1.;g2=glassPx(px,u_g2,u_gr2,u_gv2,dg2,1.,u_gb2,0.);gNS=0.;',
'  if(u_sho>.5){vec2 pc=u_org+px/u_s;vec2 rq=rt(pc,u_rs,u_rt.zw);vec4 o=mix(pageS(u_t2,u_p2,u_w.z,rq),tbS(u_tb1,rq)*u_p2.w,u_bs);o.rgb*=u_rs.w;g2.rgb=g2.rgb*(1.-o.a)+o.rgb;}}',
' if(u_ord>.5){rgb=rgb*(1.-g1.a)+g1.rgb*g1.a;a=a*(1.-g1.a)+g1.a;rgb=rgb*(1.-g2.a)+g2.rgb*g2.a;a=a*(1.-g2.a)+g2.a;}',
' else{rgb=rgb*(1.-g2.a)+g2.rgb*g2.a;a=a*(1.-g2.a)+g2.a;rgb=rgb*(1.-g1.a)+g1.rgb*g1.a;a=a*(1.-g1.a)+g1.a;}',
' if(u_bn>.5){float bd=1e5;vec4 BB=vec4(0.),BQ=vec4(0.),BK=vec4(0.);for(int i=0;i<14;i++){if(float(i)>=u_bn)break;vec4 B=u_bb[i];vec4 Q=u_bq[i];',
'  if(Q.y<.5&&(dg>0.||dg2<0.))continue;if(Q.y>.5&&dg2>0.)continue;',
'  float db=sdRB(px-B.xy,B.zw,Q.x);if(db<bd){bd=db;BB=B;BQ=Q;BK=u_bc[i];}}',
'  if(bd<1.5*u_s){vec4 bg2=btnGlass(px,BB,BQ,BK,bd);rgb=rgb*(1.-bg2.a)+bg2.rgb*bg2.a;a=a*(1.-bg2.a)+bg2.a;}}',
' if(dtk<1.5*u_s){vec4 tg=tickGlass(px,dtk);rgb=rgb*(1.-tg.a)+tg.rgb*tg.a;a=a*(1.-tg.a)+tg.a;}',
' gl_FragColor=vec4(rgb,a);}'].join('\n');
var FS=FS_H+'\n'+FS_M1;
/* другий прохід (лінзи й плаваючі скляні кнопки) — окрема мала програма: основний шейдер не роздувається */
var FS_LP=FS_H+'\n'+['void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);',
' if(u_lp>.5){float dm=1e5,ds=1e5;vec4 bl=vec4(0.),bj=vec4(0.);',
'  float pr=1e5;for(int i=0;i<16;i++){vec4 L=u_ln[i];if(L.w>.01){vec2 dq=px-L.xy;float rr=L.z*(1.8+max(u_lj[i].x,0.)*1.3)+36.*u_s;if(dot(dq,dq)<rr*rr){vec4 J=u_lj[i];float di=sdLn(px,L,J);if(di<dm){dm=di;bl=L;bj=J;}pr=min(pr,L.z);ds=ds>1e4?di:smin(ds,di,max(2.*u_s,.4*pr));}}}',
'  vec4 oc=vec4(0.);',
'  if(u_isl>.5){vec2 pc=u_org+px/u_s;vec2 qi=pc-vec2(u_vp.x*.5,29.5);vec2 ib=vec2(63.,18.5);float di=sdRB(qi,ib,18.5);',
'   if(di>0.&&di<80.&&sdTick(px)>0.){float ti=di/80.;vec2 qq=abs(qi)-ib+18.5;vec2 ni=(qq.x>0.&&qq.y>0.)?normalize(qq):(qq.x>qq.y?vec2(1.,0.):vec2(0.,1.));',
'    vec2 dsp=ni*sign(qi)*pow(1.-ti,1.9)*58.;float al=smoothstep(.4,2.2,length(dsp));',
'    if(al>.003){vec2 qx=px+dsp*u_s;vec4 T=scAt(qx);vec3 bs=(u_tk.w>.5&&u_tr.x<.5&&u_tr.y<.5&&u_tr.z>=u_vp.x-1.&&u_org.y+qx.y/u_s<u_tr.w-4.)?bgT(qx):bgG(qx);oc=vec4((T.rgb+bs*(1.-T.a))*al,al);}}}',
'  vec4 ip=oc;',
'  if(ds<=1.5*u_s){vec4 lg=lnGlass(px,ds,bl,bj);oc=vec4(lg.rgb*lg.a,lg.a)+ip*(1.-lg.a);}else if(ds<30.*u_s){float shl=1.-ds/(30.*u_s);float sa=.3*shl*shl;oc=vec4(0.,0.,0.,sa)+ip*(1.-sa);}',
'  for(int k=0;k<3;k++){vec4 F=u_fb[k];if(F.z>.5){vec4 Q=u_fq[k];float df=sdRB(px-F.xy,F.zw,Q.x);if(df<1.5*u_s){vec4 fg=btnGlass(px,F,vec4(Q.x,0.,0.,Q.w),vec4(-1e4,-1e4,1e5,1e5),df);oc=oc*(1.-fg.a)+vec4(fg.rgb*fg.a,fg.a);}}}',
'  gl_FragColor=oc;return;}',
' gl_FragColor=vec4(0.);}'].join('\n');
function sh(t,q){var o=gl.createShader(t);gl.shaderSource(o,q);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){var lg=gl.getShaderInfoLog(o),mm=/0:([0-9]+)/.exec(lg||'');console.error(lg,mm?q.split(String.fromCharCode(10))[mm[1]-1]:'');}return o;}
var UMIR={};   /* останні значення uniform'ів основної програми — копіюються в програму другого проходу */
['uniform1f','uniform2f','uniform3f','uniform4f','uniform1i','uniform2fv','uniform3fv','uniform4fv'].forEach(function(fn){var orig=gl[fn];gl[fn]=function(loc){if(loc&&loc.__n)UMIR[loc.__n]=[fn,Array.prototype.slice.call(arguments,1)];return orig.apply(gl,arguments);};});
var pr=gl.createProgram(),MP=pr;gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);gl.useProgram(pr);
var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
var U={};['u_tv','u_tc','u_tp','u_tq','u_tr','u_bc','u_bb','u_bq','u_bn','u_tko','u_dki','u_dkt','u_xs','u_atw','u_dk','u_dkv','u_tx','u_tk','u_tt','u_th','u_tb2','u_gcol','u_cell','u_isl','u_tb0','u_tb1','u_bm','u_bs','u_go','u_gb2','u_res','u_org','u_vp','u_t0','u_t1','u_t2','u_p0','u_p1','u_p2','u_scrim','u_rp','u_rs','u_rb','u_gm','u_gd','u_gbl','u_g2','u_gr2','u_gv2','u_sho','u_rt','u_ord','u_g','u_gr','u_gv','u_w','u_a','u_b','u_c','u_cv','u_nk','u_k','u_kv','u_bl','u_s'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);if(U[n])U[n].__n=n;});
gl.uniform1i(U.u_t0,0);gl.uniform1i(U.u_t1,1);gl.uniform1i(U.u_t2,2);gl.uniform1i(U.u_tb0,3);gl.uniform1i(U.u_tb1,4);gl.uniform1i(U.u_tb2,5);gl.uniform1i(U.u_tt,6);gl.uniform1i(U.u_tx,7);
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
' gl_FragColor=texture2D(u_src,uv)*.2270270270+(texture2D(u_src,uv+u_dir*1.3846153846)+texture2D(u_src,uv-u_dir*1.3846153846))*.3162162162+(texture2D(u_src,uv+u_dir*3.2307692308)+texture2D(u_src,uv-u_dir*3.2307692308))*.0702702703;}']).join('\n');
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
 for(var it=0;it<2;it++){
  gl.bindFramebuffer(gl.FRAMEBUFFER,BK.tmp.f);gl.bindTexture(gl.TEXTURE_2D,BK[which].t);gl.uniform2f(BL.u_dir,1/BK.w,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.bindFramebuffer(gl.FRAMEBUFFER,BK[which].f);gl.bindTexture(gl.TEXTURE_2D,BK.tmp.t);gl.uniform2f(BL.u_dir,0,1/BK.h);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
}
var bkCv=document.createElement('canvas'),bkCx=bkCv.getContext('2d'),bkGT=null;
function bkGlt(){   /* зменшена копія шару скла віджетів (#glt) — основа розмитого фону під панелями */
 bkEnsure();var bsz=BK.w+':'+BK.h;if(bkGlt.sz!==bsz){bkGlt.sz=bsz;bkGlt.frozen=false;}if(bkGT&&bkGlt.frozen)return;bkGlt.frozen=true;if(bkCv.width!==BK.w||bkCv.height!==BK.h){bkCv.width=BK.w;bkCv.height=BK.h;}
 var ok=false;if(tgOK&&tgShown){try{tgCleanShot(function(){bkCx.drawImage(TGC,0,0,BK.w,BK.h);});ok=true;}catch(e){}}
 if(!ok){bkCx.fillStyle='#050507';bkCx.fillRect(0,0,BK.w,BK.h);}
 if(!bkGT){bkGT=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,bkGT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,bkGT);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bkCv);gl.activeTexture(gl.TEXTURE0);
}
/* ---- пасхалка: скляні лінзи (до 6) ⌀ 50–140; невагомість, відскок від країв, желе; близькі лінзи зливаються в одну, як краплі ---- */
var LNS=[],LNid=0,LNclr=0,LNP={},FBL=[],FBA=new Float32Array(12),FBQ=new Float32Array(12),LNA=new Float32Array(64),LNB=new Float32Array(64),LNtex=null,LNtw=0,LNth=0;
function lensNew(x,y,R,vx,vy){var L={id:++LNid,x:x,y:y,vx:vx,vy:vy,R:R,s:0,sv:0,e:0,ev:0,a:0,wob:.04,imp:0,drag:null,die:0,born:performance.now()};LNS.push(L);dirty=true;return L;}
function lensSpawnOne(x,y){LG('egg','лінза ⌀100');var a=Math.random()*6.2832;lensNew(x,y,50,Math.cos(a)*60,-60+Math.sin(a)*40);}
function lensAlive(){for(var i=0;i<LNS.length;i++)if(!LNS[i].die)return true;return false;}
/* відщеплення дрібних крапель від великої (площа зберігається) */
function lensShed(L,n,vx,vy,spread){var i,m=L.R*L.R,left=m,made=0;
 for(i=0;i<n&&LNS.length<16;i++){var w=.1+Math.random()*.16,pm=Math.min(left*.5,m*w);if(Math.sqrt(pm)<4.5)break;left-=pm;var a=Math.random()*6.2832,sp=spread*(.4+Math.random()*.9);
  var P=lensNew(L.x+Math.cos(a)*L.R*.8,L.y+Math.sin(a)*L.R*.8,Math.sqrt(pm),vx*.5+Math.cos(a)*sp,vy*.5+Math.sin(a)*sp);P.s=.8;P.born=performance.now()+500;made++;}
 if(made){L.R=Math.max(5,Math.sqrt(left));L.wob=Math.min(.1,L.wob+.06);L.ev-=2.5;}return made;}
function lensSpawn(x,y){
 if(LNS.length>=16){LG('egg','ліміт крапель');return;}
 /* розмір від ⌀14 до ⌀128 (логарифмічно: дрібних набагато більше), напрям і швидкість випадкові, але невеликі */
 var R=Math.exp(Math.log(7)+Math.random()*(Math.log(64)-Math.log(7))),ang=Math.random()*6.2832,sp=40+Math.random()*190;
 LG('egg','лінза з\'явилась ⌀'+Math.round(R*2));
 lensNew(x+(Math.random()-.5)*60,y+(Math.random()-.5)*30,R,Math.cos(ang)*sp,Math.sin(ang)*sp);
}
function lensClearAll(){LNS.forEach(function(L){L.die=1;L.held=0;L.drag=null;L.mt=0;});LNP={};dirty=true;}
function fbSet(list){FBL=list;if(!list.length)LNclr=1;dirty=true;}   /* плаваючі скляні кнопки (до 3): [{el, a, rad}] — малюються поверх усього в другому проході */
function lensHit(e){for(var i=LNS.length-1;i>=0;i--){var L=LNS[i];if(!L.die&&L.s>.5&&Math.hypot(e.clientX-L.x,e.clientY-L.y)<Math.max(L.R*(1.1+Math.max(0,L.e)),24))return L;}return null;}
function lensStep(dt){
 if(!LNS.length)return false;
 var moving=false,i,j,k,n=3,h=dt/n;
 for(i=0;i<LNS.length;i++){var L=LNS[i],tg=L.die?0:1;
  L.sv+=(240*(tg-L.s)-17*L.sv)*dt;L.s+=L.sv*dt;
  if(L.die&&L.s<.02){LNS.splice(i,1);i--;if(!LNS.length)LNclr=1;moving=true;continue;}
  var R=L.R*Math.max(.2,Math.min(1.1,L.s)),RX=Math.min(R,VW/2-1),RY=Math.min(R,VH/2-1);
  if(CH.on&&CH.s>.04&&!L.drag&&!L.die){
   var cdx=CH.x-L.x,cdy=CH.y-L.y,cd=Math.hypot(cdx,cdy)||1,ux=cdx/cd,uy=cdy/cd,sS=CH.s;
   var pull=(380+1500*sS)*sS*Math.min(1,cd/140)*(1+Math.min(2,260/Math.max(60,cd))),swr=300*sS*Math.min(1,cd/100);
   L.vx+=(ux*pull-uy*swr)*dt;L.vy+=(uy*pull+ux*swr)*dt;
   if(cd<130){var dmp=Math.exp(-dt*2.2*sS);L.vx*=dmp;L.vy*=dmp;}
   var vv=Math.hypot(L.vx,L.vy);if(vv>1700){L.vx*=1700/vv;L.vy*=1700/vv;}
   moving=true;
  }
  for(k=0;k<n;k++){
   if(!L.drag){var fr=Math.exp(-h*.22);L.vx*=fr;L.vy*=fr;L.x+=L.vx*h;L.y+=L.vy*h;
    var hit=0,vn=0;
    if(L.x<RX){L.x=RX;vn=Math.abs(L.vx);L.vx=vn*.86;hit=1;L.a=0;}
    else if(L.x>VW-RX){L.x=VW-RX;vn=Math.abs(L.vx);L.vx=-vn*.86;hit=1;L.a=0;}
    if(L.y<RY){L.y=RY;var v2=Math.abs(L.vy);L.vy=v2*.86;if(v2>vn){vn=v2;L.a=Math.PI/2;}hit=1;}
    else if(L.y>VH-RY){L.y=VH-RY;var v3=Math.abs(L.vy);L.vy=-v3*.86;if(v3>vn){vn=v3;L.a=Math.PI/2;}hit=1;}
    if(hit&&vn>20){L.ev-=Math.min(9,vn*.006);L.wob=Math.min(.07,L.wob+vn*.00008);L.imp=.22;}}
   var sp=Math.hypot(L.vx,L.vy),et=0;L.imp-=h;
   if((L.held||0)>=2){et=L.stT||0;}
   else if(L.imp<=0&&sp>30){var ta=Math.atan2(L.vy,L.vx),da=Math.atan2(Math.sin(ta-L.a),Math.cos(ta-L.a));if(Math.abs(da)>Math.PI/2){da-=Math.sign(da)*Math.PI;}L.a+=da*Math.min(1,h*10);et=Math.min(.14,sp*.00011);}
   L.ev+=(-330*(L.e-et)-7.5*L.ev)*h;L.e+=L.ev*h;L.e=Math.max(-.5,Math.min(1.8,L.e));
   L.wob*=Math.exp(-h*2.6);
  }
  if(L.drag||Math.abs(L.vx)+Math.abs(L.vy)>.5||Math.abs(L.e)+Math.abs(L.ev)*.05>.002||L.wob>.002||Math.abs(L.s-tg)>.002||Math.abs(L.sv)>.01)moving=true;else{L.vx=L.vy=0;}
 }
 /* притягання близьких лінз і злиття (площа зберігається) */
 for(i=0;i<LNS.length;i++)for(j=i+1;j<LNS.length;j++){var A=LNS[i],B=LNS[j];if(A.die||B.die||A.s<.6||B.s<.6)continue;
  var nowM=performance.now();if(nowM-A.born<700||nowM-B.born<700)continue;
  var dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy)||.01,ra=A.R,rb=B.R,rs=ra+rb;
  if(d<rs*.5){
   var ma=ra*ra,mb=rb*rb,m=ma+mb,keep=ma>=mb?A:B,gone=keep===A?B:A;
   keep.x=(A.x*ma+B.x*mb)/m;keep.y=(A.y*ma+B.y*mb)/m;keep.vx=(A.vx*ma+B.vx*mb)/m;keep.vy=(A.vy*ma+B.vy*mb)/m;keep.R=Math.min(VH*.66,Math.sqrt(m));
   keep.wob=Math.min(.1,keep.wob+.07);keep.ev-=3.6;keep.sv+=.0;
   for(var pk in LNP)if(LNP[pk].L===gone)LNP[pk].L=keep;keep.held=(keep.held||0)+(gone.held||0);if(gone.drag)keep.drag=1;if(gone.mt)keep.mt=1;
   LNS.splice(LNS.indexOf(gone),1);LG('egg','лінзи злились → ⌀'+Math.round(keep.R*2));return true;
  }else if(d<rs*1.12&&!A.drag&&!B.drag){
   var f=(1-d/(rs*1.12))*300*dt,ux=dx/d,uy=dy/d;A.vx+=ux*f*rb/rs*1.6;A.vy+=uy*f*rb/rs*1.6;B.vx-=ux*f*ra/rs*1.6;B.vy-=uy*f*ra/rs*1.6;moving=true;
  }
 }
 return moving;
}
(function(){   /* перетягування, кидок і розтягування кількома пальцями (площа лінзи зберігається — як желе) */
 function ptrs(L){var a=[],k;for(k in LNP)if(LNP[k].L===L)a.push(LNP[k]);return a;}
 function near(e){for(var i=LNS.length-1;i>=0;i--){var L=LNS[i];if(L.die||L.s<.5||!(L.held>0))continue;if(Math.hypot(e.clientX-L.x,e.clientY-L.y)<Math.max(L.R*(2.6+Math.max(0,L.e)),70))return L;}return null;}
 function span(L){var a=ptrs(L),bi=0,bj=a.length>1?1:0,bd=-1,i,j,cx=0,cy=0;
  for(i=0;i<a.length;i++){cx+=a[i].x;cy+=a[i].y;for(j=i+1;j<a.length;j++){var d=Math.hypot(a[i].x-a[j].x,a[i].y-a[j].y);if(d>bd){bd=d;bi=i;bj=j;}}}
  return{cx:cx/a.length,cy:cy/a.length,d:Math.max(0,bd),ang:Math.atan2(a[bj].y-a[bi].y,a[bj].x-a[bi].x)};}
 function stInit(L){var s=span(L);L.span0=Math.max(40,s.d);L.ox=L.x-s.cx;L.oy=L.y-s.cy;L.stT=0;L.mt=1;}
 window.addEventListener('pointerdown',function(e){var L=lensHit(e)||near(e);if(!L)return;e.stopPropagation();e.preventDefault();
  LNP[e.pointerId]={L:L,x:e.clientX,y:e.clientY,dx:L.x-e.clientX,dy:L.y-e.clientY,last:{x:e.clientX,y:e.clientY,t:performance.now()},moved:0};
  L.held=(L.held||0)+1;L.drag=1;L.vx=L.vy=0;L.wob=Math.min(.07,L.wob+.02);if(L.held>=2)stInit(L);dirty=true;},true);
 window.addEventListener('pointermove',function(e){var p=LNP[e.pointerId];if(!p)return;e.stopPropagation();e.preventDefault();var L=p.L,now=performance.now(),last=p.last;p.x=e.clientX;p.y=e.clientY;
  if(L.held<2){
   var dtm=Math.max(1,now-last.t)/1000,k=Math.min(1,dtm*18),ivx=(p.x-last.x)/dtm,ivy=(p.y-last.y)/dtm;L.vx+=(ivx-L.vx)*k;L.vy+=(ivy-L.vy)*k;
   p.moved+=Math.abs(p.x-last.x)+Math.abs(p.y-last.y);
   var rxx=Math.min(L.R,VW/2-1),ryy=Math.min(L.R,VH/2-1);L.x=Math.max(rxx,Math.min(VW-rxx,p.x+p.dx));L.y=Math.max(ryy,Math.min(VH-ryy,p.y+p.dy));
   /* швидке змахування бризкає дрібними краплями (лише в паузі чорної діри) */
   var spd=Math.hypot(ivx,ivy);if(BH.ph===3&&spd>2300&&L.R>14&&now-(L.shedT||0)>120){L.shedT=now;lensShed(L,1+(Math.random()*2|0),ivx,ivy,Math.min(700,spd*.25));}
  }else{   /* кілька пальців: розтяг уздовж лінії між найдальшими пальцями, ціль задає пружину */
   p.moved+=99;var s=span(L);
   L.stT=Math.max(-.4,Math.min(1.5,s.d/L.span0-1));
   var da=Math.atan2(Math.sin(s.ang-L.a),Math.cos(s.ang-L.a));if(Math.abs(da)>Math.PI/2)da-=Math.sign(da)*Math.PI;L.a+=da*.45;
   L.x=Math.max(L.R*.6,Math.min(VW-L.R*.6,s.cx+L.ox));L.y=Math.max(L.R*.6,Math.min(VH-L.R*.6,s.cy+L.oy));L.vx=L.vy=0;
  }
  p.last={x:p.x,y:p.y,t:now};dirty=true;},true);
 function up(e){var p=LNP[e.pointerId];if(!p)return;e.stopPropagation();e.preventDefault();var L=p.L;delete LNP[e.pointerId];L.held=Math.max(0,(L.held||1)-1);
  if(L.held>0){ptrs(L).forEach(function(q){q.dx=L.x-q.x;q.dy=L.y-q.y;q.last={x:q.x,y:q.y,t:performance.now()};});if(L.held>=2)stInit(L);else L.stT=0;dirty=true;return;}
  var multi=L.mt;L.drag=null;L.mt=0;L.stT=0;
  if(performance.now()-p.last.t>90){L.vx*=.2;L.vy*=.2;}   /* палець зупинився перед відпусканням — кидка немає */
  var sp=Math.hypot(L.vx,L.vy);if(sp>3200){L.vx*=3200/sp;L.vy*=3200/sp;sp=3200;}
  if(BH.ph===3&&sp>1700&&L.R>16&&!multi){lensShed(L,2+(Math.random()*3|0),L.vx,L.vy,sp*.35);}
  if(multi){L.ev-=2.4;L.wob=Math.min(.09,L.wob+.05);}   /* відпустили розтяг — пружинить назад, як желе */
  else if(p.moved<6){if(lensTap())return;L.wob=Math.min(.08+BHtap.n*.004,L.wob+.05+BHtap.n*.004);L.ev-=.6+BHtap.n*.25;}   /* тап: здригається, щоразу сильніше; 13-й — чорна діра */
  dirty=true;}
 window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',up,true);
 ['touchstart','touchmove'].forEach(function(n){window.addEventListener(n,function(e){var t=e.touches[e.touches.length-1];if(!t)return;if(Object.keys(LNP).length||(n==='touchstart'&&(lensHit(t)||near(t)))){e.preventDefault();e.stopPropagation();}},{capture:true,passive:false});});
 window.addEventListener('click',function(e){if(lensHit(e)){e.stopPropagation();e.preventDefault();}},true);
})();
/* другий прохід: копіюємо готовий кадр (док, тікер, панелі) у текстуру й малюємо лише ділянку з лінзами — вона заломлює все, що під нею */
window.__lns=function(){return{n:LNS.length,l:LNS.map(function(L){return[Math.round(L.x),Math.round(L.y),Math.round(L.R),+L.s.toFixed(2)];}),err:LNerr,tex:[LNtw,LNth],S:S,sy:Math.round(sy[sel]||0),sel:sel};};var LNerr="";
var LPG=null,ULP={};
function lpEnsure(){
 if(LPG)return true;
 LPG=gl.createProgram();gl.attachShader(LPG,sh(gl.VERTEX_SHADER,VS));gl.attachShader(LPG,sh(gl.FRAGMENT_SHADER,FS_LP));gl.bindAttribLocation(LPG,0,'p');gl.linkProgram(LPG);
 if(!gl.getProgramParameter(LPG,gl.LINK_STATUS)){LG('egg','програма лінз: '+gl.getProgramInfoLog(LPG));LPG=null;LNdead=true;return false;}
 var n=gl.getProgramParameter(LPG,gl.ACTIVE_UNIFORMS),i;for(i=0;i<n;i++){var a=gl.getActiveUniform(LPG,i),nm=a.name.replace(/\[0\]$/,'');ULP[nm]=gl.getUniformLocation(LPG,a.name);}
 gl.useProgram(LPG);gl.uniform1i(ULP.u_lt,6);gl.useProgram(MP);return true;
}
setTimeout(function(){try{if(ISL)lpEnsure();}catch(_){}},2500);   /* програма другого проходу компілюється заздалегідь, щоб не було розриву на першому кадрі острівця */
var LNdead=false,LPinfo="";window.__lp=function(){return{LPG:!!LPG,dead:LNdead,ulp:Object.keys(ULP).join(","),umir:Object.keys(UMIR).length,info:LPinfo};};
window.__lnSpawn=function(x,y){lensSpawn(x,y);};
function lensPass(t){
 if(LNdead||!lpEnsure())return;
 var CWp=cv.width,CHp=cv.height,i,j,rects=[];
 for(i=0;i<3;i++){var f=FBL[i];
  if(!f||f.a<.01){FBA[i*4+2]=0;continue;}
  var fr=f.el.getBoundingClientRect(),fx=(fr.left+fr.width/2-R.x)*S,fy=(fr.top+fr.height/2-R.y)*S,fw=fr.width/2*S,fh=fr.height/2*S;
  FBA[i*4]=fx;FBA[i*4+1]=fy;FBA[i*4+2]=fw;FBA[i*4+3]=fh;FBQ[i*4]=Math.min(fw,fh)*(f.rad||1);FBQ[i*4+3]=f.a;
  rects.push([fx-fw-14,fy-fh-14,fx+fw+14,fy+fh+14]);}
 for(i=0;i<16;i++){var L=LNS[i];
  if(!L){LNA[i*4+3]=0;continue;}
  var rp=L.R*Math.max(.2,Math.min(1.1,L.s))*S,cx=(L.x-R.x)*S,cy=(L.y-R.y)*S,hh=rp*(1.7+Math.max(0,L.e)*1.3)+14;
  LNA[i*4]=cx;LNA[i*4+1]=cy;LNA[i*4+2]=rp;LNA[i*4+3]=L.s>.01?1:0;
  LNB[i*4]=L.e;LNB[i*4+1]=L.a;LNB[i*4+2]=L.wob;LNB[i*4+3]=(t/1000)%1000;
  if(L.s>.01)rects.push([cx-hh,cy-hh,cx+hh,cy+hh]);}
 if(ISL)rects.push([(S>0?(VW/2-63-92-R.x)*S:0),0,(VW/2+63+92-R.x)*S,(29.5+18.5+92)*S]);
 if(!rects.length)return;
 var again=true;   /* зливаємо прямокутники, що перетинаються, у кластери: кожна ділянка малюється один раз */
 while(again){again=false;for(i=0;i<rects.length&&!again;i++)for(j=i+1;j<rects.length;j++){var a=rects[i],b=rects[j];
  if(a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3]){a[0]=Math.min(a[0],b[0]);a[1]=Math.min(a[1],b[1]);a[2]=Math.max(a[2],b[2]);a[3]=Math.max(a[3],b[3]);rects.splice(j,1);again=true;break;}}}
 gl.activeTexture(gl.TEXTURE6);
 if(!LNtex){LNtex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,LNtex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.bindTexture(gl.TEXTURE_2D,LNtex);
 if(LNtw!==CWp||LNth!==CHp){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,CWp,CHp,0,gl.RGBA,gl.UNSIGNED_BYTE,null);LNtw=CWp;LNth=CHp;}
 var dbg=window.__lnDbg,p0=null;if(dbg){p0=new Uint8Array(4);gl.readPixels(Math.round(LNA[0]),CHp-Math.round(LNA[1]),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p0);}
 gl.useProgram(LPG);
 for(var mk in UMIR){var lc=ULP[mk];if(lc){var me=UMIR[mk];gl[me[0]].apply(gl,[lc].concat(me[1]));}}
 gl.uniform1i(ULP.u_lt,6);gl.uniform4fv(ULP.u_ln,LNA);gl.uniform4fv(ULP.u_lj,LNB);gl.uniform4fv(ULP.u_fb,FBA);gl.uniform4fv(ULP.u_fq,FBQ);gl.uniform1f(ULP.u_lp,1);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.SCISSOR_TEST);
 for(i=0;i<rects.length;i++){var q=rects[i],x0=Math.max(0,Math.floor(q[0])),y0=Math.max(0,Math.floor(q[1])),x1=Math.min(CWp,Math.ceil(q[2])),y1=Math.min(CHp,Math.ceil(q[3])),bw=x1-x0,bh=y1-y0;
  if(bw<=0||bh<=0)continue;var byGL=CHp-y1;
  gl.copyTexSubImage2D(gl.TEXTURE_2D,0,x0,byGL,x0,byGL,bw,bh);
  gl.scissor(x0,byGL,bw,bh);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
 if(dbg){var p1=new Uint8Array(4);gl.readPixels(Math.round(LNA[0]),CHp-Math.round(LNA[1]),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p1);LPinfo="before "+p0.join(",")+" after "+p1.join(",")+" err "+gl.getError()+" rects "+rects.length+" A "+Array.prototype.slice.call(LNA,0,4).map(Math.round).join(",");}
 gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.useProgram(MP);
 gl.bindTexture(gl.TEXTURE_2D,tkTex||dummy);gl.activeTexture(gl.TEXTURE0);   /* повертаємо смугу бігучого рядка на її блок */
}
var BTB=new Float32Array(56),BTQ=new Float32Array(56),BTC=new Float32Array(56),BTE=[],BTN=0,BTK='',tkOfs=[0,0],bkLastKey='',texVer=0,tkY0=0,TKH=190,tkCv=document.createElement('canvas'),tkCx=tkCv.getContext('2d'),tkTex=null;
function tkCopy(rx,ry,rw,rh){   /* ділянка шару плиток (#glt) під тікером — те, що він заломлює разом зі знімками сторінок */
 var rk=rx.toFixed(0)+','+ry.toFixed(0)+','+rw.toFixed(0)+','+rh.toFixed(0);
 var tnow=performance.now(),dsy=(sy[sel]||0)-tkCopy.sy,dca=(ca-tkCopy.ca)*VW,moved=Math.abs(dsy)+Math.abs(dca)>.5,big=Math.abs(dsy)>140||Math.abs(dca)>VW*.4,quiet=tnow-(tkCopy.chg||0)>160;
 if(tkCopy.last!==tgMajorN){tkCopy.last=tgMajorN;tkCopy.chg=tnow;}
 var need=!tkTex||tkCopy.rk!==rk||big||(quiet&&tkCopy.done!==tgMajorN&&tnow-(tkCopy.tt||0)>250);
 if(!need){tkOfs[0]=dca;tkOfs[1]=dsy;gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,tkTex);gl.activeTexture(gl.TEXTURE0);return;}
 tkCopy.tt=tnow;tkCopy.done=tgMajorN;tkCopy.rk=rk;tkCopy.sy=sy[sel]||0;tkCopy.ca=ca;tkOfs[0]=0;tkOfs[1]=0;
 var k=1.5,w=Math.max(8,Math.round(rw*k)),h=Math.max(8,Math.round(rh*k));if(tkCv.width!==w||tkCv.height!==h){tkCv.width=w;tkCv.height=h;}
 try{tkCx.drawImage(TGC,rx/VW*TGC.width,ry/VH*TGC.height,rw/VW*TGC.width,rh/VH*TGC.height,0,0,w,h);}catch(e){return;}
 if(!tkTex){tkTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tkTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,tkTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tkCv);gl.activeTexture(gl.TEXTURE0);
}
/* вміст тікера малюється у текстуру (2D) і заломлюється склом тікера разом із фоном */
var tkXc=document.createElement('canvas'),tkXx=tkXc.getContext('2d'),tkXTex=null,tkF=null;
/* смуга тікера (одна копія стрічки) малюється один раз за зміни даних; рух по екрану — лише зсув у шейдері */
var tkStrip={key:'',ok:0,T0:0,w:0,v:0,n:1,ids:null},tkReg=[0,0,1,1];
/* вертикальний тікер: картки 52×72 стопкою, текст прямий (символ, ціна, зміна) */
function tkStripBuildV(){
 var its=tickerTrk.querySelectorAll('.ti');
 if(!its.length||!tickerTrk.dataset.loop){tkStrip.ok=0;return;}
 var key='V|'+(tickerTrk._ver||0)+'|'+(document.fonts?document.fonts.status:'');
 if(key===tkStrip.key&&tkStrip.ok)return;
 var n=Math.max(1,Math.round(its.length/MK_COPIES)),CWc=56,CHc=72,k,ids=[];
 tkXc.width=Math.ceil(n*CWc*2);tkXc.height=160;
 var x=tkXx;x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,n*CWc,80);x.textAlign='center';x.textBaseline='middle';
 var fam=getComputedStyle(its[0]).fontFamily,g=function(q){var el=tickerEl.querySelector(q);return el?getComputedStyle(el).color:'#fff';};
 var cB=g('.tc b'),cP=g('.tp span'),cI=g('.tp i'),cN=g('.tp i.neg'),cL=getComputedStyle(its[0]).borderLeftColor;
 function fit(txt,wt,sz){x.font=wt+' '+sz+'px '+fam;var wv=x.measureText(txt).width;if(wv>CWc-10){sz=Math.max(7,sz*(CWc-10)/wv);x.font=wt+' '+sz+'px '+fam;}}
 for(k=0;k<n;k++){var ti=its[k],cx=k*CWc+CWc/2,b=ti.querySelector('.tc b'),p=ti.querySelector('.tp span'),i=ti.querySelector('.tp i'),mkEl=ti.hasAttribute('data-mk')?ti:ti.querySelector('[data-mk]');
  ids.push(mkEl?mkEl.dataset.mk:'');
  if(b){fit(b.textContent,'700',11);x.fillStyle=cB;x.fillText(b.textContent,cx,17);}
  if(p){fit(p.textContent,'600',11);x.fillStyle=cP;x.fillText(p.textContent,cx,36);}
  if(i){fit(i.textContent,'600',10);x.fillStyle=i.classList.contains('neg')?cN:cI;x.fillText(i.textContent,cx,53);}
  x.fillStyle=cL;x.fillRect(k*CWc+14,CHc-1,CWc-28,1);}
 tkStrip.key=key;tkStrip.ok=1;tkStrip.v=1;tkStrip.n=n;tkStrip.w=n*CHc;tkStrip.T0=0;tkStrip.ids=ids;atlTkCh=1;
}
function tkHit(e){   /* картка під пальцем: у вертикальному тікері — за зсувом стопки, у горизонтальному — за DOM */
 if(TKP.tm>.5&&tkStrip.v&&tkStrip.ids){var L=tkStrip.w,s=e.clientY-(TKP.ey-(VW-32)/2)+(((tkOff%L)+L)%L);s=((s%L)+L)%L;var id=tkStrip.ids[Math.floor(s/72)];return id?{dataset:{mk:id}}:null;}
 return e.target.closest('[data-mk]');
}
function tkStripBuild(){
 var its=tickerTrk.querySelectorAll('.ti');
 if(!its.length||!tickerTrk.dataset.loop){tkStrip.ok=0;return;}
 var key='H|'+(tickerTrk._ver||0)+'|'+VW+'|'+tickerEl.offsetTop+'|'+(document.fonts?document.fonts.status:'');
 if(key===tkStrip.key&&tkStrip.ok)return;
 var w=tickerTrk.scrollWidth/MK_COPIES;if(w<20)return;
 tkF=null;var tkT0=tickerEl.style.translate,tkR0=tickerEl.style.rotate;tickerEl.style.translate='';tickerEl.style.rotate='';
 var cur=-(parseFloat(String(tickerTrk._tx||'').replace('translate3d(',''))||0),r0=its[0].getBoundingClientRect(),o0=its[0].offsetLeft;
 var SW=Math.ceil((w+12)*2);tkXc.width=SW;tkXc.height=160;
 var x=tkXx;x.setTransform(2,0,0,2,0,-tkY0*2);x.clearRect(0,tkY0,w+12,80);x.textBaseline='middle';
 var g=function(q){var e=tickerEl.querySelector(q);if(!e)return null;var c=getComputedStyle(e);return{f:c.fontWeight+' '+c.fontSize+' '+c.fontFamily,c:c.color};};
 tkF={b:g('.tc b'),p:g('.tp span'),i:g('.tp i'),n:g('.tp i.neg'),l:getComputedStyle(its[0]).borderLeftColor};
 for(var n=0;n<its.length;n++){var ti=its[n],loc=ti.offsetLeft-o0;if(loc>w+12)break;
  var r=ti.getBoundingClientRect(),ox=loc-r.left;   /* r.left змінюється зі зсувом стрічки, loc — ні: переводимо координати в локальні */
  x.fillStyle=tkF.l;x.fillRect(loc,r.top+(r.height-26)/2,1,26);
  var b=ti.querySelector('.tc b'),p=ti.querySelector('.tp span'),i=ti.querySelector('.tp i'),sp=ti.querySelector('svg.sp'),t;
  if(b&&tkF.b){t=b.getBoundingClientRect();x.font=tkF.b.f;x.fillStyle=tkF.b.c;x.fillText(b.textContent,t.left+ox,t.top+t.height/2);}
  if(p&&tkF.p){t=p.getBoundingClientRect();x.font=tkF.p.f;x.fillStyle=tkF.p.c;x.fillText(p.textContent,t.left+ox,t.top+t.height/2);}
  if(i){var f=i.classList.contains('neg')&&tkF.n?tkF.n:tkF.i;if(f){t=i.getBoundingClientRect();x.font=f.f;x.fillStyle=f.c;x.fillText(i.textContent,t.left+ox,t.top+t.height/2);}}
  var pa=sp&&sp.querySelector('path');
  if(pa){var d=(pa.getAttribute('d')||'').match(/-?[0-9.]+/g);t=sp.getBoundingClientRect();
   if(d&&d.length>3){var vb=(sp.getAttribute('viewBox')||'0 0 54 26').split(' '),sx=t.width/vb[2],sy=t.height/vb[3];
    x.beginPath();for(var q=0;q+1<d.length;q+=2){var px=t.left+ox+d[q]*sx,py=t.top+d[q+1]*sy;q?x.lineTo(px,py):x.moveTo(px,py);}
    x.strokeStyle=pa.getAttribute('stroke')||'#66d896';x.lineWidth=(+pa.getAttribute('stroke-width')||1.8)*sx;x.lineJoin='round';x.lineCap='round';x.stroke();}}
 }
 tkStrip.key=key;tkStrip.ok=1;tkStrip.v=0;tkStrip.T0=r0.left+cur;tkStrip.w=w;atlTkCh=1;tickerEl.style.translate=tkT0;tickerEl.style.rotate=tkR0;
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
var bgEl=document.getElementById('bg'),dock=document.getElementById('dock'),btnsBox=document.getElementById('btns');
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
 n.style.margin='0';n.style.filter='';n.style.opacity='';n.style.scale='';n.style.translate='';n.style.rotate='';n.style.width=w+'px';n.style.transform='none';n.style.willChange='auto';FC.appendChild(n);
 FR.style.width=Math.ceil(w)+'px';FR.style.height=Math.ceil(h)+'px';
 var s0=performance.now();return html2canvas(n,{backgroundColor:null,scale:ts,logging:false,windowWidth:Math.ceil(w),windowHeight:Math.ceil(h),imageTimeout:0}).then(function(c){var d=performance.now()-s0;pfS('знімок',d);texVer++;if(d>25)LG('знімок','html2canvas '+Math.round(d)+' мс, блок '+Math.round(w)+'x'+Math.round(h));return c;});
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
 var ts=Math.min(Math.min(S,1),MAXT/(h+4)),tw=Math.ceil(w*ts)+4,th=Math.ceil(h*ts)+4;
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

var ATH=304;
var dkXc=document.createElement('canvas'),dkXx=dkXc.getContext('2d'),atlW=0,atlTkCh=1,atlDkCh=1,dkSig='';
function atlPrep(){var w=Math.round(VW*2);if(dkXc.width!==w||dkXc.height!==144){dkXc.width=w;dkXc.height=144;atlDkCh=1;dkSig='';}}
function atlUp(){
 var w=Math.max(tkXc.width,dkXc.width,Math.round(VW*2));
 if(!tkXTex){tkXTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tkXTex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
 gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,tkXTex);
 if(atlW!==w){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,ATH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);atlW=w;atlTkCh=1;atlDkCh=1;}
 if(atlTkCh&&tkStrip.ok)gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,tkXc);
 if(atlDkCh)gl.texSubImage2D(gl.TEXTURE_2D,0,0,160,gl.RGBA,gl.UNSIGNED_BYTE,dkXc);
 atlTkCh=0;atlDkCh=0;gl.activeTexture(gl.TEXTURE0);
}
/* ===== ряд іконок доку: малюється в текстуру, кольори за станом балансу, активна світиться; скляний індикатор заломлює їх ===== */
var dkImg=[],dkPos=null,dkTint=[.78,.8,.88],dkTmp=document.createElement('canvas'),dkTc=dkTmp.getContext('2d'),dkFam='',dkOK=0;
dkTmp.width=dkTmp.height=48;
function dkLoad(){
 if(dkImg.length)return;
 btns.forEach(function(b,i){var sv=b.querySelector('svg');if(!sv)return;
  var t=sv.outerHTML.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" color="#fff" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"');
  var im=new Image();im.onload=function(){dirty=true;};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(t);dkImg[i]=im;});
}
function dkMeasure(){   /* позиції іконок і підписів відносно доку (викликається, поки transform доку знято) */
 var d0=dock.getBoundingClientRect();
 dkPos=btns.map(function(b){var sv=b.querySelector('svg').getBoundingClientRect(),sp=b.querySelector('span').getBoundingClientRect();
  return{ix:sv.left-d0.left,iy:sv.top-d0.top,iw:sv.width,lx:sp.left+sp.width/2-d0.left,ly:sp.top+sp.height/2-d0.top};});
 try{dkFam=getComputedStyle(btns[0].querySelector('span')).fontFamily;}catch(e){}
}
function dkDraw(){
 dkLoad();if(!dkPos||!dkImg.length)return;
 var ready=dkImg.every(function(im){return im&&im.complete&&im.naturalWidth>0;});
 if(!ready){dkOK=0;return;}
 var tt=BAL_TREND>0?[.04,.98,.36]:BAL_TREND<0?[1,.03,.07]:[.8,.82,.9];
 var dtn=0;for(var q0=0;q0<3;q0++){dkTint[q0]+=(tt[q0]-dkTint[q0])*.08;dtn+=Math.abs(tt[q0]-dkTint[q0]);}if(dtn>.02)dirty=true;
 var sig=VW+'|'+Math.round(DR.width)+'|'+Math.round(DR.height);if(sig===dkSig&&dkOK)return;dkSig=sig;
 var x=dkXx,c=cells();
 x.setTransform(2,0,0,2,0,0);x.clearRect(0,0,VW,76);
 x.textAlign='center';x.textBaseline='middle';
 for(var k=0;k<btns.length;k++){
  var P=dkPos[k];
  var cxk=c.cx(k);
  var w=0;
  var mix=BAL_TREND===0?.12:0,tr=255*(dkTint[0]*(1-mix)+mix),tg=255*(dkTint[1]*(1-mix)+mix),tb=255*(dkTint[2]*(1-mix)+mix),r=Math.round(255+(tr-255)*w),g=Math.round(255+(tg-255)*w),b=Math.round(255+(tb-255)*w);
  var col='rgb('+r+','+g+','+b+')',al=1;
  dkTc.clearRect(0,0,48,48);dkTc.globalCompositeOperation='source-over';dkTc.drawImage(dkImg[k],0,0,48,48);
  dkTc.globalCompositeOperation='source-in';dkTc.fillStyle=col;dkTc.fillRect(0,0,48,48);
  if(w>.03){var gx=P.ix+P.iw/2,gy=P.iy+P.iw/2,gc=Math.round(255*dkTint[0])+','+Math.round(255*dkTint[1])+','+Math.round(255*dkTint[2]),gr=x.createRadialGradient(gx,gy,0,gx,gy,24);gr.addColorStop(0,'rgba('+gc+','+(.45*w).toFixed(2)+')');gr.addColorStop(1,'rgba('+gc+',0)');x.globalAlpha=1;x.fillStyle=gr;x.fillRect(gx-24,gy-24,48,48);}
  x.globalAlpha=al;
  x.drawImage(dkTmp,P.ix,P.iy,P.iw,P.iw);
  x.font='600 10px '+(dkFam||'sans-serif');x.fillStyle=col;
  x.fillText(btns[k].getAttribute('aria-label')||'',P.lx,P.ly);
  x.shadowBlur=0;x.globalAlpha=1;
 }
 dkOK=1;atlDkCh=1;
}
var dkX=0;
/* ===== 4. Розміри (кешуються, не читаються щокадру) ===== */
var fullMode=false,wantFull=false;
function rootGrid(){var gc=gridCell(),st=document.documentElement.style;st.setProperty('--gc',gc.toFixed(2)+'px');st.setProperty('--gx',((VW/2)%gc).toFixed(2)+'px');st.setProperty('--gy',((VH/2)%gc).toFixed(2)+'px');}
function measure(){
 var pt=dock.style.transform,bt0=btnsBox.style.transform;dock.style.transform='none';btnsBox.style.transform='none';
 var d=frect(dock),b=bgEl.getBoundingClientRect(),M=34;try{dkMeasure();}catch(e){}
 dock.style.transform=pt;btnsBox.style.transform=bt0;
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
/* ---- закріплення дока: затисни й перетягни до будь-якого краю — внизу/вгорі док горизонтальний, ліворуч/праворуч вертикальний; прилипає пружиною.
   Усередині док лишається «віртуальним» горизонтальним (DR, x, cells()); на екран його переносить відображення dkPt (транспонування при m=1) ---- */

var DKP={side:'b',m:0,x:0,y:0,vx:0,vy:0,vm:0,tx:0,ty:0,tm:0,ex:0,ey:0,drag:0,init:0,trans:0,lp:0,sx:0,sy:0,pid:-1,mk:''},DKM=10,DKV=36,DKMV=6;
try{var dks0=localStorage.getItem('vf-dock-side');if(dks0==='t'||dks0==='l'||dks0==='r')DKP.side=dks0;}catch(_){}
function dkVc(){return{x:DR.left+DR.width/2,y:DR.top+DR.height/2};}
function dkHome(side){var h=DR.height,vc=dkVc();
 if(side==='t')return{x:vc.x,y:SAFE.t+DKM+h/2,m:0};
 if(side==='l')return{x:DKMV+DKV/2,y:VH/2,m:1};
 if(side==='r')return{x:VW-DKMV-DKV/2,y:VH/2,m:1};
 return{x:vc.x,y:vc.y,m:0};}
function dkAway(side){return side==='t'?[0,-1]:side==='l'?[-1,0]:side==='r'?[1,0]:[0,1];}
function dkHideDist(side){return side==='b'?hideOff():DR.height+DKM+40+(side==='t'?SAFE.t:0);}
function dkInsets(){var d=DKP.side,t=TKP.side,H=(DR.height||72)+DKM+6,T=56+TKM,st=document.documentElement.style;
 function rs(sd){return(d===sd?H:0)+(t===sd?T:0);}
 st.setProperty('--pdT',(16+rs('t'))+'px');st.setProperty('--pdB',(48+rs('b')+(d==='b'?14:0)+(t==='b'?0:0))+'px');st.setProperty('--pdL','0px');st.setProperty('--pdR','0px');
 needSync=allSync();tlAllStale();dirty=true;}
function dkPick(x,y){var d={l:x,r:VW-x,t:y,b:VH-y},best=DKP.side,bd=d[best]-34,k;for(k in d)if(d[k]<bd){bd=d[k];best=k;}return best;}   /* найближчий край з гістерезисом, щоб не миготіло */
function dkU(e){var vc=dkVc(),dx=e.clientX-DKP.ex,dy=e.clientY-DKP.ey;return DKP.tm>.5?vc.x+dy:vc.x+dx;}   /* позиція пальця вздовж доку у віртуальній (горизонтальній) системі */
function kbScreen(hh){var c=cells(),vc=dkVc(),m=DKP.m,du=c.cx(KS)-vc.x,a=dkAway(DKP.side),d=hh*dkHideDist(DKP.side);return{x:DKP.x+du*(1-m)+a[0]*d,y:DKP.y+du*m+a[1]*d};}
function dkStep(dt,hh){
 if(!DR.width||!VW)return false;
 var side=DKP.side,home=dkHome(side),a=dkAway(side),mv=false;
 if(!DKP.init){DKP.init=1;DKP.x=DKP.tx=home.x;DKP.y=DKP.ty=home.y;DKP.m=DKP.tm=home.m;dkInsets();}
 if(!DKP.drag){DKP.tx=home.x;DKP.ty=home.y;DKP.tm=home.m;}
 if(!DKP.drag&&!DKP.trans){DKP.x=home.x;DKP.y=home.y;DKP.m=home.m;DKP.vx=DKP.vy=DKP.vm=0;}
 else{
  var kp=DKP.drag?560:210,dm=DKP.drag?42:20,q,h=dt/2;
  for(q=0;q<2;q++){
   DKP.vx+=(kp*(DKP.tx-DKP.x)-dm*DKP.vx)*h;DKP.x+=DKP.vx*h;
   DKP.vy+=(kp*(DKP.ty-DKP.y)-dm*DKP.vy)*h;DKP.y+=DKP.vy*h;
   DKP.vm+=(170*(DKP.tm-DKP.m)-17*DKP.vm)*h;DKP.m+=DKP.vm*h;}
  DKP.m=Math.max(0,Math.min(1,DKP.m));
  mv=true;
  if(!DKP.drag&&Math.abs(DKP.tx-DKP.x)+Math.abs(DKP.ty-DKP.y)<.35&&Math.abs(DKP.tm-DKP.m)<.004&&Math.abs(DKP.vx)+Math.abs(DKP.vy)<6&&Math.abs(DKP.vm)<.05){DKP.x=DKP.tx;DKP.y=DKP.ty;DKP.m=DKP.tm;DKP.vx=DKP.vy=DKP.vm=0;DKP.trans=0;mv=false;}
 }
 var d=hh*dkHideDist(side);DKP.ex=DKP.x+a[0]*d;DKP.ey=DKP.y+a[1]*d;
 /* DOM-кнопки: той самий перенос, щоб натискання потрапляли в скло */
 var Wd=DR.width,Hd=DR.height,mt=DKP.tm>.5?'matrix(0,1,'+(DKV/Hd).toFixed(4)+',0,'+(DKP.ex-DKV/2-DR.left).toFixed(2)+','+(DKP.ey-Wd/2-DR.top).toFixed(2)+')':'translate3d('+(DKP.ex-Wd/2-DR.left).toFixed(2)+'px,'+(DKP.ey-Hd/2-DR.top).toFixed(2)+'px,0)';
 if(DKP.mk!==mt){DKP.mk=mt;btnsBox.style.transform=mt;}
 return mv||!!DKP.drag;
}
var TKP={side:'t',m:0,x:0,y:0,vx:0,vy:0,vm:0,tx:0,ty:0,tm:0,sg:0,tsg:0,ex:0,ey:0,drag:0,init:0,trans:0,lp:0,sx:0,sy:0,pid:-1,mk:''},TKM=8,TKV=56,TKMV=6,tkHide=0;
try{var tks0=localStorage.getItem('vf-tick-side');if(tks0==='b'||tks0==='l'||tks0==='r')TKP.side=tks0;}catch(_){}
function tkThick(){return tickerEl.offsetHeight||56;}
function tkHome(side){var h=tkThick(),lane=(DKP.side===side)?(DR.height+DKM+6):0;
 if(side==='b')return{x:VW/2,y:VH-SAFE.b-TKM-h/2-lane,m:0,s:0};
 if(side==='l')return{x:TKMV+TKV/2+(DKP.side==='l'?DKV+DKMV+4:0),y:VH/2,m:1,s:-1};
 if(side==='r')return{x:VW-TKMV-TKV/2-(DKP.side==='r'?DKV+DKMV+4:0),y:VH/2,m:1,s:1};
 return{x:VW/2,y:SAFE.t+TKM+h/2+lane,m:0,s:0};}
function tkAx(e){return TKP.tm>.5?e.clientY:e.clientX;}   /* позиція пальця вздовж стрічки (у напрямку читання) */
function tkStep(dt,hh){
 if(!VW||!tickerEl.offsetHeight)return false;
 var side=TKP.side,home=tkHome(side),a=dkAway(side),mv=false;
 if(!TKP.init){TKP.init=1;TKP.x=TKP.tx=home.x;TKP.y=TKP.ty=home.y;TKP.m=TKP.tm=home.m;TKP.sg=TKP.tsg=home.s;}
 if(!TKP.drag){TKP.tx=home.x;TKP.ty=home.y;TKP.tm=home.m;TKP.tsg=home.s;}
 TKP.sg=TKP.tsg;
 if(!TKP.drag&&!TKP.trans){TKP.x=home.x;TKP.y=home.y;TKP.m=home.m;TKP.vx=TKP.vy=TKP.vm=0;}
 else{
  var kp=TKP.drag?560:210,dm=TKP.drag?42:20,q,h=dt/2;
  for(q=0;q<2;q++){
   TKP.vx+=(kp*(TKP.tx-TKP.x)-dm*TKP.vx)*h;TKP.x+=TKP.vx*h;
   TKP.vy+=(kp*(TKP.ty-TKP.y)-dm*TKP.vy)*h;TKP.y+=TKP.vy*h;
   TKP.vm+=(170*(TKP.tm-TKP.m)-17*TKP.vm)*h;TKP.m+=TKP.vm*h;}
  TKP.m=Math.max(0,Math.min(1,TKP.m));mv=true;
  if(!TKP.drag&&Math.abs(TKP.tx-TKP.x)+Math.abs(TKP.ty-TKP.y)<.35&&Math.abs(TKP.tm-TKP.m)<.004&&Math.abs(TKP.vx)+Math.abs(TKP.vy)<6&&Math.abs(TKP.vm)<.05){TKP.x=TKP.tx;TKP.y=TKP.ty;TKP.m=TKP.tm;TKP.vx=TKP.vy=TKP.vm=0;TKP.trans=0;mv=false;}
 }
 var d=hh*(tkThick()+TKM+20+(side==='t'?SAFE.t:side==='b'?SAFE.b:0));TKP.ex=TKP.x+a[0]*d;TKP.ey=TKP.y+a[1]*d;
 var cvx=VW/2,cvy=tickerEl.offsetTop+tickerEl.offsetHeight/2,dx=TKP.ex-cvx,dy=TKP.ey-cvy;
 var mt=(Math.abs(dx)<.01&&Math.abs(dy)<.01&&TKP.tm<.5)?'|':dx.toFixed(2)+'px '+dy.toFixed(2)+'px|'+(TKP.tm>.5?(TKP.sg>0?'90deg':'-90deg'):'0deg');
 if(TKP.mk!==mt){TKP.mk=mt;if(mt==='|'){tickerEl.style.translate='';tickerEl.style.rotate='';}else{var pr2=mt.split('|');tickerEl.style.translate=pr2[0];tickerEl.style.rotate=pr2[1];}}
 return mv||!!TKP.drag;
}
function tkLift(){
 if(TKP.pid<0)return;
 TKP.drag=1;TKP.trans=1;TKP.lp=0;try{clearTimeout(lpT);}catch(_){}
 try{if(tkPress){tkG.end({cancelled:true});tkPress=null;tkVel=0;}}catch(_){}
 dkBuzz(16);LG('dock','закріплення: тікер піднято');dirty=true;
}
function tkDrop(){
 var side=tkPick(TKP.tx,TKP.ty);TKP.drag=0;TKP.trans=1;TKP.pid=-1;
 if(side!==TKP.side){TKP.side=side;try{localStorage.setItem('vf-tick-side',side);}catch(_){}dkInsets();LG('dock','тікер закріплено: '+side);}
 dkBuzz(10);dirty=true;
}
function tkPick(x,y){var d={l:x,r:VW-x,t:y,b:VH-y},best=TKP.side,bd=d[best]-34,k;for(k in d)if(d[k]<bd){bd=d[k];best=k;}return best;}
tickerEl.addEventListener('pointerdown',function(e){clearTimeout(TKP.lp);TKP.sx=e.clientX;TKP.sy=e.clientY;TKP.pid=e.pointerId;TKP.lp=setTimeout(tkLift,480);},true);
tickerEl.addEventListener('pointermove',function(e){
 if(TKP.lp&&Math.hypot(e.clientX-TKP.sx,e.clientY-TKP.sy)>10){clearTimeout(TKP.lp);TKP.lp=0;}
 if(TKP.drag&&e.pointerId===TKP.pid){e.preventDefault();e.stopPropagation();TKP.tx=Math.max(20,Math.min(VW-20,e.clientX));TKP.ty=Math.max(20,Math.min(VH-20,e.clientY));var pk=tkPick(TKP.tx,TKP.ty);TKP.tm=(pk==='l'||pk==='r')?1:0;TKP.tsg=pk==='l'?-1:pk==='r'?1:0;}
},true);
['pointerup','pointercancel'].forEach(function(n){tickerEl.addEventListener(n,function(e){clearTimeout(TKP.lp);TKP.lp=0;if(TKP.drag&&e.pointerId===TKP.pid){e.stopPropagation();tkDrop();}},true);});
function dkBuzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms);}catch(_){}}
function dkLift(){
 if(DKP.pid<0||mode===1)return;
 DKP.drag=1;DKP.trans=1;drag=null;kbTap=null;kbClick=false;DKP.lp=0;
 try{btnsBox.setPointerCapture(DKP.pid);}catch(_){}
 dkBuzz(16);LG('dock','закріплення: док піднято');dirty=true;
}
function dkDrop(){
 var side=dkPick(DKP.tx,DKP.ty);DKP.drag=0;DKP.trans=1;DKP.pid=-1;
 if(side!==DKP.side){DKP.side=side;try{localStorage.setItem('vf-dock-side',side);}catch(_){}dkInsets();LG('dock','закріплено: '+side);}
 dkBuzz(10);dirty=true;
}

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
 var ks=kbScreen(hide);
 return{x:ks.x,y:ks.y,hw:22,hh:22};
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
 if(!was){var ks0=kbScreen(0);pill.x=ks0.x;pill.y=ks0.y;pill.hw=pill.hh=22;pill.vx=pill.vy=pill.vw=pill.vh=0;}
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
var TAB_ROOT=['insights','debts','home'];
function tabAtRoot(i){try{return i>2||nav.getState().screen===TAB_ROOT[i];}catch(e){return true;}}   /* з будь-якої підсторінки повторний тап по вкладці повертає на її початкову сторінку */
function actTab(i){try{app.activateButton(TAB_IDS[i]);}catch(err){console.error(err);}}
dock.addEventListener('pointerdown',function(e){
 e.preventDefault();if(mode===1)return;
 kbClick=false;
 var c=cells(),px=dkU(e),grab=x!==null&&Math.abs(px-x)<c.cw/2+4,sl=slotAt(c,px);
 clearTimeout(DKP.lp);DKP.sx=e.clientX;DKP.sy=e.clientY;DKP.pid=e.pointerId;DKP.lp=setTimeout(dkLift,480);
 if(grab){drag={id:e.pointerId,off:x-px,start:x};dragTarget=x;try{btnsBox.setPointerCapture(e.pointerId);}catch(_){}}
 else if(sl===KS){kbTap={id:e.pointerId,x:e.clientX,y:e.clientY};kbClick=true;}
 else{var i=sl>KS?sl-1:sl;if(i===dockSel&&i!==3&&tabAtRoot(i))return;dir=(c.cx(slotOf[i])-x)>=0?1:-1;actTab(i);}
});
dock.addEventListener('pointermove',function(e){
 if(DKP.lp&&Math.hypot(e.clientX-DKP.sx,e.clientY-DKP.sy)>10){clearTimeout(DKP.lp);DKP.lp=0;}
 if(DKP.drag){if(e.pointerId!==DKP.pid)return;e.preventDefault();DKP.tx=Math.max(20,Math.min(VW-20,e.clientX));DKP.ty=Math.max(20,Math.min(VH-20,e.clientY));var pk=dkPick(DKP.tx,DKP.ty);DKP.tm=(pk==='l'||pk==='r')?1:0;DKP.pk=pk;return;}
 if(kbTap&&e.pointerId===kbTap.id&&Math.hypot(e.clientX-kbTap.x,e.clientY-kbTap.y)>12){kbTap=null;kbClick=false;}
 if(!drag||e.pointerId!==drag.id)return;e.preventDefault();var c=cells();
 dragTarget=Math.max(c.cx(0),Math.min(c.cx(NS-1),dkU(e)+drag.off));setOn(tabNear(c,dragTarget));
});
function release(e){
 clearTimeout(DKP.lp);DKP.lp=0;
 if(DKP.drag){if(e.pointerId===DKP.pid)dkDrop();return;}
 if(kbTap&&e.pointerId===kbTap.id){var ok=e.type==='pointerup';kbTap=null;if(ok)tapInput();return;}
 if(!drag||e.pointerId!==drag.id)return;var c=cells();
 var tab=tabNear(c,Math.max(c.cx(0),Math.min(c.cx(NS-1),x+v*0.12))),moved=Math.abs(dragTarget-drag.start)>10;
 drag=null;setOn(dockSel);
 if(tab!==dockSel)actTab(tab);else if(!moved&&(tab===3||!tabAtRoot(tab)))actTab(tab);}
dock.addEventListener('pointerup',release);dock.addEventListener('pointercancel',function(e){kbTap=null;kbClick=false;release(e);});
dock.addEventListener('contextmenu',function(e){e.preventDefault();});
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
var BLS=0,gOX=0,gOY=0,fd={on:false,x0:0,y0:0,dx:0,dy:0};   /* fd — зсув пальця від точки дотику, сітка йде за ним */
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
var rec={pg:{v:0,ox:0,oy:0,tx:0,ty:0},mn:{v:0,ox:0,oy:0,tx:0,ty:0},sh:{v:0,ox:0,oy:0,tx:0,ty:0}},recMoving=false,RB=0,RD=0;
var pagesEl=document.getElementById('pages'),sheetsEl2=document.getElementById('sheets');
var refAt=[0,0,0];
function refreshTabs(t){      /* неактивні сторінки-вкладки перезнімаються у випадковий момент протягом ~хвилини */
 if(boot.on)return;
 for(var i=0;i<3;i++){
  if(i===sel){continue;}
  if(!refAt[i]){refAt[i]=t+240000+Math.random()*120000;continue;}
  if(t>refAt[i]){refAt[i]=t+300000+Math.random()*120000;
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
 var drw=menu.left?{ox:VW,oy:VH/2,tx:.5*VW+10,ty:0}:{ox:0,oy:VH/2,tx:-(.5*VW+10),ty:0};   /* бокова панель: сторінка зсувається вліво (разом зі стисненням −20%) */
 var L={pg:sh?ulS:dd?top:mo?drw:ul,mn:dd?top:trc,sh:top};   /* меню-випадайка (dd) ділить шар mn і мусить рухатись разом із аркушем */
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
 if(menu.kind==='more'&&(menu.on||rec.pg.v>.003)&&TKP.side==='t'){applyRec(tickerEl,rec.pg);tickerEl._dr=1;tickerEl._f=null;}   /* бігучий рядок їде разом зі сторінкою */
 else{if(tickerEl._dr){tickerEl._dr=0;tickerEl.style.transform='';tickerEl._rk=null;tickerEl._f=null;}
  if(tickerEl._f!==bsv){tickerEl._f=bsv;tickerEl.style.filter=bsv;}}
 var ev=Math.min(1,rec.pg.v).toFixed(3);if(edgeEl._ev!==ev){edgeEl._ev=ev;edgeEl.style.opacity=ev;edgeEl.style.visibility=ev>0?'visible':'hidden';}
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
var boot={on:1,hold:1,phase:0,t0:0,t1:0,t2:0,p:0,cx:0,cy:0,rmax:0,r:0,r0:0,DUR:(/[?&]slowboot/.test(location.search)?14:2.4),MIN:1.3,warm:0,
 el:document.getElementById('boot'),bar:document.querySelector('#boot .bbar i'),wrap:document.querySelector('#boot .bwrap'),logo:document.querySelector('#boot .blogo'),ring:document.querySelector('#boot .bring')};
function rrPts(cx,cy,hw,hh,r,n){
 var p=[],k,i,a,cs=[[cx+hw-r,cy-hh+r,-90],[cx+hw-r,cy+hh-r,0],[cx-hw+r,cy+hh-r,90],[cx-hw+r,cy-hh+r,180]];
 for(k=0;k<4;k++)for(i=0;i<=n;i++){a=(cs[k][2]+90*i/n)*Math.PI/180;p.push((cs[k][0]+r*Math.cos(a)).toFixed(1)+'px '+(cs[k][1]+r*Math.sin(a)).toFixed(1)+'px');}
 return p;
}
function smooth01(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
var fontsOK=!(document.fonts&&document.fonts.ready);
if(!fontsOK)document.fonts.ready.then(function(){fontsOK=true;});
/* ---------- кінематографічне завантаження ----------
   1) логотип розсипається на частинки й збирається знову (частинки беруться з пікселів самого логотипа);
   2) логотип зменшується (разом із завантаженням);
   3) скляна сфера тріскається, з тріщин б'ють лазери, вибух, частинки стягуються в точку;
   4) далі — звичайне розширення скла екрана з цієї точки.
   ?nobfx — вимкнути; ?bfxslow=3 — уповільнити в 3 рази (для перегляду). Дотик до екрана завантаження — пропустити. */
var BFX={k:+((location.search.match(/bfxslow=([\d.]+)/)||[])[1])||1,A:+((location.search.match(/bfxa=([0-9.]+)/)||[])[1])||2.1,C:3.6,E:2.45,NP:10,G:88,SCE:1.15,P:[],BK:[],cr:[],cv:null,x:null,w:0,h:0,dpr:1,on:0,init:0,skip:0,ba:0,ex:0,jx:0,jy:0,zs:1,sc:2.4,
 red:!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
function bfxR(a,b){return a+Math.random()*(b-a);}
function bfxS(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
function bfxEO(x){x=Math.max(0,Math.min(1,x));return 1-Math.pow(1-x,3);}
function bfxIO(x){x=Math.max(0,Math.min(1,x));return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
function bfxInit(){
 if(BFX.init)return;BFX.init=1;
 var off0=false;try{off0=localStorage.getItem('vf-bfx')==='0';}catch(e){}
 if(BFX.red||off0||/[?&]nobfx/.test(location.search))return;
 var img=BFX.icon=bfxIcon();   /* логотип намальований кодом, а не взятий із картинки */
 try{
  var G=BFX.G,oc=document.createElement('canvas');oc.width=oc.height=G;var ox=oc.getContext('2d');ox.drawImage(img,0,0,G,G);var d=ox.getImageData(0,0,G,G).data;
  var rc=.224,P=[],bm={},i,j;
  for(j=0;j<G;j++)for(i=0;i<G;i++){
   var u=(i+.5)/G,v=(j+.5)/G,dx=Math.max(0,Math.abs(u-.5)-(.5-rc)),dy=Math.max(0,Math.abs(v-.5)-(.5-rc));if(dx*dx+dy*dy>rc*rc)continue;
   var k=(j*G+i)*4,r=d[k],g=d[k+1],b=d[k+2];if((r*.3+g*.59+b*.11)/255<.07)continue;
   var ang=Math.random()*6.2832,dist=bfxR(.35,1.15),key=(r>>4)<<8|(g>>4)<<4|(b>>4);
   var p={tx:u-.5,ty:v-.5,dl:Math.random()*.9,sx:Math.cos(ang)*dist,sy:Math.sin(ang)*dist,spin:(Math.random()<.5?-1:1)*bfxR(1.2,3.6),sz:bfxR(.85,1.3),sp:bfxR(.25,1),X:0,Y:0,Z:0,cr:Math.min(1,r/255*1.2),cg:Math.min(1,g/255*1.2),cb:Math.min(1,b/255*1.2)};
   P.push(p);(bm[key]||(bm[key]={st:'rgb('+((r>>4)*17)+','+((g>>4)*17)+','+((b>>4)*17)+')',l:[]})).l.push(p);}
  if(P.length<300)return;
  BFX.P=P;BFX.BK=Object.keys(bm).map(function(q){return bm[q];});
  var C=[],n=BFX.NP,order=[],ev=.18,gap=.46;
  for(i=0;i<n;i++)order.push(i);
  for(i=n-1;i>0;i--){j=(Math.random()*(i+1))|0;var tmp=order[i];order[i]=order[j];order[j]=tmp;}   /* випадковий порядок кутів, щоб тріщини з'являлись у різних сторонах */
  for(var q=0;q<n;q++){
   var a=order[q]/n*6.2832+bfxR(-.2,.2),pts=[[0,0]],rad=0,ax=Math.cos(a),ay=Math.sin(a),px=-ay,py=ax,off=0;
   while(rad<1.04){rad+=bfxR(.07,.16);off+=bfxR(-.07,.07);off*=.8;pts.push([ax*rad+px*off,ay*rad+py*off]);}
   var ir=bfxR(.3,.8);C.push({a:a,pts:pts,br:0,ev:ev,back:Math.random()<.42,ix:Math.cos(a+bfxR(-.3,.3))*ir,iy:Math.sin(a+bfxR(-.3,.3))*ir,seed:Math.random()*10});
   if(Math.random()<.6){var m=(pts.length*(.25+Math.random()*.4))|0,b0=pts[m],ba=a+bfxR(.5,.9)*(Math.random()<.5?-1:1),bp=[b0.slice()],br=0;
    while(br<.4){br+=bfxR(.06,.12);bp.push([b0[0]+Math.cos(ba)*br+bfxR(-.03,.03),b0[1]+Math.sin(ba)*br+bfxR(-.03,.03)]);}
    C.push({a:a,pts:bp,br:1,ev:ev+.06,back:false});}
   ev+=gap;gap*=.8;   /* інтервали між тріщинами скорочуються: тріск, тріск... потім частіше й частіше */
  }
  BFX.cr=C;
  if(bfxGLInit()){BFX.on=1;BFX.ba=1;boot.el.classList.add('ba');boot.el.classList.add('gx');boot.el.addEventListener('pointerdown',function(){if(!BFX.skip){BFX.skip=1;BFX.A=0;LG('boot','пропуск заставки (дотик)');}});LG('boot','заставка WebGL: '+P.length+' частинок');return;}
  var cv0=document.createElement('canvas');cv0.id='bfx0';cv0.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none';boot.el.insertBefore(cv0,boot.el.firstChild);BFX.cv0=cv0;BFX.x0=cv0.getContext('2d');
  var cv=document.createElement('canvas');cv.id='bfx';cv.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3';boot.el.appendChild(cv);
  BFX.cv=cv;BFX.x=cv.getContext('2d');BFX.on=1;BFX.ba=1;boot.el.classList.add('ba');
  boot.el.addEventListener('pointerdown',function(){if(!BFX.skip){BFX.skip=1;BFX.A=0;LG('boot','пропуск заставки (дотик)');}});
  LG('boot','заставка: '+P.length+' частинок');
 }catch(e){LG('boot','заставка недоступна: '+e);BFX.on=0;}
}
function bfxSize(){
 var br=boot.el.getBoundingClientRect(),w=Math.max(1,Math.round(br.width)),h=Math.max(1,Math.round(br.height)),dpr=Math.min(2,window.devicePixelRatio||1);
 if(BFX.w!==w||BFX.h!==h||BFX.dpr!==dpr){BFX.w=w;BFX.h=h;BFX.dpr=dpr;BFX.cv.width=Math.round(w*dpr);BFX.cv.height=Math.round(h*dpr);BFX.cv0.width=BFX.cv.width;BFX.cv0.height=BFX.cv.height;}
 BFX.x.setTransform(BFX.dpr,0,0,BFX.dpr,0,0);BFX.x.globalCompositeOperation='source-over';BFX.x.globalAlpha=1;BFX.x.clearRect(0,0,w,h);
 var wr=boot.wrap.getBoundingClientRect();return[wr.left-br.left,wr.top-br.top];
}
function bfxFill(cell){   /* усі частинки одним проходом за кольоровими відрами */
 var x=BFX.x,B=BFX.BK,i,j,l,p;
 for(i=0;i<B.length;i++){x.fillStyle=B[i].st;l=B[i].l;for(j=0;j<l.length;j++){p=l[j];x.fillRect(p.X,p.Y,p.Z,p.Z);}}
}
function bfxDraw(t,el){
 if(BFX.g){bfxGLDraw(t,el);return;}
 var c=bfxSize(),cx=c[0],cy=c[1],x=BFX.x,k=BFX.k,ph=boot.phase,P=BFX.P,n=P.length,i,p,A=BFX.A*k;
 if(ph===0){
  if(el<A){
   var S2=116*2.4,cell=S2/BFX.G,D=Math.max(.35,A-1.0*k),fo=bfxS(A-.45*k,A-.05*k,el);
   boot.logo.style.opacity=(el<A-.45*k?1-bfxS(0,.1,el):fo).toFixed(3);
   if(el>A-.45*k&&BFX.ba){boot.el.classList.remove('ba');BFX.ba=0;}
   x.globalAlpha=Math.min(1,el/.1)*(1-fo);
   for(i=0;i<n;i++){p=P[i];var q=(el-p.dl*k)/D;q=q<0?0:q>1?1:q;
    var a=q<.16?bfxEO(q/.16):1-bfxIO((q-.16)/.84),th=p.spin*(1-q),cs=Math.cos(th),sn=Math.sin(th),vx=p.sx*S2*a,vy=p.sy*S2*a,z=cell*p.sz*(1.05-.5*a);
    p.X=cx+p.tx*S2+vx*cs-vy*sn-z*.5;p.Y=cy+p.ty*S2+vx*sn+vy*cs-z*.5;p.Z=z;}
   bfxFill();
  }else{if(BFX.ba){boot.el.classList.remove('ba');BFX.ba=0;}boot.logo.style.opacity='';}
  return;
 }
 if(ph===1){
  var C=BFX.C,E=BFX.E,tau=(t-boot.t1)/1000/k,S=116*BFX.sc,R=S*.41,diag=Math.hypot(BFX.w,BFX.h),sc1=BFX.sc/1.15,x0=BFX.x0,CR=BFX.cr;
  if(BFX.skip&&!BFX.sk1){BFX.sk1=1;boot.t1=Math.min(boot.t1,t-(C*k-.3)*1000);tau=(t-boot.t1)/1000/k;}
  BFX.cv0.style.display='block';x0.setTransform(BFX.dpr,0,0,BFX.dpr,0,0);x0.globalCompositeOperation='source-over';x0.clearRect(0,0,BFX.w,BFX.h);
  if(tau<E){
   /* стан: скільки тріщин вже є, "хлопок" від останньої */
   var nc=0,imp=0,i2;
   for(i2=0;i2<CR.length;i2++){var c0=CR[i2];if(c0.br)continue;var a0=tau-c0.ev;if(a0>=0){nc++;imp=Math.max(imp,Math.exp(-a0*9));}}
   var prog=nc/BFX.NP,hot=bfxS(E-.5,E,tau);
   BFX.jx=(Math.random()-.5)*2*(1+5*prog)*imp*sc1;BFX.jy=(Math.random()-.5)*2*(1+5*prog)*imp*sc1;
   BFX.zs=1+.014*imp-.05*bfxS(E-.22,E,tau);   /* кожен тріск злегка штовхає сферу, перед вибухом вона "втягується" */
   /* промені ззаду: з-за логотипа, глибина */
   x0.globalCompositeOperation='lighter';
   for(i2=0;i2<CR.length;i2++){var cb=CR[i2];if(cb.br||!cb.back)continue;var ab=tau-cb.ev;if(ab<0||ab>.85)continue;
    var bb=bfxS(0,.04,ab)*(1-bfxS(.2,.8,ab)),lnb=diag*.8*bfxEO(ab/.14),dxb=Math.cos(cb.a),dyb=Math.sin(cb.a),colb=i2%4?'255,60,75':'70,255,150';
    var gb=x0.createLinearGradient(cx,cy,cx+dxb*lnb,cy+dyb*lnb);gb.addColorStop(0,'rgba('+colb+','+(.85*bb).toFixed(3)+')');gb.addColorStop(1,'rgba('+colb+',0)');
    x0.strokeStyle=gb;x0.lineWidth=(10+6*bb)*sc1;x0.beginPath();x0.moveTo(cx,cy);x0.lineTo(cx+dxb*lnb,cy+dyb*lnb);x0.stroke();
    x0.strokeStyle='rgba(255,230,230,'+(.5*bb).toFixed(3)+')';x0.lineWidth=2.2*sc1;x0.beginPath();x0.moveTo(cx,cy);x0.lineTo(cx+dxb*lnb*.7,cy+dyb*lnb*.7);x0.stroke();}
   x0.globalCompositeOperation='source-over';
   /* світло зсередини сфери росте з кількістю тріщин */
   var gl0=.08+.75*Math.pow(prog,1.4)+.35*hot,gr0=S*(.22+.5*prog+.8*hot);
   var bl=x.createRadialGradient(cx,cy,0,cx,cy,gr0);bl.addColorStop(0,'rgba(255,240,235,'+Math.min(1,gl0).toFixed(3)+')');bl.addColorStop(.4,'rgba(255,70,80,'+(.55*Math.min(1,gl0)).toFixed(3)+')');bl.addColorStop(1,'rgba(255,0,20,0)');
   x.globalCompositeOperation='lighter';x.fillStyle=bl;x.fillRect(0,0,BFX.w,BFX.h);
   /* тріщини в колі сфери: з'являються різко, спалахують, залишаються світитись */
   x.save();x.beginPath();x.arc(cx,cy,R,0,6.2832);x.clip();x.lineJoin='round';x.lineCap='round';
   for(var pass=0;pass<2;pass++){
    x.globalCompositeOperation=pass?'source-over':'lighter';
    for(i2=0;i2<CR.length;i2++){var cr=CR[i2],age=tau-cr.ev;if(age<0)continue;
     var gp=bfxS(0,.1,age),fl=.5+.9*Math.exp(-age*8),pts=cr.pts,tot=pts.length-1,m=gp*tot,fl2=Math.floor(m),f=m-fl2;
     x.strokeStyle=pass?'rgba(255,255,255,'+Math.min(1,.55+.5*fl).toFixed(3)+')':'rgba(255,70,90,'+(.38*fl).toFixed(3)+')';x.lineWidth=(pass?1.3:5.5)*sc1;
     x.beginPath();x.moveTo(cx+pts[0][0]*R,cy+pts[0][1]*R);for(var q2=1;q2<=fl2&&q2<=tot;q2++)x.lineTo(cx+pts[q2][0]*R,cy+pts[q2][1]*R);
     if(fl2<tot)x.lineTo(cx+(pts[fl2][0]+(pts[fl2+1][0]-pts[fl2][0])*f)*R,cy+(pts[fl2][1]+(pts[fl2+1][1]-pts[fl2][1])*f)*R);
     x.stroke();}}
   x.restore();
   /* промені спереду: виходять із тріщин по одному, дедалі частіше й гучніше */
   x.globalCompositeOperation='lighter';
   for(i2=0;i2<CR.length;i2++){var cl=CR[i2];if(cl.br||cl.back)continue;var al=tau-cl.ev;if(al<0||al>.7)continue;
    var bf=bfxS(0,.035,al)*(1-bfxS(.16,.62,al)),lnf=diag*.75*bfxEO(al/.11),dxf=Math.cos(cl.a),dyf=Math.sin(cl.a),colf=i2%3?'255,60,75':'70,255,150',sx=cx+dxf*R*.12,sy=cy+dyf*R*.12;
    var gf=x.createLinearGradient(sx,sy,cx+dxf*lnf,cy+dyf*lnf);gf.addColorStop(0,'rgba('+colf+','+(.95*bf).toFixed(3)+')');gf.addColorStop(1,'rgba('+colf+',0)');
    x.strokeStyle=gf;x.lineWidth=(3+4*bf)*sc1;x.beginPath();x.moveTo(sx,sy);x.lineTo(cx+dxf*lnf,cy+dyf*lnf);x.stroke();
    x.strokeStyle='rgba(255,255,255,'+(.85*bf).toFixed(3)+')';x.lineWidth=1.2;x.beginPath();x.moveTo(sx,sy);x.lineTo(cx+dxf*lnf*.6,cy+dyf*lnf*.6);x.stroke();}
   if(imp>.02){x.fillStyle='rgba(255,235,235,'+(.05*imp).toFixed(3)+')';x.fillRect(0,0,BFX.w,BFX.h);}   /* ледь помітне блимання екрана на кожен тріск */
   x.globalCompositeOperation='source-over';
  }else{
   if(!BFX.ex){BFX.ex=1;BFX.jx=BFX.jy=0;BFX.zs=1;boot.wrap.classList.add('p1');boot.logo.style.opacity='0';LG('boot','вибух сфери');}
   x0.clearRect(0,0,BFX.w,BFX.h);
   var cell2=S/BFX.G,u=tau-E,e=bfxEO(u/.5),w=bfxIO((tau-E-.5)/(C-E-.5)),fl3=Math.pow(1-bfxS(E,E+.38,tau),1.6);
   /* частинки: розліт і стягування в точку */
   x.globalCompositeOperation='lighter';
   for(i=0;i<n;i++){p=P[i];var ln2=Math.hypot(p.tx,p.ty)||.001,dist=p.sp*diag*.5,rx=p.tx*S+(p.tx/ln2)*dist*e,ry=p.ty*S+(p.ty/ln2)*dist*e,sg=p.spin>0?1:-1,a1=e*.7*sg+w*3.4*sg,c1=Math.cos(a1),s1=Math.sin(a1),k2=1-w;
    var z2=cell2*p.sz*(.9+.7*(1-e))*(1-w*.88);p.X=cx+(rx*c1-ry*s1)*k2-z2*.5;p.Y=cy+(rx*s1+ry*c1)*k2-z2*.5;p.Z=z2;}
   x.globalAlpha=.95;bfxFill();x.globalAlpha=1;
   if(u<.9){var rr=bfxEO(u/.9)*diag*.6;x.strokeStyle='rgba(255,230,225,'+(.75*(1-u/.9)).toFixed(3)+')';x.lineWidth=2+7*(1-u/.9);x.beginPath();x.arc(cx,cy,rr,0,6.2832);x.stroke();}
   if(fl3>.01){x.fillStyle='rgba(255,244,240,'+(fl3).toFixed(3)+')';x.fillRect(0,0,BFX.w,BFX.h);}
   if(tau>E+.5){var cr2=4+24*w,cg=x.createRadialGradient(cx,cy,0,cx,cy,cr2*1.8);cg.addColorStop(0,'rgba(255,255,255,'+(w).toFixed(3)+')');cg.addColorStop(.4,'rgba(255,120,130,'+(.7*w).toFixed(3)+')');cg.addColorStop(1,'rgba(255,0,20,0)');x.fillStyle=cg;x.fillRect(cx-cr2*2,cy-cr2*2,cr2*4,cr2*4);}
   x.globalCompositeOperation='source-over';
  }
  return;
 }
 if(ph!==1&&BFX.cv0&&BFX.cv0.style.display!=='none')BFX.cv0.style.display='none';
 if(ph===2){   /* передача естафети: біла точка тане, поки зі скла розкривається екран */
  var up=(t-boot.t2)/1000,f2=bfxS(0,.55,up);
  if(up>.6){BFX.on=0;BFX.cv.style.display='none';return;}
  var r3=30*(1-f2),g3=x.createRadialGradient(cx,cy,0,cx,cy,r3+1);g3.addColorStop(0,'rgba(255,255,255,'+(1-f2).toFixed(3)+')');g3.addColorStop(.45,'rgba(255,120,130,'+(.6*(1-f2)).toFixed(3)+')');g3.addColorStop(1,'rgba(255,0,20,0)');
  x.globalCompositeOperation='lighter';x.fillStyle=g3;x.fillRect(cx-r3-2,cy-r3-2,2*r3+4,2*r3+4);x.globalCompositeOperation='source-over';
 }
}

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
  bfxInit();var elS=Math.max(0,el-(BFX.on?BFX.A*BFX.k:0));var tgt=Math.min(real,elS/boot.MIN);if(elS>9)tgt=1;
  boot.p+=(tgt-boot.p)*(1-Math.exp(-dt*7));if(tgt>=1&&boot.p>.985)boot.p=1;
  var pp=Math.max(0,Math.min(1,boot.p)),sc=2.4-(2.4-(BFX.on?BFX.SCE:0))*Math.pow(pp,1.8);   /* логотип зменшується разом із завантаженням (із заставкою — до 1.15, далі сфера тріскається; без неї — до нуля) */
  BFX.sc=sc;sc=sc*(BFX.on?BFX.zs:1);boot.logo.style.transform=(BFX.on&&(BFX.jx||BFX.jy)?'translate('+BFX.jx.toFixed(1)+'px,'+BFX.jy.toFixed(1)+'px) ':'')+'scale('+sc.toFixed(4)+')';var gsT=sc/2.4;if(boot.gs===undefined)boot.gs=gsT;boot.gs+=(gsT-boot.gs)*(1-Math.exp(-dt*14));if(gsT===0&&boot.gs<.01)boot.gs=0;
  var ws=boot.wrap.style;ws.setProperty('--gs',boot.gs.toFixed(3));ws.setProperty('--rs',(boot.gs*1.1).toFixed(3));ws.setProperty('--ro',Math.min(1,boot.gs*1.6).toFixed(3));ws.setProperty('--rr',(t*.012%360).toFixed(1)+'deg');
  if(el>.25&&!boot.lit){boot.lit=1;boot.el.classList.add('lit');}
  if(boot.phase===0&&boot.p>=1){boot.phase=1;boot.t1=t;LG('boot','фаза 1: логотип зник, '+Math.round(el*1000)+' мс від старту анімації');if(BFX.on){if(BFX.skip)boot.t1=t-(BFX.C*BFX.k-.3)*1000;}else boot.wrap.classList.add('p1');boot.warm=1;dirty=true;}
  else if(boot.phase===1&&!BFX.frz&&t-boot.t1>(BFX.on?BFX.C*BFX.k*1000:330)){
   boot.phase=2;boot.t2=t;boot.wrap.classList.add('p2');
   var r=frect(boot.logo);boot.cx=r.left+r.width/2;boot.cy=r.top+r.height/2;introStart(t);LG('boot','фаза 2: розширення з '+Math.round(boot.cx)+','+Math.round(boot.cy)+' (SO '+SO+')');
   cv.style.opacity=1;dirty=true;
  }
 }
 if(BFX.on)bfxDraw(t,el);
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
/* коефіцієнти руху країв при зсуві [верхній/лівий, нижній/правий] для додатного й від'ємного зсуву */
var EF_DEF={xp:[.35,1],xn:[1,.35],yp:[.35,1],yn:[1,.35]};
var EF_SHEET={xp:[.4,1],xn:[1,.4],yp:[1,.8],yn:[1.3,.03]};
var EF_MORE={xp:[.3,.04],xn:[1.3,.05],yp:[.4,1],yn:[1,.4]};
function panelStep(P,dt,L,k,dm,fade,bl){
 var tg=P.on?1:0,h=dt/2,q,d=P.def,t=P.tgt;
 for(q=0;q<2;q++){var a=k*(tg-P.s)-dm*P.vs;P.vs+=a*h;P.s+=P.vs*h;
  d.vx+=(300*(t.x-d.x)-21*d.vx)*h;d.x+=d.vx*h;d.vy+=(300*(t.y-d.y)-21*d.vy)*h;d.y+=d.vy*h;
  d.wx+=(340*(t.sx-d.sx)-20*d.wx)*h;d.sx+=d.wx*h;d.wy+=(340*(t.sy-d.sy)-20*d.wy)*h;d.sy+=d.wy*h;}
 var sc=Math.max(0,P.s),grow=P.mode==='grow',kk=kOf(L.v);
 var cx0=P.tx+P.tw/2,cy0=P.ty+P.th/2,Qx,Qy,Qs=grow?sc:1;
 if(grow){Qx=P.ax+(cx0-P.ax)*sc;Qy=P.ay+(cy0-P.ay)*sc;}else if(P.mode==='slide'){Qx=cx0+(1-sc)*P.slide;Qy=cy0;}else{Qx=cx0;Qy=cy0+(1-sc)*P.rise;}
 var cx=L.ox+kk*(Qx-L.ox)+L.tx*L.v,cy=L.oy+kk*(Qy-L.oy)+L.ty*L.v,s2=Qs*kk,sx=Math.max(1e-3,s2*(1+d.sx)),sy=Math.max(1e-3,s2*(1+d.sy));
 var hw=Math.max(.5,P.tw/2*sx),hh=Math.max(.5,P.th/2*sy);
 var ef=P===sheetP?EF_SHEET:(P===menu&&menu.kind==='more')?EF_MORE:EF_DEF,kx=d.x>0?ef.xp:ef.xn,ky=d.y>0?ef.yp:ef.yn;
 var ex0=cx-hw+d.x*kx[0],ex1=cx+hw+d.x*kx[1],ey0=cy-hh+d.y*ky[0],ey1=cy+hh+d.y*ky[1];
 if(P===sheetP&&ey0<14)ey0=14;   /* шторка не виходить за верх екрана при розтягуванні */
 if(ex1-ex0<1)ex1=ex0+1;if(ey1-ey0<1)ey1=ey0+1;
 cx=(ex0+ex1)/2;hw=Math.max(.5,(ex1-ex0)/2);cy=(ey0+ey1)/2;hh=Math.max(.5,(ey1-ey0)/2);sx=hw/Math.max(.5,P.tw/2);sy=hh/Math.max(.5,P.th/2);
 var mn=Math.min(hw,hh);
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
var PF={lt:0,n:0,sum:0,mx:0,j33:0,j50:0,j100:0,t0:0,nlag:0,secs:{},cur:{tiles:0,draw:0,bake:0,strip:0,atlas:0,frame:0},ck:'',st:0};
function pfS(name,ms){var s=PF.secs[name];if(!s)s=PF.secs[name]={n:0,sum:0,mx:0};s.n++;s.sum+=ms;if(ms>s.mx)s.mx=ms;if(PF.cur[name]!==undefined)PF.cur[name]=ms;}
function pfCtx(){var ck=typeof curSheet!=='undefined'&&curSheet?curSheet.kind:'';return 'стор.'+sel+(menu.on?' меню:'+menu.kind:'')+(ck?' вікно:'+ck:'')+(scrollingNow?' скрол':'')+(mode?' ввід:'+mode:'')+(boot.on?' boot':'')+(AURA?' ореол':'')+(FGact?' слід':'')+(busy?' знімок':'');}
var scrollingNow=false;
function pfFrame(t){
 if(PF.lt){var gap=t-PF.lt;PF.n++;PF.sum+=gap;if(gap>PF.mx)PF.mx=gap;if(gap>33.5)PF.j33++;if(gap>50)PF.j50++;if(gap>100)PF.j100++;
  if(gap>36&&gap<5000&&PF.nlag<900&&!document.hidden){PF.nlag++;var c=PF.cur;LG('лаг','пауза '+Math.round(gap)+' мс | js кадр '+c.frame.toFixed(1)+' плитки '+c.tiles.toFixed(1)+' малюв. '+c.draw.toFixed(1)+' розмиття '+c.bake.toFixed(1)+' смуга '+c.strip.toFixed(1)+' атлас '+c.atlas.toFixed(1)+' | '+pfCtx());}}
 PF.lt=t;
 var ck=sel+'|'+(menu.on?menu.kind:'')+'|'+(typeof curSheet!=='undefined'&&curSheet?curSheet.kind:'')+'|'+mode;
 PF.sn=(PF.sn||0)+1;if(ck!==PF.ck){var sd=t-(PF.st0||t);if(PF.st0&&sd>300)LG('fps','попередній стан: '+Math.round(1000*PF.sn/sd)+' к/с за '+(sd/1000).toFixed(1)+' с');PF.ck=ck;PF.st0=t;PF.sn=0;LG('стан',pfCtx());}
 if(!PF.t0)PF.t0=t;
 if(t-PF.t0>5000){
  if(PF.n>5&&!document.hidden){var parts=[];for(var k in PF.secs){var q=PF.secs[k];parts.push(k+' '+(q.sum/q.n).toFixed(1)+'/'+q.mx.toFixed(0));}
   LG('perf','5с: кадрів '+PF.n+' (~'+Math.round(1000*PF.n/(t-PF.t0))+' к/с), інтервал середній '+(PF.sum/PF.n).toFixed(1)+' макс '+Math.round(PF.mx)+' мс; повільніше 33мс: '+PF.j33+', 50мс: '+PF.j50+', 100мс: '+PF.j100+' | js мс середнє/макс: '+parts.join(', ')+' | '+pfCtx());}
  PF.n=0;PF.sum=0;PF.mx=0;PF.j33=0;PF.j50=0;PF.j100=0;PF.secs={};PF.t0=t;}
}
/* журнал анімацій вікон «Налаштування» і «Додатково»: поки панель рухається — кожні ~80 мс геометрія скла, DOM-панелі,
   першої кнопки (DOM і її скло) та жест; до 80 рядків на одну анімацію */
var AL={on:0,n:0,t:0,k:''};
function animLog(t){
 var P=sheetA>0.002?sheetP:(menuA>0.002&&menu.kind==='more')?menu:null;
 var mv=P&&(Math.abs(P.s-(P.on?1:0))>.004||Math.abs(P.vs)>.02||P.dragging||Math.abs(P.def.x)+Math.abs(P.def.y)>.3||recMoving);
 if(!mv){if(AL.on){LG('anim',AL.k+' стоп, рядків '+AL.n);AL.on=0;}return;}
 var k=P===sheetP?'вікно:'+(curSheet&&curSheet.kind||'?'):'more';
 if(!AL.on||AL.k!==k){AL.on=1;AL.n=0;AL.k=k;AL.t=0;LG('anim',k+' старт '+(P.on?'відкриття':'закриття')+(P.dragging?' (палець)':''));}
 if(t-AL.t<80||AL.n>=80)return;AL.t=t;AL.n++;
 var g=P.g,er=P.el?P.el.getBoundingClientRect():null,f=function(v){return Math.round(v);};
 var s='s '+P.s.toFixed(2)+' скло '+f(g.cx-g.hw)+','+f(g.cy-g.hh)+' '+f(2*g.hw)+'x'+f(2*g.hh)+(er?' DOM '+f(er.left)+','+f(er.top)+' '+f(er.width)+'x'+f(er.height):'');
 /* та сама кнопка: перша скляна кнопка цієї панелі — її скло (з BTB) і її DOM-прямокутник */
 for(var bi2=0;bi2<BTN;bi2++){var be2=BTE[bi2];if(!be2||!P.el||!P.el.contains(be2))continue;var q=be2.getBoundingClientRect(),k2=bi2*4;
  s+=' кн скло '+f((BTB[k2]-BTB[k2+2])/S+R.x)+','+f((BTB[k2+1]-BTB[k2+3])/S+R.y)+' DOM '+f(q.left)+','+f(q.top)+' «'+(be2.textContent||'').trim().slice(0,14)+'»';break;}
 if(P.dragging||P.def.x||P.def.y)s+=' жест '+P.def.x.toFixed(1)+','+P.def.y.toFixed(1)+' розтяг '+P.def.sx.toFixed(3)+','+P.def.sy.toFixed(3);
 if(rec.sh.v>.003||rec.mn.v>.003)s+=' відступ sh '+rec.sh.v.toFixed(2)+' mn '+rec.mn.v.toFixed(2);
 LG('anim',s);
}
function frame(t){
 requestAnimationFrame(frame);var pf0=performance.now();pfFrame(t);
 vpSample(t);
 {liveEnv();lvCheck();if(SO<-.5&&mode!==1&&(frame.st||0)<6&&t>(frame.stn||0)){frame.st=(frame.st||0)+1;frame.stn=t+400;window.scrollTo(0,0);LG('fix','scrollTo(0,0) спроба '+frame.st+' → scrollY '+Math.round(window.scrollY||0));}
  var bgR=bgEl.getBoundingClientRect(),bgH=bgR.height,dty=bgH-72-14-SAFE.b;
  if(Math.abs(dty-(frame.dt0===undefined?-1:frame.dt0))>.5){frame.dt0=dty;LG('dock','ціль top '+dty.toFixed(1)+' (висота '+Math.round(bgH)+', safe.b '+SAFE.b+')');}
  if(dockY===null)dockY=dty;
  if(Math.abs(dty-dockY)>.3)dockY+=(dty-dockY)*(1-Math.exp(-Math.min(.05,Math.max(.001,(t-dkLast)/1000))*9));else dockY=dty;
  dkLast=t;var dys=dockY.toFixed(2)+'px';if(dock._dy!==dys){dock._dy=dys;dock.style.setProperty('--dockTop',dys);}}
 {var dkR=frect(dock),ap=0;
  if(Math.abs(bgR.height-VH)>.5||Math.abs(bgR.width-VW)>.5||Math.abs(dkR.top-ap-DR.top)>.6||Math.abs(dkR.left-DR.left)>.6)measure();}
 if(window.__lt){window.__fps=.9*(window.__fps||60)+.1*(1000/Math.max(1,t-window.__lt));}window.__lt=t;
 var dt=Math.min(Math.max((t-last)/1000,0),1/30);last=t;
 var da=sel-ca,moving=false,i;
 if(HS.on){ca=HS.ca;moving=true;}
 else if(Math.abs(da)>0.0005){ca+=da*(1-Math.exp(-dt*9));moving=true;}else if(da!==0){ca=sel;moving=true;}
 for(i=0;i<NP;i++){if(BH.ph&&BH.pg.indexOf(i)>=0)continue;   /* чорна діра тримає сусідні вкладки видимими */
  var o=i-ca,vis=Math.abs(o)<1,st=vis?'translate3d('+(o*100)+'%,0,0)':'none';
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
 var pt0=performance.now();if(tgOK)drawTiles();pfS('tiles',performance.now()-pt0);
 if(menu.s>0||menu.on)stepMenu(dt);
 if(sheetP.s>0||sheetP.on)stepSheet(dt);
 bootStep(t,dt);
 if(lensStep(dt))dirty=true;
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
 var hT=((mode===1&&op.age>.14)||(mode===2&&cl.age<A1-.06)||sheetOn||boot.hold||BH.ph===3||(menu.on&&menu.kind==='more'))?1:0;
 if(hide!==hT){hide+=(hT-hide)*(1-Math.exp(-dt*9));if(Math.abs(hT-hide)<.002)hide=hT;dirty=true;}
 var off=hide*hideOff();lastOff=off;
 var dkMov=dkStep(dt,hide);if(dkMov)dirty=true;
 var hTk=(TKP.side!=='t'&&(sheetOn||boot.hold||BH.ph===3||(menu.on&&menu.kind==='more')))?1:0;
 if(tkHide!==hTk){tkHide+=(hTk-tkHide)*(1-Math.exp(-dt*9));if(Math.abs(hTk-tkHide)<.002)tkHide=hTk;dirty=true;}
 var tkMov=tkStep(dt,tkHide);if(tkMov)dirty=true;
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
  var ks2=kbScreen(hide),tx=ks2.x,ty=ks2.y,nk=NK,age=cl.age;
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
 var tkBase=(!fullMode&&!BH.ph&&tgOK&&tgShown&&tickerEl.classList.contains('on')&&tickerEl.offsetHeight>0&&tickerTrk.dataset.loop)?1:0;
 if(tkBase){tkY0=tickerEl.offsetTop-12;var ps0=performance.now();if(TKP.tm>.5)tkStripBuildV();else tkStripBuild();var psd=performance.now()-ps0;if(psd>1)pfS('strip',psd);}
 var tkOn=(tkBase&&tkStrip.ok)?1:0;
 if(tickerEl._gl!==tkOn){tickerEl._gl=tkOn;tickerEl.classList.toggle('tkgl',!!tkOn);dirty=true;}
 BTN=0;BTK='';
 if(menuA>0.002||sheetA>0.002){var bl=[];
  if(menuA>0.002&&menu.kind==='more')[].forEach.call(menu.el.querySelectorAll('.gbtn,.gcard'),function(b){bl.push([b,0]);});
  var ckS=null;if(sheetA>0.002&&typeof curSheet!=='undefined'&&curSheet&&curSheet.body){var sp0=scrollParent(curSheet.body.querySelector('.btnw,.gbtn')||curSheet.body,curSheet.el)||curSheet.body;ckS=sp0.getBoundingClientRect();[].forEach.call(curSheet.body.querySelectorAll('.btnw,.gbtn'),function(b){bl.push([b,1]);});}
  var ckM=menuA>0.002&&menu.kind==='more'?(scrollParent(menu.el.querySelector('.gbtn')||menu.el,menu.el)||menu.el).getBoundingClientRect():null;
  for(var bi=0;bi<bl.length&&BTN<14;bi++){var be=bl[bi][0],r=be.getBoundingClientRect(),ck=bl[bi][1]?ckS:ckM;if(r.width<2||r.bottom<0||r.top>VH)continue;
   if(ck&&(r.bottom<ck.top||r.top>ck.bottom))continue;   /* кнопка прокручена за межі видимої області */
   var red=be.classList.contains('red')||be.classList.contains('dng')||be.classList.contains('pri')?1:0,k=BTN*4,rr=Math.min(r.height/2,26)*S;
   BTB[k]=(r.left+r.width/2-R.x)*S;BTB[k+1]=(r.top+r.height/2-R.y)*S;BTB[k+2]=r.width/2*S;BTB[k+3]=r.height/2*S;BTE[BTN]=be;BTC[k]=ck?(ck.left-2-R.x)*S:-1e4;BTC[k+1]=ck?(ck.top-R.y)*S:-1e4;BTC[k+2]=ck?(ck.right+2-R.x)*S:1e5;BTC[k+3]=ck?(ck.bottom-R.y)*S:1e5;BTQ[k]=rr;BTQ[k+1]=bl[bi][1];BTQ[k+2]=red;BTQ[k+3]=1;
   BTK+=Math.round(r.left)+','+Math.round(r.top)+','+Math.round(r.width)+','+Math.round(r.height)+';';BTN++;}}
 animLog(t);
 var mg=menu.g,sg=sheetP.g,gkey=BTK+((menuA>0.002||sheetA>0.002)?[mg.cx,mg.cy,mg.hw,mg.hh,mg.r,mg.v,sg.cx,sg.cy,sg.hw,sg.hh,sg.r,sg.v,menuA,sheetA,scrimV,ghost,SH.on,SH.ready,SH.x,SH.y].map(function(q){return typeof q==='number'?q.toFixed(2):String(q);}).join(','):'');   /* дужки: інакше BTK (позиції кнопок) не входив у ключ і скло кнопок не рухалось при прокрутці */
 var glassMov=gkey!==frame.gkey;frame.gkey=gkey;
 var otherMotion=dirty||dkMov||tkMov||gMov||moving||!settled||scrolling||mode||glassMov||recMoving||(boot.on&&boot.phase===2)||boot.warm===1;
 if(otherMotion||tkOn){var pd0=performance.now();
  var e=Math.max(-0.25,Math.min(0.7,j+Math.abs(v)*0.00015));
  var IR=DR.height/2+3,hw=IR*1.3*(1+e),hh=IR/(1+e*0.7);
  var A=T[fl],Bt=f2<NP?T[f2]:null;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,A?A.tex:dummy);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,Bt?Bt.tex:dummy);
  gl.uniform4f(U.u_p0,(fl-ca)*VW,sy[fl],A?A.ch:1,(A&&BH.ph!==3)?1:0);gl.uniform3f(U.u_w,A?A.cw:1,Bt?Bt.cw:1,SH.cw);
  gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,SH.tex||dummy);gl.activeTexture(gl.TEXTURE0);
  gl.uniform4f(U.u_p2,SH.x,-SH.y,SH.ch,(SH.on&&SH.ready)?1:0);gl.uniform1f(U.u_scrim,scrimV);
  var G=menu.g,G2=sheetP.g,gm=0,gdk=1,gbl=2*BLS*Math.min(1,rec.pg.v);
  if(boot.on&&boot.phase===2){G=boot.g;gm=1;gdk=.9;gbl=0;}
  gl.uniform1f(U.u_gm,gm);gl.uniform1f(U.u_gd,gdk);gl.uniform1f(U.u_gbl,gbl);gl.uniform1f(U.u_gb2,2*BLS*Math.min(1,rec.pg.v));gl.uniform2f(U.u_go,gOX,gOY);gl.uniform1f(U.u_isl,ISL);gl.uniform1f(U.u_cell,gridCell());gl.uniform3f(U.u_gcol,GCOL[0],GCOL[1],GCOL[2]);
  gl.uniform4f(U.u_rp,rec.pg.ox,rec.pg.oy,kOf(rec.pg.v),1-RD*rec.pg.v);gl.uniform4f(U.u_rs,rec.sh.ox,rec.sh.oy,kOf(rec.sh.v),1-RD*rec.sh.v);
  gl.uniform4f(U.u_g2,(G2.cx-R.x)*S,(G2.cy-R.y)*S,G2.hw*S,G2.hh*S);gl.uniform1f(U.u_gr2,G2.r*S);gl.uniform1f(U.u_gv2,sheetA>0.002?G2.v:0);gl.uniform1f(U.u_sho,ghost);
  gl.uniform1f(U.u_rb,0);gl.uniform4f(U.u_rt,rec.pg.tx*rec.pg.v,rec.pg.ty*rec.pg.v,rec.sh.tx*rec.sh.v,rec.sh.ty*rec.sh.v);gl.uniform1f(U.u_ord,(menu.on&&menu.kind==='more'&&sheetOn)?1:0);
  gl.uniform4f(U.u_g,(G.cx-R.x)*S,(G.cy-R.y)*S,G.hw*S,G.hh*S);gl.uniform1f(U.u_gr,G.r*S);gl.uniform1f(U.u_gv,(menuA>0.002||gm)?G.v:0);
  gl.uniform4f(U.u_p1,(f2-ca)*VW,f2<NP?sy[f2]:0,Bt?Bt.ch:1,(Bt&&BH.ph!==3)?1:0);
  gl.uniform2f(U.u_res,cv.width,cv.height);gl.uniform2f(U.u_org,R.x,R.y);gl.uniform2f(U.u_vp,VW,VH);gl.uniform1f(U.u_s,S);
  var dm0=DKP.m,kc0=1-dm0+(DKV/DR.height)*dm0,dvc=dkVc(),dsw=DR.width/2+(ps.l+ps.r)/2,dsh=(DR.height/2+.22*Math.max(ps.l,ps.r,0))*kc0,dao=(ps.r-ps.l)/2,dxa=(x===null?c.cx(KS):x)-dvc.x,dxk=c.cx(KS)-dvc.x,dkh=(DR.height/2-12+bump*7.75)*kc0;
  gl.uniform4f(U.u_a,(DKP.ex+dao*(1-dm0)-R.x)*S,(DKP.ey+dao*dm0-R.y)*S,(dsw*(1-dm0)+dsh*dm0)*S,(dsh*(1-dm0)+dsw*dm0)*S);
  gl.uniform4f(U.u_b,(DKP.ex+dxa*(1-dm0)-R.x)*S,(DKP.ey+dxa*dm0-R.y)*S,(hw*(1-dm0)+hh*kc0*dm0)*S,(hh*kc0*(1-dm0)+hw*dm0)*S);
  gl.uniform4f(U.u_k,(DKP.ex+dxk*(1-dm0)-R.x)*S,(DKP.ey+dxk*dm0-R.y)*S,(27*(1-dm0)+dkh*dm0)*S,(dkh*(1-dm0)+27*dm0)*S);gl.uniform1f(U.u_kv,bump);
  if(pr&&pr.w>.5&&pr.h>.5){gl.uniform4f(U.u_c,(pr.x-R.x)*S,(pr.y-R.y)*S,pr.w*S,pr.h*S);gl.uniform1f(U.u_cv,1);gl.uniform1f(U.u_nk,pr.nk*S);gl.uniform1f(U.u_bl,(pr.bl||0)*S);}
  else{gl.uniform4f(U.u_c,0,0,0,0);gl.uniform1f(U.u_cv,0);gl.uniform1f(U.u_bl,0);}
  var bmv=0,bsv=0,shOK=(SH.on&&SH.ready)?1:0;
  if(bmv<=.003&&bsv<=.003){bkGlt.frozen=false;bkLastKey='';}
  if(bmv>.003||bsv>.003){
   var P0=[(fl-ca)*VW,sy[fl],A?A.ch:1,A?1:0],P1=[(f2-ca)*VW,f2<NP?sy[f2]:0,Bt?Bt.ch:1,Bt?1:0],P2=[SH.x,-SH.y,SH.ch,shOK],W3=[A?A.cw:1,Bt?Bt.cw:1,SH.cw];
   var bkKey=[bmv.toFixed(3),bsv.toFixed(3),rec.pg.v.toFixed(3),rec.sh.v.toFixed(3),rec.pg.ox.toFixed(1),rec.pg.oy.toFixed(1),rec.pg.tx.toFixed(1),rec.pg.ty.toFixed(1),rec.sh.ox.toFixed(1),rec.sh.oy.toFixed(1),fl,f2,Math.round(sy[fl]),f2<NP?Math.round(sy[f2]):0,Math.round(SH.x),Math.round(SH.y),texVer,shOK,BK.w,BK.h,A?A.ch:0,Bt?Bt.ch:0].join(',');
   if(bkKey!==bkLastKey||!bkGT){bkLastKey=bkKey;var pb0=performance.now();bkGlt();bake('pg',0,P0,P1,P2,W3);if(shOK)bake('sh',1,P0,P1,P2,W3);
   bkEnd(A,Bt);pfS('bake',performance.now()-pb0);}
  }
  gl.uniform1f(U.u_bm,bmv);gl.uniform1f(U.u_bs,bsv);
  atlPrep();if(tkOn){var tkv=TKP.tm>.5,tkhx=(tkv?TKV:VW-32)/2,tkhy=(tkv?VW-32:tkThick())/2;
   if(TKP.side==='t'&&!TKP.trans&&!TKP.drag&&DKP.side!=='t'){TKH=Math.ceil(tickerEl.offsetTop+tickerEl.offsetHeight+220);tkReg=[0,0,VW,TKH];}
   else{var rx0=Math.max(0,TKP.ex-tkhx-110),ry0=Math.max(0,TKP.ey-tkhy-110),rx1=Math.min(VW,TKP.ex+tkhx+110),ry1=Math.min(VH,TKP.ey+tkhy+110);tkReg=[rx0,ry0,Math.max(16,rx1-rx0),Math.max(16,ry1-ry0)];TKH=tkReg[3];}
   tkCopy(tkReg[0],tkReg[1],tkReg[2],tkReg[3]);}
  var pa0=performance.now();dkX=x===null?0:x;dkDraw();atlUp();
  {var mixW=BAL_TREND===0?.12:0,cc=cells();gl.uniform4f(U.u_dki,dkX-dkVc().x,cc.cw,DKP.m,dkPos&&dkPos[0]?dkPos[0].iy+dkPos[0].iw/2-DR.height/2:-10);gl.uniform3f(U.u_dkt,dkTint[0]*(1-mixW)+mixW,dkTint[1]*(1-mixW)+mixW,dkTint[2]*(1-mixW)+mixW);}pfS('atlas',performance.now()-pa0);
  gl.uniform4f(U.u_dk,DKP.ex,DKP.ey,DR.width,DR.height);gl.uniform1f(U.u_atw,Math.max(tkXc.width,dkXc.width,Math.round(VW*2)));
  if(tkOn){var curT=-(parseFloat(String(tickerTrk._tx||'').replace('translate3d(',''))||0);gl.uniform3f(U.u_xs,tkStrip.T0,curT,tkStrip.w);}else gl.uniform3f(U.u_xs,0,0,0);gl.uniform1f(U.u_dkv,dkOK);
  if(dkOK&&!dock._dkc){dock._dkc=1;dock.classList.add('dkc');}
  gl.uniform4f(U.u_tk,tickerEl.offsetTop*S,tickerEl.offsetHeight*S,tkY0,tkOn);gl.uniform1f(U.u_th,TKH);
  {var tm2=TKP.m,tL=(VW-32)/2,tC=(tkThick()/2)*(1-tm2)+(TKV/2)*tm2,tvv=(TKP.tm>.5&&tkStrip.v&&tkStrip.ok)?1:0;gl.uniform4f(U.u_tv,tvv,tkStrip.n||1,72,tvv?(((tkOff%tkStrip.w)+tkStrip.w)%tkStrip.w):0);gl.uniform4f(U.u_tc,TKP.ex*S,TKP.ey*S,(tL*(1-tm2)+tC*tm2)*S,(tC*(1-tm2)+tL*tm2)*S);gl.uniform4f(U.u_tp,TKP.ex,TKP.ey,tm2,TKP.sg);gl.uniform2f(U.u_tq,tL,tkThick()/2);gl.uniform4f(U.u_tr,tkReg[0],tkReg[1],tkReg[2],tkReg[3]);}gl.uniform1f(U.u_bn,BTN);if(BTN){gl.uniform4fv(U.u_bb,BTB);gl.uniform4fv(U.u_bq,BTQ);gl.uniform4fv(U.u_bc,BTC);}gl.uniform2f(U.u_tko,tkOfs[0],tkOfs[1]);
  var scOK=!dkMov&&!tkMov&&!LNclr&&!fullMode&&mode===0&&menuA<=.002&&sheetA<=.002&&!boot.on&&!pr&&!ghost;
  if(scOK){
   var CW=cv.width,CH=cv.height,rc=[[(VW/2-63-92-R.x)*S,0,(126+184)*S,(29.5+18.5+92)*S],[Math.max(0,(DKP.ex-(DKP.tm>.5?DR.height:DR.width)/2-70)*S),(DKP.ey-(DKP.tm>.5?DR.width:DR.height)/2-70)*S,Math.min(CW,((DKP.tm>.5?DR.height:DR.width)+140)*S),((DKP.tm>.5?DR.width:DR.height)+140)*S],[Math.max(0,(TKP.ex-(TKP.tm>.5?TKV:VW-32)/2-70)*S),(TKP.ey-(TKP.tm>.5?VW-32:tkThick())/2-70)*S,Math.min(CW,((TKP.tm>.5?TKV:VW-32)+140)*S),((TKP.tm>.5?VW-32:tkThick())+140)*S]];
   gl.enable(gl.SCISSOR_TEST);
   for(var qi=0;qi<rc.length;qi++){var q=rc[qi],qx=Math.floor(q[0]),qy=Math.max(0,Math.floor(q[1])),qw=Math.ceil(q[2]),qh=Math.ceil(q[3]);if(qy+qh>CH)qh=CH-qy;if(qh<=0||qw<=0)continue;gl.scissor(qx,CH-qy-qh,qw,qh);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
   gl.disable(gl.SCISSOR_TEST);
  }else{gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
  if(LNS.length||FBL.length||ISL)lensPass(t);dirty=false;boot.warm=0;LNclr=0;pfS('draw',performance.now()-pd0);
 }
 if(!shown&&full[sel]){shown=true;cv.style.opacity=1;}
 if(moving||!settled||scrolling||mode||hide!==hT||menuA>0.002&&menuA<.999||sheetA>0.002&&sheetA<.999||recMoving||boot.on&&boot.phase===2||menu.dragging||sheetP.dragging)lastMotion=t;
 if(t-lastMotion>150&&!BH.ph&&!WF.mv)pump(t);   /* важкі знімки — тільки коли нічого не рухається */
 scrollingNow=!!scrolling;pfS('frame',performance.now()-pf0);
}
