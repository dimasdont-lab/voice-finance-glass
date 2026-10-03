/** Gesture decisions and file lifetime only; no event bindings or rendering. */
export function closestChartPoint(points,normalizedX) {
  if (!points?.length) return null;
  const x=Math.max(0,Math.min(1,Number(normalizedX)||0));
  // normalizedX is relative to the PLOT, not including host chart padding.
  // Keep the first sample on an exact tie, matching original nearest-point logic.
  let index=0,distance=Infinity;
  points.forEach((_,i)=>{const current=Math.abs((points.length===1?0:i/(points.length-1))-x);if(current<distance){index=i;distance=current}});
  return {index,point:points[index]};
}

export function createChartGesture({threshold=6}={}) {
  let start=null,axis='';
  return {
    start({x,y,pointerType='touch'}){start={x,y,pointerType};axis='';return {inspect:true,blockPageScroll:false}},
    move({x,y,buttons=true}){
      if(!start||(!buttons&&start.pointerType!=='touch'))return {inspect:false,blockPageScroll:false};
      if(start.pointerType!=='touch')return {inspect:true,blockPageScroll:false};
      const dx=Math.abs(x-start.x),dy=Math.abs(y-start.y);
      if(!axis&&Math.max(dx,dy)>threshold)axis=dx>dy?'horizontal':'vertical';
      return {axis,inspect:axis==='horizontal',hide:axis==='vertical',blockPageScroll:axis==='horizontal'};
    },
    end({cancelled=false}={}){const hide=cancelled||start?.pointerType!=='touch';start=null;axis='';return {hide,blockPageScroll:false}}
  };
}

export function createTickerGesture({clock=()=>performance.now(),moveThreshold=7,tapLimitMs=380,resumeDelayMs=700}={}) {
  let press=null;
  return {
    start({x,marketId,offset=0}){press={x,marketId,offset,moved:false,time:clock()};return {pauseAutoplay:true}},
    move({x}){if(!press)return null;const dx=x-press.x;if(Math.abs(dx)>moveThreshold)press.moved=true;return {offset:press.offset-dx}},
    end({cancelled=false}={}){if(!press)return null;const marketId=!cancelled&&!press.moved&&clock()-press.time<tapLimitMs?press.marketId:null;press=null;return {openMarketId:marketId||null,resumeAt:clock()+resumeDelayMs}}
  };
}

export function createReceiptPreview({urlAPI=globalThis.URL}={}) {
  let objectURL='';
  const dispose=()=>{if(objectURL)urlAPI.revokeObjectURL(objectURL);objectURL=''};
  return {
    select(file){dispose();if(!file)return null;if(file.type?.startsWith('image/'))objectURL=urlAPI.createObjectURL(file);return {name:file.name,previewURL:objectURL||null,manualPrefill:{note:`Чек: ${file.name||'чек'}`}}},
    dispose
  };
}
