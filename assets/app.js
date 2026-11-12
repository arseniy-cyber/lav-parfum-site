(() => {
'use strict';
const ROOT=document.getElementById('app');
const assetUrl=(key)=>window.LAV_EMBEDDED_ASSETS?.[key]||key;
const CONFIG=window.LAV_CONFIG||{};
const RAW=Array.isArray(window.LAV_PRODUCTS)?window.LAV_PRODUCTS:[];
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const writeJson=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true;}catch{return false;}};
const sessionGet=k=>{try{return sessionStorage.getItem(k)}catch{return null}};
const sessionSet=(k,v)=>{try{sessionStorage.setItem(k,v)}catch{}};
const sessionRemove=k=>{try{sessionStorage.removeItem(k)}catch{}};
const DEFAULT_STORE={"about":"Здравствуйте! Рада, что вы заглянули. Я создала «Лав парфюм» как уютное место, где можно знакомиться с ароматами без спешки и выбирать то, что действительно близко.\n\nЯ люблю парфюмерию за её способность возвращать нас к дорогим моментам: любимым людям, путешествиям, тихим вечерам дома. Иногда одна нота говорит больше, чем целая история.\n\nВ моей коллекции живут и знакомые любимцы, и необычные нишевые ароматы. Я стараюсь выбирать композиции с характером, но всегда помню: самый красивый аромат - тот, в котором хорошо именно вам.\n\nМне хочется, чтобы знакомство с новым запахом было маленькой радостью. Поэтому можно начать с распива, прислушаться к композиции на своей коже и только потом решать, нужен ли большой флакон.\n\nЕсли трудно выбрать, просто напишите мне. Я с удовольствием помогу найти аромат под ваше настроение, привычки и самые любимые воспоминания.","payment":"После оформления заявки я свяжусь с вами, проверю наличие и помогу выбрать удобный способ оплаты. Онлайн-оплата на сайте пока не подключена.","delivery":"Буду рада видеть вас в Тюмени: ТРЦ «Магеллан», ул. 50 лет Октября, 14, 1 этаж, остров «Лав парфюм». Если удобнее доставка, напишите мне - вместе уточним вариант и стоимость.","telegramUrl":"https://t.me/LoveLav10","maxUrl":"","whatsappUrl":"","address":"г. Тюмень, ТРЦ «Магеллан», ул. 50 лет Октября, 14, 1 этаж, остров «Лав парфюм»","hours":"Ежедневно, 10:00–22:00"};
const state={store:{...DEFAULT_STORE},products:RAW.map(p=>({...p})),cart:readJson('lav_cart_v1',[]),overrides:readJson('lav_products_overrides_v9',{}),brand:'all',kind:'all',query:'',limit:20,selected:{},editor:null,auth:sessionGet('lav_admin_token')||'',adminQuery:'',connected:!!CONFIG.apiBase};
Object.entries(state.overrides).forEach(([id,o])=>{const idx=state.products.findIndex(p=>p.id===Number(id));if(idx>=0)state.products[idx]={...state.products[idx],...o};});
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n==null||n===''?'Цена уточняется':new Intl.NumberFormat('ru-RU').format(Number(n))+' ₽';
const activeProducts=()=>state.products.filter(p=>!p.placeholder&&p.available!==false);
const safeHref=s=>typeof s==='string'&&/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(s)?s:null;
const isUrl=(s)=>typeof s==='string'&&(/^(https?:\/\/|data:image\/|assets\/|\.\/assets\/)/i).test(s);
const tileColor=p=>['#eee3d3','#e6ddcf','#e8d9cf','#ded7cd','#e1d6c2','#eadfd7','#e4ded5','#eee0ce'][p.id%8];
const firstPrice=p=>[p.price3,p.price5,p.price10].find(x=>x!==null&&x!==''&&Number.isFinite(Number(x)));
const scentWords=p=>[p.notes?.top,p.notes?.middle,p.notes?.base,p.notes?.other].filter(Boolean).join(', ').split(/[,;·]/).map(v=>v.trim()).filter(Boolean).slice(0,3);
const visual=p=>{
 if(isUrl(p.image))return `<img loading="lazy" src="${esc(p.image)}" class="real-product-img" data-fallback="assets/products/${String(p.id).padStart(3,'0')}.webp" onerror="if(!this.dataset.fallbackTried){this.dataset.fallbackTried='1';this.src=this.dataset.fallback}else{this.hidden=true;this.parentElement.classList.add('product-photo-missing')}" alt="${esc(p.brand+' '+p.name)}">`;
 return `<div class="scent-art" aria-label="Типографическая обложка. Фото флакона пока не добавлено"><span class="scent-art-orbit"></span><span class="scent-art-letter">${esc((p.brand||'Л').charAt(0))}</span><span class="scent-art-brand">${esc(p.brand)}</span><span class="scent-art-title">${esc(p.name)}</span><span class="scent-art-notes">${esc(scentWords(p).slice(0,2).join(' · '))}</span></div>`;
};
const renderNoteList=(label,val)=>{
 const names=String(val||'').split(/[,;•·]/).map(x=>x.trim().replace(/[.]$/,'')).filter(x=>x&&!/розничная стоимость/i.test(x));
 return `<section class="note-family"><h4>${esc(label)}</h4><p class="note-words">${names.map(n=>`<span>${esc(n)}</span>`).join('')}</p></section>`;
};
const storyAside=p=>{
 const passages=String(p.description||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 const text=passages.length>2?passages[passages.length-1]:passages[0]||p.tagline||'';
 const sentences=(text.match(/[^.!?]+[.!?]+/g)||[text]).map(s=>s.trim());
 let excerpt=sentences.slice(0,2).join(' ').trim();
 if(excerpt.length>260){excerpt=excerpt.slice(0,excerpt.lastIndexOf(' ',250)>100?excerpt.lastIndexOf(' ',250):250).trim()+'…'}
 return excerpt;
};
const staticPageIDs=new Set(RAW.filter(p=>!p.placeholder&&p.available!==false).map(p=>p.id));
const productHref=p=>staticPageIDs.has(p.id)?'product/'+String(p.id).padStart(3,'0')+'.html':'product.html?id='+encodeURIComponent(p.id);
const homeEditorialCard=(p,featured=false)=>`<a href="${productHref(p)}" class="home-scent ${featured?'home-scent--featured':''} reveal" aria-label="Открыть аромат ${esc(p.title)}"><div class="home-scent-picture" style="--paper:${tileColor(p)}">${isUrl(p.image)?`<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" class="home-real-photo" data-fallback="assets/products/${String(p.id).padStart(3,'0')}.webp" onerror="if(!this.dataset.fallbackTried){this.dataset.fallbackTried='1';this.src=this.dataset.fallback}else{this.hidden=true;this.parentElement.classList.add('product-photo-missing')}">`:`<div class="home-paper-art" aria-label="Фото аромата появится после загрузки владельцем"><span class="home-paper-monogram">${esc((p.brand||'Л').charAt(0))}</span><span class="home-paper-brand">${esc(p.brand)}</span><span class="home-paper-title">${esc(p.name)}</span><span class="home-paper-accord">${esc((p.tagline||'').split('·').slice(0,2).join(' · ')||scentWords(p).slice(0,2).join(' · '))}</span></div>`}<span class="home-scent-hover">Узнать аромат <b>→</b></span></div><div class="home-scent-info"><div><span>${esc(p.brand)}</span><h3>${esc(p.name)}</h3></div><b>${firstPrice(p)!=null?'от '+money(firstPrice(p)):'Цена уточняется'}</b></div></a>`;
const card=p=>`<a href="${productHref(p)}" class="product-card reveal" data-product="${p.id}" aria-label="Открыть аромат ${esc(p.title)}"><div class="product-visual" style="--tile:${tileColor(p)}">${visual(p)}${p.hit||p.new?`<span class="product-badges">${p.new?'Новинка':'Хит коллекции'}</span>`:''}<span class="product-open">Открыть аромат <span aria-hidden="true">→</span></span></div><div class="product-meta"><div class="brand">${esc(p.brand)}</div><h3>${esc(p.name)}</h3><span class="price">${firstPrice(p)!=null?'от '+money(firstPrice(p)):'Цена уточняется'}</span></div></a>`;
const head=(ey,title,text='')=>`<div class="page-top"><span class="eyebrow">${ey}</span><h1>${title}</h1>${text?`<p>${text}</p>`:''}</div>`;
const allLink=(label,url='catalog.html',cls='')=>`<a href="${url}" class="pill ${cls}">${label}<span class="arrow">→</span></a>`;
const getPage=()=>{
 const path=decodeURIComponent(location.pathname);
 const match=path.match(/\/product\/(\d+)\.html$/);
 if(match)return '/product/'+Number(match[1]);
 const file=path.split('/').pop().replace(/\.html$/,'');
 if(file==='product')return '/product/'+(Number(new URLSearchParams(location.search).get('id'))||0);
 return ({'':'/','index':'/','catalog':'/catalog','selection':'/selection','about':'/about','quiz':'/quiz','info':'/info','contacts':'/contacts','privacy':'/privacy','admin':'/admin'})[file]||'/404';
};
const CATALOG_VIEW_KEY='lav_catalog_view_v10';
const captureCatalogView=()=>{
 if(getPage()!=='/catalog')return;
 sessionSet(CATALOG_VIEW_KEY,JSON.stringify({y:Math.max(0,scrollY),kind:state.kind,brand:state.brand,query:state.query,limit:state.limit,t:Date.now()}));
};
const recoverCatalogView=()=>{
 const navigation=performance.getEntriesByType('navigation')[0];
 const back=navigation?.type==='back_forward';
 const restore=new URLSearchParams(location.search).has('restore')||back;
 if(!restore)return null;
 try {const v=JSON.parse(sessionGet(CATALOG_VIEW_KEY)||'null');return v&&Date.now()-v.t<3600000?v:null;}catch{return null;}
};
const navigateToCatalog=()=>{captureCatalogView();window.location.href='catalog.html';};
const fetchOverrides=async()=>{
 if(!CONFIG.apiBase)return;
 try{const r=await fetch(CONFIG.apiBase.replace(/\/$/,'')+'/api/products');if(!r.ok)return;const data=await r.json();const arr=Array.isArray(data)?data:data.products;
 if(Array.isArray(arr))for(const o of arr){const i=state.products.findIndex(p=>p.id===Number(o.id));if(i>=0)state.products[i]={...state.products[i],...o};else if(Number.isInteger(Number(o.id))&&Number(o.id)>0&&o.brand&&o.name)state.products.push({...o});}
 if(getPage().startsWith('/catalog')||getPage().startsWith('/product/')||getPage()==='/admin')render(false);
 }catch(e){console.warn('Каталог работает в автономном режиме',e.message)}
};
const fetchStore=async()=>{
 if(!CONFIG.apiBase)return;
 try{const r=await fetch(CONFIG.apiBase.replace(/\/$/,'')+'/api/store');if(!r.ok)return;
 const d=await r.json();if(d.store&&typeof d.store==='object'){state.store={...state.store,...d.store};
 const route=getPage().split('?')[0];if(['/about','/contacts','/info'].includes(route))render(false);}}
 catch(e){console.warn('Настройки магазина пока недоступны',e.message)}
};
const home=()=>{
 const active=activeProducts(),hasLocal=p=>typeof p.image==='string'&&(p.image.startsWith('assets/products/')||p.image.startsWith('data:image/')),
       hits=active.filter(p=>p.hit&&hasLocal(p)),
       newer=active.filter(p=>p.new&&hasLocal(p)),
       local=active.filter(hasLocal);
 const pick=(a,n,seen=[])=>[...a,...local.filter(x=>!a.some(b=>b.id===x.id)&&!seen.some(b=>b.id===x.id))].slice(0,n);
 const picks=pick(hits,4),recent=pick(newer.filter(p=>!picks.some(x=>x.id===p.id)),3,picks);
 return `<section class="v7-hero" aria-label="Лав парфюм — знакомство с магазином">
   <div class="v7-hero-inner reveal"><span class="hero-kicker">ВАШЕ ТИХОЕ МЕСТО В МИРЕ АРОМАТОВ</span><h1>Аромат,<br>который <em>про вас.</em></h1><div class="v18-hero-note"><span class="v18-hero-note-title">Здесь можно не спешить.</span><p>Выбирайте сердцем, прислушивайтесь к себе. А если захочется совета - я с удовольствием помогу найти именно ваш аромат.</p></div><a class="v7-light-link" href="catalog.html">Открыть коллекцию <span>→</span></a></div>
 </section>
 <section class="v3-intro section-pad"><p class="intro-whisper">Мне кажется, у каждого настроения есть свой аромат.</p><h2 class="reveal">Важны не слова.<br><em>Важно ощущение.</em></h2><div class="intro-aside">Устройтесь поудобнее, оглянитесь и выбирайте в своём ритме. Здесь всё создано для спокойного, красивого знакомства с ароматами.</div></section>
 <section class="v3-curation section-pad"><div class="v3-curation-heading reveal"><div><span class="eyebrow">ИЗБРАННОЕ ИЗ КОЛЛЕКЦИИ</span><h2>Ароматы, которые<br><em>остаются в памяти.</em></h2></div><a class="elegant-link" href="catalog.html">Вся коллекция <span>→</span></a></div><div class="v3-curation-grid">${picks.map((p,i)=>homeEditorialCard(p,i===0)).join('')}</div></section>
 <section class="v7-feature" aria-label="Искусство чувствовать"><div class="v7-feature-photo" role="img" aria-label="Бургундский натюрморт с цветами и мрамором"></div><div class="v7-feature-text"><span class="eyebrow">ВЫБОР С ХАРАКТЕРОМ</span><h2>Искусство<br><em>чувствовать.</em></h2><p>Мне нравится, когда выбор аромата проходит спокойно и приятно - как маленький ритуал, в котором есть и красота, и настроение, и что-то очень личное.</p><a class="elegant-link" href="selection.html">Искусство выбора <span>→</span></a></div></section>
 <section class="v4-scent-pause section-pad v6-warm-pause"><div class="v4-pause-eyebrow">ОТ ПЕРВОЙ НОТЫ ДО ШЛЕЙФА</div><div class="v4-pause-main"><h2>Не просто аромат.<br><em>Ваше настроение.</em></h2><p>Я люблю наблюдать, как аромат раскрывается на коже: сначала лёгкая встреча, потом близкое знакомство и, наконец, тот самый шлейф. Здесь я собрала описания и заявленные ноты, чтобы выбирать было легче, спокойнее и уютнее.</p></div></section>
 <section class="v7-accent" aria-label="Тот самый акцент"><div class="v7-accent-text"><span class="eyebrow">АРОМАТ В ДЕТАЛЯХ</span><h2>Тот самый<br><em>акцент.</em></h2><p>Иногда одной ноты достаточно, чтобы вспомнить дорогой момент. Я верю, что свой аромат можно узнать именно по этому чувству.</p><a class="elegant-link" href="catalog.html">Найти свой аромат <span>→</span></a></div><div class="v7-accent-photo" role="img" aria-label="Бордовые пионы, ягоды и натуральный камень"></div></section>
 <section class="v16-editorial" aria-label="Заметки о любимых ароматах"><div class="v16-editorial-photo" role="img" aria-label="Коллекция ароматов в мягком вечернем свете"></div><div class="v16-editorial-story"><span class="eyebrow">НЕБОЛЬШАЯ ЗАМЕТКА</span><span class="v16-ed-number">01 / ЛАВ ПАРФЮМ</span><h2>У красоты есть<br><em>своё настроение.</em></h2><p>Мне нравится, когда аромат выбирают спокойно и по ощущению. Иногда достаточно одной ноты, чтобы вспомнить любимый вечер, место или человека.</p><a class="elegant-link" href="about.html">Немного обо мне <span>→</span></a></div></section>

 <section class="v19-journal" aria-label="Парфюмерные заметки">
   <div class="v19-journal-heading"><span class="eyebrow">ЖУРНАЛ АРОМАТОВ · ЗАМЕТКА 02</span><h2>У каждого аромата<br><em>своя история.</em></h2><p>Мне нравится искать красоту в деталях: в первой ноте, в воспоминаниях, в том самом настроении, которое остаётся с нами надолго.</p></div>
   <figure class="v19-journal-photo v19-journal-photo--main"><img src="assets/backgrounds/editorial-04.webp" alt="Парфюмерная коллекция в тёплом свете" loading="lazy"><figcaption>Коллекция впечатлений / 02</figcaption></figure>
   <figure class="v19-journal-photo v19-journal-photo--detail"><img src="assets/backgrounds/editorial-07.webp" alt="Флаконы и мягкий вечерний свет" loading="lazy"><figcaption>Детали, которые хочется запомнить</figcaption></figure>
   <div class="v19-journal-link"><span>ВЫБОР С ВНИМАНИЕМ</span><a class="elegant-link" href="selection.html">Искусство выбора <span aria-hidden="true">→</span></a></div>
 </section>
 <section class="v3-new section-pad"><div class="v3-new-head"><div class="reveal"><span class="eyebrow">АРОМАТЫ КОЛЛЕКЦИИ</span><h2>Тонкие <em>впечатления.</em></h2></div><p>Я приглашаю вас знакомиться с ними без спешки - спокойно, бережно и в своём ритме.</p></div><div class="v3-new-grid v7-new-grid">${recent.map(p=>homeEditorialCard(p)).join('')}</div></section>
 <section class="v6-last"><div><span class="eyebrow">МИР ЛАВ ПАРФЮМ</span><h2>Красота, которую<br><em>можно почувствовать.</em></h2><p>Здесь я делюсь тем, что люблю: ароматами, впечатлениями и маленькими открытиями.</p><a class="elegant-link" href="about.html">О моей истории <span>→</span></a></div></section>`;
};
const catalog=()=>`${head('КОЛЛЕКЦИЯ АРОМАТОВ','Выберите <em>своё.</em>','Я собрала здесь любимые и необычные ароматы. Выбирайте спокойно, в своём ритме.')}
 <section class="section-pad catalog-page" style="padding-top:0"><div class="catalog-toolbar"><div class="filter-group"><button class="filter-chip ${state.kind==='all'?'active':''}" data-kind="all">Все ароматы</button><button class="filter-chip ${state.kind==='hit'?'active':''}" data-kind="hit">Хиты</button><button class="filter-chip ${state.kind==='new'?'active':''}" data-kind="new">Новинки</button></div><select class="brand-select" id="brand-filter" aria-label="Фильтр по бренду"><option value="all">Все бренды</option>${[...new Set(activeProducts().map(p=>p.brand))].sort((a,b)=>a.localeCompare(b,'ru')).map(b=>`<option value="${esc(b)}" ${state.brand===b?'selected':''}>${esc(b)}</option>`).join('')}</select><label class="searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="catalog-search" type="search" placeholder="Найти аромат..." value="${esc(state.query)}" aria-label="Поиск аромата"></label></div><div class="catalog-meta"><span id="catalog-count">Загрузка коллекции</span></div><div id="catalog-grid" class="product-grid catalog-grid"></div><div id="load-more-wrap" class="load-more-wrap"></div></section>`;
const pById=id=>state.products.find(p=>p.id===Number(id));
const productPage=id=>{
 const p=pById(id);if(!p||p.placeholder||p.available===false)return notFound();
 const selected=state.selected[p.id]||3;
 const vPrice=p[selected==='Full'?'priceFull':'price'+selected];
 const parts=(p.description||'').split(/\n\s*\n/).map(v=>v.trim()).filter(Boolean);
 const notes=p.notes||{};
 const noteBlocks=[['Верхние ноты',notes.top],['Сердце аромата',notes.middle],['Базовые ноты',notes.base],['Ноты и аккорды',notes.other]].filter(([,val])=>!!val);
 const notesHtml=noteBlocks.map(([label,val])=>renderNoteList(label,val)).join('')||`<p class="body-copy">Описание нот уточняется.</p>`;
 const noteCredit=p.noteSource&&safeHref(p.noteSource)?`<div class="v11-note-source"><a href="${esc(p.noteSource)}" target="_blank" rel="noopener noreferrer">Состав нот по данным производителя</a></div>`:'';
 const noteCaution=(p.id===105||p.id===117||p.id===119||p.id===120||p.id===123)?`<p class="v11-note-caution">Производитель не раскрывает расширенную классическую пирамиду: приведены только подтверждённые ноты.</p>`:'';
 const descriptor=esc((p.tagline||scentWords(p).join(' · ')).slice(0,140));
 const firstText=parts[0]||'Знакомство с парфюмерной композицией.';
 const rest=parts.slice(1);
 const detailImage=isUrl(p.image)?`<img src="${esc(p.image)}" alt="${esc(p.title)}" class="real-product-img" data-fallback="assets/products/${String(p.id).padStart(3,'0')}.webp" onerror="if(!this.dataset.fallbackTried){this.dataset.fallbackTried='1';this.src=this.dataset.fallback}else{this.hidden=true;this.parentElement.classList.add('product-photo-missing')}">`:`<div class="detail-art-letter">${esc((p.brand||'L').charAt(0))}</div><div class="detail-art-sign"><span>${esc(p.brand)}</span><strong>${esc(p.name)}</strong></div><span class="detail-art-small">${esc(scentWords(p).slice(0,3).join(' / '))}</span>`;
 const related=activeProducts().filter(x=>x.id!==p.id).slice((p.id*3)%Math.max(1,activeProducts().length-3),(p.id*3)%Math.max(1,activeProducts().length-3)+3);
 return `<section class="product-page"><nav class="breadcrumb" aria-label="Навигация"><a href="catalog.html?restore=1" class="product-back" aria-label="Вернуться в каталог на прежнее место"><span aria-hidden="true">←</span> Коллекция</a><span> / </span><span>${esc(p.brand)}</span></nav><div class="product-layout"><div class="detail-gallery" style="--tile:${tileColor(p)}">${detailImage}</div><div class="detail-content"><span class="product-brand-name">${esc(p.brand)}</span><h1>${esc(p.name)}</h1>${descriptor?`<p class="note-caps">${descriptor}</p>`:''}<p class="product-excerpt">${esc(firstText)}</p><div class="purchase-panel"><span class="small-caps">ОБЪЁМ АРОМАТА</span><div class="volume-options">${[3,5,10,'Full'].map(v=>`<button class="volume-option ${selected===v?'selected':''}" data-volume="${v}" data-volume-id="${p.id}">${v==='Full'?'Полный флакон':v+' мл'}</button>`).join('')}</div><div class="buy-line"><div class="detail-price" id="detail-price">${money(vPrice)}</div><button class="purchase-action" id="add-cart" data-add="${p.id}" data-add-volume="${selected}">В корзину <span aria-hidden="true">→</span></button></div><p class="detail-disclaimer">Полный флакон можно заказать по запросу. Оплату и доставку я помогу согласовать после заявки.</p></div></div></div>
 <div class="detail-story-v2"><div class="story-lead"><span class="eyebrow">ОБ АРОМАТЕ</span><h2>У каждого<br><em>своё звучание.</em></h2><div class="story-quote"><span class="story-quote-glyph" aria-hidden="true">“</span><p>${esc(storyAside(p))}</p><span class="story-quote-end">${esc(p.brand)} · ${esc(p.name)}</span></div></div><div class="story-words">${parts.map((para,i)=>`<p class="${i===0?'story-first':''}">${esc(para)}</p>`).join('')}<div class="notes-heading"><span class="eyebrow">КОМПОЗИЦИЯ</span><h3>Ноты <em>аромата</em></h3></div><div class="note-pyramid">${notesHtml}</div>${noteCredit}${noteCaution}</div></div></section>
 <section class="related-section section-pad"><div class="section-header"><h2>Продолжить <em>знакомство.</em></h2></div><div class="product-grid">${related.map(card).join('')}</div></section>`;
};
const about=()=>`${head('МИР «ЛАВ ПАРФЮМ»','С любовью<br><em>к деталям.</em>','Мне хочется делиться ароматами, в которых вы узнаете себя.').replace('class="page-top"','class="page-top page-top--about"')}
 <section class="page-split about-page-layout"><div class="page-split-image"><img src="assets/portrait-black-original.jpg" alt="Атмосфера магазина"></div><div class="page-split-text"><span class="eyebrow">МОЯ ИСТОРИЯ</span><h2>Искусство<br><em>чувствовать.</em></h2><p class="body-copy">${esc(state.store.about||'«Лав парфюм» - пространство личных открытий.').replace(/\n\n/g,'</p><p class="body-copy">')}</p><p class="body-copy">Если вам хочется познакомиться с ароматами лично, буду рада встрече в Тюмени, в ТРЦ «Магеллан».</p></div></section>
 <section class="editorial-quote"><p>Есть ароматы, которые хочется выбрать.<br>А есть те, в которых <em>узнаёшь себя.</em></p></section>
 <section class="page-split about-page-layout flip"><div class="page-split-text"><span class="eyebrow">НАСТРОЕНИЕ</span><h2>Ваш личный<br><em>ритуал.</em></h2><p class="body-copy">Для меня выбор аромата - маленький ритуал. Порой всё начинается с одной ноты: прохладного бергамота, нежного ириса или тёплого сандала. А продолжается ощущением, которое хочется сохранить.</p><a href="catalog.html" class="quiet-link">Изучить коллекцию <span>→</span></a></div><div class="page-split-image"><img src="assets/portrait-ritual-user.jpg" alt="Любовь с флаконом парфюма"></div></section>`;
const selection=()=>`${head('ИСКУССТВО ВЫБОРА','Прислушайтесь<br><em>к себе.</em>','Я помогу прислушаться к себе и выбрать аромат по настроению.')}
 <section class="page-split selection-layout"><div class="page-split-image"><img src="assets/portrait-lav-original.jpg" alt="Аромат как часть вашего образа"></div><div class="page-split-text"><span class="eyebrow">ПЕРВОЕ ВПЕЧАТЛЕНИЕ</span><h2>Начните<br><em>с ощущения.</em></h2><p class="body-copy">Согревающий древесный аккорд, прохладная свежесть, бархатные цветы или прозрачный мускус - у каждой композиции свой характер.</p><p class="body-copy">Мне хочется, чтобы вы выбирали то, что по-настоящему близко вам, а не то, что сегодня модно.</p><a href="quiz.html" class="quiet-link">Персональный подбор <span>→</span></a></div></section>
 <section class="section-pad language-section"><div class="section-header"><h2>Как звучит <em>аромат.</em></h2><p>Три этапа одной композиции, раскрывающиеся постепенно.</p></div><div class="language-columns"><div><h3>Верхние ноты</h3><p>Первые секунды знакомства, свежесть и начальное впечатление.</p></div><div><h3>Сердце</h3><p>Главный характер композиции, который раскрывается чуть позже.</p></div><div><h3>База</h3><p>Тёплый шлейф и глубина, остающиеся на коже.</p></div></div></section>`;
const quiz=()=>`${head('ПОДБОР АРОМАТА','Ваш <em>парфюмерный гардероб.</em>','Расскажите мне о себе и любимых ароматах, а я постараюсь подобрать именно ваше звучание.')}
 <div class="form-shell"><div class="form-panel quiz-panel"><div class="form-intro"><span class="eyebrow">ПОДБОР С ЛЮБОВЬЮ</span><h2>Помогу найти<br><em>то самое.</em></h2><p>Мне важно почувствовать ваш вкус, настроение и привычки. Поэтому я подготовила небольшую анкету: отвечайте свободно, своими словами. Так мне будет проще подобрать аромат, который станет по-настоящему вашим.</p><p>Заполнение займёт 5–7 минут.</p><div class="v7-quiz-art" role="img" aria-label="Бургундские ткани, белые лилии и кристаллы"><span>В каждом ощущении<br><em>есть своя история.</em></span></div><p class="v7-quiz-caption">Ваш вкус. Ваш характер. Ваш аромат.</p></div>
 <form id="quiz-form" class="lav-form v6-quiz-form"><h3 class="v6-form-section-title">Ваши контакты</h3><div class="form-grid"><div class="form-field"><label for="q-name">Ваше имя *</label><input id="q-name" name="name" required maxlength="120" placeholder="Как к вам обращаться"></div><div class="form-field"><label for="q-contact">Instagram или телефон для связи *</label><input id="q-contact" name="contact" required maxlength="130" placeholder="@ник или номер телефона"></div></div><div class="form-field"><label for="q-email">E-mail (необязательно)</label><input id="q-email" name="email" type="email" placeholder="Чтобы получить подбор на почту"></div>
 <h3 class="v6-form-section-title">Ваш образ жизни</h3><p class="v6-form-help">Куда и как часто вы будете носить аромат?</p>
 <div class="form-field"><label>Чем вы занимаетесь?</label><textarea name="occupation" placeholder="Бизнес, офис, работа из дома, творчество, встречи с людьми..."></textarea></div>
 <div class="form-field"><label>Как проходит ваш обычный день?</label><textarea name="day" placeholder="Расскажите в 2–3 предложениях"></textarea></div>
 <div class="form-field"><label>Какой стиль одежды вам ближе?</label><select name="style"><option value="">Выберите вариант</option>${['Классика','Casual / комфорт','Спорт-шик','Вечерний / драматический','Минимализм','Романтический','Другое'].map(v=>`<option>${v}</option>`).join('')}</select></div>
 <fieldset class="quiz-fieldset"><legend>Бывают ли ситуации, где аромат должен быть сдержанным?</legend><div class="form-choice quiz-choices"><label class="radio-chip"><input name="restrained" type="radio" value="Да"><span>Да</span></label><label class="radio-chip"><input name="restrained" type="radio" value="Нет"><span>Нет</span></label></div></fieldset>
 <h3 class="v6-form-section-title">Ваш вкус</h3><p class="v6-form-help">Ваши любимые и нежелательные ароматы.</p>
 <div class="form-field"><label>Назовите 2–3 аромата, которые вам нравятся, и расскажите почему</label><textarea name="favorites" placeholder="Любимые названия, ощущения, шлейф..."></textarea></div>
 <div class="form-field"><label>Какие запахи категорически не нравятся?</label><textarea name="dislikes" placeholder="Например, табак, слишком сладкие композиции или ладан"></textarea></div>
 <fieldset class="quiz-fieldset"><legend>Какой шлейф вы предпочитаете?</legend><div class="form-choice quiz-choices">${['Тихий — близко к коже','Умеренный — чувствуют рядом','Яркий — заметный и долгий'].map(v=>`<label class="radio-chip"><input type="radio" name="trail" value="${v}"><span>${v}</span></label>`).join('')}</div></fieldset>
 <h3 class="v6-form-section-title">Ваши ожидания</h3><p class="v6-form-help">Какие эмоции должен передавать аромат?</p>
 <fieldset class="quiz-fieldset"><legend>Какое впечатление вы хотите производить?</legend><div class="form-choice quiz-choices">${['Авторитет, статус, профессионализм','Женственность, притягательность, сексуальность','Энергия, бодрость, динамика','Уют, спокойствие, кокон для себя'].map(v=>`<label class="radio-chip"><input type="checkbox" name="goals" value="${v}"><span>${v}</span></label>`).join('')}</div></fieldset>
 <div class="form-field"><label>Какого внутреннего состояния вам сейчас не хватает?</label><textarea name="state" placeholder="Уверенности, свободы, спокойствия, энергии..."></textarea></div>
 <div class="form-field"><label>Продолжите фразу: «Для меня идеальный парфюм — это запах…»</label><textarea name="ideal" placeholder="Ваши ассоциации и ожидания"></textarea></div>
 <div class="form-field"><label>Дополнительные пожелания</label><textarea name="comment" placeholder="Если хотите добавить что-то ещё"></textarea></div>
 <p class="v6-form-help">Фотографии ваших любимых флаконов и повседневного образа при желании можно отдельно отправить в <a href="https://t.me/LoveLav10" target="_blank" rel="noopener noreferrer">Telegram магазина</a>.</p>
 <label class="v7-consent"><input type="checkbox" name="consent" required><span>Согласен(на) на обработку данных для ответа на анкету. <a href="privacy.html" target="_blank">Политика обработки персональных данных</a></span></label>${turnstileBox()}<button type="submit" class="purchase-action">Отправить анкету <span>→</span></button><p class="form-feedback" id="quiz-feedback" role="status"></p></form></div></div>`;
const info=()=>`${head('ПОКУПАТЕЛЯМ','Оплата <em>и доставка.</em>','Я помогу уточнить оплату и выбрать удобный способ получения.')}
 <section class="content-page"><div class="content-wrap"><div class="content-columns info-columns"><article class="info-card"><span class="eyebrow">ОПЛАТА</span><h2>Удобно<br><em>для вас.</em></h2><p>${esc(state.store.payment||'После оформления заявки я свяжусь с вами, проверю наличие и уточню удобный способ оплаты.')}</p><p>Онлайн-оплата на сайте пока не подключена. Пожалуйста, дождитесь моего подтверждения заказа перед оплатой.</p></article><article class="info-card"><span class="eyebrow">ДОСТАВКА И САМОВЫВОЗ</span><h2>Бережно<br><em>к каждому заказу.</em></h2><p>${esc(state.store.delivery||'Я помогу подобрать способ получения и уточню стоимость доставки при подтверждении заказа.')}</p><p>Буду рада видеть вас в ТРЦ «Магеллан» (Тюмень), 1 этаж, ежедневно с 10:00 до 22:00.</p></article></div><section class="lav-return-note lav-return-note--v14" aria-labelledby="lav-return-note-title"><span class="eyebrow">УСЛОВИЯ ПОКУПКИ</span><h2 id="lav-return-note-title">Обмена и возврата нет</h2><div class="lav-return-note-copy"><p>Обмен и возврат на распив не предусмотрен - пожалуйста, отнеситесь к выбору внимательно.</p><p>Мы всегда поможем подобрать аромат онлайн, прежде чем вы примете решение.</p></div></section><p class="v7-legal-disclosure">Продавец: ИП Лящева Любовь Семёновна · ИНН 720415999600 · ОГРНИП 325723200108031</p></div></section>`;
const contacts=()=>`${head('КОНТАКТЫ','Я <em>рядом.</em>','Напишите мне, и я с радостью помогу выбрать аромат, подскажу по нотам и бережно оформлю заказ.').replace('class="page-top"','class="page-top page-top--contacts"')}
 <section class="page-split contacts-layout"><div class="page-split-text"><span class="eyebrow">СВЯЗАТЬСЯ С МАГАЗИНОМ</span><h2>Начнём<br><em>с разговора.</em></h2><p class="body-copy">Напишите мне в удобном мессенджере или загляните в магазин - я буду рада знакомству.</p><div class="contact-links">${[['Telegram',state.store.telegramUrl],['Instagram','https://www.instagram.com/lav_i_parfums/'],['Max',state.store.maxUrl],['WhatsApp',state.store.whatsappUrl]].map(([name,url])=>safeHref(url)?`<a class="contact-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="contact-link__icon" aria-hidden="true">${name==='Telegram'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 3-19 8 7.6 2.4L21 3Z"/><path d="m21 3-3.7 18-7.7-7.6L21 3ZM9.6 13.4l-.2 5.2 3-2.6"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'}</span><span>${name}</span><span class="contact-link__arrow" aria-hidden="true">→</span></a>`:'').join('')||'<span class="contact-link">Контакты будут добавлены владельцем</span>'}</div><p class="body-copy"><a href="tel:+79123925973">+7 (912) 392-59-73</a></p>${state.store.address?`<p class="body-copy">Адрес: ${esc(state.store.address)}</p>`:''}${state.store.hours?`<p class="body-copy">Часы работы: ${esc(state.store.hours)}</p>`:''}<p class="v7-seller-line">ИП Лящева Любовь Семёновна<br>ИНН 720415999600 · ОГРНИП 325723200108031</p></div><div class="page-split-image contacts-artwork" role="img" aria-label="Фотография оригинального флакона AZIRI Vangilia в руке"></div></section>`;
const privacy=()=>`${head('ИНФОРМАЦИЯ','Обработка <em>персональных данных.</em>','Информация о данных, которые вы передаёте при оформлении заказа и анкеты.')}
 <section class="content-page v7-policy"><div class="content-wrap">
 <h2>Кто обрабатывает данные</h2><p>Индивидуальный предприниматель Лящева Любовь Семёновна, ИНН 720415999600, ОГРНИП 325723200108031. Для обращений: <a href="tel:+79123925973">+7 (912) 392-59-73</a>, <a href="https://t.me/LoveLav10" target="_blank" rel="noopener noreferrer">Telegram магазина</a>.</p>
 <h2>Какие данные и для чего</h2><p>Имя, телефон или ник в мессенджере, e-mail при предоставлении, содержимое заявки или анкеты и сведения о выбранных товарах используются для ответа на запрос, подбора аромата и согласования заказа. В публичный доступ эти данные не передаются.</p>
 <h2>Хранение и передача</h2><p>В автономном предпросмотре корзина и тестовые заявки могут сохраняться в браузере устройства. В рабочей версии данные могут передаваться через сервер магазина и Telegram владельцу для исполнения обращения. Хранение ограничивается целями обработки и применимыми требованиями законодательства.</p>
 <h2>Ваш выбор</h2><p>Вы можете обратиться к продавцу по указанному телефону или в Telegram, чтобы уточнить, исправить или запросить удаление переданных данных в предусмотренных законом случаях. Не вводите паспортные и банковские данные в поле комментария.</p>
 <p class="v7-policy-note">Текст подготовлен для текущего функционала сайта; перед запуском владелец должен утвердить окончательную политику и проверить применимые требования к обработке данных.</p>
 </div></section>`;
const notFound=()=>`${head('ЛАВ ПАРФЮМ','Такой страницы<br><em>пока нет.</em>','Вернёмся к ароматам?')}<div style="padding:0 var(--edge) 90px">${allLink('В каталог')}</div>`;
const filtered=()=>{
 const q=state.query.trim().toLocaleLowerCase('ru');
 const collator=new Intl.Collator('ru',{sensitivity:'base',numeric:true});
 return activeProducts().filter(p=>(state.brand==='all'||p.brand===state.brand)&&(state.kind==='all'||(state.kind==='hit'?p.hit:p.new))&&(!q||[p.name,p.brand,p.title,p.tagline].join(' ').toLocaleLowerCase('ru').includes(q))).sort((a,b)=>collator.compare(a.brand||'',b.brand||'')||collator.compare(a.name||'',b.name||'')||a.id-b.id);
};
const updateCatalog=()=>{
 const target=$('#catalog-grid');if(!target)return;
 const arr=filtered();target.innerHTML=arr.length?arr.slice(0,state.limit).map(card).join(''):`<div class="empty-state"><h3>Аромат не найден</h3><p class="body-copy">Попробуйте другой запрос или сбросьте фильтры.</p><button class="pill" id="reset-filters">Показать всю коллекцию <span class="arrow">→</span></button></div>`;
 $('#catalog-count').textContent=`Найдено ароматов: ${arr.length}`;
 $('#load-more-wrap').innerHTML=arr.length>state.limit?`<button class="pill" id="load-more">Показать ещё <span class="arrow">↓</span></button>`:'';
 $$('.filter-chip').forEach(x=>x.classList.toggle('active',x.dataset.kind===state.kind));
 observeReveals();
};
const observeReveals=()=>{
 if(!('IntersectionObserver' in window)){$$('.reveal:not(.visible)').forEach(x=>x.classList.add('visible'));return;}
 const obs=new IntersectionObserver((entries,observer)=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.07,rootMargin:'0px 0px -20px 0px'});
 $$('.reveal:not(.visible)').forEach(el=>obs.observe(el));
};
const render=(scroll=true)=>{
 const route=getPage().split('?')[0];
 document.body.classList.toggle("lav-quiz-page",route==="/quiz");
 document.title='Лав парфюм — люби аромат, выбери свой';
 if(route==='/'){ROOT.innerHTML=home();}
 else if(route==='/catalog'){
  const qs=new URLSearchParams(location.search);if(qs.has('kind'))state.kind=qs.get('kind')||'all';
  ROOT.innerHTML=catalog();updateCatalog();document.title='Коллекция ароматов — Лав парфюм';
 }else if(route.startsWith('/product/')){
  const id=Number(route.split('/')[2]);ROOT.innerHTML=productPage(id);const p=pById(id);if(p)document.title=`${p.brand} ${p.name} — Лав парфюм`;
 }else if(route==='/about'){ROOT.innerHTML=about();document.title='Мир Лав парфюм';}
 else if(route==='/selection'){ROOT.innerHTML=selection();document.title='Искусство выбора — Лав парфюм';}
 else if(route==='/quiz'){ROOT.innerHTML=quiz();document.title='Подбор аромата — Лав парфюм';}
 else if(route==='/info'){ROOT.innerHTML=info();document.title='Оплата и доставка — Лав парфюм';}
 else if(route==='/contacts'){ROOT.innerHTML=contacts();document.title='Контакты — Лав парфюм';}
 else if(route==='/privacy'){ROOT.innerHTML=privacy();document.title='Политика обработки персональных данных — Лав парфюм';}
 else if(route==='/admin'){ROOT.innerHTML=adminPage();document.title='Управление — Лав парфюм';}
 else ROOT.innerHTML=notFound();
 closeMenu();if(scroll&&!(route==='/catalog'&&recoverCatalogView())){window.scrollTo({top:0,behavior:'instant'});}
 observeReveals();initTurnstile();
};
let catalogRestoredThisVisit=false;
function restoreCatalogScroll(){
 if(catalogRestoredThisVisit||getPage()!=='/catalog')return;
 const previous=recoverCatalogView();if(!previous)return;
 catalogRestoredThisVisit=true;
 // Restore filters and cards before restoring scroll, never move the visitor again.
 state.kind=previous.kind;state.brand=previous.brand;state.query=previous.query;state.limit=previous.limit;
 const search=$('#catalog-search');if(search)search.value=previous.query;
 const brand=$('#brand-filter');if(brand)brand.value=previous.brand;
 updateCatalog();
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  window.scrollTo({top:Math.max(0,Math.min(previous.y,max)),behavior:'instant'});
  // The restore flag belongs only to this navigation, not to subsequent visits.
  const url=new URL(location.href);
  if(url.searchParams.has('restore')){
   url.searchParams.delete('restore');
   history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
 }));
}
window.addEventListener('pagehide',captureCatalogView);
window.addEventListener('auxclick',e=>{if(e.button===1&&getPage()==='/catalog'&&e.target.closest('a[data-product]'))captureCatalogView();},true);
window.addEventListener('click',e=>{if(getPage()==='/catalog'&&e.target.closest('a[data-product]'))captureCatalogView();},true);
// Mouse-wheel inertia without scroll snapping or fighting a dragged scrollbar.
// Touch, trackpad, keyboard, native links and scrollbars retain native behaviour.
function setupSmoothWheel(){
 const header=$('#site-header');
 const onScroll=()=>header?.classList.toggle('compact',window.scrollY>55);
 addEventListener('scroll',onScroll,{passive:true});onScroll();
 // Soft desktop mouse-wheel smoothing: smooth, light and not heavy.
 // Touch, trackpad, scrollbar dragging and keyboard keep native behaviour.
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const desktop=matchMedia('(min-width: 900px) and (pointer: fine)');
 let frame=0,target=scrollY,lastFrame=0;
 const clamp=v=>Math.max(0,Math.min(v,Math.max(0,document.documentElement.scrollHeight-innerHeight)));
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;target=scrollY;lastFrame=0;};
 const tick=now=>{
  const elapsed=Math.min(34,Math.max(1,now-(lastFrame||now-16)));
  lastFrame=now;
  target=clamp(target);
  const current=window.scrollY;
  const gap=target-current;
  if(Math.abs(gap)<.6){window.scrollTo(0,target);frame=0;return;}
  const fraction=1-Math.exp(-elapsed/120);
  window.scrollTo(0,clamp(current+gap*fraction));
  frame=requestAnimationFrame(tick);
 };
 document.addEventListener('pointerdown',e=>{if(e.clientX>=document.documentElement.clientWidth-22)stop();},{passive:true});
 document.addEventListener('touchstart',stop,{passive:true});
 document.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))stop();},{passive:true});
 addEventListener('pagehide',stop,{passive:true});
 addEventListener('resize',stop,{passive:true});
 addEventListener('wheel',e=>{
  if(e.defaultPrevented||!e.cancelable||e.ctrlKey||e.metaKey||!desktop.matches||reduced.matches||document.body.classList.contains('no-scroll'))return;
  if(e.target.closest('input,textarea,select,[role="dialog"],.cart-drawer,.menu-layer,[data-scroll-container],.quiz-panel .form-intro'))return;
  if(Math.abs(e.deltaX)>Math.abs(e.deltaY)*.5)return;
  const delta=e.deltaMode===1?e.deltaY*36:e.deltaMode===2?e.deltaY*innerHeight:e.deltaY;
  // Let fine continuous trackpad gestures keep native system momentum.
  if(e.deltaMode===0&&Math.abs(delta)<42)return;
  if(Math.abs(delta)<1)return;
  e.preventDefault();
  const distance=Math.sign(delta)*Math.min(300,Math.max(110,Math.abs(delta)*1.05));
  target=clamp((frame?target:window.scrollY)+distance);
  if(!frame){lastFrame=performance.now();frame=requestAnimationFrame(tick);}
 },{passive:false});
}
function closeMenu(){const menu=$('#menu-layer');menu.classList.remove('active');menu.setAttribute('aria-hidden','true');$('#menu-toggle').classList.remove('active');$('#menu-toggle').setAttribute('aria-expanded','false');}
function toggleMenu(){const menu=$('#menu-layer');const val=!menu.classList.contains('active');closeCart();menu.classList.toggle('active',val);menu.setAttribute('aria-hidden',String(!val));$('#menu-toggle').classList.toggle('active',val);$('#menu-toggle').setAttribute('aria-expanded',String(val));}
function updateCartCount(){const c=state.cart.reduce((n,i)=>n+i.qty,0);$('#cart-count').textContent=c;}
function cartPrice(item){const p=pById(item.id);if(!p)return null;return item.volume==='Full'?p.priceFull:p['price'+item.volume];}
function addToCart(id,volume){const p=pById(id);if(!p)return;const v=volume==='Full'?'Full':Number(volume)||3;const existing=state.cart.find(x=>x.id===id&&x.volume===v);if(existing)existing.qty++;else state.cart.push({id,volume:v,qty:1});writeJson('lav_cart_v1',state.cart);updateCartCount();showToast('Аромат добавлен в корзину');openCart();}
function changeCart(id,volume,d){const i=state.cart.findIndex(x=>x.id===id&&String(x.volume)===String(volume));if(i<0)return;state.cart[i].qty+=d;if(state.cart[i].qty<1)state.cart.splice(i,1);writeJson('lav_cart_v1',state.cart);updateCartCount();renderCart();}
function cartTotal(){let total=0;let pending=false;for(const item of state.cart){const price=cartPrice(item);if(price==null)pending=true;else total+=Number(price)*item.qty;}return {total,pending};}
function renderCart(){const target=$('#cart-items'),bottom=$('#cart-bottom');if(!state.cart.length){target.innerHTML=`<div class="cart-empty"><span class="serif">Найдите свой аромат.</span><p>Здесь появятся композиции,<br>которые вы выберете.</p><button class="pill" id="cart-go-catalog">Перейти к коллекции <span class="arrow">→</span></button></div>`;bottom.innerHTML='';return;}
 target.innerHTML=state.cart.map(item=>{const p=pById(item.id);if(!p)return'';return `<div class="cart-row"><div class="cart-tile">${isUrl(p.image)?`<img src="${esc(p.image)}" alt="${esc(p.brand+' '+p.name)}" loading="lazy">`:esc(p.brand[0])}</div><div class="cart-row-info"><b>${esc(p.brand.toUpperCase())}</b><h3>${esc(p.name)}</h3><div class="small-details">${item.volume==='Full'?'Полный флакон':item.volume+' мл'}</div><strong>${money(cartPrice(item))}</strong><div class="qty-tools"><button data-cart-delta="-1" data-cart-id="${item.id}" data-cart-v="${item.volume}" aria-label="Уменьшить">−</button><span>${item.qty}</span><button data-cart-delta="1" data-cart-id="${item.id}" data-cart-v="${item.volume}" aria-label="Увеличить">+</button></div></div><button class="remove-item" data-cart-remove="${item.id}" data-cart-v="${item.volume}" aria-label="Удалить">×</button></div>`;}).join('');
 const {total,pending}=cartTotal();bottom.innerHTML=`<div class="total-row"><span>Итого ${pending?'(без стоимости флаконов по запросу)':''}</span><strong>${money(total)}</strong></div><button class="pill" id="open-checkout"><span>Оформить заявку</span><span class="arrow">→</span></button><p class="form-legal" style="margin:12px 0 0">Оплата и доставка согласуются после подтверждения заказа.</p>`;
}
function openCart(){closeMenu();renderCart();$('#cart-drawer').classList.add('active');$('#cart-drawer').setAttribute('aria-hidden','false');$('#overlay-backdrop').classList.add('active');document.body.classList.add('no-scroll');}
function closeCart(){const d=$('#cart-drawer');d.classList.remove('active');d.setAttribute('aria-hidden','true');if(!$('#modal-root').classList.contains('active')){$('#overlay-backdrop').classList.remove('active');document.body.classList.remove('no-scroll');}}
function showToast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>el.classList.remove('show'),2700);}
const turnstileBox=()=>CONFIG.turnstileSiteKey?`<div class="turnstile-target" data-sitekey="${esc(CONFIG.turnstileSiteKey)}"></div>`:'';
function initTurnstile(){
 const targets=$$('.turnstile-target:not([data-loaded])');if(!targets.length)return;
 const run=()=>{if(!window.turnstile)return;targets.forEach(t=>{if(t.dataset.loaded)return;t.dataset.loaded='true';window.turnstile.render(t,{sitekey:CONFIG.turnstileSiteKey,theme:'light'});});};
 if(window.turnstile){run();return;}
 if(!$('#turnstile-script')){const tag=document.createElement('script');tag.id='turnstile-script';tag.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';tag.onload=run;document.head.appendChild(tag);}else{setTimeout(run,300);}
}
function openModal(html){closeCart();const root=$('#modal-root');root.innerHTML=`<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`;root.classList.add('active');root.setAttribute('aria-hidden','false');initTurnstile();$('#overlay-backdrop').classList.add('active');document.body.classList.add('no-scroll');}
function closeModal(){const root=$('#modal-root');root.classList.remove('active');root.setAttribute('aria-hidden','true');root.innerHTML='';$('#overlay-backdrop').classList.remove('active');document.body.classList.remove('no-scroll');}
const orderText=(payload)=>{
 const lines=payload.items.map(i=>{const p=pById(i.id);return `${p?.brand||''} ${p?.name||'№'+i.id}, ${i.volume==='Full'?'полный флакон':i.volume+' мл'} × ${i.qty} — ${cartPrice(i)==null?'цена по запросу':money(Number(cartPrice(i))*i.qty)}`;});
 const t=cartTotal();return `ЗАЯВКА «ЛАВ ПАРФЮМ»\n\n${lines.map((line,i)=>(i+1)+'. '+line).join('\n')}\n\nИтого: ${money(t.total)}${t.pending?' + флаконы по запросу':''}\n\nИмя: ${payload.name}\nСвязь: ${payload.contact}\nКомментарий: ${payload.comment||'Нет'}`;
};
const copyText=async text=>{
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);return true;}}catch{}
 try{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.left='-9999px';document.body.appendChild(t);t.select();const ok=document.execCommand('copy');t.remove();return ok;}catch{return false;}
};
function checkout(){const lines=state.cart.map(i=>{const p=pById(i.id);return `<p style="font-size:11px;color:#725950;line-height:1.7;margin:0 0 6px">${esc(p?.brand)} ${esc(p?.name)} · ${i.volume==='Full'?'Флакон':i.volume+' мл'} × ${i.qty}</p>`;}).join('');
 openModal(`<button class="close-round" data-close-modal aria-label="Закрыть">×</button><div class="eyebrow">ПОЧТИ ГОТОВО</div><h2>Оформить<br><em>заявку.</em></h2><div style="margin-bottom:23px">${lines}</div><form id="order-form" class="lav-form"><div class="form-field"><label for="order-name">Ваше имя *</label><input id="order-name" name="name" required maxlength="100" placeholder="Как к вам обращаться"></div><div class="form-field"><label for="order-contact">Телефон или мессенджер *</label><input id="order-contact" name="contact" required maxlength="140" placeholder="+7... или @username"></div><div class="form-field"><label for="order-comment">Комментарий к заказу</label><textarea id="order-comment" name="comment" placeholder="Удобный способ связи, пожелания..." rows="3"></textarea></div><p class="form-legal">Способ оплаты и доставки согласовывается индивидуально. ${state.connected?'Заявка будет передана магазину.':'В демонстрационной версии сообщение не отправляется автоматически — его можно скопировать.'}</p><label class="v7-consent"><input type="checkbox" name="consent" required><span>Согласен(на) на обработку данных для связи по заказу. <a href="privacy.html" target="_blank">Политика обработки персональных данных</a></span></label><button type="submit" class="pill"><span>${state.connected?'Отправить заявку':'Скопировать заявку'}</span><span class="arrow">→</span></button>${turnstileBox()}<div class="form-feedback" id="order-feedback"></div></form>`);
}
const apiRequest=async(path,options={})=>{
 const url=CONFIG.apiBase.replace(/\/$/,'')+path;
 const headers={...(options.headers||{})};if(options.body&&typeof options.body==='string')headers['Content-Type']='application/json';
 return fetch(url,{...options,headers});
};
async function submitOrder(form){const fd=new FormData(form);const payload={name:String(fd.get('name')||'').trim(),contact:String(fd.get('contact')||'').trim(),comment:String(fd.get('comment')||'').trim(),items:state.cart.map(i=>({...i})),turnstileToken:String(fd.get('cf-turnstile-response')||'')};
 const btn=$('button[type=submit]',form),feedback=$('#order-feedback');btn.disabled=true;
 if(!state.connected){const copy=await copyText(orderText(payload));writeJson('lav_demo_orders',[...readJson('lav_demo_orders',[]),{...payload,createdAt:new Date().toISOString()}]);feedback.classList.add('active');feedback.textContent=copy?'Заявка скопирована. В демоверсии она не отправлена в магазин.':'Заявка сохранена в браузере. Автоматическая отправка пока не подключена.';btn.disabled=false;return;}
 try{const res=await apiRequest('/api/orders',{method:'POST',body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Не удалось отправить');feedback.textContent=data.notificationDelivered?`Заявка №${esc(data.orderId||'')} отправлена магазину. С вами свяжутся для подтверждения.`:`Заявка №${esc(data.orderId||'')} сохранена, но отправка уведомления владельцу пока не настроена.`;feedback.classList.add('active');state.cart=[];writeJson('lav_cart_v1',state.cart);updateCartCount();btn.disabled=true;}
 catch(err){feedback.classList.add('active');feedback.textContent=`Не удалось отправить заявку: ${err.message}. Попробуйте ещё раз.`;btn.disabled=false;}
}
async function submitQuiz(form){
 const fd=new FormData(form);
 const values=['email','occupation','day','style','restrained','favorites','dislikes','trail','state','ideal','comment'];
 const labels={email:'E-mail',occupation:'Занятость',day:'Обычный день',style:'Стиль одежды',restrained:'Нужен сдержанный аромат',favorites:'Любимые ароматы',dislikes:'Нежелательные запахи',trail:'Предпочитаемый шлейф',state:'Желаемое состояние',ideal:'Мой идеальный аромат',comment:'Пожелания'};
 const answers=values.map(k=>labels[k]+': '+String(fd.get(k)||'—')).join('\n');
 const goals=fd.getAll('goals').map(String).join('; ');
 const payload={type:'quiz',name:String(fd.get('name')||''),contact:String(fd.get('contact')||''),family:goals,mood:String(fd.get('style')||''),notes:String(fd.get('favorites')||''),comment:'Цели: '+(goals||'—')+'\n'+answers,turnstileToken:String(fd.get('cf-turnstile-response')||'')};
 const btn=$('button[type=submit]',form),fb=$('#quiz-feedback');btn.disabled=true;let msg='';
 if(!state.connected){const txt=`АНКЕТА ЛАВ ПАРФЮМ\nИмя: ${payload.name}\nКонтакт: ${payload.contact}\n${payload.comment}`;const copy=await copyText(txt);writeJson('lav_demo_quizzes',[...readJson('lav_demo_quizzes',[]),payload]);msg=copy?'Ответы скопированы. Это предпросмотр: владельцу ничего не отправлено.':'Анкета сохранена только на этом устройстве. Для реальной отправки требуется сервер.';}
 else try{const res=await apiRequest('/api/forms',{method:'POST',body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка');msg='Спасибо! Анкета отправлена. Владелица магазина свяжется с вами.';form.reset();}catch(e){msg='Не удалось отправить анкету: '+e.message;}
 fb.textContent=msg;fb.classList.add('active');btn.disabled=false;
}
function adminPage(){
 if(!state.connected)return `<section class="admin-page admin-locked"><div class="admin-login"><span class="eyebrow">ЛАВ ПАРФЮМ</span><h1>Управление</h1><p class="body-copy">Панель владельца будет доступна после подключения защищённого сервера и авторизации. В режиме предпросмотра редактирование закрыто.</p><a href="index.html" class="quiet-link">На главную <span>→</span></a></div></section>`;
 if(!state.auth)return `<section class="admin-page"><div class="admin-login"><div class="eyebrow">ПАНЕЛЬ МАГАЗИНА</div><h1>Вход</h1><form id="admin-login" class="lav-form"><div class="form-field"><label>Логин</label><input type="text" name="username" autocomplete="username" required></div><div class="form-field"><label>Пароль</label><input type="password" name="password" autocomplete="current-password" required></div><button class="pill" type="submit">Войти <span class="arrow">→</span></button><p id="admin-login-error" class="form-feedback"></p></form></div></section>`;
 const q=state.adminQuery.toLowerCase();const prods=state.products.filter(p=>[p.id,p.brand,p.name].join(' ').toLowerCase().includes(q));
 const edit=state.editor!=null?pById(state.editor):null;
 const editMarkup=edit?`<div class="admin-edit" id="admin-edit"><h2>Редактировать №${edit.id}</h2><form id="admin-edit-form" class="lav-form"><input type="hidden" name="id" value="${edit.id}"><div class="form-grid"><div class="form-field"><label>Бренд</label><input name="brand" value="${esc(edit.brand)}" required></div><div class="form-field"><label>Название аромата</label><input name="name" value="${esc(edit.name)}" required></div></div><div class="form-field"><label>Характер аромата</label><input name="tagline" value="${esc(edit.tagline||'')}"></div><div class="form-grid">${['price3','price5','price10','priceFull'].map((k,i)=>`<div class="form-field"><label>${['3 мл','5 мл','10 мл','Полный флакон'][i]}, ₽</label><input type="number" min="0" step="1" name="${k}" placeholder="Цена не указана" value="${edit[k]??''}"></div>`).join('')}</div><div class="form-field"><label>Описание аромата</label><textarea name="description" rows="8">${esc(edit.description||'')}</textarea></div><div class="form-grid"><div class="form-field"><label>Верхние ноты</label><textarea name="top">${esc(edit.notes?.top||'')}</textarea></div><div class="form-field"><label>Ноты сердца</label><textarea name="middle">${esc(edit.notes?.middle||'')}</textarea></div><div class="form-field"><label>Базовые ноты</label><textarea name="base">${esc(edit.notes?.base||'')}</textarea></div><div class="form-field"><label>Другие ноты и аккорды</label><textarea name="other">${esc(edit.notes?.other||'')}</textarea></div></div><div class="form-field"><label>Адрес изображения (URL или assets/файл.webp)</label><input name="image" placeholder="assets/my-fragrance.webp" value="${esc(edit.image||'')}"><input type="file" id="product-photo-file" accept="image/*"><small class="body-copy" style="font-size:11px">Фото загрузится на сервер магазина.</small></div><div class="form-choice"><label class="radio-chip"><input type="checkbox" name="available" ${edit.available?'checked':''}><span>Показывать товар</span></label><label class="radio-chip"><input type="checkbox" name="hit" ${edit.hit?'checked':''}><span>Хит продаж</span></label><label class="radio-chip"><input type="checkbox" name="new" ${edit.new?'checked':''}><span>Новинка</span></label></div><div style="display:flex;gap:15px;flex-wrap:wrap"><button class="pill" type="submit">Сохранить изменения <span class="arrow">→</span></button><button class="filter-chip" type="button" id="admin-cancel-edit">Отмена</button></div><p class="form-feedback" id="admin-edit-feedback"></p></form></div>`:'';
 return `<section class="admin-page"><div class="eyebrow">ЛАВ ПАРФЮМ / УПРАВЛЕНИЕ</div><h1>Каталог<br><em>и заказы.</em></h1><div class="admin-banner">Административный раздел. Здесь изменения сохраняются на сервере и отражаются в каталоге.</div><div class="admin-stats">В каталоге ${state.products.length} позиций, опубликовано ${activeProducts().length}, скрыто ${state.products.length-activeProducts().length}. </div><div class="admin-actions"><button class="pill" id="admin-add-product">Добавить аромат <span class="arrow">+</span></button><button class="filter-chip" id="admin-export">Выгрузить JSON</button>${state.connected?'<button class="filter-chip" data-admin-records="orders">Заказы</button><button class="filter-chip" data-admin-records="forms">Анкеты</button>':''}${state.connected?'<button class="filter-chip" id="admin-logout">Выйти</button>':''}</div><details class="admin-settings"><summary>Настройки магазина и контактов</summary><form id="admin-store-form" class="lav-form"><div class="form-grid">${[['telegramUrl','Telegram (https://...)'],['maxUrl','Max (https://...)'],['whatsappUrl','WhatsApp (https://...)'],['address','Адрес магазина'],['hours','Часы работы']].map(([k,label])=>`<div class="form-field"><label>${label}</label><input name="${k}" value="${esc(state.store[k]||'')}"></div>`).join('')}</div>${[['about','О бренде'],['payment','Оплата'],['delivery','Доставка']].map(([k,label])=>`<div class="form-field"><label>${label}</label><textarea name="${k}" rows="4">${esc(state.store[k]||'')}</textarea></div>`).join('')}<button class="purchase-action" type="submit">Сохранить настройки <span>→</span></button><div id="admin-store-feedback" class="form-feedback"></div></form></details><div id="admin-records-container"></div>${editMarkup}<label class="searchbox" style="margin-bottom:25px;max-width:380px"><input id="admin-search" type="search" placeholder="Поиск аромата / номер..." value="${esc(state.adminQuery)}"></label><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>№</th><th>Бренд</th><th>Аромат</th><th>3 мл</th><th>5 мл</th><th>10 мл</th><th>Статус</th><th></th></tr></thead><tbody id="admin-table-body">${adminRows(prods)}</tbody></table></div></section>`;
}
function adminRows(prods){return prods.map(p=>`<tr><td>${p.id}</td><td>${esc(p.brand)}</td><td>${esc(p.name)}</td><td>${p.price3??'—'}</td><td>${p.price5??'—'}</td><td>${p.price10??'—'}</td><td>${p.available?'Опубликован':'Скрыт'}</td><td><button data-admin-edit="${p.id}">Изменить</button> <button data-admin-toggle="${p.id}">${p.available?'Скрыть':'Показать'}</button></td></tr>`).join('');}
async function adminRecords(kind){
 const box=$('#admin-records-container');if(!box)return;
 box.innerHTML='<div class="admin-banner">Загрузка...</div>';
 try{const r=await apiRequest('/api/admin/'+kind,{headers:{Authorization:'Bearer '+state.auth}}),data=await r.json();if(!r.ok)throw Error(data.error||'Ошибка');const entries=data[kind]||[];
 box.innerHTML=`<div class="admin-edit"><h2>${kind==='orders'?'Заказы':'Анкеты'}</h2>${entries.length?entries.map(e=>`<div class="admin-record"><strong>№ ${esc(e.id)} • ${esc(new Date(e.createdAt).toLocaleString('ru-RU'))}</strong><p>${esc(e.name)} • ${esc(e.contact)}</p>${kind==='orders'?`<p>${e.items.map(i=>`${esc(i.brand)} ${esc(i.name)} (${esc(i.volume)} мл × ${i.qty})`).join('; ')}</p><label>Статус: <select data-order-status="${esc(e.id)}">${[['new','Новый'],['confirmed','Подтверждён'],['ready','Готов'],['completed','Завершён'],['cancelled','Отменён']].map(([k,t])=>`<option value="${k}" ${k===e.status?'selected':''}>${t}</option>`).join('')}</select></label>`:`<p>Предпочтения: ${esc(e.family)}; повод: ${esc(e.mood)}; ноты: ${esc(e.notes)}; ${esc(e.comment)}</p>`}</div>`).join(''):'<p>Пока пусто</p>'}</div>`;
 }catch(e){box.innerHTML='<div class="admin-banner">'+esc(e.message)+'</div>'}
}
function adminEdit(id){state.editor=id;render(false);$('#admin-edit')?.scrollIntoView({behavior:'smooth',block:'start'});}
async function adminSave(form){const fd=new FormData(form),id=Number(fd.get('id'));const p=pById(id);if(!p)return;const v=k=>String(fd.get(k)||'').trim();const price=k=>v(k)===''?null:Number(v(k));
 const update={id,brand:v('brand'),name:v('name'),title:v('brand')+' '+v('name'),tagline:v('tagline'),description:v('description'),price3:price('price3'),price5:price('price5'),price10:price('price10'),priceFull:price('priceFull'),notes:{top:v('top'),middle:v('middle'),base:v('base'),other:v('other')},available:fd.has('available'),hit:fd.has('hit'),new:fd.has('new'),placeholder:false,image:v('image')||null};
 const file=$('#product-photo-file')?.files[0];const fb=$('#admin-edit-feedback');
 try{
  if(file){if(state.connected){const res=await apiRequest('/api/admin/upload',{method:'POST',headers:{Authorization:'Bearer '+state.auth,'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});const data=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка загрузки');update.image=data.url;}else{if(file.size>2_800_000)throw new Error('Для локального демо выберите фото до 2,8 МБ. На сервере доступны большие файлы.');update.image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});}}
  if(state.connected){const res=await apiRequest('/api/admin/products/'+id,{method:'PUT',headers:{Authorization:'Bearer '+state.auth},body:JSON.stringify(update)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Ошибка сохранения');}
  else {state.overrides[id]=update;try{writeJson('lav_products_overrides_v9',state.overrides)}catch(e){throw new Error('Недостаточно места в браузере для сохранения фото. Используйте URL изображения.') }}
  const index=state.products.findIndex(x=>x.id===id);state.products[index]={...state.products[index],...update};state.editor=null;showToast('Изменения сохранены');render(false);
 }catch(e){if(fb){fb.classList.add('active');fb.textContent=e.message;}}
}
async function adminLogin(form){const fd=new FormData(form);try{const r=await apiRequest('/api/admin/login',{method:'POST',body:JSON.stringify({username:String(fd.get('username')),password:String(fd.get('password'))})});const d=await r.json();if(!r.ok)throw Error(d.error||'Неверный пароль');state.auth=d.token;sessionSet('lav_admin_token',d.token);render(false);}catch(e){const fb=$('#admin-login-error');fb.textContent=e.message;fb.classList.add('active')}}
async function adminToggleVisibility(id){
 if(!state.connected||!state.auth)return;
 const p=pById(id);if(!p)return;
 const publish=p.available===false;
 if(!publish&&!window.confirm('Скрыть этот аромат из каталога? Данные сохранятся в панели управления.'))return;
 const update={...p,available:publish};
 try{const r=await apiRequest('/api/admin/products/'+id,{method:'PUT',headers:{Authorization:'Bearer '+state.auth},body:JSON.stringify(update)});
 if(!r.ok)throw Error('Не удалось изменить видимость');state.products[state.products.findIndex(x=>x.id===id)]=update;
 showToast(publish?'Аромат опубликован':'Аромат скрыт');render(false);
 }catch(e){showToast(e.message)}
}
async function adminStoreSave(form){
 if(!state.connected||!state.auth)return;
 const fd=new FormData(form);const store={};for(const k of Object.keys(DEFAULT_STORE))store[k]=String(fd.get(k)||'').trim();
 const fb=$('#admin-store-feedback');
 try{const r=await apiRequest('/api/admin/store',{method:'PUT',headers:{Authorization:'Bearer '+state.auth},body:JSON.stringify(store)});const data=await r.json();if(!r.ok)throw Error(data.error||'Ошибка сохранения');state.store={...DEFAULT_STORE,...data.store};
 if(fb){fb.classList.add('active');fb.textContent='Настройки сохранены для всех посетителей.';}
 }catch(e){if(fb){fb.classList.add('active');fb.textContent=e.message;}}
}
function exportAdmin(){const blob=new Blob([JSON.stringify(state.products,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lav-parfum-catalog.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
function handleClick(e){
 const t=e.target;
 // Product cards are real anchors. Do not intercept mouse, middle-click or Ctrl/Cmd-click.
 const kind=t.closest('[data-kind]');if(kind){state.kind=kind.dataset.kind;state.limit=20;updateCatalog();return;}
 const reset=t.closest('#reset-filters');if(reset){state.query='';state.brand='all';state.kind='all';state.limit=20;$('#catalog-search').value='';$('#brand-filter').value='all';updateCatalog();return;}
 if(t.closest('#load-more')){state.limit+=20;updateCatalog();return;}
 const vol=t.closest('[data-volume]');if(vol){const id=Number(vol.dataset.volumeId);state.selected[id]=vol.dataset.volume==='Full'?'Full':Number(vol.dataset.volume);const p=pById(id),price=state.selected[id]==='Full'?p.priceFull:p['price'+state.selected[id]];$('#detail-price').textContent=money(price);$$('[data-volume-id]').forEach(b=>b.classList.toggle('selected',String(state.selected[id])===b.dataset.volume));$('#add-cart').dataset.addVolume=state.selected[id];return;}
 const add=t.closest('[data-add]');if(add){addToCart(Number(add.dataset.add),add.dataset.addVolume||3);return;}
 const minus=t.closest('[data-cart-delta]');if(minus){changeCart(Number(minus.dataset.cartId),minus.dataset.cartV,Number(minus.dataset.cartDelta));return;}
 const remove=t.closest('[data-cart-remove]');if(remove){changeCart(Number(remove.dataset.cartRemove),remove.dataset.cartV,-9999);return;}
 if(t.closest('#open-checkout')){checkout();return;}
 if(t.closest('#cart-go-catalog')){closeCart();window.location.href='catalog.html';return;}
 const rec=t.closest('[data-admin-records]');if(rec){adminRecords(rec.dataset.adminRecords);return;}
 if(t.closest('#admin-add-product')){const id=Math.max(0,...state.products.map(p=>p.id))+1;const p={id,brand:'Новый бренд',name:'Новый аромат',title:'Новый аромат',tagline:'',description:'',notes:{top:'',middle:'',base:'',other:''},price3:null,price5:null,price10:null,priceFull:null,available:false,hit:false,new:false,image:null,placeholder:true};state.products.push(p);state.editor=id;render(false);return;}
 const toggled=t.closest('[data-admin-toggle]');if(toggled){adminToggleVisibility(Number(toggled.dataset.adminToggle));return;}
 const edit=t.closest('[data-admin-edit]');if(edit){adminEdit(Number(edit.dataset.adminEdit));return;}
 if(t.closest('#admin-cancel-edit')){state.editor=null;render(false);return;}
 if(t.closest('#admin-export')){exportAdmin();return;}
 if(t.closest('#admin-logout')){sessionRemove('lav_admin_token');state.auth='';render(false);return;}
}
async function updateOrderStatus(select){try{const r=await apiRequest('/api/admin/orders/'+select.dataset.orderStatus,{method:'PATCH',headers:{Authorization:'Bearer '+state.auth},body:JSON.stringify({status:select.value})});if(!r.ok)throw Error('Не удалось обновить статус');showToast('Статус заказа изменён');}catch(e){showToast(e.message);}}
function handleInputs(e){
 if(e.target.id==='catalog-search'){state.query=e.target.value;state.limit=20;updateCatalog();}
 if(e.target.id==='brand-filter'){state.brand=e.target.value;state.limit=20;updateCatalog();}
 if(e.target.id==='admin-search'){state.adminQuery=e.target.value;$('#admin-table-body').innerHTML=adminRows(state.products.filter(p=>[p.id,p.brand,p.name].join(' ').toLowerCase().includes(state.adminQuery.toLowerCase())));}
}
document.addEventListener('submit',e=>{const form=e.target;if(['order-form','quiz-form','admin-edit-form','admin-login','admin-store-form'].includes(form.id)){e.preventDefault();if(form.id==='order-form')submitOrder(form);else if(form.id==='quiz-form')submitQuiz(form);else if(form.id==='admin-edit-form')adminSave(form);else if(form.id==='admin-store-form')adminStoreSave(form);else adminLogin(form);}});
document.addEventListener('click',handleClick);
document.addEventListener('input',handleInputs);document.addEventListener('change',e=>{if(e.target.matches('[data-order-status]'))updateOrderStatus(e.target)});
$('#cart-toggle').addEventListener('click',openCart);
$('#search-trigger').addEventListener('click',()=>{window.location.href='catalog.html';setTimeout(()=>$('#catalog-search')?.focus(),100)});
$('#menu-toggle').addEventListener('click',toggleMenu);
$('#overlay-backdrop').addEventListener('click',()=>{$('#modal-root').classList.contains('active')?closeModal():closeCart()});
$('#cart-drawer').addEventListener('click',e=>{if(e.target.closest('[data-close-cart]'))closeCart()});
$('#modal-root').addEventListener('click',e=>{if(e.target.closest('[data-close-modal]'))closeModal()});
$('#menu-layer').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});document.addEventListener('pointerdown',e=>{if($('#menu-layer').classList.contains('active')&&!e.target.closest('#menu-layer')&&!e.target.closest('#menu-toggle'))closeMenu();});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeCart();closeMenu()}});
window.addEventListener('pageshow',e=>{if(!e.persisted&&getPage()==='/catalog')restoreCatalogScroll();});
$('#year').textContent=new Date().getFullYear();
updateCartCount();render(true);setupSmoothWheel();fetchOverrides();fetchStore();
})();
