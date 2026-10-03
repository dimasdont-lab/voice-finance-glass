window.html2canvas=function(el,o){return new Promise(function(res){setTimeout(function(){
 var sc=o.scale||1,r=el.getBoundingClientRect(),c=document.createElement('canvas');
 c.width=Math.max(1,Math.ceil(r.width*sc));c.height=Math.max(1,Math.ceil(r.height*sc));
 var x=c.getContext('2d');x.scale(sc,sc);
 var win=el.ownerDocument.defaultView;
 function rr(px,py,w,h,rad){rad=Math.min(rad,w/2,h/2);x.beginPath();x.moveTo(px+rad,py);x.arcTo(px+w,py,px+w,py+h,rad);x.arcTo(px+w,py+h,px,py+h,rad);x.arcTo(px,py+h,px,py,rad);x.arcTo(px,py,px+w,py,rad);x.closePath();}
 function walk(n){
  var cs=win.getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return;
  var b=n.getBoundingClientRect(),ox=b.left-r.left,oy=b.top-r.top;
  var bg=cs.backgroundColor;
  if(bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){x.globalAlpha=1;x.fillStyle=bg;rr(ox,oy,b.width,b.height,parseFloat(cs.borderTopLeftRadius)||0);x.fill();}
  if(parseFloat(cs.borderTopWidth)>0&&cs.borderTopColor!=='rgba(0, 0, 0, 0)'){x.strokeStyle=cs.borderTopColor;x.lineWidth=1;rr(ox+.5,oy+.5,b.width-1,b.height-1,parseFloat(cs.borderTopLeftRadius)||0);x.stroke();}
  for(var i=0;i<n.childNodes.length;i++){var k=n.childNodes[i];
   if(k.nodeType===3&&k.textContent.trim()){var rg=n.ownerDocument.createRange();rg.selectNodeContents(k);var tb=rg.getBoundingClientRect();
     x.fillStyle=cs.color;x.font=cs.fontWeight+' '+cs.fontSize+' sans-serif';x.textBaseline='middle';x.fillText(k.textContent.trim(),tb.left-r.left,tb.top-r.top+tb.height/2);}
   else if(k.nodeType===1)walk(k);}
 }
 walk(el);res(c);},40);});};
