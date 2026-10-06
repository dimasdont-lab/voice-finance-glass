/* ===== 7. Скляні віджети: окремий WebGL-шар під текстом. Малює фон із сіткою й плитки з заломленням сітки.
   Вкладене скло: кнопки «Доходи/Витрати», міні-картки (шар 1), круглі значки (шар 2), заповнення прогрес-барів (шар 3, свій колір).
   Скляні лінії графіків: ланцюжки капсул (до 4 ліній), колір лінії, заломлення сітки. Вимикаються разом із GLINES ===== */
var BH={ph:0,x:0,y:0,r:0,k:0,au:1,pg:[],po:1},WF={n:0,rects:[]},CH={on:0,x:0,y:0,s:0,tx:0,ty:0,drag:0},FGL={down:0,x:0,y:0,tx:0,ty:0,k:0},RPL=[],RPU=new Float32Array(64),RPn=0,RPsig='',FGn=0,FGu=new Float32Array(96),FGcu=new Float32Array(72),FGbb=null,FGbbPrev=null,tgMNA='',tgMajor='',tgMajorN=0,FGact=0,FGgen=0,FGtex=null,PRSIG='0',tgDraws=0,TGC=document.getElementById('glt'),tgl=null,TGU={},TL=[],TLL=[],tlStale=[],tgSig='',tgW=0,tgH=0,tgS=0,tgOK=false,tgShown=false,TMAX=40,NSEG=0,NLN=4;
var GLASS_LINE_OK=false;
var tgR=new Float32Array(TMAX*4),tgM=new Float32Array(TMAX*4),tgC=new Float32Array(TMAX*4);
var TILE_R={acw:22,tile:28,srch:24},NEST=[['.split>button',20,1],['.chw',20,1],['.mini',20,1],['.dot',15,2],['.ic',20,2],['.bar',8,2],['.cat .b',6,2]];
var FXFS=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_vp;uniform vec2 u_res;uniform vec4 u_fp[24];uniform vec3 u_fc[24];uniform float u_fn;uniform float u_t;uniform float u_aura;uniform float u_amode;uniform vec3 u_abc;uniform vec3 u_ahsv;',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
/* слід під пальцем у стилі ободка Сірі: яскраве ядро, м'яке світіння навколо, білястий «розпечений» центр */
/* слід пальця — суцільна лінія: світіння від відрізків між сусідніми точками (радіус, сила й колір інтерполюються); w<0 — початок нового штриха */
'vec3 fgAt(vec2 p){vec3 c=vec3(0.);if(u_fn<.5)return c;vec4 pa=u_fp[0];vec3 ca=u_fc[0];for(int i=0;i<24;i++){if(float(i)>=u_fn)break;vec4 f=u_fp[i];vec3 fc0=u_fc[i];',
' vec4 A=(i==0||f.w<0.)?f:pa;vec3 cA=(i==0||f.w<0.)?fc0:ca;pa=f;ca=fc0;vec2 ab=f.xy-A.xy;float h=clamp(dot(p-A.xy,ab)/max(dot(ab,ab),1e-4),0.,1.);',
' float r=mix(A.z,f.z,h),w=mix(abs(A.w),abs(f.w),h);vec2 d=p-(A.xy+ab*h);float q=dot(d,d)/(r*r);if(q<5.){',
' vec3 fc=mix(cA,fc0,h);float mg=(fc.r+fc.g+fc.b)/3.;fc=clamp(mg+(fc-mg)*1.35,0.,1.);float core=exp(-q*7.),mid=exp(-q*1.6),far=exp(-sqrt(q)*1.4);',
' c=max(c,(fc*(core*1.15+mid*.62+far*.2)*1.25+vec3(1.,.86,.94)*core*core*.28)*w*(1.-smoothstep(2.5,5.,q)));}}return c;}',
/* палітра ободка: середнє між першою (м'якшою) і «як у Сірі» */
'vec3 auraPal(float t){float f=fract(t)*4.;vec3 a=vec3(1.,.21,.51),b=vec3(.6,.26,1.),c=vec3(.2,.49,1.),d=vec3(1.,.55,.19);',
' vec3 c0=mix(a,b,smoothstep(0.,1.,clamp(f,0.,1.))),c1=mix(b,c,smoothstep(0.,1.,clamp(f-1.,0.,1.))),c2=mix(c,d,smoothstep(0.,1.,clamp(f-2.,0.,1.))),c3=mix(d,a,smoothstep(0.,1.,clamp(f-3.,0.,1.)));',
' return f<1.?c0:f<2.?c1:f<3.?c2:c3;}',
/* ободок: середнє між першим варіантом і «як у Сірі» — ядро біля краю, помірне світіння всередину */
/* HSV-корекція ободка: відтінок (оберти), насиченість і яскравість (множники) */
'vec3 rgb2hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.);vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+1e-10)),d/(q.x+1e-10),q.x);}',
'vec3 hsv2rgb(vec3 c){vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}',
'vec3 auraCol(float h,float ang){vec3 c;if(u_amode>.5){c=u_abc*(.82+.18*sin(ang*2.+u_t*.5))+vec3(.06)*sin(ang*3.-u_t*.4);}else c=auraPal(h);',
' vec3 v=rgb2hsv(max(c,0.));v.x=fract(v.x+u_ahsv.x);v.y=clamp(v.y*u_ahsv.y,0.,1.);v.z*=u_ahsv.z;return hsv2rgb(v);}',
'vec3 auraAt(vec2 p){if(u_aura<.01)return vec3(0.);vec2 c=u_vp*.5,q=p-c;float d=sdRB(q,c,62.);if(d<-100.||d>8.)return vec3(0.);',
' float inn=clamp(-d,0.,100.);float core=exp(-inn*inn/(2.*8.*8.));float mid=exp(-inn*inn/(2.*25.*25.));float far=exp(-inn/40.)*(1.-smoothstep(70.,100.,inn));',
' float ang=atan(q.y,q.x);float h=ang*.159+u_t*.028+.09*sin(ang*2.+u_t*.45)+.05*sin(ang*3.-u_t*.6);',
' vec3 col=auraCol(h,ang);float pulse=.85+.15*sin(u_t*.7+ang*2.+sin(u_t*.3+ang*3.));',
' float lum=(core*.98+mid*.5+far*.1)*pulse;vec3 g=col*lum*.86;',
' g+=vec3(1.,.86,.94)*core*core*.12;',   /* ледь білястий край */
' return g*u_aura;}',
'void main(){vec2 p=vec2(gl_FragCoord.x/u_res.x,1.-gl_FragCoord.y/u_res.y)*u_vp;gl_FragColor=vec4(fgAt(p)+auraAt(p),1.);}'].join('\n');
var FX={p:null,U:{},fb:null,tex:null,w:0,h:0},ABC=[.72,.72,.82];   /* поточний колір балансу для ободка (плавно) */
var BGFS=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_vp;uniform vec2 u_res;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform vec3 u_gcol;uniform sampler2D u_fx;uniform float u_fxk;uniform float u_clean;uniform vec4 u_bh;uniform vec4 u_rp[16];uniform float u_rn;uniform vec3 u_ch;uniform float u_bt;uniform vec3 u_fg;',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
'vec3 fgAt(vec2 p){return vec3(0.);}',
'vec3 auraAt(vec2 p){return u_fxk>0.?texture2D(u_fx,vec2(p.x/u_vp.x,1.-p.y/u_vp.y)).rgb:vec3(0.);}',
GLSL_BG,
'void main(){vec2 p=vec2(gl_FragCoord.x/u_res.x,1.-gl_FragCoord.y/u_res.y)*u_vp;vec2 p0=p;float gb=0.;',
' if(u_clean>.5){gl_FragColor=vec4(mix(vec3(.0196,.0196,.0275),u_gcol,.17*gridL(p+u_go-u_vp*.5)),1.);return;}',
/* пасхалка «чорна діра»: u_bh = центр, радіус горизонту, сила. Гравітаційна лінза (зображення з-за діри), закрутка, чорний диск, кільце фотонів */
' if(u_rn>.5){vec2 o=vec2(0.);float mA=1.;for(int i=0;i<16;i++){if(float(i)>=u_rn)break;vec4 r=u_rp[i];vec2 dr=p-r.xy;float L=length(dr)+.001;',
'  float R=r.z*(280.+26.*min(r.w,9.)),w=(34.+r.z*46.)*(.8+.25*r.w),x=(L-R)/w,fa=1.-r.z/1.7;float env=exp(-x*x*.8)*fa*fa*smoothstep(0.,60.,L);o+=dr/L*sin(x*2.2)*env*6.4*r.w;mA=max(mA,r.w);gb+=env*min(r.w,4.)*1.8;}   /* сітка яскравішає під кільцем хвилі й тане разом із нею */',
'  p+=o/(1.+length(o)/(9.*mA));}',
' if(abs(u_ch.z)>.001){vec2 dc=p-u_ch.xy;float s=u_ch.z,sa=abs(s),L=length(dc)+.001,q=L/(70.+90.*sa);vec2 dr=dc/L;',
'  float pk=smoothstep(.45,1.,sa),ph=sin(u_bt*(24.+26.*sa)),qc=L/(26.+34.*sa);p+=dr*s*sa*46.*q*exp(-q*q)+dr*pk*ph*sa*13.*qc*exp(-qc*qc);',                                              /* стягування до пальця (сильніше, росте з зарядом) */
'  gb+=sa*(2.8*exp(-q*q)+1.1*exp(-q*q*.12))+pk*ph*sa*2.6*exp(-qc*qc*.9);}',
' {vec2 df=p0-u_fg.xy;gb+=u_fg.z*2.4*exp(-dot(df,df)/9025.);}',   /* під пальцем сітка світиться яскравіше */
' gBoost=min(gb,6.);',
' if(u_bh.w>.001){vec2 d=p-u_bh.xy;float L=max(length(d),1.),R=u_bh.z,k=u_bh.w;',
'  float E=R*2.5;float f=1.-k*E*E/(L*L+E*E*.25);float a=k*6.5*R*R/(L*L+R*R*.6)+k*.9*exp(-L/(R*6.));float ca=cos(a),sa=sin(a);vec2 q=u_bh.xy+vec2(ca*d.x-sa*d.y,sa*d.x+ca*d.y)*f;',
'  vec3 col=gradBg(q);float hole=1.-smoothstep(R*.92,R*1.02,L);',
'  float ring=exp(-pow((L-R*1.08)/(R*.07+1.2),2.))*k;float glow=exp(-max(L-R,0.)/(R*1.4))*k*.45;',
'  col=mix(col,vec3(0.),hole)+vec3(1.,.72,.45)*ring*.9+vec3(.55,.3,.9)*glow*(1.-hole);',
'  gl_FragColor=vec4(col,1.);return;}',
' gl_FragColor=vec4(gradBg(p),1.);}'].join('\n');
var BG={p:null,U:{},fb:null,tex:null,w:0,h:0};
var TCLEAN=0;
function mkTFS(nseg){return['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif',
'uniform vec2 u_res;uniform vec2 u_vp;uniform vec2 u_go;uniform float u_cell;uniform float u_isl;uniform vec3 u_gcol;uniform float u_s;uniform float u_n;uniform float u_br;uniform vec4 u_tk;uniform vec4 u_r[40];uniform vec4 u_m[40];uniform vec4 u_c[40];uniform vec4 u_gu[40];uniform sampler2D u_ga;uniform vec2 u_gas;uniform sampler2D u_bgt;uniform float u_clean;uniform float u_gt;',,
nseg?'uniform vec4 u_sg['+nseg+'];uniform vec4 u_lb[4];uniform vec4 u_li[4];uniform vec4 u_lc[4];uniform vec4 u_lf[4];uniform float u_nl;uniform float u_am;':'',
'float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}',
'vec3 gradBg(vec2 p){return texture2D(u_bgt,vec2(p.x/u_vp.x,1.-p.y/u_vp.y)).rgb;}',
'float edgeRim(vec2 p){vec2 c=u_vp*.5,q0=p-c;float d=sdRB(q0,c,62.);float r=0.;',
' if(d<0.){float t=clamp(-d/22.,0.,1.);vec2 q=abs(q0)-c+62.;vec2 nn=((q.x>0.&&q.y>0.)?normalize(q):(q.x>q.y?vec2(1.,0.):vec2(0.,1.)))*sign(q0);',
'  float sp=pow(max(dot(nn,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(nn,normalize(vec2(.6,.8))),0.),3.);r+=pow(1.-t,3.)*(.015+.054*sp);}',
' if(u_isl>.5){vec2 qi=p-vec2(c.x,29.5);float di=sdRB(qi,vec2(63.,18.5),18.5);',
'  r+=.26*exp(-pow((di-1.2)/1.6,2.))+.07*pow(1.-clamp(di/20.,0.,1.),2.)*step(0.,di);}',
' return r;}',
/* скло однієї форми: R — центр і піврозміри, M — (радіус, відтінок, прозорість, шар), C — власний колір (rgb, сила) */
'vec4 gly(vec2 q,vec4 R,vec4 G){float gz=abs(G.z);if(gz<1.)return vec4(0.);float gs=max(.05,R.z/(gz*.25*u_s));vec2 l=(q-R.xy)/u_s*2./gs;if(G.z<0.)l-=clamp(u_go,-14.,14.)*.5;if(abs(l.x)>gz*.5+52.||abs(l.y)>G.w*.5+52.)return vec4(0.);return texture2D(u_ga,(G.xy+vec2(gz,G.w)*.5+l)/u_gas);}',
/* скляний прогрес-бар: кольорова трубка, товщина скла — уся висота бару */
'vec4 barGlass(vec2 px,vec4 R,vec4 M,vec4 C,float dm){float hh=max(1.,min(R.z,R.w));float t=clamp(-dm/hh,0.,1.);float e=1.;float Q=M.x;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-R.xy,R.zw,Q)-sdRB(px-vec2(e,0.)-R.xy,R.zw,Q),sdRB(px+vec2(0.,e)-R.xy,R.zw,Q)-sdRB(px-vec2(0.,e)-R.xy,R.zw,Q))+1e-5);',
' vec2 of=n*pow(1.-t,1.4)*hh*1.6;float ab=.12;',
' vec3 rf=vec3(gradBg((px-of*(1.+ab))/u_s).r,gradBg((px-of)/u_s).g,gradBg((px-of*(1.-ab))/u_s).b);',
' vec3 ci=mix(rf,C.rgb,C.a)*(.62+.5*t);',
' float sp=pow(max(dot(n,vec2(0.,-1.)),0.),2.);ci+=vec3(pow(1.-t,2.)*(.06+.42*sp));',
' float hl=smoothstep(.0,.35,t)*(1.-smoothstep(.35,.8,t))*step(px.y,R.y-hh*.15);ci+=vec3(.16)*hl;',
' return vec4(ci*u_br,clamp(-dm/(1.2*u_s)+.5,0.,1.)*M.z);}',
/* скляні цифри: висота скла — розмита маска гліфів з атласу, нормаль — її градієнт */
'vec4 textGlass(vec2 px,vec4 R,vec4 M,vec4 C,vec4 G){float r=2.4*u_s;',
' float hC=gly(px,R,G).a,hL=gly(px-vec2(r,0.),R,G).a,hR=gly(px+vec2(r,0.),R,G).a,hU=gly(px-vec2(0.,r),R,G).a,hD=gly(px+vec2(0.,r),R,G).a;',
' float H=(2.*hC+hL+hR+hU+hD)/6.;if(H<.02)return vec4(0.);',
' vec2 gr=vec2(hR-hL,hD-hU);float gl=length(gr);vec2 n=gl>1e-3?-gr/gl:vec2(0.);',
' vec2 of=gr*6.*u_s;',
' vec3 rf=vec3(gradBg((px+of*1.18)/u_s).r,gradBg((px+of)/u_s).g,gradBg((px+of*.82)/u_s).b);',
' vec3 ci=mix(rf,C.rgb,C.a*.92)*(.72+.4*H);',
' float sp=pow(max(dot(n,normalize(vec2(-.5,-.85))),0.),2.);ci+=vec3(min(1.,gl)*(.1+.55*sp));',
' return vec4(ci*u_br,smoothstep(.1,.5,H)*M.z);}',
'vec4 glassAt(vec2 px,vec4 R,vec4 M,vec4 C,float dm,vec4 G){',
' if(M.w>3.5)return textGlass(px,R,M,C,G);',
' float Q=M.x;float gk=abs(G.z)>1.?1.:0.;float m=(M.w>.5?(gk>0.?22.:18.):36.)*u_s;m=min(m,max(2.*u_s,min(R.z,R.w)*1.8));float t=clamp(-dm/(.6*m),0.,1.);float e=1.5;',
' vec2 n=normalize(vec2(sdRB(px+vec2(e,0.)-R.xy,R.zw,Q)-sdRB(px-vec2(e,0.)-R.xy,R.zw,Q),sdRB(px+vec2(0.,e)-R.xy,R.zw,Q)-sdRB(px-vec2(0.,e)-R.xy,R.zw,Q))+1e-5);',
' vec2 of=n*pow(1.-t,2.2)*(gk>0.?.5:.6)*m;float ab=.07*(.35+pow(1.-t,1.5));float zm=C.a>0.?.55:(M.w>.5?.96:.93);',
' vec2 za=R.xy+((px-of*(1.+ab))-R.xy)*zm,zb=R.xy+((px-of)-R.xy)*zm,zc=R.xy+((px-of*(1.-ab))-R.xy)*zm;',
' vec3 ci=vec3(0.);float gbr=u_s*(.25+1.6*pow(1.-t,2.)),wsum=0.;',
' for(int k=0;k<5;k++){if(k>0&&t>=.97)break;vec2 o=k==1?vec2(gbr,0.):k==2?vec2(-gbr,0.):k==3?vec2(0.,gbr):k==4?vec2(0.,-gbr):vec2(0.);float wk=k==0?(t<.97?2.:1.):1.;',
'  ci+=wk*vec3(gradBg((za+o)/u_s).r,gradBg((zb+o)/u_s).g,gradBg((zc+o)/u_s).b);wsum+=wk;}',
' ci/=wsum;',
' ci=mix(ci,M.y>0.?vec3(.03,.34,.15):vec3(.45,.05,.08),min(.45,abs(M.y)*.20));',
' if(C.a>0.)ci=mix(ci,C.rgb,C.a)*.9;',
' float gA=0.;{vec4 ga=gly(px-of*(1.+ab),R,G),gb=gly(px-of,R,G),gc=gly(px-of*(1.-ab),R,G);ci=vec3(mix(ci.r,ga.r,ga.a),mix(ci.g,gb.g,gb.a),mix(ci.b,gc.b,gc.a));gA=max(max(ga.a,gb.a),gc.a);}',
' float rim=pow(1.-t,3.);float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),3.)+.5*pow(max(dot(n,normalize(vec2(.6,.8))),0.),3.);',
' ci+=vec3(rim*((C.a>0.?.024:.006)+(C.a>0.?.09:.027)*sp));ci*=u_br;',
' return vec4(ci,clamp(-dm/(1.5*u_s)+.5,0.,1.)*M.z*mix((C.a>0.||C.r<0.)?.74:1.,1.,gA));}',
/* скляна трубка лінії графіка: d — відстань до поверхні, n — напрям від осі, r — радіус */
'vec4 lineGlass(vec2 px,float d,vec2 n,float r,vec4 col){',
' float t=clamp(-d/r,0.,1.);vec2 of=n*pow(1.-t,1.3)*r*2.6;float ab=.18*(.35+pow(1.-t,1.2));',
' vec2 c0=px-n*(d+r);vec2 sb=c0+(px-c0)*.4;',
' vec3 ci=vec3(gradBg((sb-of*(1.+ab))/u_s).r,gradBg((sb-of)/u_s).g,gradBg((sb-of*(1.-ab))/u_s).b);',
' ci=mix(ci,col.rgb,min(.9,.22*u_gt/.65))*(.95+.15*t);',
' float sp=pow(max(dot(n,normalize(vec2(-.6,-.8))),0.),2.);ci+=vec3(pow(1.-t,2.)*(.018+.09*sp));',
' return vec4(ci*u_br,clamp(-d/(1.2*u_s)+.5,0.,1.)*col.a);}',
'void main(){',
' vec2 px=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);vec2 p=px/u_s;float tkb=u_tk.w>.5?u_tk.x+u_tk.y:-1.;float dBr=1e5;vec4 RBr=vec4(0.);float QBr=1.;',
' float bl=-1.,pl=-1.,dB=1e5,dP=1e5,dn=1e5,aN=1.;vec4 RB=vec4(0.),MB=vec4(1.,0.,1.,0.),CB=vec4(0.),RP=RB,MP=MB,CP=CB;vec4 GB=vec4(0.),GP=GB;',
' for(int i=0;i<40;i++){if(float(i)>=u_n||px.y<tkb)break;vec4 r=u_r[i];vec4 m=u_m[i];if(max(abs(px.x-r.x)-r.z,abs(px.y-r.y)-r.w)>34.*u_s)continue;float d=sdRB(px-r.xy,r.zw,m.x);',
'  if(m.w<.5&&d<dn){dn=d;aN=m.z;}if(m.w>2.5&&d<dBr){dBr=d;RBr=r;QBr=m.x;}',
'  if(d<1.5*u_s){if(m.w>=bl){pl=bl;RP=RB;MP=MB;CP=CB;dP=dB;GP=GB;bl=m.w;RB=r;MB=m;CB=u_c[i];dB=d;GB=u_gu[i];}else if(m.w>=pl){pl=m.w;RP=r;MP=m;CP=u_c[i];dP=d;GP=u_gu[i];}}}',
' vec3 col=gradBg(p)+vec3(edgeRim(p))*(1.-u_clean);float sw=26.*u_s;',
' float sh=dn>0.?1.-clamp(dn/sw,0.,1.):0.;col*=1.-.16*sh*sh*aN;',
' for(int Ls=0;Ls<2;Ls++){if(Ls==0&&pl<-.5)continue;if(Ls==1&&bl<-.5)continue;bool b0=Ls==0;vec4 g=glassAt(px,b0?RP:RB,b0?MP:MB,b0?CP:CB,b0?dP:dB,b0?GP:GB);col=mix(col,g.rgb,g.a);}',
nseg?(' for(int l=0;l<4;l++){if(float(l)>=u_nl||px.y<tkb)break;vec4 bb=u_lb[l];if(px.x<bb.x||px.y<bb.y||px.x>bb.z||px.y>bb.w)continue;'+
'  vec4 li=u_li[l];float best=1e5;vec2 cp=px;float yc=-1.;'+
'  for(int i=0;i<'+nseg+';i++){float fi=float(i);if(fi<li.x)continue;if(fi>=li.x+li.y)break;vec4 sg=u_sg[i];vec2 pa=px-sg.xy,ba=sg.zw-sg.xy;'+
'   float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-4),0.,1.);vec2 q=sg.xy+ba*h;float dd=length(px-q);if(dd<best){best=dd;cp=q;}if(ba.x>1e-3&&pa.x>=0.&&pa.x<=ba.x)yc=sg.y+ba.y*(pa.x/ba.x);}'+
'  if(u_am>.5&&yc>-.5){float H=u_am<1.5?max(li.w-yc,1.):20.*u_s;float dy=px.y-yc;'+
'   if(dy>0.&&dy<H){float s=dy/H;float disp=H*.22*s*pow(1.-s,1.5);vec2 q=px-vec2(0.,disp);'+
'    vec3 dl=vec3(gradBg((q-vec2(0.,disp*.25))/u_s).r,gradBg(q/u_s).g,gradBg((q+vec2(0.,disp*.25))/u_s).b)-gradBg(p);'+
'    float ed=clamp((H-dy)/(1.5*u_s),0.,1.)*clamp(dy/u_s,0.,1.)*u_lc[l].a;'+
'    col+=(dl+u_lc[l].rgb*.035*(1.-s))*ed*u_br;}}'+
'  float d=best-li.z;if(d<1.5*u_s){vec4 g=lineGlass(px,d,normalize(px-cp+vec2(1e-5,0.)),li.z,u_lc[l]);float fw=u_lf[l].z;float fx=fw>0.?min(smoothstep(0.,fw,px.x-u_lf[l].x),smoothstep(0.,fw,u_lf[l].y-px.x)):1.;col=mix(col,g.rgb,g.a*fx);}}'):'',
' gl_FragColor=vec4(col,1.);}'].join('\n');}
(function(){
 try{tgl=TGC.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch(e){}
 if(!tgl)return;
 var maxV=tgl.getParameter(tgl.MAX_FRAGMENT_UNIFORM_VECTORS)||0;
 NSEG=maxV>=420?128:maxV>=300?64:0;   /* ланки ліній у uniform-масиві: скільки дозволяє GPU */
 function cs(t,q){var o=tgl.createShader(t);tgl.shaderSource(o,q);tgl.compileShader(o);if(!tgl.getShaderParameter(o,tgl.COMPILE_STATUS)){var lg=tgl.getShaderInfoLog(o),mm=/0:([0-9]+)/.exec(lg||'');console.error('tile',lg,mm?q.split(String.fromCharCode(10))[mm[1]-1]:'');return null;}return o;}
 var v=cs(tgl.VERTEX_SHADER,VS),f=cs(tgl.FRAGMENT_SHADER,mkTFS(NSEG));
 if(!f&&NSEG){NSEG=0;f=cs(tgl.FRAGMENT_SHADER,mkTFS(0));}
 if(!v||!f)return;
 var p=tgl.createProgram();tgl.attachShader(p,v);tgl.attachShader(p,f);tgl.bindAttribLocation(p,0,'p');tgl.linkProgram(p);
 if(!tgl.getProgramParameter(p,tgl.LINK_STATUS)){console.error(tgl.getProgramInfoLog(p));return;}
 tgl.useProgram(p);
 var b=tgl.createBuffer();tgl.bindBuffer(tgl.ARRAY_BUFFER,b);tgl.bufferData(tgl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),tgl.STATIC_DRAW);
 tgl.enableVertexAttribArray(0);tgl.vertexAttribPointer(0,2,tgl.FLOAT,false,0,0);
 ['u_res','u_vp','u_go','u_cell','u_isl','u_gcol','u_s','u_n','u_br','u_r','u_m','u_c','u_sg','u_lb','u_li','u_lc','u_nl','u_am','u_tk','u_lf','u_gu','u_ga','u_gas','u_bgt','u_clean','u_gt'].forEach(function(n){TGU[n]=tgl.getUniformLocation(p,n);});
 var fv=cs(tgl.VERTEX_SHADER,VS),ff=cs(tgl.FRAGMENT_SHADER,FXFS);
 if(fv&&ff){var fp=tgl.createProgram();tgl.attachShader(fp,fv);tgl.attachShader(fp,ff);tgl.bindAttribLocation(fp,0,'p');tgl.linkProgram(fp);
  if(tgl.getProgramParameter(fp,tgl.LINK_STATUS)){FX.p=fp;['u_vp','u_res','u_fp','u_fc','u_fn','u_t','u_aura','u_amode','u_abc','u_ahsv'].forEach(function(n){FX.U[n]=tgl.getUniformLocation(fp,n);});}}
 var bv=cs(tgl.VERTEX_SHADER,VS),bf=cs(tgl.FRAGMENT_SHADER,BGFS);
 if(bv&&bf){var bp=tgl.createProgram();tgl.attachShader(bp,bv);tgl.attachShader(bp,bf);tgl.bindAttribLocation(bp,0,'p');tgl.linkProgram(bp);
  if(tgl.getProgramParameter(bp,tgl.LINK_STATUS)){BG.p=bp;['u_vp','u_res','u_go','u_cell','u_isl','u_gcol','u_fx','u_fxk','u_clean','u_bh','u_rp','u_rn','u_ch','u_bt','u_fg'].forEach(function(n){BG.U[n]=tgl.getUniformLocation(bp,n);});}}
 if(!BG.p){console.error('tile bg program failed');return;}
 FX.main=p;tgl.useProgram(p);
 tgOK=true;GLASS_LINE_OK=false;   /* скляні лінії графіків вимкнено назавжди: графіки — звичайні лінії; скло лише на барах */
 LG('glt','шар скла плиток: WebGL ok, uniform-векторів '+maxV+', ланок ліній '+NSEG);
})();
/* згладжування ламаної графіка (зрізання кутів): скло без «зламів» на вершинах */
function chaikin(p){var it=0;while(it<3&&Math.pow(2,it+1)*(p.length-1)<=40)it++;
 for(var k=0;k<it;k++){var o=[p[0]];for(var i=0;i<p.length-1;i++){var a=p[i],b=p[i+1];o.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]]);}o.push(p[p.length-1]);p=o;}
 return p;}
var tgSG=new Float32Array(Math.max(4,NSEG*4)),tgLB=new Float32Array(16),tgLI=new Float32Array(16),tgLC=new Float32Array(16),tgLF=new Float32Array(16),tgGU=new Float32Array(160),TGF=0;
function tileRadius(el){for(var k in TILE_R)if(el.classList.contains(k))return TILE_R[k];return 0;}
function offIn(el,host){var x=0,y=0,e=el;while(e&&e!==host){x+=e.offsetLeft;y+=e.offsetTop;e=e.offsetParent;}if(e!==host)return null;
 var hw=host.offsetWidth;if(hw>0&&el.offsetWidth>0){var hr=host.getBoundingClientRect(),er=el.getBoundingClientRect(),sx=hr.width/hw;if(sx>.2&&sx<5){var fx=(er.left-hr.left)/sx,fy=(er.top-hr.top)/sx;if(Math.abs(fx-x)<2&&Math.abs(fy-y)<2){x=fx;y=fy;}}}
 return[x,y];}
function tlAll(){for(var i=0;i<tlStale.length;i++)tlStale[i]=1;dirty=true;}
/* колір скла барів, цифр і ліній графіків: насиченість і яскравість з налаштувань (50 = як є) */
function gcol(c){var mg=(c[0]+c[1]+c[2])/3,sk=CG.gsat/50,bk=CG.gbr/50;return c.map(function(v){return Math.max(0,Math.min(1.5,(mg+(v-mg)*sk)*bk));});}
function hexRgb(c){c=String(c||'').trim();var m;if((m=c.match(/var\((--[\w-]+)\)/)))c=getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();if((m=c.match(/^#([0-9a-f]{6})$/i))){var n=parseInt(m[1],16);return[(n>>16)/255,((n>>8)&255)/255,(n&255)/255];}
 if((m=c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/)))return[m[1]/255,m[2]/255,m[3]/255];return null;}
var GA={key:'',cv:document.createElement('canvas'),W:2048,H:1024,tex:null,dirty:true,gen:0};
GA.cv.width=GA.W;GA.cv.height=GA.H;GA.cx=GA.cv.getContext('2d');
function glyphable(el){return!!(el&&el.matches&&el.matches('.split>button,.mini,.gnum')&&(el.textContent||'').trim().length>0);}
function gaDraw(cx,t,ox,oy){
 var el=t.el,er=el.getBoundingClientRect(),sx=er.width/Math.max(1,el.offsetWidth)||1;
 cx.save();cx.translate(ox,oy);cx.scale(2,2);cx.beginPath();cx.rect(-26,-26,t.w+52,t.h+52);cx.clip();cx.textBaseline='middle';cx.textAlign='left';
 var sv=el.classList.contains('chw')?el.querySelector('svg[data-pts]'):null;
 if(sv){var sr=sv.getBoundingClientRect(),vb=(sv.getAttribute('data-vb')||'1,1').split(',').map(Number),pp=sv.getAttribute('data-pts').split(' ').map(function(q){var a=q.split(',');return[10+a[0]/vb[0]*(t.w-20),(sr.top-er.top)/sx+(.12+.7*a[1]/vb[1])*sr.height/sx];}),col=sv.getAttribute('data-col')||'#66d896',bot=(sr.top-er.top)/sx+sr.height/sx,g;
  if(pp.length>1){var y0=pp[0][1],y1=pp[pp.length-1][1];pp.unshift([-26,y0],[-6,y0]);pp.push([t.w+6,y1],[t.w+26,y1]);cx.beginPath();cx.moveTo(pp[0][0],bot);cx.lineTo(pp[0][0],pp[0][1]);for(var k=1;k<pp.length-1;k++)cx.lineTo(pp[k][0],pp[k][1]);cx.lineTo(pp[pp.length-1][0],pp[pp.length-1][1]);cx.lineTo(pp[pp.length-1][0],bot);cx.closePath();
   g=cx.createLinearGradient(0,0,0,bot);g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');cx.fillStyle=g;cx.fill();
   cx.beginPath();cx.moveTo(pp[0][0],pp[0][1]);for(var k2=1;k2<pp.length-1;k2++)cx.lineTo(pp[k2][0],pp[k2][1]);cx.lineTo(pp[pp.length-1][0],pp[pp.length-1][1]);cx.strokeStyle=col;cx.lineWidth=3;cx.lineJoin='round';cx.lineCap='round';cx.stroke();}}
 var tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),n;
 while((n=tw.nextNode())){var s=n.nodeValue;if(!s||!s.trim())continue;var pe=n.parentElement,ga=pe.closest('.dot,.ic,.aic');if(ga&&ga!==el)continue;
  var rg=document.createRange();rg.selectNodeContents(n);var rc=rg.getBoundingClientRect(),cs=getComputedStyle(pe);
  cx.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;cx.fillStyle=cs.color;
  cx.fillText(s.trim(),(rc.left-er.left)/sx,(rc.top-er.top)/sx+rc.height/sx/2);}
 cx.restore();
}
function gaBuild(){
 var cx=GA.cx,x=0,y=0,rh=0,i,j,ents=[],key=[];
 for(i=0;i<NP;i++){var L=TL[i];if(!L)continue;var far=BH.ph?(i!==sel&&BH.pg.indexOf(i)<0):Math.abs(i-ca)>1.01;for(j=0;j<L.length;j++){var t=L[j];t.gu=null;if(!t.gl||far)continue;
  var w=Math.ceil(t.w*2)+4,h=Math.ceil(t.h*2)+4;if(x+w+104>GA.W){x=0;y+=rh+2;rh=0;}if(y+h+104>GA.H)continue;
  t._gx0=x+54;t._gy0=y+54;t.gu=[x+54,y+54,t.w*2,t.h*2];x+=w+104;rh=Math.max(rh,h+104);ents.push(t);
  var sv=t.el.querySelector('svg[data-pts]');key.push(t.w+'x'+t.h+'@'+t._gx0+','+t._gy0+t.el.innerHTML.length+(sv?sv.getAttribute('data-pts')+sv.getAttribute('data-col'):'')+(t.el.textContent||''));}}
 var k=key.join('~');
 if(k!==GA.key||!GA.tex){
  cx.clearRect(0,0,GA.W,GA.H);ents.forEach(function(t){gaDraw(cx,t,t._gx0,t._gy0);});
  if(!GA.tex){GA.tex=tgl.createTexture();tgl.bindTexture(tgl.TEXTURE_2D,GA.tex);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_MIN_FILTER,tgl.LINEAR);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_MAG_FILTER,tgl.LINEAR);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_WRAP_S,tgl.CLAMP_TO_EDGE);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_WRAP_T,tgl.CLAMP_TO_EDGE);}
  tgl.activeTexture(tgl.TEXTURE1);tgl.bindTexture(tgl.TEXTURE_2D,GA.tex);tgl.texImage2D(tgl.TEXTURE_2D,0,tgl.RGBA,tgl.RGBA,tgl.UNSIGNED_BYTE,GA.cv);tgl.activeTexture(tgl.TEXTURE0);
  GA.key=k;GA.gen++;
 }
 GA.dirty=false;
}
function tlMeasure(i){
 var host=inn[i],ch=host.children,list=[],lines=[],gl=false,ir=null,kx=1,ky=1;
 for(var k=0;k<ch.length;k++){var el=ch[k],r=tileRadius(el);
  if(!r&&(el.classList.contains('tools')||el.classList.contains('accs'))){[].forEach.call(el.querySelectorAll('.pillb,.aic'),function(c){var o=offIn(c,host);if(!o)return;var ai=c.classList.contains('aic'),bx=o[0]+c.offsetWidth/2,by=o[1]+c.offsetHeight/2;list.push({el:c,blk:el,bcx:bx,bcy:by,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:ai?c.offsetWidth*.3:c.offsetHeight/2,hot:0,lv:0,pill:1,c:ai?hexRgb(c.style.color):c.classList.contains('ac')?[1,.49,.51]:null});});continue;}
  if(!r)continue;
  var hot=el.classList.contains('bal')?(el.classList.contains('dn')?-1:el.classList.contains('up')?1:0):0;
  var bcx=el.offsetLeft+el.offsetWidth/2,bcy=el.offsetTop+el.offsetHeight/2;
  list.push({el:el,blk:el,bcx:bcx,bcy:bcy,l:el.offsetLeft,t:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight,r:r,hot:hot,lv:0,c:null});
  if(!el.classList.contains('tile')||el.classList.contains('wg-folder'))continue;
  NEST.forEach(function(q){[].forEach.call(el.querySelectorAll(q[0]),function(c){
   var o=offIn(c,host);if(!o||!c.offsetWidth)return;
   var h2=hot;if(q[2]===2)h2=c.classList.contains('up')?1.6:c.classList.contains('dn')?-1.6:hot;
   var cc=c.classList.contains('ic')?hexRgb(c.style.color):null;
   list.push({el:c,blk:el,bcx:bcx,bcy:bcy,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:Math.min(q[1],c.offsetHeight/2),hot:h2,lv:q[2],c:cc});});});
  /* скляні цифри (шар 4): форма скла — самі гліфи тексту з атласу */
  [].forEach.call(el.querySelectorAll('.gnum'),function(c){
   var o=offIn(c,host);if(!o||!c.offsetWidth)return;
   list.push({el:c,blk:el,bcx:bcx,bcy:bcy,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:4,hot:0,lv:4,c:hexRgb(c.getAttribute('data-col'))||hexRgb(getComputedStyle(c).color)||[1,1,1]});});
  if(!GLINES)continue;
  /* заповнення прогрес-барів — скло власного кольору */
  [].forEach.call(el.querySelectorAll('.bar i,.cat .b i'),function(c){
   var o=offIn(c,host);if(!o||c.offsetWidth<2)return;
   var col=hexRgb(c.getAttribute('data-col'))||hexRgb(c.style.getPropertyValue('background'))||hexRgb(c.style.backgroundColor)||[1,.49,.51];
   list.push({el:c,blk:el,bcx:bcx,bcy:bcy,l:o[0],t:o[1],w:c.offsetWidth,h:c.offsetHeight,r:c.offsetHeight/2,hot:0,lv:3,c:col});});
  /* лінії графіків: точки з data-pts у координатах viewBox → координати сторінки */
  if(gl)[].forEach.call(el.querySelectorAll('svg[data-pts]'),function(sv){
   if(!ir){ir=host.getBoundingClientRect();kx=ir.width/Math.max(1,host.offsetWidth);ky=ir.height/Math.max(1,host.offsetHeight);}
   if(sv.closest('.chw')&&GA.cv)return;
   var r2=sv.getBoundingClientRect(),l=(r2.left-ir.left)/kx,t=(r2.top-ir.top)/ky,w=r2.width/kx,h=r2.height/ky,vb=(sv.getAttribute('data-vb')||'1,1').split(',').map(Number);
   var pts=sv.getAttribute('data-pts').split(' ').map(function(s){var a=s.split(',');return[l+a[0]/vb[0]*w,t+a[1]/vb[1]*h];});
   pts=chaikin(pts);
   if(pts.length>1)lines.push({fade:sv.closest('.chw')?18:0,blk:el,bcx:bcx,bcy:bcy,pts:pts,base:t+h,r:parseFloat(sv.getAttribute('data-lw'))||3,c:hexRgb(sv.getAttribute('data-col'))||[1,1,1]});});
 }
 list.forEach(function(t){t.gl=glyphable(t.el);});
 GA.dirty=true;
 TL[i]=list;TLL[i]=lines;tlStale[i]=0;
}
function tlAllStale(){for(var i=0;i<NP;i++)tlStale[i]=1;}
window.addEventListener('resize',tlAllStale);
setTimeout(tlAllStale,1200);setTimeout(tlAllStale,3500);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(tlAllStale);
/* хвилі по фону від тапів і від руху пальця: до 16 одночасно, кожна живе 1.7 с */
function rippleAdd(x,y,a){RPL.push({x:x,y:y,t:performance.now(),a:a||1});if(RPL.length>16)RPL.shift();RPn=RPL.length;dirty=true;}
function rpTick(){var now=performance.now();RPL=RPL.filter(function(r){return now-r.t<1700;});RPn=RPL.length;var s='';
 for(var i=0;i<RPn;i++){var r=RPL[i],age=(now-r.t)/1000;RPU[i*4]=r.x;RPU[i*4+1]=r.y;RPU[i*4+2]=age;RPU[i*4+3]=r.a;s+=age.toFixed(3);}RPsig='rp'+s;if(RPn)dirty=true;}
function bgPrep(W,H,fxOn){
 if(!BG.tex||BG.w!==W||BG.h!==H){if(BG.tex){tgl.deleteTexture(BG.tex);tgl.deleteFramebuffer(BG.fb);}BG.tex=tgl.createTexture();tgl.activeTexture(tgl.TEXTURE3);tgl.bindTexture(tgl.TEXTURE_2D,BG.tex);tgl.texImage2D(tgl.TEXTURE_2D,0,tgl.RGBA,W,H,0,tgl.RGBA,tgl.UNSIGNED_BYTE,null);
  tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_MIN_FILTER,tgl.LINEAR);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_MAG_FILTER,tgl.LINEAR);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_WRAP_S,tgl.CLAMP_TO_EDGE);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_WRAP_T,tgl.CLAMP_TO_EDGE);
  BG.fb=tgl.createFramebuffer();tgl.bindFramebuffer(tgl.FRAMEBUFFER,BG.fb);tgl.framebufferTexture2D(tgl.FRAMEBUFFER,tgl.COLOR_ATTACHMENT0,tgl.TEXTURE_2D,BG.tex,0);tgl.bindFramebuffer(tgl.FRAMEBUFFER,null);BG.w=W;BG.h=H;}
 tgl.useProgram(BG.p);
 tgl.uniform2f(BG.U.u_vp,VW,VH);tgl.uniform2f(BG.U.u_res,W,H);tgl.uniform2f(BG.U.u_go,gOffEff()[0],gOffEff()[1]);tgl.uniform1f(BG.U.u_cell,gCellEff());tgl.uniform1f(BG.U.u_isl,ISL);tgl.uniform3f(BG.U.u_gcol,GCOL[0],GCOL[1],GCOL[2]);
 tgl.uniform1i(BG.U.u_fx,2);tgl.uniform1f(BG.U.u_fxk,fxOn&&!TCLEAN?1:0);tgl.uniform1f(BG.U.u_clean,TCLEAN);tgl.uniform4f(BG.U.u_bh,BH.x,BH.y,BH.r,TCLEAN?0:BH.k);tgl.uniform1f(BG.U.u_rn,TCLEAN?0:RPn);if(RPn)tgl.uniform4fv(BG.U.u_rp,RPU);tgl.uniform3f(BG.U.u_ch,CH.x,CH.y,TCLEAN?0:CH.s);tgl.uniform1f(BG.U.u_bt,(performance.now()/1000)%1000);tgl.uniform3f(BG.U.u_fg,FGL.x,FGL.y,TCLEAN?0:FGL.k*(1+2.4*(FGL.p||0)));
 tgl.useProgram(FX.main);tgl.activeTexture(tgl.TEXTURE3);tgl.bindTexture(tgl.TEXTURE_2D,BG.tex);tgl.activeTexture(tgl.TEXTURE0);
}
function pass2(x,y,w,h){   /* фон у текстуру, потім скло — у межах прямокутника (координати WebGL) */
 var W=tgW,H=tgH;
 if(x!==null){tgl.enable(tgl.SCISSOR_TEST);tgl.scissor(x,y,w,h);}else tgl.disable(tgl.SCISSOR_TEST);
 tgl.useProgram(BG.p);tgl.bindFramebuffer(tgl.FRAMEBUFFER,BG.fb);tgl.activeTexture(tgl.TEXTURE3);tgl.bindTexture(tgl.TEXTURE_2D,null);tgl.activeTexture(tgl.TEXTURE0);
 tgl.drawArrays(tgl.TRIANGLE_STRIP,0,4);
 tgl.bindFramebuffer(tgl.FRAMEBUFFER,null);tgl.useProgram(FX.main);tgl.activeTexture(tgl.TEXTURE3);tgl.bindTexture(tgl.TEXTURE_2D,BG.tex);tgl.activeTexture(tgl.TEXTURE0);
 tgl.drawArrays(tgl.TRIANGLE_STRIP,0,4);
}
function fxRender(W,H){
 var w=Math.max(8,Math.round(W/3)),h=Math.max(8,Math.round(H/3));
 if(!FX.tex||FX.w!==w||FX.h!==h){if(FX.tex){tgl.deleteTexture(FX.tex);tgl.deleteFramebuffer(FX.fb);}FX.tex=tgl.createTexture();tgl.activeTexture(tgl.TEXTURE2);tgl.bindTexture(tgl.TEXTURE_2D,FX.tex);tgl.texImage2D(tgl.TEXTURE_2D,0,tgl.RGBA,w,h,0,tgl.RGBA,tgl.UNSIGNED_BYTE,null);
  tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_MIN_FILTER,tgl.LINEAR);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_MAG_FILTER,tgl.LINEAR);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_WRAP_S,tgl.CLAMP_TO_EDGE);tgl.texParameteri(tgl.TEXTURE_2D,tgl.TEXTURE_WRAP_T,tgl.CLAMP_TO_EDGE);
  FX.fb=tgl.createFramebuffer();tgl.bindFramebuffer(tgl.FRAMEBUFFER,FX.fb);tgl.framebufferTexture2D(tgl.FRAMEBUFFER,tgl.COLOR_ATTACHMENT0,tgl.TEXTURE_2D,FX.tex,0);FX.w=w;FX.h=h;}
 var sc=tgl.isEnabled(tgl.SCISSOR_TEST);if(sc)tgl.disable(tgl.SCISSOR_TEST);
 tgl.useProgram(FX.p);tgl.bindFramebuffer(tgl.FRAMEBUFFER,FX.fb);tgl.viewport(0,0,w,h);
 tgl.uniform2f(FX.U.u_vp,VW,VH);tgl.uniform2f(FX.U.u_res,w,h);tgl.uniform1f(FX.U.u_t,(performance.now()/1000)%1000);tgl.uniform1f(FX.U.u_aura,AURA?FGS.a/50*BH.au:0);var abT=BAL_TREND>0?[.2,.95,.45]:BAL_TREND<0?[1,.18,.25]:[.72,.72,.82];for(var ab=0;ab<3;ab++)ABC[ab]+=(abT[ab]-ABC[ab])*.08;tgl.uniform1f(FX.U.u_amode,FGS.am?1:0);tgl.uniform3f(FX.U.u_abc,ABC[0],ABC[1],ABC[2]);tgl.uniform3f(FX.U.u_ahsv,FGS.ah/360,FGS.as/100,FGS.av/100);tgl.uniform1f(FX.U.u_fn,FGact?FGn:0);if(FGact){tgl.uniform4fv(FX.U.u_fp,FGu);tgl.uniform3fv(FX.U.u_fc,FGcu);}
 tgl.drawArrays(tgl.TRIANGLE_STRIP,0,4);
 tgl.bindFramebuffer(tgl.FRAMEBUFFER,null);tgl.viewport(0,0,W,H);tgl.useProgram(FX.main);tgl.activeTexture(tgl.TEXTURE2);tgl.bindTexture(tgl.TEXTURE_2D,FX.tex);tgl.activeTexture(tgl.TEXTURE0);
}
function tgCleanShot(fn){if(!tgOK||!tgW){fn();return;}TCLEAN=1;tgSig='';drawTilesS.q=null;drawTiles();try{fn();}finally{TCLEAN=0;tgSig='';drawTilesS.q=null;drawTiles();}}
function drawTiles(){drawTilesS(Math.min(S,1.6));}
function drawTilesS(S){
 if(!VW||!VH)return;
 {var cr=Math.round(ca);if(cr!==GA.cr){GA.cr=cr;GA.dirty=true;}}
 /* швидкий вихід без жодних виділень пам'яті: якщо сцена не змінилась з минулого малювання — нічого не робимо */
 {var qr=rec.pg,qs=0,qi,qst=false;for(qi=0;qi<NP;qi++){qs+=(sy[qi]||0)*(1.1+qi*.37);if(Math.abs(qi-ca)<1&&(tlStale[qi]||!TL[qi]))qst=true;}
  var qn=ca*7.3+VW*3.1+VH*1.7+S*5+gOX*1.3+gOY*2.1+GCOL[0]*11+GCOL[1]*13+GCOL[2]*17+qr.v*19+qr.ox*.3+qr.oy*.5+qr.tx*.7+qr.ty*.9+qs+CG.is+CG.ib*3+CG.bal*5+CG.gt*7+CG.gsat*9+CG.gbr*11+AREA_MODE*101+(AURA?Math.floor(performance.now()/66):0)*.37+FGgen*.71+GA.gen*13+tickerEl.offsetTop*.11;
  if(!TCLEAN&&qn===drawTilesS.q&&tgW&&!qst&&!GA.dirty&&!intro.on&&!(typeof PRS!=='undefined'&&PRS.size)&&!(BH.ph===1||BH.ph===2)&&!RPn&&!CH.on&&!CH.rel&&!WF.n&&!(FGL.k>.004))return;drawTilesS.q=qn;}
 var rp=rec.pg,v=rp.v>.003?rp.v:0,k=v?kOf(v):1,n=0,ns=0,nl=0,sig=[ca.toFixed(3),VW,VH,S,gOX.toFixed(1),gOY.toFixed(1),(FLD.id?FLD.zoom.toFixed(3):0),GCOL.map(function(x){return x.toFixed(3);}).join(':'),v.toFixed(3),rp.ox.toFixed(1),rp.oy.toFixed(1),rp.tx.toFixed(1),rp.ty.toFixed(1),'am'+AREA_MODE,'tk'+tickerEl.offsetTop+'/'+tickerEl.offsetHeight,CG.is,CG.ib,CG.bal,CG.gt,CG.gsat,CG.gbr,PRSIG],i,j;
 var NEAR=BH.ph?1.01:1;   /* під час чорної діри скло малюється й для сусідніх вкладок */
 TGF++;for(i=0;i<NP;i++){if((Math.abs(i-ca)<NEAR||(BH.ph&&BH.pg.indexOf(i)>=0))&&(tlStale[i]||!TL[i]))tlMeasure(i);}
 if(GA.dirty)gaBuild();var mna='ga'+GA.gen+'fg'+FGgen,minor=mna+(AURA?Math.floor(performance.now()/66):0);
 for(i=0;i<NP&&n<TMAX;i++){
  var o=i-ca;if(BH.ph?(i!==sel&&BH.pg.indexOf(i)<0):Math.abs(o)>=NEAR)continue;
  var po=BH.ph?BH.po:1;
  if(tlStale[i]||!TL[i])tlMeasure(i);
  var yy=sy[i];sig.push(i,yy.toFixed(2));
  var tf=function(x,y,bcx,bcy,ia,blk){if(ia){x=bcx+(x-bcx)*ia.s+ia.x;y=bcy+(y-bcy)*ia.s+ia.y;}var pb=blk&&blk._ps;if(pb){x=bcx+(x-bcx)*pb.s*(pb.jx||1)+pb.dx;y=bcy+(y-bcy)*pb.s*(pb.jy||1)+pb.dy;}x+=o*po*VW;y-=yy;if(v){x=rp.ox+rp.tx*v+k*(x-rp.ox);y=rp.oy+rp.ty*v+k*(y-rp.oy);}return[x,y];};
  var list=TL[i];if(WF.n)list=list.filter(function(q){return!q.blk.classList.contains('wfd');}).concat(list.filter(function(q){return q.blk.classList.contains('wfd');}));   /* скло від'єднаного віджета — поверх інших */
  for(j=0;j<list.length&&n<TMAX;j++){
   var t=list[j];if(BH.ph&&i!==sel&&t.lv>0)continue;
   var ia=t.blk._ia,pbk=t.blk._ps,pe=t.el!==t.blk?t.el._ps:null,sc=(ia?ia.s:1)*k*(pbk?pbk.s:1)*(pe?pe.s:1),c0=tf(t.l+t.w/2,t.t+t.h/2,t.bcx,t.bcy,ia,t.blk),cx=c0[0]+(pe?pe.dx:0),cy=c0[1]+(pe?pe.dy:0),hw=t.w/2*sc*(pbk&&pbk.jx||1),hh=t.h/2*sc*(pbk&&pbk.jy||1),rr=t.r*sc*Math.min(pbk&&pbk.jx||1,pbk&&pbk.jy||1);
   if(cx+hw<-40||cx-hw>VW+40||cy+hh<-40||cy-hh>VH+40)continue;
   /* під від'єднаним віджетом */
   tgR[n*4]=cx*S;tgR[n*4+1]=cy*S;tgR[n*4+2]=hw*S;tgR[n*4+3]=hh*S;
   tgM[n*4]=Math.min(rr*S,hw*S,hh*S);tgM[n*4+1]=t.hot*(t.lv===2?CG.ib/45:CG.bal/45);tgM[n*4+2]=ia?ia.a:1;tgM[n*4+3]=t.lv;
   if(t.gu){tgGU[n*4]=t.gu[0];tgGU[n*4+1]=t.gu[1];tgGU[n*4+2]=t.el.classList.contains('chw')?-t.gu[2]:t.gu[2];tgGU[n*4+3]=t.gu[3];if(!t.el._gx){t.el.classList.add('gxh');t.el._gx=1;}t.el._gf=TGF;}else{tgGU[n*4]=tgGU[n*4+1]=tgGU[n*4+2]=tgGU[n*4+3]=0;}
   if(t.c&&t.lv>=3){var gc=gcol(t.c);tgC[n*4]=gc[0];tgC[n*4+1]=gc[1];tgC[n*4+2]=gc[2];tgC[n*4+3]=CG.gt/100;}   /* бари й цифри: чистий власний колір скла */
   else if(t.c){var mg=(t.c[0]+t.c[1]+t.c[2])/3,sk=CG.is/100*2.5,bk=CG.ib/100*1.1,sa=function(v){return Math.max(0,Math.min(1,mg+(v-mg)*sk))*bk;};tgC[n*4]=sa(t.c[0]);tgC[n*4+1]=sa(t.c[1]);tgC[n*4+2]=sa(t.c[2]);tgC[n*4+3]=.3;}else{tgC[n*4+3]=0;if(t.pill)tgC[n*4]=-1;}
   n++;sig.push(cx.toFixed(1),cy.toFixed(1),hw.toFixed(1),hh.toFixed(1),ia?ia.a.toFixed(2):'');
  }
  var ll=TLL[i]||[];
  for(j=0;j<ll.length&&nl<NLN;j++){
   var L=ll[j],ia2=L.blk._ia,sc2=(ia2?ia2.s:1)*k*(L.blk._ps?L.blk._ps.s:1),start=ns,mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9,prev=null,q;
   for(q=0;q<L.pts.length&&ns<NSEG;q++){
    var pp=tf(L.pts[q][0],L.pts[q][1],L.bcx,L.bcy,ia2,L.blk);
    mnx=Math.min(mnx,pp[0]);mny=Math.min(mny,pp[1]);mxx=Math.max(mxx,pp[0]);mxy=Math.max(mxy,pp[1]);
    if(prev){tgSG[ns*4]=prev[0]*S;tgSG[ns*4+1]=prev[1]*S;tgSG[ns*4+2]=pp[0]*S;tgSG[ns*4+3]=pp[1]*S;ns++;}
    prev=pp;
   }
   if(ns===start||mxx<-20||mnx>VW+20||mxy<-20||mny>VH+20){ns=start;continue;}
   var pad=(L.r*sc2+34),baseY=tf(L.pts[0][0],L.base,L.bcx,L.bcy,ia2,L.blk)[1],bot=AREA_MODE===1?Math.max(mxy,baseY):AREA_MODE===2?mxy+22:mxy;
   tgLB[nl*4]=(mnx-pad)*S;tgLB[nl*4+1]=(mny-pad)*S;tgLB[nl*4+2]=(mxx+pad)*S;tgLB[nl*4+3]=(bot+pad)*S;
   tgLF[nl*4]=mnx*S;tgLF[nl*4+1]=mxx*S;tgLF[nl*4+2]=L.fade*S;tgLF[nl*4+3]=0;
   tgLI[nl*4]=start;tgLI[nl*4+1]=ns-start;tgLI[nl*4+2]=L.r*sc2*S;tgLI[nl*4+3]=baseY*S;
   var lc=gcol(L.c);tgLC[nl*4]=lc[0];tgLC[nl*4+1]=lc[1];tgLC[nl*4+2]=lc[2];tgLC[nl*4+3]=ia2?ia2.a:1;
   nl++;sig.push('L',start,ns,mnx.toFixed(1),mny.toFixed(1));
  }
 }
 for(i=0;i<NP;i++){var Lc=TL[i];if(!Lc)continue;for(j=0;j<Lc.length;j++){var te=Lc[j].el;if(te._gx&&te._gf!==TGF){te.classList.remove('gxh');te._gx=0;}}}
 rpTick();if(RPn||CH.on||FGL.k>.004)sig.push(RPsig+'c'+CH.s.toFixed(3)+'f'+FGL.k.toFixed(3)+(FGL.x|0)+','+(FGL.y|0));   /* хвилі: повний перемальований кадр */
 var major=sig.join(','),key=major+'|'+minor;
 if(key===tgSig&&tgW)return;
 tgSig=key;var onlyLite=(major===tgMajor&&('ga'+GA.gen)===tgMNA.split('fg')[0]&&!!tgW);var onlyAura=onlyLite&&mna===tgMNA;tgMNA=mna;if(major!==tgMajor){tgMajor=major;tgMajorN++;}
 var W=Math.round(VW*S),H=Math.round(VH*S);
 if(W!==tgW||H!==tgH||S!==tgS){tgW=W;tgH=H;tgS=S;TGC.width=W;TGC.height=H;tgl.viewport(0,0,W,H);onlyAura=false;onlyLite=false;}
 tgl.uniform2f(TGU.u_res,W,H);tgl.uniform2f(TGU.u_vp,VW,VH);tgl.uniform1f(TGU.u_s,S);tgl.uniform2f(TGU.u_go,gOffEff()[0],gOffEff()[1]);tgl.uniform1f(TGU.u_isl,ISL);tgl.uniform1f(TGU.u_cell,gCellEff());tgl.uniform3f(TGU.u_gcol,GCOL[0],GCOL[1],GCOL[2]);tgl.uniform1f(TGU.u_n,n);tgl.uniform1f(TGU.u_br,1-RD*v);tgl.uniform1f(TGU.u_gt,CG.gt/100);
 var tkT=tickerEl.offsetTop,tkH=tickerEl.offsetHeight;tgl.uniform4f(TGU.u_tk,tkT*S,tkH*S,28*S,0); var fxOn=FX.p&&(AURA||FGact)&&!TCLEAN?1:0;if(fxOn)fxRender(W,H);bgPrep(W,H,fxOn);tgl.uniform1i(TGU.u_bgt,3);tgl.uniform1f(TGU.u_clean,TCLEAN);

 tgl.uniform4fv(TGU.u_r,tgR);tgl.uniform4fv(TGU.u_m,tgM);tgl.uniform4fv(TGU.u_c,tgC);tgl.uniform4fv(TGU.u_gu,tgGU);tgl.uniform1i(TGU.u_ga,1);tgl.uniform2f(TGU.u_gas,GA.W,GA.H);if(GA.tex){tgl.activeTexture(tgl.TEXTURE1);tgl.bindTexture(tgl.TEXTURE_2D,GA.tex);tgl.activeTexture(tgl.TEXTURE0);}

 if(NSEG){tgl.uniform4fv(TGU.u_sg,tgSG);tgl.uniform4fv(TGU.u_lb,tgLB);tgl.uniform4fv(TGU.u_li,tgLI);tgl.uniform4fv(TGU.u_lc,tgLC);tgl.uniform4fv(TGU.u_lf,tgLF);tgl.uniform1f(TGU.u_nl,nl);tgl.uniform1f(TGU.u_am,AREA_MODE);}
 tgDraws++;
 var fgR=null;if(FGbb||FGbbPrev){var A1=FGbb||FGbbPrev,B1=FGbbPrev||FGbb;fgR=[Math.min(A1[0],B1[0]),Math.min(A1[1],B1[1]),Math.max(A1[2],B1[2]),Math.max(A1[3],B1[3])];}FGbbPrev=FGbb;
 if(TCLEAN){onlyLite=false;onlyAura=false;}
 if(onlyLite&&!onlyAura&&fgR){var fx0=Math.max(0,Math.floor(fgR[0]*S)),fy0=Math.max(0,Math.floor(fgR[1]*S)),fx1=Math.min(W,Math.ceil(fgR[2]*S)),fy1=Math.min(H,Math.ceil(fgR[3]*S));
  if(fx1>fx0&&fy1>fy0)pass2(fx0,H-fy1,fx1-fx0,fy1-fy0);onlyAura=true;}
 if(onlyAura&&AURA){var bd=Math.round(104*S);pass2(0,H-bd,W,bd);pass2(0,0,W,bd);pass2(0,bd,bd,Math.max(1,H-2*bd));pass2(W-bd,bd,bd,Math.max(1,H-2*bd));}
 else if(!onlyAura)pass2(null);
 tgl.disable(tgl.SCISSOR_TEST);
 if(!tgShown){tgShown=true;TGC.style.display='block';document.documentElement.classList.add('gt');}
}

/* ---- поява віджетів під час розширення скляної форми: злітаються з країв екрана з розмиття й затемнення, знизу догори, у випадковому порядку ---- */
var intro={on:0,t0:0,items:[]};
function introStart(t){
 var host=inn[sel];if(!host)return;
 var ch=host.children,list=[],k;
 for(k=0;k<ch.length;k++){var el=ch[k];if(el.offsetTop-(sy[sel]||0)<VH+20)list.push({el:el,top:el.offsetTop});}
 list.sort(function(a,b){return b.top-a.top;});                       /* знизу вгору */
 intro.items=list.map(function(it,rank){
  /* старт за межами екрана з випадкового краю; летить по кривій (квадратична Безьє з випадковим вигином) */
  var side=Math.floor(Math.random()*4),r=Math.random()-.5,sx,sy0;
  if(side===0){sx=-VW*1.15;sy0=r*VH*.7;}else if(side===1){sx=VW*1.15;sy0=r*VH*.7;}else if(side===2){sy0=VH*1.05;sx=r*VW*1.2;}else{sy0=-VH*.95;sx=r*VW*1.2;}
  var len=Math.hypot(sx,sy0)||1,nx=-sy0/len,ny=sx/len,bend=(Math.random()<.5?-1:1)*(.3+Math.random()*.35)*len;
  return{el:it.el,sx:sx,sy:sy0,cx:sx*.5+nx*bend,cy:sy0*.5+ny*bend,rot:(Math.random()-.5)*16,
   delay:.45+rank*.16+Math.random()*.22,dur:1.25+Math.random()*.4};   /* починають, коли скло вже розгортається */
 });
 intro.on=1;intro.t0=t;
}
function introStep(t){
 var tt=(t-intro.t0)/1000,done=true;
 intro.items.forEach(function(it){
  var p=Math.max(0,Math.min(1,(tt-it.delay)/it.dur)),e=1-Math.pow(1-p,3),u=1-e,st=it.el.style;
  if(p<1)done=false;
  var x=u*u*it.sx+2*u*e*it.cx,y=u*u*it.sy+2*u*e*it.cy,sc=.7+.3*e,al=Math.min(1,p*3);
  st.transform=p<1?'translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) rotate('+(it.rot*u).toFixed(2)+'deg) scale('+sc.toFixed(3)+')':'';
  st.filter=p<1?'brightness('+(.3+.7*e).toFixed(2)+')':'';
  st.opacity=al<1?al.toFixed(2):'';
  it.el._ia=p<1?{x:x,y:y,s:sc,a:al}:null;
 });
 if(done){intro.on=0;intro.items=[];}
}
