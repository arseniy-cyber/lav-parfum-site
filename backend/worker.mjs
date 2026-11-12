/**
 * LAV PARFUM | first-version Cloudflare Worker API
 * Bindings: LAV_KV (KV), LAV_IMAGES (R2); secrets: ADMIN_PASSWORD,
 * TOKEN_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
 * optional TURNSTILE_SECRET.
 * vars: SITE_ORIGIN, CATALOG_URL.
 * No customer status notifications are implemented.
 */
const enc=new TextEncoder();
const sendJSON=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const err=(message,status=400)=>sendJSON({error:message},status);
const decode64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function hmac(str,secret){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',k,enc.encode(str)));}
function slowEquals(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const n=Math.max(a.length,b.length);let diff=a.length^b.length;for(let i=0;i<n;i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function makeToken(env){const payload=b64(enc.encode(JSON.stringify({exp:Date.now()+8*60*60*1000,nonce:crypto.randomUUID()})));return payload+'.'+await hmac(payload,env.TOKEN_SECRET);}
async function isAdmin(request,env){const token=(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!token||!env.TOKEN_SECRET)return false;const [p,s,...extra]=token.split('.');if(!p||!s||extra.length||!slowEquals(await hmac(p,env.TOKEN_SECRET),s))return false;try{const body=JSON.parse(new TextDecoder().decode(decode64(p)));return Number(body.exp)>Date.now()}catch{return false}}
async function notifyOwner(env,text){if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return false;try{const r=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:text.slice(0,3900),disable_web_page_preview:true})});return r.ok}catch{return false}}
async function checkTurnstile(token,request,env){if(!env.TURNSTILE_SECRET)return true;if(!token)return false;try{const b=new FormData();b.set('secret',env.TURNSTILE_SECRET);b.set('response',token);b.set('remoteip',request.headers.get('CF-Connecting-IP')||'');const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:b});const result=await r.json();return result.success===true}catch{return false}}
async function readBody(request,max=16000){const body=await request.text();if(body.length>max)throw Error('Слишком большой запрос');return JSON.parse(body)}
async function getCatalog(env){if(!env.CATALOG_URL)return [];
 const response=await fetch(env.CATALOG_URL,{headers:{Accept:'application/json'}});if(!response.ok)throw Error('Каталог временно недоступен');const json=await response.json();return Array.isArray(json)?json:[];
}
async function getOverrides(env){if(!env.LAV_KV)return[];let cursor,keys=[];
 do{const result=await env.LAV_KV.list({prefix:'product:',cursor,limit:1000});keys.push(...result.keys);cursor=result.list_complete?undefined:result.cursor;}while(cursor&&keys.length<2500);
 return (await Promise.all(keys.map(k=>env.LAV_KV.get(k.name,'json')))).filter(Boolean);
}
async function getProductMap(env){const base=await getCatalog(env);const byId=new Map(base.map(p=>[Number(p.id),p]));for(const patch of await getOverrides(env))byId.set(Number(patch.id),{...byId.get(Number(patch.id)),...patch});return byId;}
async function listRecords(env,prefix){const result=await env.LAV_KV.list({prefix,limit:500});return(await Promise.all(result.keys.map(x=>env.LAV_KV.get(x.name,'json')))).filter(Boolean).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname,method=request.method;
 const allowed=(env.SITE_ORIGIN||'').replace(/\/$/,'');const origin=request.headers.get('Origin')||'';
 if(method==='OPTIONS'){
  if(!allowed||origin!==allowed)return err('Origin not allowed',403);
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,X-File-Name','Access-Control-Max-Age':'86400','Vary':'Origin'}});
 }
 if(!allowed||!env.LAV_KV)return err('Worker не настроен: SITE_ORIGIN / LAV_KV',503);
 if(method!=='GET'&&origin&&origin!==allowed)return err('Origin not allowed',403);
 const cors=origin===allowed?{'Access-Control-Allow-Origin':allowed,'Vary':'Origin'}:{};
 const json=(data,status=200)=>sendJSON(data,status,cors);
 const error=(message,status=400)=>json({error:message},status);
 const priv=async()=>await isAdmin(request,env);
 try{
 if(path==='/api/health'&&method==='GET')return json({ok:true});
 if(path==='/api/store'&&method==='GET')return json({store:await env.LAV_KV.get('site:settings','json')||{}});
 if(path==='/api/admin/store'&&method==='PUT'){
  if(!await priv())return error('Требуется авторизация',401);
  const data=await readBody(request,12000);
  const limits={about:3000,payment:3000,delivery:3000,telegramUrl:350,maxUrl:350,whatsappUrl:350,address:500,hours:500};
  const store={};for(const [key,max] of Object.entries(limits))store[key]=String(data[key]||'').trim().slice(0,max);
  for(const key of ['telegramUrl','maxUrl','whatsappUrl'])if(store[key]&&!/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(store[key]))return error('Контактная ссылка должна начинаться с https://');
  await env.LAV_KV.put('site:settings',JSON.stringify(store));return json({ok:true,store});
 }
 if(path==='/api/products'&&method==='GET')return json({products:await getOverrides(env)});
 if(path==='/api/admin/login'&&method==='POST'){
  if(!env.ADMIN_PASSWORD||!env.TOKEN_SECRET)return error('Администратор не настроен',503);
  // Best-effort throttling in KV. Configure Cloudflare WAF rate limiting before production.
  const address=request.headers.get('CF-Connecting-IP')||'unknown';
  const id=b64(await crypto.subtle.digest('SHA-256',enc.encode(address))).slice(0,42);
  const attemptKey='admin-login-attempts:'+id;
  const tries=Number(await env.LAV_KV.get(attemptKey)||0);
  if(tries>=7)return error('Слишком много попыток входа. Попробуйте позже.',429);
  const v=await readBody(request,1000);
  if(!slowEquals(String(v.username||''),env.ADMIN_USERNAME||'owner')||!slowEquals(String(v.password||''),env.ADMIN_PASSWORD)){
   await env.LAV_KV.put(attemptKey,String(tries+1),{expirationTtl:900});
   return error('Неверный пароль',401);
  }
  await env.LAV_KV.delete(attemptKey);
  return json({token:await makeToken(env)});
 }
 if(path.match(/^\/api\/media\/image\/[\w-]+\.(?:png|webp|jpg|jpeg|avif)$/)&&method==='GET'){
  if(!env.LAV_IMAGES)return error('Хранилище изображений не настроено',503);
  const name=path.replace('/api/media/','');const obj=await env.LAV_IMAGES.get(name);if(!obj)return error('Не найдено',404);
  return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff',...cors}});
 }
 if(path==='/api/admin/upload'&&method==='POST'){
  if(!await priv())return error('Требуется авторизация',401);if(!env.LAV_IMAGES)return error('Хранилище фото не подключено',503);
  const type=(request.headers.get('Content-Type')||'').split(';')[0];const exts={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/avif':'avif'};
  if(!exts[type])return error('Разрешены только JPG, PNG, WebP, AVIF');
  const body=await request.arrayBuffer();if(body.byteLength>8*1024*1024||body.byteLength<16)return error('Допустимый размер фото: до 8 МБ');
  const key=`image/${crypto.randomUUID()}.${exts[type]}`;await env.LAV_IMAGES.put(key,body,{httpMetadata:{contentType:type}});
  return json({url:`${url.origin}/api/media/${key}`});
 }
 const pm=path.match(/^\/api\/admin\/products\/(\d+)$/);
 if(pm&&method==='PUT'){
  if(!await priv())return error('Требуется авторизация',401);
  const p=await readBody(request,30000),id=Number(pm[1]);if(id<1||id>100000||String(p.name||'').length>220||String(p.brand||'').length>160)return error('Некорректные данные');
  const clean={id,brand:String(p.brand||'').slice(0,160),name:String(p.name||'').slice(0,220),title:String(p.title||'').slice(0,350),tagline:String(p.tagline||'').slice(0,500),description:String(p.description||'').slice(0,16000),notes:{top:String(p.notes?.top||'').slice(0,3000),middle:String(p.notes?.middle||'').slice(0,3000),base:String(p.notes?.base||'').slice(0,3000),other:String(p.notes?.other||'').slice(0,3000)},available:!!p.available,hit:!!p.hit,new:!!p.new,placeholder:false,image:p.image&&String(p.image).length<500?String(p.image):null};
  for(const k of ['price3','price5','price10','priceFull'])clean[k]=p[k]==null||p[k]===''?null:(Number.isFinite(Number(p[k]))&&Number(p[k])>=0&&Number(p[k])<=10000000?Number(p[k]):null);
  await env.LAV_KV.put('product:'+id,JSON.stringify(clean));return json({ok:true});
 }
 if(path==='/api/orders'&&method==='POST'){
  const v=await readBody(request);if(!await checkTurnstile(v.turnstileToken,request,env))return error('Проверка безопасности не пройдена',403);
  const name=String(v.name||'').trim().slice(0,100),contact=String(v.contact||'').trim().slice(0,140),comment=String(v.comment||'').trim().slice(0,700);
  if(name.length<2||contact.length<3||!Array.isArray(v.items)||v.items.length===0||v.items.length>30)return error('Укажите контакт и товары');
  const map=await getProductMap(env);const items=[];let total=0;
  for(const i of v.items){const id=Number(i.id),qty=Number(i.qty),volume=String(i.volume);
   if(!Number.isInteger(qty)||qty<1||qty>20||!['3','5','10','Full'].includes(volume))return error('Ошибка в списке товаров');
   const p=map.get(id);if(!p||p.available===false||p.placeholder)return error('Один из товаров недоступен');
   const price=p[volume==='Full'?'priceFull':'price'+volume];const safePrice=price==null?null:Number(price);if(safePrice!=null)total+=safePrice*qty;
   items.push({id,brand:p.brand,name:p.name,volume,qty,price:safePrice});
  }
  const orderId=crypto.randomUUID().slice(0,8).toUpperCase();const createdAt=new Date().toISOString();
  const order={id:orderId,createdAt,status:'new',name,contact,comment,items,total};
  await env.LAV_KV.put(`order:${createdAt}:${orderId}`,JSON.stringify(order));
  const message=`НОВЫЙ ЗАКАЗ • ЛАВ ПАРФЮМ\n№ ${orderId}\n\n${items.map((i,n)=>`${n+1}. ${i.brand} ${i.name} | ${i.volume==='Full'?'полный флакон':i.volume+' мл'} × ${i.qty} | ${i.price==null?'Цена по запросу':i.price*i.qty+' ₽'}`).join('\n')}\n\nИтого (без позиций по запросу): ${total} ₽\nИмя: ${name}\nКонтакт: ${contact}\nКомментарий: ${comment||'Нет'}`;
  const delivered=await notifyOwner(env,message);
  return json({ok:true,orderId,notificationDelivered:delivered});
 }
 if(path==='/api/forms'&&method==='POST'){
  const v=await readBody(request);if(!await checkTurnstile(v.turnstileToken,request,env))return error('Проверка безопасности не пройдена',403);
  const name=String(v.name||'').trim().slice(0,100),contact=String(v.contact||'').trim().slice(0,140);
  if(name.length<2||contact.length<3)return error('Укажите имя и контакт');
  const fields=['family','mood','notes','comment'];const data={id:crypto.randomUUID().slice(0,8).toUpperCase(),createdAt:new Date().toISOString(),name,contact};
  fields.forEach(k=>data[k]=String(v[k]||'').slice(0,k==='comment'?6000:800));await env.LAV_KV.put(`quiz:${data.createdAt}:${data.id}`,JSON.stringify(data));
  await notifyOwner(env,`НОВАЯ АНКЕТА • ЛАВ ПАРФЮМ\n№ ${data.id}\nИмя: ${name}\nКонтакт: ${contact}\nПредпочтения: ${data.family}\nПовод: ${data.mood}\nНоты: ${data.notes}\nОтветы: ${data.comment}`.slice(0,3900));
  return json({ok:true});
 }
 if(path==='/api/admin/orders'&&method==='GET'){if(!await priv())return error('Требуется авторизация',401);return json({orders:await listRecords(env,'order:')});}
 if(path==='/api/admin/forms'&&method==='GET'){if(!await priv())return error('Требуется авторизация',401);return json({forms:await listRecords(env,'quiz:')});}
 if(/^\/api\/admin\/orders\/[A-F0-9]+$/.test(path)&&method==='PATCH'){
  if(!await priv())return error('Требуется авторизация',401);const id=path.split('/').at(-1);const data=await readBody(request,1000);if(!['new','confirmed','ready','completed','cancelled'].includes(data.status))return error('Неверный статус');
  const listing=await env.LAV_KV.list({prefix:'order:',limit:500});const key=listing.keys.find(k=>k.name.endsWith(':'+id));if(!key)return error('Заказ не найден',404);const obj=await env.LAV_KV.get(key.name,'json');obj.status=data.status;await env.LAV_KV.put(key.name,JSON.stringify(obj));return json({ok:true});
 }
 return error('Маршрут не найден',404);
 }catch(e){console.error(e);return error(e?.message||'Ошибка сервера',500)}
}};
