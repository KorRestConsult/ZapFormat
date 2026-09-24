const MARKUP = 15;

const datasets = {
  "0250603006": {
    title: "BOSCH 0 250 603 006",
    subtitle: "Свеча накаливания",
    exact: [
      {id:"b1",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"03",source:"Поставка 1",purchase:1803,qty:10,days:2},
      {id:"b2",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"07",source:"Поставка 2",purchase:1865,qty:22,days:1},
      {id:"b3",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"11",source:"Поставка 3",purchase:1940,qty:5,days:1},
      {id:"b4",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"18",source:"Поставка 4",purchase:1725,qty:40,days:5},
      {id:"b5",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"24",source:"Поставка 5",purchase:1768,qty:12,days:2},
      {id:"b6",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"31",source:"Поставка 6",purchase:1792,qty:8,days:3},
      {id:"b7",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"44",source:"Поставка 7",purchase:1840,qty:20,days:2}
    ],
    analogs: [
      {id:"ba1",type:"analog",brand:"BERU",article:"GE102",name:"Свеча накаливания",warehouse:"02",source:"Аналог",purchase:1510,qty:12,days:1},
      {id:"ba2",type:"analog",brand:"NGK",article:"97256",name:"Свеча накаливания",warehouse:"05",source:"Аналог",purchase:1640,qty:7,days:2},
      {id:"ba3",type:"analog",brand:"DENSO",article:"DG-193",name:"Свеча накаливания",warehouse:"09",source:"Аналог",purchase:1435,qty:3,days:2},
      {id:"ba4",type:"analog",brand:"FEBI",article:"176214",name:"Свеча накаливания",warehouse:"13",source:"Аналог",purchase:1190,qty:16,days:3},
      {id:"ba5",type:"analog",brand:"SWAG",article:"20 94 6721",name:"Свеча накаливания",warehouse:"21",source:"Аналог",purchase:1280,qty:9,days:4},
      {id:"ba6",type:"analog",brand:"MEYLE",article:"314 860 0004",name:"Свеча накаливания",warehouse:"25",source:"Аналог",purchase:1345,qty:6,days:2},
      {id:"ba7",type:"analog",brand:"STELLOX",article:"202 084-SX",name:"Свеча накаливания",warehouse:"31",source:"Аналог",purchase:790,qty:28,days:3},
      {id:"ba8",type:"analog",brand:"PATRON",article:"PGP002",name:"Свеча накаливания",warehouse:"44",source:"Аналог",purchase:860,qty:34,days:5},
      {id:"ba9",type:"analog",brand:"STELLOX",article:"201095-SX",name:"Свеча накаливания",warehouse:"31",source:"Аналог",purchase:930,qty:0,days:4}
    ]
  },
  "11277810456": {
    title: "BMW 11 27 7 810 456",
    subtitle: "Элемент привода / ролик",
    exact: [
      {id:"bm1",type:"exact",brand:"BMW",article:"11277810456",name:"Ролик / элемент привода",warehouse:"03",source:"Оригинал",purchase:2713,qty:5,days:2},
      {id:"bm2",type:"exact",brand:"BMW",article:"11277810456",name:"Ролик / элемент привода",warehouse:"15",source:"Оригинал",purchase:2950,qty:2,days:1},
      {id:"bm3",type:"exact",brand:"BMW",article:"11277810456",name:"Ролик / элемент привода",warehouse:"28",source:"Оригинал",purchase:2480,qty:12,days:6}
    ],
    analogs: [
      {id:"bma1",type:"analog",brand:"INA",article:"532 0792 10",name:"Ролик приводного ремня",warehouse:"01",source:"Аналог",purchase:2420,qty:17,days:1},
      {id:"bma2",type:"analog",brand:"GATES",article:"T39198",name:"Натяжитель приводного ремня",warehouse:"07",source:"Аналог",purchase:6810,qty:7,days:1},
      {id:"bma3",type:"analog",brand:"SNR",article:"GA350.89",name:"Ролик натяжной",warehouse:"09",source:"Аналог",purchase:2260,qty:9,days:2},
      {id:"bma4",type:"analog",brand:"DAYCO",article:"APV3126",name:"Ролик приводного ремня",warehouse:"17",source:"Аналог",purchase:1970,qty:4,days:2},
      {id:"bma5",type:"analog",brand:"FEBI",article:"106256",name:"Ролик",warehouse:"22",source:"Аналог",purchase:1835,qty:11,days:3},
      {id:"bma6",type:"analog",brand:"MEYLE",article:"314 009 0008",name:"Ролик",warehouse:"30",source:"Аналог",purchase:1740,qty:20,days:4}
    ]
  },
  "MIP-E475": {
    title: "MASUMA MIP-E475",
    subtitle: "Натяжитель приводного ремня",
    exact: [
      {id:"m1",type:"exact",brand:"MASUMA",article:"MIP-E475",name:"Натяжитель приводного ремня",warehouse:"03",source:"Точная позиция",purchase:3147,qty:1,days:2},
      {id:"m2",type:"exact",brand:"MASUMA",article:"MIP-E475",name:"Натяжитель приводного ремня",warehouse:"19",source:"Точная позиция",purchase:3290,qty:3,days:1}
    ],
    analogs: [
      {id:"ma1",type:"analog",brand:"GATES",article:"T39198",name:"Натяжитель приводного ремня",warehouse:"03",source:"Аналог",purchase:6810,qty:2,days:1},
      {id:"ma2",type:"analog",brand:"INA",article:"534 0533 10",name:"Натяжитель ремня",warehouse:"08",source:"Аналог",purchase:5980,qty:5,days:2},
      {id:"ma3",type:"analog",brand:"DAYCO",article:"APV3165",name:"Натяжитель ремня",warehouse:"12",source:"Аналог",purchase:5140,qty:4,days:3},
      {id:"ma4",type:"analog",brand:"FEBI",article:"102981",name:"Натяжитель ремня",warehouse:"24",source:"Аналог",purchase:4490,qty:7,days:4}
    ]
  }
};

const demoOrders = {
  "1042": {
    id:"1042",
    date:"24 сентября 2026",
    time:"10:14",
    total:4218,
    status:"В пути",
    statusClass:"",
    comment:"Позвонить за 30 минут до выдачи.",
    receive:{
      city:"Рязань",
      method:"Самовывоз",
      point:"Точка выдачи ZapFormat · Рязань",
      recipient:"Получатель из профиля",
      note:"Сообщим, когда все позиции будут готовы к выдаче."
    },
    timeline:[
      {date:"24.09 · 10:14",title:"Заказ оформлен",state:"done"},
      {date:"24.09 · 10:28",title:"Подтверждён",state:"done"},
      {date:"24.09 · 13:05",title:"Передан в доставку",state:"done"},
      {date:"Сейчас",title:"В пути к точке выдачи",state:"current"},
      {date:"—",title:"Готов к выдаче",state:""}
    ],
    items:[
      {
        id:"1042-1",sourceId:"b1",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",
        qty:1,price:1812,warehouse:"5196",term:"2 дня",status:"В пути",statusClass:"",
        returnAllowed:false,
        timeline:[
          {title:"Подтверждена",state:"done"},
          {title:"Склад",state:"done"},
          {title:"В пути",state:"current"},
          {title:"Выдача",state:""}
        ]
      },
      {
        id:"1042-2",sourceId:"m1",brand:"MASUMA",article:"MIP-E475",name:"Натяжитель приводного ремня",
        qty:1,price:2406,warehouse:"1893",term:"2 дня",status:"Подтверждён",statusClass:"processing",
        returnAllowed:false,
        timeline:[
          {title:"Подтверждена",state:"done"},
          {title:"Склад",state:"current"},
          {title:"В пути",state:""},
          {title:"Выдача",state:""}
        ]
      }
    ]
  },
  "1041": {
    id:"1041",
    date:"23 сентября 2026",
    time:"17:42",
    total:3120,
    status:"Готов к выдаче",
    statusClass:"ready",
    comment:"Без комментария.",
    receive:{
      city:"Рязань",
      method:"Самовывоз",
      point:"Точка выдачи ZapFormat · Рязань",
      recipient:"Получатель из профиля",
      note:"Заказ можно получить после уведомления."
    },
    timeline:[
      {date:"23.09 · 17:42",title:"Заказ оформлен",state:"done"},
      {date:"23.09 · 18:01",title:"Подтверждён",state:"done"},
      {date:"24.09 · 09:20",title:"Прибыл в точку выдачи",state:"done"},
      {date:"Сейчас",title:"Готов к выдаче",state:"current"}
    ],
    items:[
      {
        id:"1041-1",sourceId:"bm1",brand:"BMW",article:"11277810456",name:"Ролик / элемент привода",
        qty:1,price:3120,warehouse:"03",term:"1 день",status:"Готов к выдаче",statusClass:"ready",
        returnAllowed:false,
        timeline:[
          {title:"Подтверждена",state:"done"},
          {title:"В пути",state:"done"},
          {title:"Прибыла",state:"done"},
          {title:"Выдача",state:"current"}
        ]
      }
    ]
  },
  "1038": {
    id:"1038",
    date:"18 сентября 2026",
    time:"12:06",
    total:11490,
    status:"Завершён",
    statusClass:"gray",
    comment:"Заказ получен полностью.",
    receive:{
      city:"Рязань",
      method:"Самовывоз",
      point:"Точка выдачи ZapFormat · Рязань",
      recipient:"Получатель из профиля",
      note:"Получено 20 сентября 2026."
    },
    timeline:[
      {date:"18.09 · 12:06",title:"Заказ оформлен",state:"done"},
      {date:"18.09 · 12:31",title:"Подтверждён",state:"done"},
      {date:"19.09 · 15:10",title:"Готов к выдаче",state:"done"},
      {date:"20.09 · 11:18",title:"Получен",state:"done"}
    ],
    items:[
      {
        id:"1038-1",sourceId:"ba1",brand:"BERU",article:"GE102",name:"Свеча накаливания",
        qty:2,price:1735,warehouse:"02",term:"1 день",status:"Получено",statusClass:"gray",returnAllowed:true,
        timeline:[
          {title:"Подтверждена",state:"done"},{title:"В пути",state:"done"},{title:"Выдана",state:"done"}
        ]
      },
      {
        id:"1038-2",sourceId:"ba2",brand:"NGK",article:"97256",name:"Свеча накаливания",
        qty:1,price:1886,warehouse:"05",term:"2 дня",status:"Получено",statusClass:"gray",returnAllowed:true,
        timeline:[
          {title:"Подтверждена",state:"done"},{title:"В пути",state:"done"},{title:"Выдана",state:"done"}
        ]
      },
      {
        id:"1038-3",sourceId:"bm1",brand:"BMW",article:"11277810456",name:"Ролик / элемент привода",
        qty:1,price:3120,warehouse:"03",term:"2 дня",status:"Получено",statusClass:"gray",returnAllowed:true,
        timeline:[
          {title:"Подтверждена",state:"done"},{title:"В пути",state:"done"},{title:"Выдана",state:"done"}
        ]
      },
      {
        id:"1038-4",sourceId:"ma4",brand:"FEBI",article:"102981",name:"Натяжитель ремня",
        qty:1,price:3014,warehouse:"24",term:"4 дня",status:"Получено",statusClass:"gray",returnAllowed:true,
        timeline:[
          {title:"Подтверждена",state:"done"},{title:"В пути",state:"done"},{title:"Выдана",state:"done"}
        ]
      }
    ]
  }
};

let currentKey = "0250603006";
let currentFilter = "all";
let currentSort = "recommended";
let quantities = {};
let expandedGroups = new Set();
let cart = loadCart();

function retail(p){ return Math.round(p * (1 + MARKUP/100)); }
function rub(n){ return new Intl.NumberFormat("ru-RU").format(n) + " ₽"; }
function loadCart(){
  try{
    const raw=JSON.parse(localStorage.getItem("zapformat-cart") || "[]");
    return raw.map(x=>({
      ...x,
      orderQty: x.orderQty ?? x.qty ?? 1,
      availableQty: x.availableQty ?? x.available ?? x.qty ?? 0,
      selected: x.selected ?? true,
      comment: x.comment ?? "",
      priceAtAdd: x.priceAtAdd ?? x.price ?? 0,
      previousPrice: x.previousPrice ?? null,
      priceChanged: x.priceChanged ?? false,
      availabilityChanged: x.availabilityChanged ?? false
    }));
  }catch{return []}
}
function saveCart(){
  localStorage.setItem("zapformat-cart", JSON.stringify(cart));
  renderCart();
  renderCartPage();
}

function resolveDataset(query){
  const raw=(query||"").trim();
  const q=raw.toUpperCase().replace(/\s+/g,"");
  if(datasets[q]) return q;

  const natural=raw.toLowerCase();
  if(q.includes("0250603006") || natural.includes("свеч") || natural.includes("накал")) return "0250603006";
  if(q.includes("11277810456")) return "11277810456";
  if(
    q.includes("MIPE475") ||
    q.includes("MIP-E475") ||
    natural.includes("натяж") ||
    natural.includes("ролик") ||
    natural.includes("ремн")
  ) return "MIP-E475";
  if(natural.includes("bmw") && natural.includes("x3")) return "MIP-E475";
  return "0250603006";
}

function showRoute(route){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const target=document.getElementById("view-"+route);
  if(target) target.classList.add("active");
  window.scrollTo({top:0,behavior:"auto"});
}

function navigate(route, push=true){
  showRoute(route);
  if(push){
    const url = route==="home" ? location.pathname : location.pathname+"?view="+encodeURIComponent(route);
    history.pushState({route}, "", url);
  }
}

function search(query){
  const raw=(query||"").trim();
  if(!raw) return;

  currentKey=resolveDataset(raw);
  const data=datasets[currentKey];

  const title=document.getElementById("resultTitle");
  const subtitle=document.getElementById("resultSubtitle");
  const heading=document.getElementById("exactHeading");
  const secondary=document.getElementById("searchInput2");

  if(title) title.textContent=data.title;
  if(subtitle) subtitle.textContent=data.subtitle+" · точные предложения и аналоги";
  if(heading) heading.textContent=data.subtitle;
  if(secondary) secondary.value=raw;

  showRoute("search");
  renderCatalog();
  history.pushState({route:"search",query:raw}, "", location.pathname+"?q="+encodeURIComponent(raw));
}

function baseList(type){
  const data=datasets[currentKey];
  let list=type==="exact" ? [...data.exact] : [...data.analogs];
  if(currentFilter==="exact" && type!=="exact") return [];
  if(currentFilter==="analog" && type!=="analog") return [];
  if(currentFilter==="fast") list=list.filter(x=>x.days<=2);
  if(currentFilter==="stock") list=list.filter(x=>x.qty>0);
  if(currentSort==="price") list.sort((a,b)=>retail(a.purchase)-retail(b.purchase));
  if(currentSort==="speed") list.sort((a,b)=>a.days-b.days || retail(a.purchase)-retail(b.purchase));
  if(currentSort==="stock") list.sort((a,b)=>b.qty-a.qty);
  return list;
}

function cartSvg(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h2l2 11h10l2-8H5.2"></path><circle cx="9" cy="19" r="1.5"></circle><circle cx="16" cy="19" r="1.5"></circle></svg>';
}

function supplyRowHtml(x){
  const term=x.days===0?"Сегодня":x.days+(x.days===1?" день":" дн.");
  return `
    <div class="supply-row">
      <div class="supply-left">
        <div class="supply-term">
          <b>${term}</b>
          <small>${x.warehouse}</small>
        </div>
        <span class="supply-warehouse">${x.source}</span>
      </div>
      <div class="supply-price">${rub(retail(x.purchase))}</div>
      <div class="supply-stock">${x.qty} шт.</div>
      <button class="cart-icon-btn" data-add="${x.id}" aria-label="В корзину">${cartSvg()}</button>
    </div>`;
}

function groupCardHtml(items, key){
  if(!items.length) return "";
  const first=items[0];
  const expanded=expandedGroups.has(key);
  const visible=expanded ? items : items.slice(0,5);
  const hiddenCount=Math.max(0,items.length-visible.length);
  return `
    <article class="product-group">
      <div class="product-group-head">
        <div class="product-thumb">${first.brand.slice(0,5)}</div>
        <div class="product-title">
          <div class="product-title-line">
            <a href="javascript:void(0)">${first.article}</a>
            <b>${first.brand}</b>
          </div>
          <small>${first.name}</small>
        </div>
        <span class="product-arrow">›</span>
      </div>
      <div class="supply-list">${visible.map(supplyRowHtml).join("")}</div>
      ${hiddenCount ? `<button class="show-more" data-show-group="${key}">Показать ещё <span>${hiddenCount}</span></button>` : ""}
    </article>`;
}

function renderCatalog(){
  const exact=baseList("exact");
  const analog=baseList("analog");

  const exactRoot=document.getElementById("exactResults");
  const analogRoot=document.getElementById("analogResults");

  if(exactRoot){
    exactRoot.innerHTML=exact.length
      ? groupCardHtml(exact,"exact-"+currentKey)
      : '<div class="product-group"><div class="product-group-head"><div class="product-title"><b>Нет точных предложений</b></div></div></div>';
  }

  if(analogRoot){
    analogRoot.innerHTML=analog.length
      ? analog.map(x=>groupCardHtml([x],"analog-"+x.id)).join("")
      : '<div class="product-group"><div class="product-group-head"><div class="product-title"><b>Нет аналогов</b></div></div></div>';
  }

  const analogSection=document.getElementById("analogSection");
  if(analogSection) analogSection.style.display=(currentFilter==="exact")?"none":"block";

  const count=exact.length+analog.length;
  const countEl=document.getElementById("offerCount");
  if(countEl) countEl.textContent=count;
}

function findItem(id){
  for(const data of Object.values(datasets)){
    const found=[...data.exact,...data.analogs].find(x=>x.id===id);
    if(found) return found;
  }
}

function changeQty(id,delta){
  quantities[id]=Math.max(1,(quantities[id]||1)+delta);
  const el=document.getElementById("qty-"+id);
  if(el) el.textContent=quantities[id];
}

function addToCart(id,btn){
  const item=findItem(id); if(!item) return;
  const orderQty=quantities[id]||1;
  const price=retail(item.purchase);
  const existing=cart.find(x=>x.id===id);
  if(existing){
    existing.orderQty+=orderQty;
    existing.selected=true;
  } else {
    cart.push({
      ...item,
      price,
      priceAtAdd:price,
      previousPrice:null,
      orderQty,
      availableQty:item.qty,
      selected:true,
      comment:"",
      priceChanged:false,
      availabilityChanged:false
    });
  }
  saveCart();
  if(btn){
    btn.classList.add("added");
    setTimeout(()=>{btn.classList.remove("added")},850);
  }
}

function changeCartQty(id,delta){
  const item=cart.find(x=>x.id===id); if(!item) return;
  item.orderQty=Math.max(1,item.orderQty+delta);
  saveCart();
}
function removeFromCart(id){ cart=cart.filter(x=>x.id!==id); saveCart(); }

function renderCart(){
  const count=cart.reduce((s,x)=>s+(x.orderQty||0),0);
  const top=document.getElementById("cartCount");
  const mobile=document.getElementById("mobileCartCount");
  if(top) top.textContent=count;
  if(mobile) mobile.textContent=count;
}

function refreshCartOffers(){
  let changed=0;
  cart.forEach(item=>{
    const live=findItem(item.id);
    if(!live) return;

    const nextPrice=retail(live.purchase);
    const nextAvailable=live.qty;

    item.previousPrice=item.price;
    item.priceChanged=item.price!==nextPrice;
    item.availabilityChanged=item.availableQty!==nextAvailable;
    if(item.priceChanged || item.availabilityChanged) changed++;

    item.price=nextPrice;
    item.availableQty=nextAvailable;
    if(item.availableQty===0) item.selected=false;
  });

  localStorage.setItem("zapformat-cart",JSON.stringify(cart));

  const status=document.getElementById("cartRefreshStatus");
  const time=document.getElementById("cartRefreshTime");
  const notice=document.getElementById("cartChangeNotice");
  if(status) status.textContent="Цены и наличие обновлены";
  if(time) time.textContent=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  if(notice){
    if(changed){
      notice.hidden=false;
      notice.textContent="Изменились цена или наличие у "+changed+" позиц.";
    } else {
      notice.hidden=true;
      notice.textContent="";
    }
  }
  renderCartPage();
}

function selectedCartItems(){
  return cart.filter(x=>x.selected && x.availableQty>0);
}

function renderCartPage(){
  const root=document.getElementById("orderCartRows");
  if(!root) return;

  if(!cart.length){
    root.innerHTML='<div style="padding:24px;background:#fff;color:#7b8892">Корзина пока пустая.</div>';
    const total=document.getElementById("orderCartTotal");
    if(total) total.textContent=rub(0);
    return;
  }

  root.innerHTML=cart.map((x,index)=>{
    const subtotal=x.price*x.orderQty;
    const unavailable=x.availableQty===0;
    const classes=["order-cart-row"];
    if(unavailable) classes.push("unavailable");
    if(x.priceChanged) classes.push("price-changed");

    const priceHtml=x.priceChanged && x.previousPrice && x.previousPrice!==x.price
      ? '<span class="cart-price-stack"><span class="old-price">'+rub(x.previousPrice)+'</span><span class="new-price">'+rub(x.price)+'</span><span class="changed-label">цена изменилась</span></span>'
      : '<span class="cart-price-stack"><span class="new-price">'+rub(x.price)+'</span></span>';

    return `
      <div class="${classes.join(" ")}">
        <div class="row-number">${index+1}</div>
        <div class="row-select"><input class="cart-check" type="checkbox" data-cart-select="${x.id}" ${x.selected?"checked":""} ${unavailable?"disabled":""}></div>
        <div class="brand-cell">${x.brand}</div>
        <div class="article-cell"><span class="cart-article">${x.article}</span></div>
        <div class="description-cell cart-description">${x.name}</div>
        <div class="warehouse-cell">${x.warehouse}</div>
        <div class="term-cell">${x.days===1?"1 день":x.days+" дня"}</div>
        <div class="qty-cell">
          <div class="cart-stepper">
            <button data-cart-minus="${x.id}">−</button>
            <span>${x.orderQty}</span>
            <button data-cart-plus="${x.id}">+</button>
          </div>
        </div>
        <div class="availability-cell cart-availability ${unavailable?"zero":""}">${x.availableQty}</div>
        <div class="price-cell cart-price-cell">${priceHtml}</div>
        <div class="sum-cell cart-sum-cell">${rub(subtotal)}</div>
        <div class="comment-cell cart-comment"><input data-cart-comment="${x.id}" value="${String(x.comment||"").replace(/"/g,"&quot;")}" placeholder="Комментарий"></div>
        <div class="remove-cell"><button class="cart-remove-icon" data-remove="${x.id}" aria-label="Удалить">×</button></div>
      </div>
    `;
  }).join("");

  const total=selectedCartItems().reduce((s,x)=>s+x.price*x.orderQty,0);
  const totalEl=document.getElementById("orderCartTotal");
  if(totalEl) totalEl.textContent=rub(total);
}

function toggleCartSelection(id,checked){
  const item=cart.find(x=>x.id===id); if(!item) return;
  item.selected=checked;
  saveCart();
}

function setCartComment(id,value){
  const item=cart.find(x=>x.id===id); if(!item) return;
  item.comment=value;
  localStorage.setItem("zapformat-cart",JSON.stringify(cart));
}

function clearCart(){
  cart=[];
  saveCart();
}

function deleteSelected(){
  cart=cart.filter(x=>!x.selected);
  saveCart();
}

function saveCartManual(){
  localStorage.setItem("zapformat-cart",JSON.stringify(cart));
  const btn=document.getElementById("saveCartButton");
  if(btn){
    const old=btn.textContent;
    btn.textContent="✓ Сохранено";
    setTimeout(()=>btn.textContent=old,900);
  }
}


document.addEventListener("click",e=>{
  const route=e.target.closest("[data-route]"); if(route){ navigate(route.dataset.route); return; }
  const query=e.target.closest("[data-query]"); if(query){ search(query.dataset.query); return; }
  const filter=e.target.closest("[data-filter]");
  if(filter){
    document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));
    filter.classList.add("active"); currentFilter=filter.dataset.filter; renderCatalog(); return;
  }
  const sort=e.target.closest("[data-sort]");
  if(sort){
    document.querySelectorAll("[data-sort]").forEach(x=>x.classList.remove("active"));
    sort.classList.add("active");
    const mode=sort.dataset.sort;
    currentSort=mode==="warehouse"?"recommended":mode;
    renderCatalog();
    return;
  }
  const show=e.target.closest("[data-show-group]");
  if(show){
    expandedGroups.add(show.dataset.showGroup);
    renderCatalog();
    return;
  }
  const plus=e.target.closest("[data-qty-plus]"); if(plus){ changeQty(plus.dataset.qtyPlus,1); return; }
  const minus=e.target.closest("[data-qty-minus]"); if(minus){ changeQty(minus.dataset.qtyMinus,-1); return; }
  const add=e.target.closest("[data-add]"); if(add){ addToCart(add.dataset.add,add); return; }
  const cplus=e.target.closest("[data-cart-plus]"); if(cplus){ changeCartQty(cplus.dataset.cartPlus,1); return; }
  const cminus=e.target.closest("[data-cart-minus]"); if(cminus){ changeCartQty(cminus.dataset.cartMinus,-1); return; }
  const remove=e.target.closest("[data-remove]"); if(remove){ removeFromCart(remove.dataset.remove); return; }
});

document.getElementById("searchForm").addEventListener("submit",e=>{e.preventDefault();search(document.getElementById("searchInput").value)});
document.getElementById("searchForm2").addEventListener("submit",e=>{e.preventDefault();search(document.getElementById("searchInput2").value)});

renderCart();
renderCatalog();
const aiInput=document.getElementById("searchInput");
if(aiInput && aiInput.tagName==="TEXTAREA"){
  aiInput.addEventListener("input",()=>{
    aiInput.style.height="auto";
    aiInput.style.height=Math.min(aiInput.scrollHeight,120)+"px";
  });
}

function restoreFromUrl(){
  const params=new URLSearchParams(location.search);
  const q=params.get("q");
  const view=params.get("view");
  if(q){
    currentKey=resolveDataset(q);
    const data=datasets[currentKey];
    document.getElementById("resultTitle") && (document.getElementById("resultTitle").textContent=data.title);
    document.getElementById("resultSubtitle") && (document.getElementById("resultSubtitle").textContent=data.subtitle+" · точные предложения и аналоги");
    document.getElementById("exactHeading") && (document.getElementById("exactHeading").textContent=data.subtitle);
    document.getElementById("searchInput2") && (document.getElementById("searchInput2").value=q);
    showRoute("search");
    renderCatalog();
  } else if(view){
    showRoute(view);
  } else {
    showRoute("home");
  }
}
window.addEventListener("popstate",restoreFromUrl);
document.getElementById("backButton")?.addEventListener("click",()=>history.back());
restoreFromUrl();

document.addEventListener("change",e=>{
  const select=e.target.closest("[data-cart-select]");
  if(select){ toggleCartSelection(select.dataset.cartSelect,select.checked); return; }
  const comment=e.target.closest("[data-cart-comment]");
  if(comment){ setCartComment(comment.dataset.cartComment,comment.value); }
});
document.addEventListener("input",e=>{
  const comment=e.target.closest("[data-cart-comment]");
  if(comment){ setCartComment(comment.dataset.cartComment,comment.value); }
});

document.getElementById("refreshCartButton")?.addEventListener("click",refreshCartOffers);
document.getElementById("clearCartButton")?.addEventListener("click",clearCart);
document.getElementById("deleteSelectedButton")?.addEventListener("click",deleteSelected);
document.getElementById("saveCartButton")?.addEventListener("click",saveCartManual);
document.getElementById("checkoutOrderButton")?.addEventListener("click",()=>{
  const selected=selectedCartItems();
  if(!selected.length){ alert("Отметьте хотя бы одну доступную позицию."); return; }
  alert("Заказ готов к отправке. Реальную отправку подключим к серверной части.");
});
document.getElementById("cartBackButton")?.addEventListener("click",()=>history.back());

document.getElementById("cartFileInput")?.addEventListener("change",async e=>{
  const file=e.target.files?.[0]; if(!file) return;
  const text=await file.text();
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let added=0;
  for(const line of lines){
    const [articleRaw,qtyRaw]=line.split(/[;,\t]/);
    const article=(articleRaw||"").trim();
    const orderQty=Math.max(1,parseInt(qtyRaw||"1",10)||1);
    let found=null;
    for(const data of Object.values(datasets)){
      found=[...data.exact,...data.analogs].find(x=>x.article.toLowerCase()===article.toLowerCase());
      if(found) break;
    }
    if(found){
      quantities[found.id]=orderQty;
      addToCart(found.id);
      added++;
    }
  }
  alert("Добавлено позиций: "+added);
  e.target.value="";
});

const originalNavigate=navigate;
navigate=function(route,push=true){
  originalNavigate(route,push);
  if(route==="cart"){
    refreshCartOffers();
    renderCartPage();
  }
};
renderCartPage();

let activeReturnKey=null;
let demoReturnRequests=(()=>{
  try{return JSON.parse(localStorage.getItem("zapformat-demo-returns")||"[]")}catch{return []}
})();

function findCatalogItemById(id){
  for(const data of Object.values(datasets)){
    const found=[...data.exact,...data.analogs].find(x=>x.id===id);
    if(found) return found;
  }
  return null;
}

function orderTimelineHtml(steps,compact=false){
  return '<div class="'+(compact?'position-timeline':'order-timeline')+'">'+steps.map((step,index)=>{
    const state=step.state||"";
    return '<div class="timeline-step '+state+'">'+
      '<span class="timeline-dot"></span>'+
      '<div class="timeline-copy">'+
        (!compact?'<small>'+step.date+'</small>':'')+
        '<b>'+step.title+'</b>'+
      '</div>'+
    '</div>';
  }).join("")+'</div>';
}

function returnRequestFor(orderId,itemId){
  return demoReturnRequests.find(x=>x.orderId===orderId && x.itemId===itemId);
}

function renderOrderDetail(id){
  const mount=document.getElementById("orderDetailMount");
  const order=demoOrders[id];
  if(!mount || !order) return;

  const itemsHtml=order.items.map((item,index)=>{
    const key=order.id+":"+item.id;
    const request=returnRequestFor(order.id,item.id);
    const returnPanel=activeReturnKey===key ? `
      <form class="return-form" data-return-form="${key}">
        <div class="return-form-head"><b>Возврат позиции</b><button type="button" data-cancel-return>×</button></div>
        <div class="return-form-grid">
          <label><span>Причина</span><select name="reason" required><option value="">Выберите причину</option><option>Не подошла деталь</option><option>Повреждение</option><option>Не соответствует заказу</option><option>Другая причина</option></select></label>
          <label><span>Количество</span><input name="qty" type="number" min="1" max="${item.qty}" value="1" required></label>
          <label class="return-comment"><span>Комментарий</span><textarea name="comment" rows="2" placeholder="Коротко опишите причину"></textarea></label>
        </div>
        <div class="return-form-actions"><button type="button" data-cancel-return>Отмена</button><button class="account-primary" type="submit">Создать заявку</button></div>
      </form>` : "";

    const returnAction=request
      ? '<span class="return-created">Возврат #'+request.requestId+' создан</span>'
      : item.returnAllowed
        ? '<button class="position-return" data-start-return="'+key+'">Оформить возврат</button>'
        : '<button class="position-return" disabled>Возврат после получения</button>';

    return `
      <article class="order-position">
        <div class="position-top">
          <div class="position-index">${index+1}</div>
          <div class="position-title">
            <div class="position-brand-row"><b>${item.brand}</b><span>${item.article}</span></div>
            <h3>${item.name}</h3>
          </div>
          <strong class="status ${item.statusClass||""}">${item.status}</strong>
        </div>

        <div class="position-meta">
          <div><small>Количество</small><b>${item.qty} шт.</b></div>
          <div><small>Цена</small><b>${rub(item.price)}</b></div>
          <div><small>Сумма</small><b>${rub(item.price*item.qty)}</b></div>
          <div><small>Склад</small><b>${item.warehouse}</b></div>
          <div><small>Срок</small><b>${item.term}</b></div>
        </div>

        ${orderTimelineHtml(item.timeline,true)}

        <div class="position-actions">
          ${returnAction}
        </div>
        ${returnPanel}
      </article>
    `;
  }).join("");

  mount.innerHTML=`
    <div class="order-detail-head">
      <button class="order-detail-back" data-account-tab="orders">← Все заказы</button>
      <div class="order-detail-title">
        <div>
          <span class="eyebrow">ЗАКАЗ</span>
          <h2>#${order.id}</h2>
          <p>${order.date} · ${order.time}</p>
        </div>
        <div class="order-detail-state">
          <strong class="status ${order.statusClass||""}">${order.status}</strong>
          <b>${rub(order.total)}</b>
        </div>
      </div>
      <div class="order-detail-actions">
        <button data-repeat-order="${order.id}">Повторить заказ</button>
      </div>
    </div>

    <div class="order-summary-grid">
      <article><span>Дата</span><b>${order.date}</b><small>${order.time}</small></article>
      <article><span>Сумма</span><b>${rub(order.total)}</b><small>итого по заказу</small></article>
      <article><span>Позиций</span><b>${order.items.length}</b><small>${order.items.reduce((s,x)=>s+x.qty,0)} шт.</small></article>
      <article><span>Статус</span><b>${order.status}</b><small>обновляется по позициям</small></article>
    </div>

    <section class="order-detail-block">
      <div class="order-detail-block-head"><span class="eyebrow">ДВИЖЕНИЕ ЗАКАЗА</span><h3>Временная шкала</h3></div>
      ${orderTimelineHtml(order.timeline)}
    </section>

    <section class="order-detail-block positions-block">
      <div class="order-detail-block-head"><span class="eyebrow">ПОЗИЦИИ</span><h3>Состав заказа</h3></div>
      <div class="order-positions">${itemsHtml}</div>
    </section>

    <div class="order-detail-grid">
      <section class="order-detail-block">
        <div class="order-detail-block-head"><span class="eyebrow">КОММЕНТАРИЙ</span><h3>К заказу</h3></div>
        <p class="order-comment">${order.comment}</p>
      </section>

      <section class="order-detail-block">
        <div class="order-detail-block-head"><span class="eyebrow">ПОЛУЧЕНИЕ</span><h3>${order.receive.method}</h3></div>
        <dl class="receive-info">
          <div><dt>Город</dt><dd>${order.receive.city}</dd></div>
          <div><dt>Точка</dt><dd>${order.receive.point}</dd></div>
          <div><dt>Получатель</dt><dd>${order.receive.recipient}</dd></div>
        </dl>
        <p class="receive-note">${order.receive.note}</p>
      </section>
    </div>
  `;
}

function openOrderDetail(id){
  if(!demoOrders[id]) return;
  activeReturnKey=null;
  localStorage.setItem("zapformat-order-detail",id);
  renderOrderDetail(id);
  showAccountTab("order-detail");
  window.scrollTo({top:0,behavior:"auto"});
}

function repeatOrder(id){
  const order=demoOrders[id];
  if(!order) return;
  for(const position of order.items){
    const item=findCatalogItemById(position.sourceId);
    if(!item) continue;
    const existing=cart.find(x=>x.id===item.id);
    const price=retail(item.purchase);
    if(existing){
      existing.orderQty+=position.qty;
      existing.selected=true;
      existing.price=price;
      existing.availableQty=item.qty;
    }else{
      cart.push({
        ...item,
        price,
        priceAtAdd:price,
        previousPrice:null,
        orderQty:position.qty,
        availableQty:item.qty,
        selected:true,
        comment:"",
        priceChanged:false,
        availabilityChanged:false
      });
    }
  }
  saveCart();
  navigate("cart");
}

function startReturn(key){
  activeReturnKey=key;
  const [orderId]=key.split(":");
  renderOrderDetail(orderId);
  requestAnimationFrame(()=>document.querySelector('[data-return-form="'+key+'"]')?.scrollIntoView({block:"center",behavior:"smooth"}));
}

function cancelReturn(){
  if(!activeReturnKey) return;
  const [orderId]=activeReturnKey.split(":");
  activeReturnKey=null;
  renderOrderDetail(orderId);
}

function showAccountTab(tab){
  document.querySelectorAll(".account-pane").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll("[data-account-tab]").forEach(x=>x.classList.remove("active"));
  document.getElementById("account-"+tab)?.classList.add("active");
  document.querySelectorAll('[data-account-tab="'+tab+'"]').forEach(x=>x.classList.add("active"));
  try{ localStorage.setItem("zapformat-account-tab",tab); }catch{}
}

document.addEventListener("click",e=>{
  const tab=e.target.closest("[data-account-tab]");
  if(tab){ showAccountTab(tab.dataset.accountTab); return; }

  const detail=e.target.closest("[data-order-detail]");
  if(detail){
    openOrderDetail(detail.dataset.orderDetail);
    return;
  }

  const repeat=e.target.closest("[data-repeat-order]");
  if(repeat){
    repeatOrder(repeat.dataset.repeatOrder);
    return;
  }

  const startReturnButton=e.target.closest("[data-start-return]");
  if(startReturnButton){
    startReturn(startReturnButton.dataset.startReturn);
    return;
  }

  if(e.target.closest("[data-cancel-return]")){
    cancelReturn();
    return;
  }
});

document.addEventListener("submit",e=>{
  const form=e.target.closest("[data-return-form]");
  if(!form) return;
  e.preventDefault();

  const [orderId,itemId]=form.dataset.returnForm.split(":");
  const order=demoOrders[orderId];
  const item=order?.items.find(x=>x.id===itemId);
  if(!order || !item) return;

  const data=Object.fromEntries(new FormData(form).entries());
  const requestId="R"+String(Date.now()).slice(-6);
  demoReturnRequests.push({
    requestId,
    orderId,
    itemId,
    article:item.article,
    brand:item.brand,
    qty:Number(data.qty)||1,
    reason:data.reason||"",
    comment:data.comment||"",
    createdAt:new Date().toISOString()
  });
  localStorage.setItem("zapformat-demo-returns",JSON.stringify(demoReturnRequests));
  activeReturnKey=null;
  renderOrderDetail(orderId);
});

document.getElementById("profileForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.currentTarget).entries());
  localStorage.setItem("zapformat-profile",JSON.stringify(data));
  const btn=e.currentTarget.querySelector("button[type=submit]");
  const old=btn.textContent; btn.textContent="Сохранено"; setTimeout(()=>btn.textContent=old,900);
});

document.getElementById("deliveryForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const btn=e.currentTarget.querySelector("button[type=submit]");
  const old=btn.textContent; btn.textContent="Сохранено"; setTimeout(()=>btn.textContent=old,900);
});

document.getElementById("addCarButton")?.addEventListener("click",()=>{
  alert("Добавление автомобиля подключим через форму VIN / марка / модель / двигатель.");
});

try{
  const savedProfile=JSON.parse(localStorage.getItem("zapformat-profile")||"null");
  if(savedProfile && document.getElementById("profileForm")){
    for(const [key,value] of Object.entries(savedProfile)){
      const input=document.querySelector('#profileForm [name="'+key+'"]');
      if(input) input.value=value;
    }
  }
  const savedTab=localStorage.getItem("zapformat-account-tab");
  if(savedTab==="order-detail"){
    const savedOrder=localStorage.getItem("zapformat-order-detail");
    if(savedOrder && demoOrders[savedOrder]){
      renderOrderDetail(savedOrder);
      showAccountTab("order-detail");
    }else{
      showAccountTab("orders");
    }
  }else if(savedTab){
    showAccountTab(savedTab);
  }
}catch{}
