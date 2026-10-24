export const categories=['全部','上衣','裤子','外套','鞋子'];
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const freshCanvas=(settings={})=>({id:null,name:'',note:'',date:'',favorite:false,body:settings.body||'女',background:'#F7F6F2',layers:[]});
export const initialState=()=>({version:1,garments:[],outfits:[],draft:null,editorDraft:null,settings:{width:2,color:'#575952',body:'女',endpoint:'',font:'playful'}});
export function addLayer(canvas,garment){const kind=garment.category;const layer={id:uid(),garmentId:garment.id,art:garment.art,name:garment.name,category:kind,x:kind==='鞋子'?105:kind==='裤子'?95:95,y:kind==='鞋子'?430:kind==='裤子'?245:125,w:kind==='鞋子'?190:210,h:kind==='鞋子'?140:kind==='裤子'?280:180,scale:1,rotation:0};const layers=[...canvas.layers];const coat=layers.findIndex(l=>l.category==='外套');layers.splice(kind!=='外套'&&coat!==-1?coat:layers.length,0,layer);return {...canvas,layers};}
export function moveLayer(canvas,id,delta){const layers=[...canvas.layers],i=layers.findIndex(l=>l.id===id),j=Math.min(layers.length-1,Math.max(0,i+delta));if(i<0)return canvas;[layers[i],layers[j]]=[layers[j],layers[i]];return {...canvas,layers};}
export function filterGarments(items,{category='全部',season='',color='',style='',archived=false}={}){return items.filter(g=>!!g.archived===archived&&(category==='全部'||g.category===category)&&(!season||g.season===season)&&(!color||g.colorTag.includes(color))&&(!style||g.style.includes(style)));}
export function validDate(s){if(!s)return true;const d=new Date(s);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function validateBackup(s){
 if(!s||s.version!==1||!Array.isArray(s.garments)||!Array.isArray(s.outfits)||!s.settings)throw Error('备份格式不正确');
 if(s.garments.length>2000||s.outfits.length>2000)throw Error('备份条目过多');
 const validId=id=>typeof id==='string'&&/^[\w-]{1,100}$/.test(id);
 const validArt=a=>a&&(!a.image||(typeof a.image==='string'&&a.image.length<12000000&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(a.image)))&&typeof a.svg==='string'&&a.svg.length<=2000000&&/^#[0-9a-f]{6}$/i.test(a.color)&&Number.isFinite(a.width)&&Array.isArray(a.strokes)&&a.strokes.length<=3000&&a.strokes.every(p=>typeof p.d==='string'&&p.d.length<200000&&Number.isFinite(p.width));
 for(const g of s.garments){if(!validId(g.id)||typeof g.name!=='string'||!categories.slice(1).includes(g.category)||!validArt(g.art))throw Error('衣物数据不完整');for(const k of ['season','colorTag','style','material'])if(typeof g[k]!=='string')g[k]='';delete g.source;}
 for(const o of s.outfits){if(!validId(o.id)||typeof o.name!=='string'||!Array.isArray(o.layers)||o.layers.length>200||!/^#[0-9a-f]{6}$/i.test(o.background)||!['男','女','关'].includes(o.body)||!validDate(o.date)||o.layers.some(l=>!validId(l.id)||typeof l.name!=='string'||!validArt(l.art)||!['x','y','w','h','scale','rotation'].every(k=>Number.isFinite(l[k])&&Math.abs(l[k])<10000)||l.w<=0||l.h<=0||l.scale<=0))throw Error('搭配数据不完整');}
 return s;
}
export function openStore(){return new Promise((resolve,reject)=>{const r=indexedDB.open('linecloset',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export function loadStore(db){return new Promise((resolve,reject)=>{const r=db.transaction('data').objectStore('data').get('state');r.onsuccess=()=>resolve(r.result||initialState());r.onerror=()=>reject(r.error);});}
export function saveStore(db,state){return new Promise((resolve,reject)=>{const t=db.transaction('data','readwrite');t.objectStore('data').put(structuredClone(state),'state');t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('存储被中断'));});}
