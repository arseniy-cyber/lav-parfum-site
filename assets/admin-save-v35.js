/* Lav Parfum V33 - independent, explicit admin product save handler.
   Runs before default form validation, never silently fails. */
(() => {
  'use strict';
  if (!/\/admin\.html$/i.test(location.pathname)) return;
  const API = String(window.LAV_CONFIG?.apiBase || '').replace(/\/$/, '');
  const $ = (selector, root=document) => root.querySelector(selector);
  let busy=false;
  let statusBox;
  function showStatus(message, mode='info') {
    if(!statusBox){
      statusBox=document.createElement('div');
      statusBox.id='lav-save-status-v33';
      statusBox.setAttribute('role','status');
      statusBox.setAttribute('aria-live','polite');
      statusBox.style.cssText='position:fixed;left:16px;right:16px;bottom:18px;max-width:740px;margin:auto;z-index:2147483646;box-shadow:0 12px 40px rgba(0,0,0,.26);border-radius:14px;padding:18px 50px 18px 22px;font:500 16px/1.5 Arial,sans-serif;white-space:pre-line;';
      const close=document.createElement('button');
      close.type='button';close.textContent='×';close.setAttribute('aria-label','Закрыть уведомление');
      close.style.cssText='position:absolute;right:12px;top:8px;background:none;border:0;color:inherit;font-size:30px;cursor:pointer;';
      close.addEventListener('click',()=>statusBox.remove());
      statusBox.appendChild(close);
    }
    if(!statusBox.isConnected)document.body.appendChild(statusBox);
    let output=$('.lav-v33-message',statusBox);
    if(!output){output=document.createElement('div');output.className='lav-v33-message';statusBox.insertBefore(output,statusBox.firstChild);}
    output.textContent=message;
    const palettes={info:['#fff9f0','#654822','#cca777'],success:['#f5fff5','#184e29','#67a67e'],error:['#fff1ef','#701c2a','#c54f64']};
    const c=palettes[mode]||palettes.info;
    statusBox.style.background=c[0];statusBox.style.color=c[1];statusBox.style.border='2px solid '+c[2];
  }
  const text=(fd,key)=>String(fd.get(key)??'').trim();
  const price=(fd,key)=>{
    const raw=text(fd,key).replace(',','.').replace(/\s/g,'');
    if(!raw)return null;
    const v=Number(raw);
    if(!Number.isFinite(v)||v<0||v>10000000)throw new Error('Некорректная цена в поле «'+key+'»: '+raw);
    return v;
  };
  async function doSave(form){
    if(busy)return;
    busy=true;
    const btn=$('button[type="submit"]',form);
    const original=btn?.innerHTML;
    if(btn){btn.disabled=true;btn.textContent='Отправка в Cloudflare...';}
    try{
      showStatus('Начинаю сохранение товара. Проверяю подключение...');
      const fd=new FormData(form);
      const id=Number(text(fd,'id'));
      const brand=text(fd,'brand'),name=text(fd,'name');
      if(!Number.isInteger(id)||id<1)throw Error('Не найден номер товара.');
      if(!brand||!name)throw Error('Заполни бренд и название аромата.');
      const update={
        id,brand,name,title:brand+' '+name,
        tagline:text(fd,'tagline'),description:text(fd,'description'),
        price3:price(fd,'price3'),price5:price(fd,'price5'),
        price10:price(fd,'price10'),priceFull:price(fd,'priceFull'),
        notes:{top:text(fd,'top'),middle:text(fd,'middle'),base:text(fd,'base'),other:text(fd,'other')},
        available:fd.has('available'),hit:fd.has('hit'),new:fd.has('new'),
        placeholder:false,image:fd.has('removePhoto')?null:(text(fd,'image')||null)
      };
      if(!API)throw Error('Адрес Worker не задан в настройках сайта.');
      const token=sessionStorage.getItem('lav_admin_token');
      if(!token)throw Error('Нет токена входа. Нажми «Выйти» и войди в админку заново.');
      const photo=$('#product-photo-file',form)?.files?.[0];
      if(photo&&fd.has('removePhoto'))throw Error('Выбери одно: загрузить фотографию или убрать её.');
      if(photo){
        if(!['image/jpeg','image/png','image/webp','image/avif'].includes(photo.type))throw Error('Выбери JPG, PNG, WebP или AVIF.');
        if(photo.size>8*1024*1024||photo.size<16)throw Error('Файл фотографии должен быть от 16 байт до 8 МБ.');
        showStatus('Загружаю фотографию в Cloudinary...');
        let uploaded;
        try{
          uploaded=await fetch(API+'/api/admin/upload',{
            method:'POST',mode:'cors',cache:'no-store',
            headers:{'Authorization':'Bearer '+token,'Content-Type':photo.type},body:photo
          });
        }catch(e){throw Error('Не удалось отправить фотографию: '+e.message);}
        const uploadBody=await uploaded.json().catch(()=>({}));
        if(!uploaded.ok||!uploadBody.url){
          throw Error('Фотография не загружена: HTTP '+uploaded.status+' - '+String(uploadBody.error||'неизвестная ошибка'));
        }
        update.image=uploadBody.url;
        showStatus('Фотография загружена в Cloudinary. Сохраняю товар...');
      }
      showStatus('Отправляю изменение товара №'+id+' в Cloudflare...');
      let response;
      try{
        response=await fetch(API+'/api/admin/products/'+id,{
          method:'PUT',mode:'cors',cache:'no-store',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify(update)
        });
      }catch(e){throw Error('Не удалось связаться с Worker: '+e.message+'. Проверь интернет и настройки SITE_ORIGIN.');}
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.ok!==true){
        const hint=response.status===401?' Выйди из админки и войди заново.':'';
        throw Error('Worker ответил HTTP '+response.status+': '+String(body.error||'нет подтверждения сохранения')+'.'+hint);
      }
      showStatus('Worker принял изменение. Проверяю сохранение в KV...');
      let stored=null;
      for(let i=0;i<5;i++){
        if(i)await new Promise(r=>setTimeout(r,1100*i));
        const check=await fetch(API+'/api/products?verify='+Date.now()+'-'+i,{cache:'no-store'});
        if(!check.ok)throw Error('Worker принял изменение, но проверка каталога вернула HTTP '+check.status);
        const listing=await check.json();
        stored=(Array.isArray(listing)?listing:listing.products||[]).find(p=>Number(p.id)===id)||null;
        if(stored&&['price3','price5','price10','priceFull','image'].every(key=>(stored[key]??null)===(update[key]??null)))break;
        stored=null;
      }
      if(!stored)throw Error('Worker ответил об успехе, но новые цены пока не видны в KV. Проверь, не кешируется ли API; запись товара №'+id+' должна появиться в KV Pairs.');
      const row=document.querySelector('[data-admin-edit="'+id+'"]')?.closest('tr');
      if(row){let cells=row.querySelectorAll('td');if(cells.length>=6){cells[3].textContent=stored.price3??'—';cells[4].textContent=stored.price5??'—';cells[5].textContent=stored.price10??'—';}}
      if(photo)$('#product-photo-file',form).value='';
      showStatus('СОХРАНЕНО И ПРОВЕРЕНО В CLOUDFLARE KV!\n'+(photo?'Фотография сохранена в Cloudinary.\n':'')+'Аромат №'+id+' · 3 мл: '+(stored.price3??'—')+' ₽ · 5 мл: '+(stored.price5??'—')+' ₽ · 10 мл: '+(stored.price10??'—')+' ₽\nОбнови страницу, чтобы увидеть изменения во всём каталоге.','success');
    }catch(e){
      console.error('[Lav admin V33]',e);
      showStatus('НЕ СОХРАНЕНО. '+(e?.message||String(e)),'error');
    }finally{
      if(btn&&btn.isConnected){btn.disabled=false;btn.innerHTML=original;}
      busy=false;
    }
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#admin-edit-form button[type="submit"]');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    const form=button.closest('form');if(form)doSave(form);
  },true);
  document.addEventListener('submit',event=>{
    if(event.target?.id!=='admin-edit-form')return;
    event.preventDefault();event.stopImmediatePropagation();
    doSave(event.target);
  },true);
  const cleanupToken=sessionStorage.getItem('lav_admin_token');
  if(cleanupToken&&API)fetch(API+'/api/admin/cleanup',{method:'POST',headers:{Authorization:'Bearer '+cleanupToken}}).catch(()=>{});
  console.info('[Lav Parfum] Защищённое сохранение товаров и фотографий V35 активно.');
})();