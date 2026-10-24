// Local fallback: border-connected background segmentation, not a semantic AI model.
export async function basicOutline(source,asSticker=false){
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('无法读取这张照片'));i.src=source;});
 const size=asSticker?640:180,scale=Math.min(size/img.width,size/img.height),w=Math.max(2,Math.round(img.width*scale)),h=Math.max(2,Math.round(img.height*scale));
 const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);const p=ctx.getImageData(0,0,w,h).data;
 const corners=[0,w-1,(h-1)*w,w*h-1];const bg=[0,1,2].map(k=>corners.reduce((s,i)=>s+p[i*4+k],0)/4);const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),q=[];
 const transparent=corners.some(i=>p[i*4+3]<30);
 const near=i=>transparent?p[i*4+3]<30:Math.hypot(p[i*4]-bg[0],p[i*4+1]-bg[1],p[i*4+2]-bg[2])<65||p[i*4+3]<30;
 function add(i){if(i>=0&&i<w*h&&!seen[i]&&near(i)){seen[i]=1;q.push(i);}}
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 for(let n=0;n<q.length;n++){const i=q[n],x=i%w;if(x>0)add(i-1);if(x<w-1)add(i+1);add(i-w);add(i+w);}
 for(let i=0;i<mask.length;i++)mask[i]=seen[i]?0:1;
 // Keep only the largest connected foreground object; eliminate isolated noise.
 const visited=new Uint8Array(mask.length);let largest=[];
 for(let i=0;i<mask.length;i++){if(!mask[i]||visited[i])continue;const region=[i];visited[i]=1;for(let n=0;n<region.length;n++){const k=region[n],x=k%w;for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,k-w,k+w])if(j>=0&&j<mask.length&&mask[j]&&!visited[j]){visited[j]=1;region.push(j);}}if(region.length>largest.length)largest=region;}
 if(largest.length<40||largest.length>w*h*.95)throw Error('没有找到清晰的衣物轮廓。请用纯色背景重拍，或选择 AI 处理。');
 mask.fill(0);largest.forEach(i=>mask[i]=1);
 if(asSticker){const result=ctx.getImageData(0,0,w,h);for(let i=0;i<mask.length;i++)if(!mask[i])result.data[i*4+3]=0;ctx.putImageData(result,0,0);return normalizeSticker(c.toDataURL('image/png'));}
 const edges=new Map();const key=(x,y)=>`${x},${y}`;const edge=(a,b)=>{if(!edges.has(a))edges.set(a,[]);edges.get(a).push(b);};
 for(const i of largest){const x=i%w,y=Math.floor(i/w);if(y===0||!mask[i-w])edge(key(x,y),key(x+1,y));if(x===w-1||!mask[i+1])edge(key(x+1,y),key(x+1,y+1));if(y===h-1||!mask[i+w])edge(key(x+1,y+1),key(x,y+1));if(x===0||!mask[i-1])edge(key(x,y+1),key(x,y));}
 const paths=[];while(edges.size){const start=edges.keys().next().value;let k=start,points=[];for(let n=0;n<100000;n++){points.push(k.split(',').map(Number));const next=edges.get(k);if(!next)break;const dest=next.pop();if(!next.length)edges.delete(k);k=dest;if(k===start)break;}if(points.length>20)paths.push(points);}
 const xs=largest.map(i=>i%w),ys=largest.map(i=>Math.floor(i/w));const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);const s=Math.min(200/(maxX-minX+1),184/(maxY-minY+1));const ox=(240-(maxX-minX)*s)/2,oy=(220-(maxY-minY)*s)/2;
 return paths.map(points=>{const smooth=points.filter((_,i)=>i%3===0);return `<path d="${smooth.map(([x,y],i)=>`${i?'L':'M'}${((x-minX)*s+ox).toFixed(1)},${((y-minY)*s+oy).toFixed(1)}`).join(' ')}Z"/>`;}).join('');
}
export async function normalizeSticker(source){
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('无法读取贴纸'));i.src=source;});
 const s=Math.min(1,900/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const d=ctx.getImageData(0,0,c.width,c.height).data;
 let x0=c.width,y0=c.height,x1=-1,y1=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 if(x1<0)throw Error('未找到清晰主体，请换一张照片');const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;out.getContext('2d').drawImage(c,x0,y0,out.width,out.height,0,0,out.width,out.height);return out.toDataURL('image/png');
}
export async function createSticker(source){
 if(window.Capacitor?.getPlatform()==='ios'){
  const result=await window.Capacitor.registerPlugin('ClosetCutout').cutout({image:source});
  return {image:await normalizeSticker(result.image),method:'iPhone 端侧抠图'};
 }
 return {image:await basicOutline(source,true),method:'本地纯色背景抠图'};
}
export async function aiOutline(source,endpoint,signal){
 if(!endpoint)throw Error('请先在「我的 → AI 服务」中填写服务地址。');
 const u=new URL(endpoint);if(!['http:','https:'].includes(u.protocol))throw Error('服务地址需以 https:// 或 http:// 开头');
 const blob=await(await fetch(source)).blob(),form=new FormData();form.append('file',blob,'garment.jpg');
 const response=await fetch(endpoint.replace(/\/$/,'')+'/outline',{method:'POST',body:form,signal});
 if(!response.ok){let detail='';try{detail=(await response.json()).detail||'';}catch{}throw Error(detail||`AI 服务返回 ${response.status}`);}
 const data=await response.json();if(typeof data.svg!=='string'||!data.svg.includes('<path'))throw Error('AI 服务未返回有效线稿');return data.svg;
}
