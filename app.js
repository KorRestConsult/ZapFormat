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

let currentKey = "0250603006";
let currentFilter = "all";
let currentSort = "recommended";
let quantities = {};
let expandedGroups = new Set();
let cart = loadCart();
const defaultGarageState = {
  vehicle:{
    id:null,
    brand:"",
    model:"",
    year:"",
    engine:"",
    vin:"",
    plate:"",
    mileage:0,
    isDefault:false
  },
  maintenance:[],
  measurements:[],
  history:[]
};
let garageTab="overview";
let garageMeasurementOpen=false;
let garageHistoryOpen=false;
let garageVehicles=[];
let garageActiveVehicleId=null;
let garageState=loadGarageState();

function loadGarageState(){
  try{
    const saved=JSON.parse(localStorage.getItem("zapformat-garage")||"null");
    if(!saved || String(saved?.vehicle?.id||"").startsWith("demo-")) return structuredClone(defaultGarageState);
    return {...structuredClone(defaultGarageState),...saved,vehicle:{...defaultGarageState.vehicle,...saved.vehicle}};
  }catch{
    return structuredClone(defaultGarageState);
  }
}
function saveGarageState(){
  try{localStorage.setItem("zapformat-garage",JSON.stringify(garageState))}catch{}
}


function retail(p){ return Math.round(p * (1 + MARKUP/100)); }
function itemRetail(item){
  const live=Number(item?.retailPrice);
  if(Number.isFinite(live) && live>=0) return Math.round(live);
  return retail(Number(item?.purchase||0));
}
function rub(n){ return new Intl.NumberFormat("ru-RU").format(n) + " ₽"; }

function showToast(message,type=""){
  let root=document.getElementById("appToast");
  if(!root){
    root=document.createElement("div");
    root.id="appToast";
    root.className="app-toast";
    root.setAttribute("role","status");
    root.setAttribute("aria-live","polite");
    document.body.appendChild(root);
  }
  root.textContent=message;
  root.className="app-toast show"+(type?" "+type:"");
  clearTimeout(showToast._timer);
  showToast._timer=setTimeout(()=>root.classList.remove("show"),2400);
}
function loadCart(){
  try{
    const raw=JSON.parse(localStorage.getItem("zapformat-cart") || "[]");
    return raw
      .filter(x=>x && (x.offerToken || x.live===true))
      .map(x=>{
        const stale=Boolean(x.stale || !x.offerToken);
        return {
          ...x,
          orderQty:x.orderQty ?? x.qty ?? 1,
          availableQty:x.availableQty ?? x.available ?? x.qty ?? 0,
          selected:stale ? false : (x.selected ?? true),
          comment:x.comment ?? "",
          priceAtAdd:x.priceAtAdd ?? x.price ?? 0,
          previousPrice:x.previousPrice ?? null,
          priceChanged:x.priceChanged ?? false,
          availabilityChanged:x.availabilityChanged ?? false,
          stale,
          offerToken:x.offerToken||null
        };
      });
  }catch{return []}
}
function saveCart(){
  localStorage.setItem("zapformat-cart", JSON.stringify(cart));
  renderCart();
  renderCartPage();
  scheduleCartSync();
}

const API_BASE = (() => {
  const configured=String(window.ZAPFORMAT_CONFIG?.apiBase || "").trim().replace(/\/$/,"");
  if(configured) return configured;
  return location.hostname.endsWith("github.io") ? "" : location.origin;
})();
let sessionUser=null;
let pendingAccountRoute="profile";
let liveAccountRequests=[];
let liveAccountOrders=[];
let accountDataHydrated=false;
let cartSyncTimer=null;
let cartSyncReady=false;
let cartHydratedUserId=null;
let lastSmartSearchQuery="";
let smartSearchBusy=false;

function backendConfigured(){ return Boolean(API_BASE); }

async function apiRequest(path,options={}){
  if(!backendConfigured()){
    const error=new Error("backend_not_configured");
    error.code="backend_not_configured";
    throw error;
  }
  const response=await fetch(API_BASE+path,{
    ...options,
    credentials:"include",
    headers:{
      "Accept":"application/json",
      ...(options.body ? {"Content-Type":"application/json"} : {}),
      ...(options.headers||{})
    }
  });
  if(response.status===204) return null;
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data.error||("http_"+response.status));
    error.code=data.error||("http_"+response.status);
    error.status=response.status;
    error.data=data;
    throw error;
  }
  return data;
}

function cartPayload(){
  return cart
    .filter(item=>item && item.offerToken && item.article && item.brand)
    .slice(0,100)
    .map(item=>({
      client_id:String(item.id||"").slice(0,160),
      article:item.article,
      brand:item.brand,
      description:item.name||"",
      warehouse:item.warehouse||"",
      delivery_days:Number.isFinite(Number(item.days)) ? Number(item.days) : null,
      quantity:Math.max(1,Math.trunc(Number(item.orderQty)||1)),
      available_quantity:Number.isFinite(Number(item.availableQty)) ? Math.max(0,Math.trunc(Number(item.availableQty))) : null,
      unit_price:Math.max(0,Number(item.price)||0),
      comment:item.comment||"",
      selected:item.selected!==false,
      offer_token:item.offerToken,
      vehicle_id:item.vehicleContext?.id||null
    }));
}

async function syncCartToAccount(){
  if(!cartSyncReady || !backendConfigured() || !sessionUser) return;
  try{
    await apiRequest("/api/cart",{
      method:"PUT",
      body:JSON.stringify({items:cartPayload()})
    });
  }catch(error){
    console.warn("ZapFormat cart sync failed",error);
  }
}

function scheduleCartSync(){
  if(!cartSyncReady || !backendConfigured() || !sessionUser) return;
  clearTimeout(cartSyncTimer);
  cartSyncTimer=setTimeout(()=>syncCartToAccount(),650);
}

function cartItemFromAccount(item){
  const price=Math.max(0,Number(item?.unit_price)||0);
  const available=Math.max(0,Number(item?.available_quantity)||0);
  const stale=!item?.offer_token;
  return {
    id:String(item?.client_id||("saved-"+item?.id)),
    type:"saved",
    brand:String(item?.brand||""),
    article:String(item?.article||""),
    name:String(item?.description||"Автозапчасть"),
    warehouse:String(item?.warehouse||"Поставка"),
    source:"Сохранённая корзина",
    purchase:0,
    retailPrice:price,
    qty:available,
    days:Math.max(0,Number(item?.delivery_days)||0),
    live:true,
    quoteOnly:false,
    price,
    priceAtAdd:price,
    previousPrice:null,
    orderQty:Math.max(1,Math.trunc(Number(item?.quantity)||1)),
    availableQty:available,
    selected:stale ? false : item?.selected!==false,
    comment:String(item?.comment||""),
    priceChanged:false,
    availabilityChanged:false,
    stale,
    offerToken:item?.offer_token||null,
    vehicleContext:item?.vehicle?.id ? {
      id:item.vehicle.id,
      label:[item.vehicle.brand,item.vehicle.model,item.vehicle.generation].filter(Boolean).join(" "),
      vin:item.vehicle.vin||""
    } : null
  };
}

async function hydrateCartFromAccount(){
  if(!backendConfigured() || !sessionUser) return;
  const userId=String(sessionUser.id||"");
  if(cartHydratedUserId===userId) return;

  cartSyncReady=false;
  try{
    const data=await apiRequest("/api/cart");
    const remote=(data?.items||[]).map(cartItemFromAccount);
    const merged=new Map();

    for(const item of remote){
      merged.set(String(item.id),item);
    }
    for(const item of cart){
      if(item?.id) merged.set(String(item.id),item);
    }

    cart=[...merged.values()];
    localStorage.setItem("zapformat-cart",JSON.stringify(cart));
    renderCart();
    renderCartPage();
    scheduleCartSync();

    cartHydratedUserId=userId;
    cartSyncReady=true;
    await syncCartToAccount();
  }catch(error){
    console.warn("ZapFormat cart hydration failed",error);
    cartHydratedUserId=userId;
    cartSyncReady=true;
  }
}

function authErrorText(error){
  const code=error?.code||error?.message;
  const map={
    backend_not_configured:"Backend авторизации подготовлен, но публичный HTTPS-адрес API ещё не указан.",
    invalid_credentials:"Неверный телефон/email или пароль.",
    password_too_short:"Пароль должен быть не короче 8 символов.",
    user_already_exists:"Аккаунт с таким телефоном или email уже существует.",
    name_and_identity_required:"Укажите имя и телефон или email.",
    login_and_password_required:"Введите телефон/email и пароль.",
    unauthorized:"Нужно войти в аккаунт.",
    conflict:"Такие данные уже используются другим аккаунтом."
  };
  return map[code]||"Не удалось выполнить запрос. Проверьте соединение и попробуйте ещё раз.";
}

function setAuthStatus(message,type=""){
  const root=document.getElementById("authStatus");
  if(!root) return;
  root.textContent=message||"";
  root.className="auth-status"+(type?" "+type:"");
}

function showAuthTab(tab){
  document.querySelectorAll("[data-auth-tab]").forEach(x=>x.classList.toggle("active",x.dataset.authTab===tab));
  document.querySelectorAll("[data-auth-pane]").forEach(x=>x.classList.toggle("active",x.dataset.authPane===tab));
  setAuthStatus("");
}

function updateCheckoutMode(){
  const button=document.getElementById("checkoutOrderButton");
  const note=document.querySelector(".checkout-recheck-note");
  if(button && !button.disabled){
    button.textContent=sessionUser ? "Оформить заказ" : "Отправить запрос";
  }
  if(note){
    note.textContent=sessionUser
      ? "Цена и наличие проверяются повторно. После оформления заказ сразу появится в личном кабинете."
      : "Без входа отправим запрос менеджеру. Войдите, чтобы создать заказ сразу и видеть его статус.";
  }
}

function applySessionUser(){
  const headerProfile=document.getElementById("accountEntryButton");
  if(headerProfile){
    headerProfile.textContent=sessionUser?.name || "Войти";
    headerProfile.dataset.route=sessionUser ? "profile" : "auth";
  }

  const userBox=document.querySelector(".account-user");
  if(userBox && sessionUser){
    const avatar=userBox.querySelector(".account-avatar");
    const title=userBox.querySelector("b");
    const sub=userBox.querySelector("span");
    const initials=((sessionUser.name||"").slice(0,1)+(sessionUser.surname||"").slice(0,1)).toUpperCase()||"ZF";
    if(avatar) avatar.textContent=initials;
    if(title) title.textContent=[sessionUser.name,sessionUser.surname].filter(Boolean).join(" ");
    if(sub) sub.textContent=sessionUser.phone||sessionUser.email||"ZapFormat";
  }

  const logout=document.getElementById("logoutButton");
  if(logout) logout.hidden=!sessionUser;

  const form=document.getElementById("profileForm");
  if(form && sessionUser){
    const values={
      name:sessionUser.name||"",
      surname:sessionUser.surname||"",
      phone:sessionUser.phone||"",
      email:sessionUser.email||""
    };
    for(const [name,value] of Object.entries(values)){
      const input=form.querySelector('[name="'+name+'"]');
      if(input) input.value=value;
    }
  }

  if(sessionUser){
    const quoteName=document.getElementById("quoteName");
    const quotePhone=document.getElementById("quotePhone");
    const fullName=[sessionUser.name,sessionUser.surname].filter(Boolean).join(" ");
    if(quoteName && !String(quoteName.value||"").trim() && fullName) quoteName.value=fullName;
    if(quotePhone && !String(quotePhone.value||"").trim() && sessionUser.phone) quotePhone.value=sessionUser.phone;
  }

  updateCheckoutMode();
  updateVehicleContextUi();
}

function formatDateRu(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ru-RU");
}

function requestStatusLabel(status){
  const map={
    new:"Принят",
    received:"Принят",
    confirmed:"Подтверждён",
    processing:"В работе",
    ready:"Готов",
    completed:"Завершён",
    cancelled:"Отменён",
    created:"Создан",
    review:"На рассмотрении",
    approved:"Одобрен",
    rejected:"Отклонён",
    refunded:"Возврат выполнен"
  };
  return map[String(status||"").toLowerCase()] || String(status||"Принят");
}

function renderLiveAccount(overview,orders,requests,garage){
  const stats=document.getElementById("accountLiveStats");
  if(stats){
    stats.innerHTML=`
      <article><span>Активные заказы</span><b>${overview?.stats?.active_orders ?? 0}</b><small>заказы и запросы</small></article>
      <article><span>Готово к получению</span><b>${overview?.stats?.ready_orders ?? 0}</b><small>можно забирать</small></article>
      <article><span>Автомобили</span><b>${overview?.stats?.vehicles ?? 0}</b><small>в гараже</small></article>
      <article><span>Возвраты</span><b>${overview?.stats?.active_returns ?? 0}</b><small>активные заявки</small></article>`;
  }

  const entries=[
    ...(orders||[]).map(order=>({
      kind:"order",
      key:String(order.id),
      number:String(order.order_number),
      created_at:order.created_at,
      items_count:Number(order.items_count||0),
      total:Number(order.total_amount||0),
      status:order.status
    })),
    ...(requests||[]).map(request=>({
      kind:"request",
      key:String(request.id),
      number:String(request.id),
      created_at:request.created_at,
      items_count:Number(request.items_count||0),
      total:Number(request.quoted_total||0),
      needs_confirmation:Boolean(request.needs_confirmation),
      status:request.status
    }))
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

  const recent=document.getElementById("accountRecentRequests");
  if(recent){
    const rows=entries.slice(0,3);
    recent.innerHTML=rows.length ? rows.map(row=>{
      const isOrder=row.kind==="order";
      const detailAttr=isOrder
        ? `data-live-order-detail="${row.key}"`
        : `data-live-request-detail="${row.key}"`;
      return `
        <article class="account-order" ${detailAttr} tabindex="0">
          <div>
            <small>#${row.number} · ${formatDateRu(row.created_at)}</small>
            <b>${isOrder?"Заказ ZapFormat":"Запрос на запчасти"}</b>
            <span>${row.items_count} поз. · ${isOrder?rub(row.total):(row.needs_confirmation&&row.total===0?"сумма уточняется":rub(row.total))}</span>
          </div>
          <div class="order-progress"><i class="done"></i><i></i><i></i><i></i></div>
          <strong class="status">${requestStatusLabel(row.status)}</strong>
        </article>`;
    }).join("") : '<div class="account-empty"><p>Пока нет заказов. Найдите запчасть и оформите первый заказ.</p></div>';
  }

  const table=document.getElementById("accountOrdersTable");
  if(table){
    const head='<div class="account-table-head"><span>Заказ</span><span>Дата</span><span>Позиций</span><span>Сумма</span><span>Статус</span><span></span></div>';
    const rows=entries.map(row=>{
      const isOrder=row.kind==="order";
      const totalText=isOrder
        ? rub(row.total)
        : (row.needs_confirmation&&row.total===0 ? "уточняется" : rub(row.total));
      const detailAttr=isOrder
        ? `data-live-order-detail="${row.key}"`
        : `data-live-request-detail="${row.key}"`;
      return `<div class="account-table-row">
        <b>#${row.number}</b>
        <span>${formatDateRu(row.created_at)}</span>
        <span>${row.items_count}</span>
        <span>${totalText}</span>
        <strong class="status">${requestStatusLabel(row.status)}</strong>
        <button ${detailAttr}>Подробнее</button>
      </div>`;
    }).join("");
    table.innerHTML=head+(rows||'<div class="account-empty"><p>Реальных заказов пока нет.</p></div>');
  }

  const garagePreview=document.getElementById("accountGaragePreview");
  if(garagePreview){
    const vehicle=garage?.vehicles?.[0];
    garagePreview.innerHTML=vehicle
      ? `<div class="account-car"><div class="car-mark">${vehicle.brand}</div><div><b>${vehicle.brand} ${vehicle.model}</b><span>${vehicle.year||"—"} · ${vehicle.engine||""}</span><small>${vehicle.vin||"VIN не указан"}</small></div></div>`
      : "Добавьте автомобиль в гараж.";
  }
}


function renderAccountPreferences(preferences){
  const delivery=preferences?.delivery||null;
  const form=document.getElementById("deliveryForm");
  if(form){
    const values={
      city:delivery?.city||"Рязань",
      address:delivery?.address||"",
      recipient:delivery?.recipient_name||sessionUser?.name||"",
      phone:delivery?.recipient_phone||sessionUser?.phone||""
    };
    for(const [key,value] of Object.entries(values)){
      const input=form.querySelector('[name="'+key+'"]');
      if(input) input.value=value||"";
    }
  }

  const preview=document.getElementById("accountDeliveryPreview");
  if(preview){
    preview.textContent=delivery?.address
      ? [delivery.city,delivery.address].filter(Boolean).join(" · ")
      : "Укажите основную точку или адрес получения.";
  }

  const notifications=preferences?.notifications||{};
  const map={orderStatus:"order_status",positionChange:"item_changes",returns:"returns",marketing:"marketing"};
  document.querySelectorAll("[data-notification]").forEach(input=>{
    const key=map[input.dataset.notification];
    if(key && Object.prototype.hasOwnProperty.call(notifications,key)){
      input.checked=Boolean(notifications[key]);
    }
  });
}

function renderAccountReports(report){
  const mount=document.getElementById("accountReportStats");
  if(!mount) return;
  const monthLabel=new Intl.DateTimeFormat("ru-RU",{month:"long"}).format(new Date());
  mount.innerHTML=
    '<article><span>Заказов за месяц</span><b>'+Number(report?.orders_count||0)+'</b><small>'+monthLabel+'</small></article>'+
    '<article><span>Покупок</span><b>'+rub(Number(report?.purchases_total||0))+'</b><small>за месяц</small></article>'+
    '<article><span>Возвратов</span><b>'+Number(report?.returns_count||0)+'</b><small>за месяц</small></article>'+
    '<article><span>Средний заказ</span><b>'+rub(Number(report?.average_order||0))+'</b><small>за месяц</small></article>';
}

function renderAccountReturns(data){
  const mount=document.getElementById("accountReturnsList");
  if(!mount) return;
  const rows=Array.isArray(data?.returns)?data.returns:[];
  if(!rows.length){
    mount.innerHTML=
      '<div class="account-empty">'+
        '<div class="empty-icon">↩</div>'+
        '<h3>Возвратов пока нет</h3>'+
        '<p>Откройте завершённый заказ и выберите нужную позицию.</p>'+
        '<button data-account-tab="orders">Перейти к заказам</button>'+
      '</div>';
    return;
  }

  mount.innerHTML='<div class="account-order-list">'+rows.map(row=>
    '<article class="account-order">'+
      '<div>'+
        '<small>Возврат #'+escapeHtml(row.return_number)+' · заказ #'+escapeHtml(row.order_number)+' · '+formatDateRu(row.created_at)+'</small>'+
        '<b>'+escapeHtml(row.brand||"")+' '+escapeHtml(row.article||"")+'</b>'+
        '<span>'+escapeHtml(row.reason||"")+' · '+Number(row.quantity||1)+' шт.</span>'+
      '</div>'+
      '<strong class="status">'+requestStatusLabel(row.status)+'</strong>'+
    '</article>'
  ).join("")+'</div>';
}

function normalizeGarageVehicle(vehicle){
  return {
    id:vehicle?.id||null,
    brand:String(vehicle?.brand||""),
    model:String(vehicle?.model||""),
    generation:String(vehicle?.generation||""),
    year:vehicle?.year||"",
    engine:String(vehicle?.engine||""),
    vin:String(vehicle?.vin||""),
    plate:String(vehicle?.plate_number||vehicle?.plate||""),
    mileage:Number(vehicle?.current_mileage??vehicle?.mileage??0)||0,
    isDefault:Boolean(vehicle?.is_default)
  };
}

async function hydrateRealGarage(garage){
  if(!sessionUser) return;

  garageVehicles=(garage?.vehicles||[]).map(normalizeGarageVehicle);

  if(!garageVehicles.length){
    garageActiveVehicleId=null;
    garageState=structuredClone(defaultGarageState);
    saveGarageState();
    renderGarageApp();
    updateVehicleContextUi();
    return;
  }

  let vehicle=
    garageVehicles.find(x=>String(x.id)===String(garageActiveVehicleId)) ||
    garageVehicles.find(x=>x.isDefault) ||
    garageVehicles[0];

  garageActiveVehicleId=vehicle.id;

  try{
    const detail=await apiRequest("/api/garage/vehicles/"+encodeURIComponent(vehicle.id));
    const currentMileage=Number(detail.vehicle.current_mileage||0);
    garageState={
      vehicle:normalizeGarageVehicle(detail.vehicle),
      maintenance:(detail.maintenance||[]).map(x=>{
        const nextMileage=x.next_service_mileage===null ? null : Number(x.next_service_mileage);
        const remaining=nextMileage===null ? null : nextMileage-currentMileage;
        return {
          id:x.id,
          code:x.code||"",
          title:x.title,
          intervalKm:x.interval_km,
          lastKm:x.last_service_mileage,
          nextKm:nextMileage,
          status:remaining===null ? "measure" : remaining<=2500 ? "soon" : "ok",
          query:x.part_search_query||""
        };
      }),
      measurements:(detail.measurements||[]).map(x=>({
        id:x.id,
        type:x.measurement_type,
        value:x.value ?? x.value_text ?? "",
        unit:x.unit||"",
        note:x.note||"",
        date:formatDateRu(x.measured_at)
      })),
      history:(detail.history||[]).map(x=>({
        id:x.id,
        date:formatDateRu(x.service_date),
        mileage:x.mileage||0,
        title:x.title,
        note:x.note||""
      }))
    };
    saveGarageState();
    renderGarageApp();
    updateVehicleContextUi();
  }catch(error){
    console.warn("Garage hydration failed",error);
  }
}

async function selectGarageVehicle(vehicleId){
  if(!sessionUser || !vehicleId || String(vehicleId)===String(garageActiveVehicleId)) return;
  const target=garageVehicles.find(x=>String(x.id)===String(vehicleId));
  if(!target) return;

  garageActiveVehicleId=target.id;
  garageTab="overview";
  garageMeasurementOpen=false;
  garageHistoryOpen=false;

  try{
    await apiRequest("/api/garage/vehicles/"+encodeURIComponent(target.id)+"/default",{method:"POST"});
    garageVehicles=garageVehicles.map(x=>({...x,isDefault:String(x.id)===String(target.id)}));
    await hydrateRealGarage({vehicles:garageVehicles.map(x=>({
      id:x.id,brand:x.brand,model:x.model,generation:x.generation,year:x.year,engine:x.engine,
      vin:x.vin,plate_number:x.plate,current_mileage:x.mileage,is_default:x.isDefault
    }))});
    accountDataHydrated=false;
  }catch(error){
    console.error("Garage vehicle switch failed",error);
    showToast("Не удалось переключить автомобиль.","warn");
  }
}

async function hydrateAccountData(){
  if(!backendConfigured() || !sessionUser) return;
  try{
    const [overview,orders,requests,garage,preferences,reports,returnsData]=await Promise.all([
      apiRequest("/api/account/overview"),
      apiRequest("/api/account/orders"),
      apiRequest("/api/account/requests"),
      apiRequest("/api/garage"),
      apiRequest("/api/account/preferences"),
      apiRequest("/api/account/reports"),
      apiRequest("/api/account/returns")
    ]);
    liveAccountOrders=orders.orders||[];
    liveAccountRequests=requests.requests||[];
    renderLiveAccount(overview,liveAccountOrders,liveAccountRequests,garage);
    renderAccountPreferences(preferences);
    renderAccountReports(reports);
    renderAccountReturns(returnsData);
    await hydrateRealGarage(garage);
    accountDataHydrated=true;
  }catch(error){
    console.warn("Account hydration failed",error);
  }
}


async function repeatLiveOrder(orderId,button){
  const original=button?.textContent||"Повторить заказ";
  if(button){
    button.disabled=true;
    button.textContent="Проверяем…";
  }

  try{
    const data=await apiRequest("/api/account/orders/"+encodeURIComponent(orderId));
    const items=Array.isArray(data?.items)?data.items:[];
    if(!items.length){
      showToast("В заказе нет позиций для повтора.","warn");
      return;
    }

    let added=0;
    let unavailable=0;

    for(const item of items){
      try{
        const offersData=await apiRequest(
          "/api/catalog/offers?number="+encodeURIComponent(item.article)+
          "&brand="+encodeURIComponent(item.brand||"")
        );
        const qty=Math.max(1,Number(item.quantity||1));
        const offers=(Array.isArray(offersData?.offers)?offersData.offers:[])
          .filter(o=>o?.offer_token && Number(o.availability||0)>=qty);

        const offer=offers[0];
        if(!offer){
          unavailable++;
          continue;
        }

        const token=offer.offer_token;
        const existing=cart.find(x=>x.offerToken===token);
        if(existing){
          existing.orderQty+=qty;
          existing.availableQty=Number(offer.availability||existing.availableQty||0);
          existing.price=Number(offer.price||existing.price||0);
          existing.retailPrice=Number(offer.price||existing.retailPrice||0);
          existing.selected=true;
          existing.stale=false;
        }else{
          cart.push({
            id:"repeat-"+String(item.id||item.article)+"-"+String(Date.now())+"-"+added,
            type:"exact",
            brand:offer.brand||item.brand||"",
            article:offer.article||item.article||"",
            name:offer.description||item.description||"Автозапчасть",
            warehouse:"Поставка",
            source:"Повтор заказа",
            purchase:0,
            retailPrice:Number(offer.price||0),
            qty:Number(offer.availability||0),
            days:Math.max(0,Math.ceil(Number(offer.delivery_hours||0)/24)),
            deliveryProbability:offer.delivery_probability??null,
            offerToken:token,
            live:true,
            quoteOnly:false,
            price:Number(offer.price||0),
            priceAtAdd:Number(offer.price||0),
            previousPrice:null,
            orderQty:qty,
            availableQty:Number(offer.availability||0),
            selected:true,
            comment:"",
            priceChanged:false,
            availabilityChanged:false,
            stale:false,
            vehicleContext:item.vehicle_id ? {
              id:item.vehicle_id,
              label:[item.vehicle_brand,item.vehicle_model,item.vehicle_generation].filter(Boolean).join(" "),
              vin:item.vehicle_vin||""
            } : null
          });
        }
        added++;
      }catch(error){
        console.warn("Repeat order offer lookup failed",error);
        unavailable++;
      }
    }

    if(!added){
      showToast("Сейчас нет доступных предложений по позициям этого заказа.","warn");
      return;
    }

    saveCart();
    navigate("cart");
    await refreshCartOffers({silent:true});
    showToast(
      unavailable
        ? "В корзину добавлено: "+added+". Недоступно сейчас: "+unavailable+"."
        : "Заказ добавлен в корзину по текущим ценам."
    );
  }catch(error){
    console.error("Repeat live order failed",error);
    showToast("Не удалось повторить заказ.","warn");
  }finally{
    if(button){
      button.disabled=false;
      button.textContent=original;
    }
  }
}

async function openLiveOrderDetail(id){
  try{
    const data=await apiRequest("/api/account/orders/"+encodeURIComponent(id));
    const mount=document.getElementById("orderDetailMount");
    if(!mount) return;

    const order=data.order;
    const items=data.items||[];
    const history=data.history||[];

    mount.innerHTML=`
      <div class="order-detail-head">
        <div class="order-detail-toolbar"><button class="order-detail-back" data-account-tab="orders">← Заказы</button><button class="order-repeat-compact" data-live-repeat-order="${order.id}">Повторить заказ</button></div>
        <div class="order-detail-title">
          <div>
            <span class="eyebrow">ЗАКАЗ ZAPFORMAT</span>
            <h2>#${order.order_number}</h2>
            <p>${formatDateRu(order.created_at)}${order.recipient_name?" · "+escapeHtml(order.recipient_name):""}${order.recipient_phone?" · "+escapeHtml(order.recipient_phone):""}</p>
          </div>
          <div class="order-detail-state">
            <strong class="status">${requestStatusLabel(order.status)}</strong>
            <b>${rub(Number(order.total_amount||0))}</b>
          </div>
        </div>
      </div>

      <section class="order-detail-block positions-block">
        <div class="order-detail-block-head"><span class="eyebrow">ПОЗИЦИИ</span><h3>Состав заказа</h3></div>
        <div class="order-positions">
          ${items.map((item,index)=>`
            <article class="order-position">
              <div class="position-top">
                <span class="position-index">${index+1}</span>
                <div class="position-title">
                  <h3>${item.brand||""} ${item.article}</h3>
                  <p>${escapeHtml(item.description||"")}</p>
                  ${item.vehicle_id ? '<small class="order-vehicle-context">Для: '+escapeHtml([item.vehicle_brand,item.vehicle_model,item.vehicle_generation].filter(Boolean).join(" "))+(item.vehicle_vin?" · "+escapeHtml(shortVin(item.vehicle_vin)):"")+' · контекст заказа</small>' : ""}\n                  ${item.supplier_status ? '<small class="order-vehicle-context">Поставка: '+escapeHtml(item.supplier_status)+'</small>' : ""}
                </div>
                <strong class="status">${requestStatusLabel(item.status)}</strong>
              </div>
              <div class="position-meta">
                <div><small>Количество</small><b>${item.quantity} шт.</b></div>
                <div><small>Цена</small><b>${rub(Number(item.unit_price||0))}</b></div>
                <div><small>Сумма</small><b>${rub(Number(item.unit_price||0)*Number(item.quantity||0))}</b></div>
                <div><small>Срок</small><b>${item.delivery_days===0?"Сегодня":item.delivery_days===1?"1 день":item.delivery_days!=null?item.delivery_days+" дн.":"—"}</b></div>
              </div>
              ${(item.received_at || item.status==="completed") ? '<details class="return-details"><summary>Оформить возврат</summary><form class="return-form" data-live-return-form="'+item.id+'" data-live-return-order="'+order.id+'"><div class="return-form-grid"><label><span>Причина</span><select name="reason" required><option value="">Выберите причину</option><option>Не подошла деталь</option><option>Повреждение</option><option>Не соответствует заказу</option><option>Другая причина</option></select></label><label><span>Количество</span><input name="quantity" type="number" min="1" max="'+item.quantity+'" value="1" required></label><label class="return-comment"><span>Комментарий</span><textarea name="comment" rows="2" placeholder="Комментарий"></textarea></label></div><div class="return-form-actions"><button class="account-primary" type="submit">Создать возврат</button></div></form></details>' : ""}
            </article>`).join("")}
        </div>
      </section>

      <section class="order-detail-block">
        <div class="order-detail-block-head"><span class="eyebrow">СТАТУС</span><h3>История заказа</h3></div>
        <div class="order-timeline">
          ${history.length ? history.map(step=>`
            <div class="timeline-step done">
              <span class="timeline-dot"></span>
              <div class="timeline-copy">
                <small>${formatDateRu(step.created_at)}</small>
                <b>${requestStatusLabel(step.status)}</b>
                ${step.note?`<p>${step.note}</p>`:""}
              </div>
            </div>`).join("") : '<div class="account-empty"><p>Заказ создан.</p></div>'}
        </div>
      </section>
    `;

    showAccountTab("order-detail");
  }catch(error){
    console.error(error);
    showToast("Не удалось открыть заказ.","warn");
  }
}

async function openLiveRequestDetail(id){
  try{
    const data=await apiRequest("/api/account/requests/"+encodeURIComponent(id));
    const mount=document.getElementById("orderDetailMount");
    if(!mount) return;
    const req=data.request;
    const items=data.items||[];
    mount.innerHTML=`
      <div class="order-detail-head">
        <div class="order-detail-toolbar"><button class="order-detail-back" data-account-tab="orders">← Заказы</button></div>
        <div class="order-detail-title">
          <div><span class="eyebrow">ЗАПРОС</span><h2>#${req.id}</h2><p>${formatDateRu(req.created_at)}</p></div>
          <div class="order-detail-state"><strong class="status">${requestStatusLabel(req.status)}</strong></div>
        </div>
      </div>
      <section class="order-detail-block positions-block">
        <div class="order-detail-block-head"><span class="eyebrow">ПОЗИЦИИ</span><h3>Состав запроса</h3></div>
        <div class="order-positions">
          ${items.map((item,index)=>`
            <article class="order-position">
              <div class="position-top">
                <span class="position-index">${index+1}</span>
                <div class="position-title">
                  <h3>${escapeHtml(item.brand||"")} ${escapeHtml(item.article||"")}</h3>
                  <p>${escapeHtml(item.description||"")}</p>
                  ${item.vehicle_id ? '<small class="order-vehicle-context">Для: '+escapeHtml([item.vehicle_brand,item.vehicle_model,item.vehicle_generation].filter(Boolean).join(" "))+(item.vehicle_vin?" · "+escapeHtml(shortVin(item.vehicle_vin)):"")+' · контекст запроса</small>' : ""}
                </div>
                <strong class="status">${item.needs_confirmation?"Цена уточняется":"Цена подтверждена"}</strong>
              </div>
              <div class="position-meta">
                <div><small>Количество</small><b>${item.quantity} шт.</b></div>
                <div><small>Цена</small><b>${item.quoted_price===null?"после подтверждения":rub(Number(item.quoted_price))}</b></div>
              </div>
            </article>`).join("")}
        </div>
      </section>`;
    showAccountTab("order-detail");
  }catch(error){
    showToast("Не удалось открыть запрос.","warn");
  }
}

async function hydrateSession(){
  if(!backendConfigured()){
    applySessionUser();
    return null;
  }
  try{
    const data=await apiRequest("/api/auth/me");
    sessionUser=data.user;
    applySessionUser();
    await hydrateCartFromAccount();
    await hydrateAccountData();
    if(document.getElementById("view-auth")?.classList.contains("active")){
      showRoute(pendingAccountRoute||"profile");
    }
    return sessionUser;
  }catch(error){
    if(error.status!==401) console.warn("ZapFormat session check failed",error);
    sessionUser=null;
    applySessionUser();
    return null;
  }
}

function resolveDataset(query){
  const q=String(query||"").trim().toUpperCase().replace(/\s+/g,"");
  return datasets[q] ? q : null;
}

function syncMobileNav(route){
  const mappedRoute=route==="search" ? "home" : route;
  document.querySelectorAll(".mobile-nav [data-route]").forEach(button=>{
    const active=button.dataset.route===mappedRoute;
    button.classList.toggle("active",active);
    if(active) button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
  });
}

function showRoute(route){
  const protectedAccountRoute=route==="profile" || route==="orders" || route==="garage";
  if(protectedAccountRoute && backendConfigured() && !sessionUser){
    pendingAccountRoute=route;
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    document.getElementById("view-auth")?.classList.add("active");
    syncMobileNav("");
    window.scrollTo({top:0,behavior:"auto"});
    return;
  }

  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const accountRoute=route==="orders" || route==="garage";
  const resolvedRoute=accountRoute ? "profile" : route;
  const target=document.getElementById("view-"+resolvedRoute);
  if(target) target.classList.add("active");
  if(route==="orders") showAccountTab("orders");
  if(route==="garage") showAccountTab("garage");
  syncMobileNav(route);
  window.scrollTo({top:0,behavior:"auto"});
}

function navigate(route, push=true){
  showRoute(route);
  if(push){
    const url = route==="home" ? location.pathname : location.pathname+"?view="+encodeURIComponent(route);
    history.pushState({route}, "", url);
  }
}

function escapeHtml(value){
  return String(value??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function looksLikeArticle(value){
  const raw=String(value||"").trim();
  if(raw.length<3 || raw.length>40 || /\s/.test(raw)) return false;
  return /^[A-Za-zА-Яа-я0-9._\/-]+$/.test(raw);
}

function normalizeVin(value){
  return String(value||"").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"");
}

function looksLikeVin(value){
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(normalizeVin(value));
}

function extractArticleCandidate(value){
  const raw=String(value||"").trim();
  if(looksLikeArticle(raw) && !looksLikeVin(raw)) return raw;
  const tokens=raw
    .split(/\s+/)
    .map(token=>token.replace(/^[^A-Za-zА-Яа-я0-9]+|[^A-Za-zА-Яа-я0-9._\/-]+$/g,""))
    .filter(Boolean)
    .filter(token=>looksLikeArticle(token) && /\d/.test(token) && !looksLikeVin(token));
  return tokens.length===1 ? tokens[0] : null;
}

function currentSearchVehicle(){
  if(!sessionUser || !garageState?.vehicle?.id) return null;
  return garageState.vehicle;
}

function vehicleLabel(vehicle){
  if(!vehicle) return "";
  return [vehicle.brand,vehicle.model,vehicle.generation].filter(Boolean).join(" ");
}

function shortVin(vin){
  const value=normalizeVin(vin);
  if(!value) return "VIN не указан";
  return "VIN ••••"+value.slice(-6);
}

function updateVehicleContextUi(){
  const vehicle=currentSearchVehicle();
  const header=document.getElementById("headerVehicleButton");
  const home=document.getElementById("homeVehicleContext");
  const catalog=document.getElementById("catalogVehicleContext");
  const searchInput=document.getElementById("searchInput");
  const searchInput2=document.getElementById("searchInput2");
  const disclaimer=document.getElementById("catalogDisclaimer");

  if(!vehicle){
    if(header) header.hidden=true;
    if(home) home.hidden=true;
    if(catalog) catalog.hidden=true;
    if(searchInput) searchInput.placeholder="Артикул / VIN / деталь";
    if(searchInput2) searchInput2.placeholder="Артикул, VIN или название детали";
    if(disclaimer) disclaimer.textContent="Информация по аналогам справочная. Перед заказом совместимость уточняется по автомобилю или VIN.";
    return;
  }

  const label=vehicleLabel(vehicle)||"Мой автомобиль";
  if(header){
    header.hidden=false;
    const mark=document.getElementById("headerVehicleMark");
    const name=document.getElementById("headerVehicleName");
    if(mark) mark.textContent=String(vehicle.brand||"AUTO").slice(0,5).toUpperCase();
    if(name) name.textContent=label;
  }
  if(home){
    home.hidden=false;
    const name=document.getElementById("homeVehicleName");
    if(name) name.textContent=label+(vehicle.vin?" · "+shortVin(vehicle.vin):"");
  }
  if(catalog){
    catalog.hidden=false;
    const name=document.getElementById("catalogVehicleName");
    const vin=document.getElementById("catalogVehicleVin");
    if(name) name.textContent=label;
    if(vin) vin.textContent=shortVin(vehicle.vin);
  }
  if(searchInput) searchInput.placeholder="Что найти для "+label+"? Артикул / деталь";
  if(searchInput2) searchInput2.placeholder="Артикул или деталь для "+label;
  if(disclaimer){
    disclaimer.textContent="Выбран "+label+". Автомобиль используется как контекст поиска и заказа; это не подтверждение применимости конкретной детали.";
  }
}

function smartSearchMount(){
  setCatalogControlsVisible(false);
  const exactRoot=document.getElementById("exactResults");
  const analogRoot=document.getElementById("analogResults");
  const analogSection=document.getElementById("analogSection");
  const countEl=document.getElementById("offerCount");
  const countLabel=document.getElementById("offerCountLabel");
  if(analogRoot) analogRoot.innerHTML="";
  if(analogSection) analogSection.style.display="none";
  if(countEl) countEl.textContent="0";
  if(countLabel) countLabel.textContent="подобрано";
  return exactRoot;
}

function renderVehicleSearchState(query,vehicle,options={}){
  const exactRoot=smartSearchMount();
  if(!exactRoot) return;

  const label=vehicle ? vehicleLabel(vehicle) : "";
  const vin=vehicle?.vin ? shortVin(vehicle.vin) : "";
  const isVin=Boolean(options.vin);
  exactRoot.innerHTML=`
    <div class="vehicle-search-state">
      <span class="eyebrow">${isVin?"VIN":"УМНЫЙ ПОИСК"}</span>
      <h3>${isVin?"VIN распознан":"Запрос понят"}</h3>
      <p><b>${escapeHtml(query)}</b>${label?" · "+escapeHtml(label):""}${vin?" · "+escapeHtml(vin):""}</p>
      <p class="vehicle-search-note">
        ${isVin
          ? "VIN используется как контекст автомобиля. ZapFormat не будет придумывать совместимость или артикулы."
          : "ZapFormat понимает запрос, но показывает только те артикулы, которые подтверждены каталогом выбранной модификации."}
      </p>
      <div class="vehicle-search-actions">
        ${vehicle?'<button type="button" data-route="garage">Открыть гараж</button>':'<button type="button" data-route="garage">Добавить автомобиль</button>'}
        <button type="button" data-focus-catalog-search>Ввести артикул</button>
      </div>
    </div>`;
}

function smartSpecRows(value,depth=0){
  if(value===null || value===undefined || value==="") return "";
  if(depth>2) return '<span>'+escapeHtml(String(value))+'</span>';
  if(Array.isArray(value)){
    if(!value.length) return "";
    return value.map((item,index)=>`
      <div class="smart-spec-row">
        <b>${index+1}</b>
        <span>${typeof item==="object" ? smartSpecRows(item,depth+1) : escapeHtml(String(item))}</span>
      </div>`).join("");
  }
  if(typeof value==="object"){
    return Object.entries(value)
      .filter(([,v])=>v!==null && v!==undefined && v!=="")
      .map(([key,v])=>`
        <div class="smart-spec-row">
          <b>${escapeHtml(String(key).replace(/_/g," "))}</b>
          <span>${typeof v==="object" ? smartSpecRows(v,depth+1) : escapeHtml(String(v))}</span>
        </div>`).join("");
  }
  return escapeHtml(String(value));
}

function renderSmartPartSearch(data,query){
  const root=smartSearchMount();
  if(!root) return;

  const vehicle=data?.vehicle||currentSearchVehicle();
  const label=vehicle ? vehicleLabel(vehicle) : "";
  const interpreter=data?.interpreter==="ai" ? "ИИ понял запрос" : "Запрос разобран";
  const intent=data?.intent||{};

  if(data?.mode==="needs_vehicle"){
    root.innerHTML=`
      <div class="vehicle-search-state">
        <span class="eyebrow">УМНЫЙ ПОИСК</span>
        <h3>Сначала нужен автомобиль</h3>
        <p>Чтобы безопасно подобрать <b>${escapeHtml(intent.part_name||query)}</b>, добавьте машину в гараж. Без автомобиля ZapFormat не будет угадывать применимость.</p>
        <div class="vehicle-search-actions"><button type="button" data-route="garage">Добавить автомобиль</button></div>
      </div>`;
    return;
  }

  if(data?.mode==="clarification"){
    root.innerHTML=`
      <div class="vehicle-search-state">
        <span class="eyebrow">${escapeHtml(interpreter)}</span>
        <h3>Нужно одно уточнение</h3>
        <p>${escapeHtml(data.question||intent.clarification_question||"Уточните деталь.")}</p>
        ${label?'<p class="vehicle-search-note">Автомобиль: <b>'+escapeHtml(label)+'</b></p>':""}
        <div class="vehicle-search-actions"><button type="button" data-focus-catalog-search>Уточнить запрос</button></div>
      </div>`;
    return;
  }

  if(data?.mode==="vehicle_catalog_unavailable"){
    root.innerHTML=`
      <div class="vehicle-search-state">
        <span class="eyebrow">${escapeHtml(interpreter)}</span>
        <h3>Каталог применимости временно недоступен</h3>
        <p>Запрос понят: <b>${escapeHtml(intent.part_name||query)}</b>${label?" · "+escapeHtml(label):""}.</p>
        <p class="vehicle-search-note">Артикул не подставляем наугад. Можно искать по известному номеру детали или повторить позже.</p>
        <div class="vehicle-search-actions"><button type="button" data-focus-catalog-search>Ввести артикул</button></div>
      </div>`;
    return;
  }

  if(data?.mode==="catalog_provider_required"){
    const vinPresent=Boolean(data?.vehicle_identity?.vin_present);
    root.innerHTML=`
      <div class="vehicle-search-state">
        <span class="eyebrow">ПОДБОР ПО АВТОМОБИЛЮ</span>
        <h3>Нужен расширенный каталог применимости</h3>
        <p>Запрос понят: <b>${escapeHtml(intent.part_name||query)}</b>${label?" · "+escapeHtml(label):""}.</p>
        <p class="vehicle-search-note">${vinPresent
          ? "VIN сохранён, но текущий каталог не умеет автоматически расшифровать VIN для этой группы деталей. ZapFormat не будет подставлять артикул по догадке."
          : "Для этой группы нужен источник, который подтверждает детали по точной модификации или VIN. Пока такого подтверждения нет, артикул не подставляем."}</p>
        <div class="vehicle-search-actions"><button type="button" data-route="garage">Проверить автомобиль</button><button type="button" data-focus-catalog-search>Ввести известный артикул</button></div>
      </div>`;
    return;
  }

  if(data?.mode==="vehicle_needs_details"){
    root.innerHTML=`
      <div class="vehicle-search-state">
        <span class="eyebrow">${escapeHtml(interpreter)}</span>
        <h3>Нужно точнее определить автомобиль</h3>
        <p><b>${escapeHtml(label||"Автомобиль")}</b> найден не однозначно. Уточните поколение, двигатель или год в гараже.</p>
        <p class="vehicle-search-note">${data?.vehicle_identity?.vin_present
          ? "VIN сохранён, но текущий каталог не умеет автоматически определить модификацию по VIN. ZapFormat не выбирает её по догадке."
          : "Это защита от неверного подбора: ZapFormat не выбирает модификацию по догадке."}</p>
        <div class="vehicle-search-actions"><button type="button" data-route="garage">Уточнить автомобиль</button></div>
      </div>`;
    return;
  }

  if(data?.mode==="choose_modification"){
    const candidates=(data.candidates||[]);
    root.innerHTML=`
      <div class="vehicle-search-state smart-selection-state">
        <span class="eyebrow">${escapeHtml(interpreter)}</span>
        <h3>Выберите модификацию ${label?"· "+escapeHtml(label):""}</h3>
        <p class="vehicle-search-note">${data?.vehicle_identity?.vin_present
          ? "VIN сохранён, но текущий каталог не расшифровывает его до модификации автоматически. Выберите точную модификацию — выбор сохранится в гараже."
          : "Выберите точную модификацию — выбор сохранится в гараже. После этого ZapFormat сможет брать артикулы именно из каталога этой модификации."}</p>
        <div class="smart-candidate-list">
          ${candidates.map(c=>`
            <button type="button" class="smart-candidate"
              data-catalog-modification="${escapeHtml(c.id||"")}">
              <span>
                <b>${escapeHtml(c.name||"Модификация")}</b>
                <small>${[
                  c.year_from||c.yearFrom,
                  c.year_to||c.yearTo,
                  c.fuel_type||c.fuelType,
                  c.power_hp||c.powerHP ? (c.power_hp||c.powerHP)+" л.с." : "",
                  c.motor_codes||c.motorCodes
                ].filter(Boolean).map(escapeHtml).join(" · ")}</small>
              </span>
              <strong>Выбрать ›</strong>
            </button>
          `).join("") || '<div class="garage-empty-inline"><b>Нет вариантов для выбора.</b></div>'}
        </div>
      </div>`;
    return;
  }

  if(data?.mode==="vehicle_specs"){
    root.innerHTML=`
      <div class="vehicle-search-state">
        <span class="eyebrow">ПОДБОР ПО АВТОМОБИЛЮ</span>
        <h3>${escapeHtml(intent.part_name||query)} ${label?"· "+escapeHtml(label):""}</h3>
        <p class="vehicle-search-note">Данные получены из каталога выбранной модификации, а не придуманы ИИ.</p>
        <div class="smart-spec-list">${smartSpecRows(data?.specs?.data||data?.specs)}</div>
      </div>`;
    return;
  }

  if(data?.mode==="verified_articles"){
    const articles=(data.articles||[]);
    const catalogModification=data?.catalog?.modification?.name||"выбранной модификации";
    root.innerHTML=`
      <div class="vehicle-search-state smart-selection-state">
        <span class="eyebrow">${data?.fitment_status==="catalog_fitment_confirmed"?"СОВМЕСТИМОСТЬ ПОДТВЕРЖДЕНА":"ПОДБОР ПО АВТОМОБИЛЮ"}</span>
        <h3>${escapeHtml(intent.part_name||query)}</h3>
        <p>${label?"Для <b>"+escapeHtml(label)+"</b>. ":""}Найдены позиции из каталога ${escapeHtml(catalogModification)}.</p>
        <p class="vehicle-search-note">Нажмите позицию — дальше загрузим живые цены, остатки, сроки и доступные аналоги.</p>
        <div class="smart-article-list">
          ${articles.map(item=>`
            <button type="button" class="smart-article"
              data-verified-article="${escapeHtml(item.article||"")}"
              data-verified-brand="${escapeHtml(item.brand||"")}"
              data-verified-description="${escapeHtml(item.description||"")}">
              <span class="smart-article-brand">${escapeHtml(item.brand||"—")}</span>
              <span class="smart-article-copy">
                <b>${escapeHtml(item.article||"—")}</b>
                <small>${escapeHtml(item.description||item.goods_group_name||"Запчасть")}</small>
              </span>
              <strong>Цены ›</strong>
            </button>
          `).join("")}
        </div>
      </div>`;
    return;
  }

  root.innerHTML=`
    <div class="vehicle-search-state">
      <span class="eyebrow">${escapeHtml(interpreter)}</span>
      <h3>Подтверждённый артикул не найден</h3>
      <p>Запрос: <b>${escapeHtml(intent.part_name||query)}</b>${label?" · "+escapeHtml(label):""}.</p>
      <p class="vehicle-search-note">Автомобиль определён, но в каталоге выбранной модификации нет надёжной позиции для этого запроса. ZapFormat не будет подставлять случайный номер.</p>
      <div class="vehicle-search-actions"><button type="button" data-focus-catalog-search>Искать по артикулу</button><button type="button" data-route="garage">Проверить автомобиль</button></div>
    </div>`;
}

async function runSmartPartSearch(query,vehicle){
  if(smartSearchBusy) return false;
  lastSmartSearchQuery=String(query||"").trim();

  if(!sessionUser){
    setSearchHead(lastSmartSearchQuery,"Умный подбор работает с автомобилем из гаража.",lastSmartSearchQuery);
    renderSmartPartSearch({mode:"needs_vehicle",intent:{part_name:lastSmartSearchQuery}},lastSmartSearchQuery);
    return true;
  }

  smartSearchBusy=true;
  setSearchHead(
    lastSmartSearchQuery,
    vehicle ? "Разбираем запрос для "+vehicleLabel(vehicle)+"…" : "Разбираем запрос…",
    lastSmartSearchQuery
  );
  renderSearchState("Умный поиск","Понимаем деталь и проверяем каталог автомобиля.");

  try{
    const data=await apiRequest("/api/catalog/ai-search",{
      method:"POST",
      body:JSON.stringify({
        query:lastSmartSearchQuery,
        vehicle_id:vehicle?.id||null
      })
    });
    setSearchHead(
      data?.intent?.part_name||lastSmartSearchQuery,
      data?.vehicle ? "Автомобиль: "+vehicleLabel(data.vehicle) : "Умный подбор",
      lastSmartSearchQuery
    );
    renderSmartPartSearch(data,lastSmartSearchQuery);
    return true;
  }catch(error){
    console.error("Smart part search failed",error);
    setSearchHead(lastSmartSearchQuery,"Не удалось выполнить умный подбор.",lastSmartSearchQuery);
    renderSearchState("Умный поиск временно недоступен","Поиск по точному артикулу продолжает работать.");
    return false;
  }finally{
    smartSearchBusy=false;
  }
}

function setCatalogControlsVisible(visible){
  document.querySelector(".catalog-actions")?.toggleAttribute("hidden",!visible);
  document.querySelector(".compact-filters")?.toggleAttribute("hidden",!visible);
}

function setSearchHead(titleText,subtitleText,query){
  const title=document.getElementById("resultTitle");
  const subtitle=document.getElementById("resultSubtitle");
  const heading=document.getElementById("exactHeading");
  const secondary=document.getElementById("searchInput2");
  if(title) title.textContent=titleText||"—";
  if(subtitle) subtitle.textContent=subtitleText||"";
  if(heading) heading.textContent=titleText||"";
  if(secondary) secondary.value=query||"";
}

function renderSearchState(titleText,detailText){
  const exactRoot=document.getElementById("exactResults");
  const analogRoot=document.getElementById("analogResults");
  const analogSection=document.getElementById("analogSection");
  const countEl=document.getElementById("offerCount");
  const countLabel=document.getElementById("offerCountLabel");
  if(countEl) countEl.textContent="0";
  if(countLabel) countLabel.textContent="предложений";
  if(analogRoot) analogRoot.innerHTML="";
  if(analogSection) analogSection.style.display="none";
  if(exactRoot){
    exactRoot.innerHTML=
      '<div class="product-group search-state-card"><div class="product-group-head">'+
      '<div class="product-title"><b>'+escapeHtml(titleText)+'</b><small>'+escapeHtml(detailText||"")+'</small></div>'+
      '</div></div>';
  }
}

function renderBrandChoices(article,brands){
  const exactRoot=document.getElementById("exactResults");
  const analogRoot=document.getElementById("analogResults");
  const analogSection=document.getElementById("analogSection");
  const countEl=document.getElementById("offerCount");
  const countLabel=document.getElementById("offerCountLabel");
  setCatalogControlsVisible(false);
  if(analogRoot) analogRoot.innerHTML="";
  if(analogSection) analogSection.style.display="none";
  if(countEl) countEl.textContent=String(brands.length);
  if(countLabel) countLabel.textContent=brands.length===1?"производитель":"производителей";
  if(!exactRoot) return;

  if(!brands.length){
    renderSearchState("Артикул не найден","Проверьте номер и попробуйте ещё раз.");
    return;
  }

  exactRoot.innerHTML=brands.map((item,index)=>{
    const brand=String(item.brand||"").trim();
    const number=String(item.article||article).trim();
    const description=String(item.description||"Запчасть").trim();
    return `
      <article class="brand-choice">
        <button type="button" class="brand-choice-button"
          data-brand-select="${escapeHtml(brand)}"
          data-brand-number="${escapeHtml(number)}"
          data-brand-description="${escapeHtml(description)}">
          <span class="brand-choice-logo">${escapeHtml(brand.slice(0,5)||"—")}</span>
          <span class="brand-choice-main">
            <span class="brand-choice-line">
              <b>${escapeHtml(brand||"Без бренда")}</b>
              <code>${escapeHtml(number)}</code>
            </span>
            <small>${escapeHtml(description)}</small>
          </span>
          <span class="brand-choice-action">Цены и аналоги ›</span>
        </button>
      </article>`;
  }).join("");
}

async function loadLiveOffers(article,brand,description="",options={}){
  const number=String(article||"").trim();
  const maker=String(brand||"").trim();
  if(!number || !maker) return;

  setCatalogControlsVisible(false);
  setSearchHead(maker+" "+number,"Загружаем реальные предложения…",number);
  renderSearchState("Загрузка","Получаем цены, наличие, сроки и аналоги.");

  try{
    const offersData=await apiRequest(
      "/api/catalog/offers?number="+encodeURIComponent(number)+
      "&brand="+encodeURIComponent(maker)
    );
    const offers=Array.isArray(offersData?.offers) ? offersData.offers : [];
    const analogOffers=Array.isArray(offersData?.analogs) ? offersData.analogs : [];

    const searchVehicle=currentSearchVehicle();
    const mapOffer=(o,index,type)=>({
      id:"live-"+type+"-"+index+"-"+String(o.brand||maker).replace(/[^A-Za-zА-Яа-я0-9_-]/g,"")+"-"+String(o.article||number).replace(/[^A-Za-zА-Яа-я0-9_-]/g,""),
      type,
      brand:o.brand||maker,
      article:o.article||number,
      name:o.description||description||"Автозапчасть",
      warehouse:"Поставка",
      source:type==="analog"?"Аналог":"Точное предложение",
      purchase:0,
      retailPrice:Number(o.price||0),
      qty:Number(o.availability||0),
      days:Math.max(0,Math.ceil(Number(o.delivery_hours||0)/24)),
      deliveryProbability:o.delivery_probability??null,
      offerToken:o.offer_token||null,
      live:true,
      vehicleContext:searchVehicle ? {
        id:searchVehicle.id,
        label:vehicleLabel(searchVehicle),
        vin:searchVehicle.vin||""
      } : null
    });

    const exact=offers.map((o,index)=>mapOffer(o,index,"exact"));
    const analogs=analogOffers.map((o,index)=>mapOffer(o,index,"analog"));
    const key="live:"+maker.toUpperCase()+":"+number.toUpperCase();

    datasets[key]={
      title:(maker+" "+number).trim(),
      subtitle:description||(exact[0]?.name||analogs[0]?.name)||"Результат поиска",
      exact,
      analogs
    };
    currentKey=key;
    currentFilter="all";
    currentSort="price";

    document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));
    document.querySelectorAll("[data-sort]").forEach(x=>x.classList.toggle("active",x.dataset.sort==="price"));

    setSearchHead(
      datasets[key].title,
      datasets[key].subtitle+" · реальные данные поставщика"+
        (searchVehicle?" · контекст: "+vehicleLabel(searchVehicle):""),
      number
    );
    setCatalogControlsVisible(true);
    renderCatalog();

    if(options.push!==false){
      const url=new URL(location.href);
      url.search="";
      url.searchParams.set("q",number);
      url.searchParams.set("brand",maker);
      history.pushState({route:"search",query:number,brand:maker},"",url.pathname+url.search);
    }
    return true;
  }catch(error){
    console.error("Supplier offers lookup failed",error);
    setSearchHead(maker+" "+number,"Не удалось загрузить предложения.",number);
    renderSearchState("Предложения временно недоступны","Повторите поиск через несколько секунд.");
    return false;
  }
}

async function search(query,options={}){
  const raw=String(query||"").trim();
  if(!raw) return false;

  document.querySelector(".compact-filters")?.classList.remove("open");
  const filtersToggle=document.querySelector(".filters-toggle");
  if(filtersToggle){
    filtersToggle.textContent="Показать фильтры";
    filtersToggle.setAttribute("aria-expanded","false");
  }

  showRoute("search");
  setCatalogControlsVisible(false);
  setSearchHead(raw,"Ищем артикул у поставщика…",raw);
  renderSearchState("Поиск","Получаем список производителей.");

  if(!backendConfigured()){
    renderSearchState("Сервер каталога недоступен","Откройте серверную версию ZapFormat.");
    return false;
  }

  const vehicle=currentSearchVehicle();

  if(looksLikeVin(raw)){
    const vin=normalizeVin(raw);
    const matched=garageVehicles.find(x=>normalizeVin(x.vin)===vin);
    if(matched && sessionUser){
      await selectGarageVehicle(matched.id);
    }
    const active=matched || currentSearchVehicle();
    setSearchHead(vin,active ? "VIN связан с "+vehicleLabel(active) : "VIN распознан",vin);
    renderVehicleSearchState(vin,active,{vin:true});
    return true;
  }

  const article=extractArticleCandidate(raw);
  if(!article){
    return runSmartPartSearch(raw,vehicle);
  }

  try{
    const brandsData=await apiRequest("/api/catalog/brands?number="+encodeURIComponent(article));
    const brands=(Array.isArray(brandsData?.brands)?brandsData.brands:[])
      .filter(x=>x?.brand)
      .sort((a,b)=>String(a.brand).localeCompare(String(b.brand),"ru",{sensitivity:"base"}));

    const key="brands:"+article.toUpperCase();
    datasets[key]={title:article,subtitle:"Выберите производителя",exact:[],analogs:[]};
    currentKey=key;

    setSearchHead(article,brands.length ? "Выберите производителя — затем покажем цены и аналоги." : "Артикул не найден.",raw);
    renderBrandChoices(article,brands);

    if(options.push!==false){
      const url=new URL(location.href);
      url.search="";
      url.searchParams.set("q",article);
      history.pushState({route:"search",query:article},"",url.pathname+url.search);
    }

    const requestedBrand=String(options.brand||"").trim();
    if(requestedBrand){
      const match=brands.find(x=>String(x.brand||"").toLowerCase()===requestedBrand.toLowerCase());
      if(match){
        return loadLiveOffers(
          match.article||article,
          match.brand,
          match.description||"",
          {push:false}
        );
      }
    }
    return true;
  }catch(error){
    console.error("Supplier brand lookup failed",error);
    setSearchHead(raw,"Не удалось получить данные поставщика.",raw);
    renderSearchState("Поиск временно недоступен","Повторите попытку через несколько секунд.");
    return false;
  }
}

function baseList(type){
  const data=datasets[currentKey];
  let list=type==="exact" ? [...data.exact] : [...data.analogs];
  if(currentFilter==="exact" && type!=="exact") return [];
  if(currentFilter==="analog" && type!=="analog") return [];
  if(currentFilter==="fast") list=list.filter(x=>x.days<=2);
  if(currentFilter==="stock") list=list.filter(x=>x.qty>0);
  if(currentSort==="price") list.sort((a,b)=>itemRetail(a)-itemRetail(b));
  if(currentSort==="speed") list.sort((a,b)=>a.days-b.days || itemRetail(a)-itemRetail(b));
  if(currentSort==="stock") list.sort((a,b)=>b.qty-a.qty);
  if(currentSort==="warehouse") list.sort((a,b)=>{
    const an=Number(String(a.warehouse).replace(/\D/g,""));
    const bn=Number(String(b.warehouse).replace(/\D/g,""));
    if(Number.isFinite(an) && Number.isFinite(bn) && an!==bn) return an-bn;
    return String(a.warehouse).localeCompare(String(b.warehouse),"ru",{numeric:true});
  });
  return list;
}

function cartSvg(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h2l2 11h10l2-8H5.2"></path><circle cx="9" cy="19" r="1.5"></circle><circle cx="16" cy="19" r="1.5"></circle></svg>';
}

function supplyRowHtml(x){
  if(x.quoteOnly){
    return `
      <div class="supply-row">
        <div class="supply-left">
          <div class="supply-term">
            <b>Подтверждение</b>
            <small>${x.warehouse}</small>
          </div>
          <span class="supply-warehouse">${x.source}</span>
        </div>
        <div class="supply-price"><span class="quote-only-label">Цена по запросу</span></div>
        <div class="supply-stock">—</div>
        <button class="quote-request-btn" data-add="${x.id}" aria-label="Добавить в запрос">В запрос</button>
      </div>`;
  }
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
      <div class="supply-price">${rub(itemRetail(x))}</div>
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

function groupOffersByPart(items){
  const groups=new Map();
  for(const item of items){
    const key=[
      String(item.brand||"").trim().toUpperCase(),
      String(item.article||"").trim().toUpperCase()
    ].join("|");
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(item);
  }
  return [...groups.values()];
}

function renderCatalog(){
  const exact=baseList("exact");
  const analog=baseList("analog");

  const exactRoot=document.getElementById("exactResults");
  const analogRoot=document.getElementById("analogResults");

  if(exactRoot){
    exactRoot.innerHTML=exact.length
      ? groupCardHtml(exact,"exact-"+currentKey)
      : '<div class="product-group"><div class="product-group-head"><div class="product-title"><b>Нет точных предложений</b><small>Ниже могут быть доступны аналоги.</small></div></div></div>';
  }

  if(analogRoot){
    const analogGroups=groupOffersByPart(analog);
    analogRoot.innerHTML=analogGroups.length
      ? analogGroups.map((items,index)=>groupCardHtml(items,"analog-"+currentKey+"-"+index)).join("")
      : '<div class="product-group"><div class="product-group-head"><div class="product-title"><b>Нет аналогов</b></div></div></div>';
  }

  const analogSection=document.getElementById("analogSection");
  if(analogSection){
    analogSection.style.display=(currentFilter==="exact" || !analog.length)?"none":"block";
  }

  const count=exact.length+analog.length;
  const countEl=document.getElementById("offerCount");
  const countLabel=document.getElementById("offerCountLabel");
  if(countEl) countEl.textContent=count;
  if(countLabel){
    countLabel.textContent=currentFilter==="exact"
      ? exact.length+" точных"
      : currentFilter==="analog"
        ? analog.length+" аналогов"
        : exact.length+" точных · "+analog.length+" аналогов";
  }
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
  const price=item.quoteOnly ? 0 : itemRetail(item);
  const existing=cart.find(x=>x.id===id);
  if(existing){
    existing.orderQty+=orderQty;
    existing.selected=true;
    if(item.vehicleContext) existing.vehicleContext=item.vehicleContext;
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

async function refreshCartOffers(options={}){
  const silent=Boolean(options.silent);
  const checkoutIds=new Set((options.checkoutIds||[]).map(String));
  const refreshable=cart.filter(x=>x.offerToken);
  const status=document.getElementById("cartRefreshStatus");
  const time=document.getElementById("cartRefreshTime");
  const notice=document.getElementById("cartChangeNotice");
  const button=document.getElementById("refreshCartButton");

  if(!refreshable.length){
    cart.forEach(item=>{
      item.stale=true;
      item.selected=false;
    });
    saveCart();
    if(status) status.textContent="Нужно заново выбрать предложения";
    if(time) time.textContent="";
    if(notice){
      notice.hidden=false;
      notice.textContent="Старые позиции нельзя подтвердить автоматически. Добавьте их заново из живого каталога.";
    }
    return {ok:false,changed:0,blocked:cart.length};
  }

  if(button) button.disabled=true;
  if(status) status.textContent="Проверяем цены и наличие…";

  try{
    const data=await apiRequest("/api/catalog/revalidate",{
      method:"POST",
      body:JSON.stringify({
        items:refreshable.map(x=>({
          id:x.id,
          offer_token:x.offerToken,
          quantity:x.orderQty
        }))
      })
    });

    const byId=new Map((data?.items||[]).map(item=>[String(item.id),item]));
    let changed=0;
    let blocked=0;
    let checkoutChanged=0;
    let checkoutBlocked=0;

    cart.forEach(item=>{
      if(!item.offerToken){
        item.stale=true;
        item.selected=false;
        blocked++;
        if(checkoutIds.has(String(item.id))) checkoutBlocked++;
        return;
      }

      const checked=byId.get(String(item.id));
      if(!checked || checked.status==="invalid" || checked.status==="unavailable"){
        item.stale=true;
        item.selected=false;
        item.availableQty=0;
        item.availabilityChanged=true;
        blocked++;
        if(checkoutIds.has(String(item.id))) checkoutBlocked++;
        return;
      }

      const nextPrice=Number(checked.price||0);
      const nextAvailable=Number(checked.availability||0);
      const nextDays=Math.max(0,Math.ceil(Number(checked.delivery_hours||0)/24));
      const priceChanged=Math.abs(Number(item.price||0)-nextPrice)>0.009;
      const availabilityChanged=Number(item.availableQty||0)!==nextAvailable;

      item.previousPrice=priceChanged ? item.price : null;
      item.priceChanged=priceChanged;
      item.availabilityChanged=availabilityChanged;
      if(priceChanged || availabilityChanged){
        changed++;
        if(checkoutIds.has(String(item.id))) checkoutChanged++;
      }

      item.price=nextPrice;
      item.availableQty=nextAvailable;
      item.days=nextDays;
      item.offerToken=checked.offer_token||item.offerToken;
      item.stale=false;

      if(checked.status==="insufficient" || nextAvailable<item.orderQty){
        item.selected=false;
        blocked++;
        if(checkoutIds.has(String(item.id))) checkoutBlocked++;
      }
    });

    localStorage.setItem("zapformat-cart",JSON.stringify(cart));
    renderCart();
    renderCartPage();

    if(status) status.textContent="Цены и наличие обновлены";
    if(time) time.textContent=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
    if(notice){
      if(blocked){
        notice.hidden=false;
        notice.textContent="У "+blocked+" позиц. недостаточно остатка или предложение больше недоступно.";
      }else if(changed){
        notice.hidden=false;
        notice.textContent="Изменились цена или наличие у "+changed+" позиц. Проверьте корзину.";
      }else{
        notice.hidden=true;
        notice.textContent="";
      }
    }

    if(!silent && !blocked && !changed) showToast("Цены и наличие актуальны.");
    return {ok:true,changed,blocked,checkoutChanged,checkoutBlocked};
  }catch(error){
    console.error("Cart revalidation failed",error);
    if(status) status.textContent="Не удалось обновить цены";
    if(time) time.textContent="";
    if(notice){
      notice.hidden=false;
      notice.textContent="Связь с каталогом временно недоступна. Заказ не отправлен.";
    }
    return {
      ok:false,
      changed:0,
      blocked:cart.length||1,
      checkoutChanged:0,
      checkoutBlocked:checkoutIds.size||1
    };
  }finally{
    if(button) button.disabled=false;
  }
}
function selectedCartItems(){
  return cart.filter(x=>
    x.selected &&
    !x.stale &&
    Boolean(x.offerToken) &&
    Number(x.availableQty||0)>=Number(x.orderQty||1)
  );
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
    const unavailable=Boolean(x.stale) || Number(x.availableQty||0)<Number(x.orderQty||1);
    const classes=["order-cart-row"];
    if(unavailable) classes.push("unavailable");
    if(x.priceChanged) classes.push("price-changed");

    const priceHtml=x.quoteOnly
      ? '<span class="cart-price-stack"><span class="new-price">После подтверждения</span></span>'
      : (x.priceChanged && x.previousPrice && x.previousPrice!==x.price
        ? '<span class="cart-price-stack"><span class="old-price">'+rub(x.previousPrice)+'</span><span class="new-price">'+rub(x.price)+'</span><span class="changed-label">цена изменилась</span></span>'
        : '<span class="cart-price-stack"><span class="new-price">'+rub(x.price)+'</span></span>');

    return `
      <div class="${classes.join(" ")}">
        <div class="row-number">${index+1}</div>
        <div class="row-select"><input class="cart-check" type="checkbox" data-cart-select="${x.id}" ${x.selected?"checked":""} ${unavailable?"disabled":""}></div>
        <div class="brand-cell">${x.brand}</div>
        <div class="article-cell"><span class="cart-article">${x.article}</span></div>
        <div class="description-cell cart-description">
          <span>${escapeHtml(x.name)}</span>
          ${x.vehicleContext?.label ? '<small class="cart-vehicle-context">'+escapeHtml(x.vehicleContext.label)+(x.vehicleContext.vin?" · "+escapeHtml(shortVin(x.vehicleContext.vin)):"")+'</small>' : ""}
        </div>
        <div class="warehouse-cell">${x.warehouse}</div>
        <div class="term-cell">${x.stale?"обновить":(x.days===0?"Сегодня":x.days===1?"1 день":x.days+" дня")}</div>
        <div class="qty-cell">
          <div class="cart-stepper">
            <button data-cart-minus="${x.id}">−</button>
            <span>${x.orderQty}</span>
            <button data-cart-plus="${x.id}">+</button>
          </div>
        </div>
        <div class="availability-cell cart-availability ${unavailable?"zero":""}">${x.stale?"—":x.availableQty}</div>
        <div class="price-cell cart-price-cell">${priceHtml}</div>
        <div class="sum-cell cart-sum-cell">${x.quoteOnly?"после подтверждения":rub(subtotal)}</div>
        <div class="comment-cell cart-comment"><input data-cart-comment="${x.id}" value="${String(x.comment||"").replace(/"/g,"&quot;")}" placeholder="Комментарий"></div>
        <div class="remove-cell"><button class="cart-remove-icon" data-remove="${x.id}" aria-label="Удалить">×</button></div>
      </div>
    `;
  }).join("");

  const total=selectedCartItems().reduce((s,x)=>s+(x.quoteOnly?0:x.price*x.orderQty),0);
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
  scheduleCartSync();
}

function clearCart(){
  cart=[];
  saveCart();
}

function deleteSelected(){
  cart=cart.filter(x=>!x.selected);
  saveCart();
}

async function saveCartManual(){
  localStorage.setItem("zapformat-cart",JSON.stringify(cart));
  const buttons=[...document.querySelectorAll('#saveCartButton,[data-cart-action="save"]')];
  const labels=buttons.map(btn=>btn.textContent);
  buttons.forEach(btn=>{
    btn.disabled=true;
    btn.textContent="Сохраняем…";
  });

  try{
    if(backendConfigured() && sessionUser){
      await apiRequest("/api/cart",{
        method:"PUT",
        body:JSON.stringify({items:cartPayload()})
      });
      cartSyncReady=true;
      showToast("Корзина сохранена в аккаунте.");
    }else{
      showToast("Корзина сохранена на этом устройстве.");
    }

    buttons.forEach(btn=>btn.textContent="✓ Сохранено");
  }catch(error){
    console.error("Manual cart save failed",error);
    buttons.forEach(btn=>btn.textContent="Ошибка");
    showToast("Не удалось сохранить корзину на сервере.","warn");
  }finally{
    setTimeout(()=>{
      buttons.forEach((btn,index)=>{
        btn.textContent=labels[index]||"Сохранить";
        btn.disabled=false;
      });
    },900);
  }
}

async function checkoutCart(){
  let selected=selectedCartItems();
  if(!selected.length){
    showToast("Отметьте доступные позиции.","warn");
    return;
  }

  const name=String(document.getElementById("quoteName")?.value||"").trim();
  const phone=String(document.getElementById("quotePhone")?.value||"").trim();
  if(phone.replace(/\D/g,"").length<10){
    showToast("Укажите телефон для заказа.","warn");
    document.getElementById("quotePhone")?.focus();
    return;
  }

  if(!backendConfigured()){
    showToast("Сервер заказа временно недоступен.","warn");
    return;
  }

  const button=document.getElementById("checkoutOrderButton");
  if(button){ button.disabled=true; button.textContent="Проверяем цену и наличие…"; }

  try{
    const checkoutIds=selected.map(x=>x.id);
    const check=await refreshCartOffers({silent:true,checkoutIds});
    if(!check.ok || check.checkoutBlocked){
      showToast("Одна из выбранных позиций недоступна. Проверьте корзину.","warn");
      return;
    }
    if(check.checkoutChanged){
      showToast("У выбранных позиций изменились цена или наличие. Проверьте и подтвердите заказ ещё раз.","warn");
      return;
    }

    selected=selectedCartItems();
    if(!selected.length){
      showToast("Нет доступных позиций для заказа.","warn");
      return;
    }

    if(button) button.textContent="Отправляем заказ…";

    const result=await apiRequest("/api/quote-requests",{
      method:"POST",
      body:JSON.stringify({
        name,
        phone,
        items:selected.map(x=>({
          client_id:x.id,
          brand:x.brand,
          article:x.article,
          description:x.name,
          quantity:x.orderQty,
          comment:x.comment||"",
          offer_token:x.offerToken,
          expected_price:x.price,
          vehicle_id:x.vehicleContext?.id||null
        }))
      })
    });

    const sentIds=new Set(selected.map(x=>x.id));
    cart=cart.filter(x=>!sentIds.has(x.id));
    saveCart();

    localStorage.setItem("zapformat-quote-name",name);
    localStorage.setItem("zapformat-quote-phone",phone);

    if(result.kind==="order" && result.order_number){
      showToast("Заказ #"+result.order_number+" создан.");
      if(sessionUser){
        accountDataHydrated=false;
        await hydrateAccountData();
        navigate("orders");
        await openLiveOrderDetail(result.order_id || result.order_number);
      }
    }else{
      showToast("Запрос "+result.request_id+" принят.");
      if(sessionUser){
        accountDataHydrated=false;
        await hydrateAccountData();
        navigate("orders");
        await openLiveRequestDetail(result.request_id);
      }
    }
  }catch(error){
    console.error(error);
    if(error.status===409 && error.code==="cart_changed"){
      await refreshCartOffers({silent:true});
      showToast("Цена или наличие изменились. Проверьте корзину и подтвердите ещё раз.","warn");
    }else{
      showToast("Не удалось отправить заказ. Попробуйте ещё раз.","warn");
    }
  }finally{
    if(button) button.disabled=false;
    updateCheckoutMode();
  }
}


document.addEventListener("click",async e=>{
  const brandChoice=e.target.closest("[data-brand-select]");
  if(brandChoice){
    loadLiveOffers(
      brandChoice.dataset.brandNumber,
      brandChoice.dataset.brandSelect,
      brandChoice.dataset.brandDescription||""
    );
    return;
  }

  const cartAction=e.target.closest("[data-cart-action]");
  if(cartAction){
    const action=cartAction.dataset.cartAction;
    if(action==="clear") clearCart();
    else if(action==="delete-selected") deleteSelected();
    else if(action==="save") await saveCartManual();
    else if(action==="checkout") checkoutCart();
    return;
  }

  const verifiedArticle=e.target.closest("[data-verified-article]");
  if(verifiedArticle){
    await loadLiveOffers(
      verifiedArticle.dataset.verifiedArticle,
      verifiedArticle.dataset.verifiedBrand,
      verifiedArticle.dataset.verifiedDescription||""
    );
    return;
  }

  const modification=e.target.closest("[data-catalog-modification]");
  if(modification){
    const vehicle=currentSearchVehicle();
    if(!vehicle?.id || !lastSmartSearchQuery) return;
    modification.disabled=true;
    try{
      await apiRequest("/api/garage/vehicles/"+encodeURIComponent(vehicle.id)+"/catalog-modification",{
        method:"POST",
        body:JSON.stringify({modification_id:modification.dataset.catalogModification})
      });
      accountDataHydrated=false;
      await hydrateAccountData();
      await runSmartPartSearch(lastSmartSearchQuery,currentSearchVehicle());
    }catch(error){
      console.error("Catalog modification save failed",error);
      showToast("Не удалось сохранить модификацию.","warn");
      modification.disabled=false;
    }
    return;
  }

  const route=e.target.closest("[data-route]"); if(route){ navigate(route.dataset.route); return; }
  const query=e.target.closest("[data-query]"); if(query){ search(query.dataset.query); return; }
  if(e.target.closest("[data-focus-catalog-search]")){
    const input=document.getElementById("searchInput2");
    input?.focus();
    input?.select?.();
    return;
  }

  const filtersToggle=e.target.closest(".filters-toggle");
  if(filtersToggle){
    const filters=document.querySelector(".compact-filters");
    const open=filters?.classList.toggle("open");
    filtersToggle.textContent=open ? "Скрыть фильтры" : "Показать фильтры";
    filtersToggle.setAttribute("aria-expanded",open ? "true" : "false");
    return;
  }

  const filter=e.target.closest("[data-filter]");
  if(filter){
    document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));
    filter.classList.add("active");
    currentFilter=filter.dataset.filter;
    renderCatalog();
    if(window.matchMedia("(max-width:680px)").matches){
      document.querySelector(".compact-filters")?.classList.remove("open");
      const toggle=document.querySelector(".filters-toggle");
      if(toggle){
        toggle.textContent="Показать фильтры";
        toggle.setAttribute("aria-expanded","false");
      }
    }
    return;
  }
  const sort=e.target.closest("[data-sort]");
  if(sort){
    document.querySelectorAll("[data-sort]").forEach(x=>x.classList.remove("active"));
    sort.classList.add("active");
    const mode=sort.dataset.sort;
    currentSort=mode;
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
const quoteNameInput=document.getElementById("quoteName");
const quotePhoneInput=document.getElementById("quotePhone");
if(quoteNameInput) quoteNameInput.value=localStorage.getItem("zapformat-quote-name")||"";
if(quotePhoneInput) quotePhoneInput.value=localStorage.getItem("zapformat-quote-phone")||"";
updateCheckoutMode();
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
  const brand=params.get("brand");
  const view=params.get("view");
  if(q){
    search(q,{push:false,brand});
  } else if(view){
    showRoute(view);
  } else {
    showRoute("home");
  }
}
window.addEventListener("popstate",restoreFromUrl);
document.getElementById("backButton")?.addEventListener("click",()=>history.back());
restoreFromUrl();
hydrateSession();

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
document.getElementById("checkoutOrderButton")?.addEventListener("click",checkoutCart);
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
  showToast("Добавлено позиций: "+added);
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

function maintenanceStateLabel(item){
  if(item.status==="soon") return '<span class="garage-state soon">Скоро</span>';
  if(item.status==="measure") return '<span class="garage-state measure">По замерам</span>';
  return '<span class="garage-state ok">В порядке</span>';
}

function maintenanceRemaining(item){
  if(!item.nextKm) return "Контроль по состоянию";
  const left=item.nextKm-garageState.vehicle.mileage;
  if(left<=0) return "Пора сделать";
  return "через "+new Intl.NumberFormat("ru-RU").format(left)+" км";
}

function renderGarageOverview(){
  const v=garageState.vehicle;
  const next=garageState.maintenance
    .filter(x=>x.nextKm)
    .sort((a,b)=>a.nextKm-b.nextKm)[0];

  const measures=garageState.measurements.slice(0,4);
  const history=garageState.history.slice(0,2);

  return `
    <div class="garage-owner-grid">
      <section class="garage-owner-main">
        <div class="garage-car-hero">
          <div class="garage-car-badge">${escapeHtml((v.brand||"ZF").slice(0,5))}</div>
          <div class="garage-car-title">
            <span class="eyebrow">ОСНОВНОЙ АВТОМОБИЛЬ</span>
            <h2>${escapeHtml(v.brand)} ${escapeHtml(v.model)}</h2>
            <p>${escapeHtml(v.year||"—")} · ${escapeHtml(v.engine||"Двигатель не указан")}${v.vin?" · VIN "+escapeHtml(v.vin):""}</p>
          </div>
          <button class="garage-outline" data-garage-search="${escapeHtml([v.brand,v.model,v.engine].filter(Boolean).join(" "))}">Найти запчасть</button>
        </div>

        <div class="garage-mileage-card">
          <div>
            <small>Текущий пробег</small>
            <strong>${new Intl.NumberFormat("ru-RU").format(v.mileage||0)} км</strong>
            <span>Пробег хранится в аккаунте и используется для плана обслуживания.</span>
          </div>
          <div class="garage-mileage-edit">
            <input id="garageMileageInput" inputmode="numeric" value="${v.mileage||0}" aria-label="Пробег">
            <button data-garage-save-mileage>Сохранить</button>
          </div>
        </div>

        <section class="garage-panel">
          <div class="garage-panel-head">
            <div><span class="eyebrow">БЛИЖАЙШЕЕ ТО</span><h3>${next?.title||"План обслуживания пока пуст"}</h3></div>
            <button data-garage-tab="maintenance">Все работы →</button>
          </div>
          ${next ? `
            <div class="garage-next-service">
              <div><small>Следующий рубеж</small><b>${next.nextKm ? new Intl.NumberFormat("ru-RU").format(next.nextKm)+" км" : "по состоянию"}</b></div>
              <div><small>Осталось</small><b>${maintenanceRemaining(next)}</b></div>
              <button class="garage-primary" data-garage-prefill="${escapeHtml(next.query||([v.brand,v.model,next.title].filter(Boolean).join(" ")))}">Найти детали</button>
            </div>
          ` : `
            <div class="garage-empty-inline">
              <b>Пока нет сохранённых работ ТО.</b>
              <span>Гараж уже хранит автомобиль, VIN, пробег, замеры и историю. План ТО добавим следующим слоем.</span>
            </div>
          `}
        </section>
      </section>

      <aside class="garage-owner-side">
        <section class="garage-panel">
          <div class="garage-panel-head"><div><span class="eyebrow">ЗАМЕРЫ</span><h3>Состояние</h3></div><button data-garage-tab="measurements">Все →</button></div>
          <div class="garage-measure-mini">
            ${measures.length ? measures.map(x=>`
              <div><span>${escapeHtml(x.type)}</span><b>${escapeHtml(x.value)} ${escapeHtml(x.unit)}</b></div>
            `).join("") : '<div class="garage-empty-mini">Замеров пока нет</div>'}
          </div>
        </section>

        <section class="garage-panel">
          <div class="garage-panel-head"><div><span class="eyebrow">ИСТОРИЯ</span><h3>Последние работы</h3></div><button data-garage-tab="history">Вся история →</button></div>
          <div class="garage-history-mini">
            ${history.length ? history.map(x=>`
              <article><small>${escapeHtml(x.date)} · ${new Intl.NumberFormat("ru-RU").format(x.mileage||0)} км</small><b>${escapeHtml(x.title)}</b><span>${escapeHtml(x.note||"")}</span></article>
            `).join("") : '<div class="garage-empty-mini">История пока пуста</div>'}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function renderGarageMaintenance(){
  const v=garageState.vehicle;
  return `
    <section class="garage-panel garage-full-panel">
      <div class="garage-panel-head">
        <div><span class="eyebrow">ТЕХОБСЛУЖИВАНИЕ</span><h3>План ТО</h3><p>Пробег, состояние и быстрый переход к поиску деталей именно для выбранного автомобиля.</p></div>
      </div>
      <div class="garage-maintenance-list">
        ${garageState.maintenance.length ? garageState.maintenance.map(item=>`
          <article class="garage-maintenance-row">
            <div class="garage-maintenance-main">
              ${maintenanceStateLabel(item)}
              <b>${escapeHtml(item.title)}</b>
              <small>${item.nextKm ? "Следующее: "+new Intl.NumberFormat("ru-RU").format(item.nextKm)+" км · "+maintenanceRemaining(item) : "Интервал определяется по состоянию и замерам"}</small>
            </div>
            <button data-garage-prefill="${escapeHtml(item.query||([v.brand,v.model,item.title].filter(Boolean).join(" ")))}">Найти детали</button>
          </article>
        `).join("") : `
          <div class="garage-empty-inline">
            <b>План ТО ещё не заполнен.</b>
            <span>Мы не подставляем выдуманные регламенты или детали. План будет строиться по данным автомобиля, пробегу и подтверждённым работам.</span>
          </div>
        `}
      </div>
    </section>
  `;
}

function renderGarageMeasurements(){
  return `
    <section class="garage-panel garage-full-panel">
      <div class="garage-panel-head">
        <div><span class="eyebrow">ЗАМЕРЫ</span><h3>Контроль состояния</h3><p>Колодки, диски, протектор, давление, АКБ, жидкости — любые фактические значения по машине.</p></div>
        <button class="garage-primary" data-garage-toggle-measurement>+ Добавить замер</button>
      </div>

      ${garageMeasurementOpen ? `
        <form class="garage-measure-form" id="garageMeasurementForm">
          <label><span>Что измерили</span><input name="type" placeholder="Например: Передние колодки" required></label>
          <label><span>Значение</span><input name="value" inputmode="decimal" placeholder="6" required></label>
          <label><span>Единица</span><input name="unit" placeholder="мм / В / бар / °C" required></label>
          <label class="garage-measure-note"><span>Комментарий</span><input name="note" placeholder="Необязательно"></label>
          <div class="garage-measure-actions"><button type="button" data-garage-toggle-measurement>Отмена</button><button class="garage-primary" type="submit">Сохранить</button></div>
        </form>
      ` : ""}

      <div class="garage-measure-list">
        ${garageState.measurements.map(x=>`
          <article>
            <div><b>${x.type}</b><small>${x.date}${x.note?" · "+x.note:""}</small></div>
            <strong>${x.value} <span>${x.unit}</span></strong>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGarageHistory(){
  const today=new Date().toISOString().slice(0,10);
  return `
    <section class="garage-panel garage-full-panel">
      <div class="garage-panel-head">
        <div><span class="eyebrow">ИСТОРИЯ АВТОМОБИЛЯ</span><h3>Работы и обслуживание</h3><p>Сервисная история хранится в аккаунте и привязана к выбранному автомобилю.</p></div>
        <button class="garage-primary" data-garage-toggle-history>+ Добавить запись</button>
      </div>

      ${garageHistoryOpen ? `
        <form class="garage-history-form" id="garageHistoryForm">
          <label><span>Работа</span><input name="title" placeholder="Например: Замена масла" required></label>
          <label><span>Пробег, км</span><input name="mileage" inputmode="numeric" value="${garageState.vehicle.mileage||""}" placeholder="Пробег"></label>
          <label><span>Дата</span><input name="service_date" type="date" value="${today}"></label>
          <label class="wide"><span>Комментарий</span><input name="note" placeholder="Что сделали, какие детали установили"></label>
          <div class="garage-measure-actions wide">
            <button type="button" data-garage-toggle-history>Отмена</button>
            <button class="garage-primary" type="submit">Сохранить</button>
          </div>
        </form>
      ` : ""}

      <div class="garage-history-list">
        ${garageState.history.length ? garageState.history.map(x=>`
          <article>
            <div class="garage-history-date"><b>${escapeHtml(x.date)}</b><span>${new Intl.NumberFormat("ru-RU").format(x.mileage||0)} км</span></div>
            <div><b>${escapeHtml(x.title)}</b><p>${escapeHtml(x.note||"")}</p></div>
          </article>
        `).join("") : `
          <div class="garage-empty-inline">
            <b>История пока пуста.</b>
            <span>Добавляйте фактические работы — дальше они смогут влиять на рекомендации и план ТО.</span>
          </div>
        `}
      </div>
    </section>
  `;
}

function renderGarageApp(){
  const root=document.getElementById("garageApp");
  if(!root) return;

  if(!garageState.vehicle?.id){
    root.innerHTML=`
      <div class="garage-owner-head">
        <div>
          <span class="eyebrow">ГАРАЖ</span>
          <h2>Мои автомобили</h2>
          <p>Сохраните автомобиль один раз — дальше VIN, пробег, история и подбор будут связаны с ним.</p>
        </div>
        <button class="account-primary" data-garage-add-vehicle>+ Добавить автомобиль</button>
      </div>
      <section class="garage-empty-state">
        <div class="garage-empty-icon">+</div>
        <h3>В гараже пока нет автомобилей</h3>
        <p>Добавьте марку, модель и при возможности VIN. Никаких демонстрационных BMW — здесь будут только ваши реальные автомобили.</p>
        <button class="garage-primary" data-garage-add-vehicle>Добавить автомобиль</button>
      </section>
    `;
    return;
  }

  const v=garageState.vehicle;
  const vehicles=garageVehicles.length ? garageVehicles : [v];

  root.innerHTML=`
    <div class="garage-owner-head">
      <div>
        <span class="eyebrow">ГАРАЖ</span>
        <h2>Мои автомобили</h2>
        <p>Выберите основной автомобиль. По нему открываются пробег, замеры, история и поиск деталей.</p>
      </div>
      <button class="account-primary" data-garage-add-vehicle>+ Добавить автомобиль</button>
    </div>

    <div class="garage-vehicle-strip">
      ${vehicles.map(car=>`
        <button class="${String(car.id)===String(v.id)?"active":""}" data-garage-vehicle="${escapeHtml(car.id)}">
          <span class="car-mark">${escapeHtml((car.brand||"ZF").slice(0,5))}</span>
          <span>
            <b>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</b>
            <small>${escapeHtml(car.year||"—")} · ${escapeHtml(car.engine||"двигатель не указан")}${car.isDefault?" · основной":""}</small>
          </span>
        </button>
      `).join("")}
      <button class="garage-add-small" data-garage-edit-vehicle aria-label="Изменить выбранный автомобиль">✎</button>
      <button class="garage-add-small garage-add-new" data-garage-add-vehicle aria-label="Добавить автомобиль">+</button>
    </div>

    <nav class="garage-tabs" aria-label="Разделы автомобиля">
      <button class="${garageTab==="overview"?"active":""}" data-garage-tab="overview">Обзор</button>
      <button class="${garageTab==="maintenance"?"active":""}" data-garage-tab="maintenance">ТО</button>
      <button class="${garageTab==="measurements"?"active":""}" data-garage-tab="measurements">Замеры</button>
      <button class="${garageTab==="history"?"active":""}" data-garage-tab="history">История</button>
    </nav>

    <div class="garage-tab-body">
      ${garageTab==="overview" ? renderGarageOverview() :
        garageTab==="maintenance" ? renderGarageMaintenance() :
        garageTab==="measurements" ? renderGarageMeasurements() :
        renderGarageHistory()}
    </div>
  `;
}

async function saveGarageVin(){
  const input=document.getElementById("garageVinInput");
  const vin=String(input?.value||"").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"");
  if(vin.length!==17){
    showToast("VIN должен содержать 17 символов.","warn");
    input?.focus();
    return;
  }

  garageState.vehicle.vin=vin;
  saveGarageState();
  renderGarageApp();

  if(backendConfigured() && sessionUser && garageState.vehicle.id && !String(garageState.vehicle.id).startsWith("demo-")){
    try{
      await apiRequest("/api/garage/vehicles/"+encodeURIComponent(garageState.vehicle.id),{
        method:"PATCH",
        body:JSON.stringify({vin})
      });
    }catch(error){
      console.warn("ZapFormat VIN sync failed",error);
    }
  }
}

function closeGarageVehicleEditor(){
  document.getElementById("garageVehicleEditor")?.remove();
}

function openGarageVehicleEditor(mode="edit"){
  closeGarageVehicleEditor();
  const isNew=mode==="new" || !garageState.vehicle?.id;
  const v=isNew ? structuredClone(defaultGarageState.vehicle) : garageState.vehicle;
  const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const root=document.createElement("div");
  root.id="garageVehicleEditor";
  root.className="vehicle-editor-backdrop";
  root.innerHTML=`
    <div class="vehicle-editor" role="dialog" aria-modal="true" aria-labelledby="vehicleEditorTitle">
      <div class="vehicle-editor-head">
        <div><span class="eyebrow">ГАРАЖ</span><h3 id="vehicleEditorTitle">${isNew?"Добавить автомобиль":"Изменить автомобиль"}</h3></div>
        <button type="button" class="vehicle-editor-close" data-close-vehicle-editor aria-label="Закрыть">×</button>
      </div>
      <form id="garageVehicleForm" class="vehicle-editor-form" data-vehicle-mode="${isNew?"new":"edit"}">
        <label><span>Марка</span><input name="brand" value="${esc(v.brand)}" placeholder="Ford" required></label>
        <label><span>Модель</span><input name="model" value="${esc(v.model)}" placeholder="Focus" required></label>
        <label><span>Год</span><input name="year" inputmode="numeric" value="${esc(v.year)}" placeholder="2010"></label>
        <label><span>Поколение</span><input name="generation" value="${esc(v.generation)}" placeholder="F25 / Mk2"></label>
        <label><span>Двигатель</span><input name="engine" value="${esc(v.engine)}" placeholder="1.8 бензин"></label>
        <label><span>Госномер</span><input name="plate" value="${esc(v.plate)}" placeholder="А123ВС62"></label>
        <label class="wide"><span>VIN</span><input name="vin" maxlength="17" autocomplete="off" autocapitalize="characters" value="${esc(v.vin)}" placeholder="17 символов"></label>
        <label class="wide"><span>Пробег, км</span><input name="mileage" inputmode="numeric" value="${esc(v.mileage||"")}" placeholder="0"></label>
        <div class="vehicle-editor-actions">
          <button type="button" data-close-vehicle-editor>Отмена</button>
          <button type="submit" class="account-primary">${isNew?"Добавить":"Сохранить"}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(root);
  requestAnimationFrame(()=>root.classList.add("show"));
  root.querySelector('input[name="brand"]')?.focus();
}

async function saveGarageVehicleForm(form){
  const data=Object.fromEntries(new FormData(form).entries());
  const mode=form.dataset.vehicleMode||"edit";
  const vin=String(data.vin||"").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"");
  if(vin && vin.length!==17){
    showToast("VIN должен содержать 17 символов.","warn");
    form.querySelector('[name="vin"]')?.focus();
    return;
  }

  const brand=String(data.brand||"").trim().toUpperCase();
  const model=String(data.model||"").trim();
  if(!brand || !model){
    showToast("Укажите марку и модель.","warn");
    return;
  }

  const yearRaw=parseInt(data.year,10);
  const year=Number.isFinite(yearRaw) ? Math.max(1900,Math.min(2100,yearRaw)) : null;
  const mileage=Math.max(0,parseInt(String(data.mileage||"0").replace(/\D/g,""),10)||0);
  const payload={
    brand,
    model,
    generation:String(data.generation||"").trim()||null,
    year,
    engine:String(data.engine||"").trim(),
    plate_number:String(data.plate||"").trim().toUpperCase()||null,
    vin:vin||null,
    current_mileage:mileage
  };

  if(!backendConfigured() || !sessionUser){
    showToast("Войдите в аккаунт, чтобы сохранить автомобиль.","warn");
    return;
  }

  const button=form.querySelector('button[type="submit"]');
  if(button) button.disabled=true;

  try{
    let result;
    if(mode==="new"){
      result=await apiRequest("/api/garage/vehicles",{
        method:"POST",
        body:JSON.stringify({...payload,is_default:garageVehicles.length===0})
      });
      garageActiveVehicleId=result?.vehicle?.id||null;
    }else{
      if(!garageState.vehicle?.id) throw new Error("vehicle_not_selected");
      result=await apiRequest("/api/garage/vehicles/"+encodeURIComponent(garageState.vehicle.id),{
        method:"PATCH",
        body:JSON.stringify(payload)
      });
      garageActiveVehicleId=result?.vehicle?.id||garageState.vehicle.id;
    }

    closeGarageVehicleEditor();
    accountDataHydrated=false;
    await hydrateAccountData();
    showToast(mode==="new" ? "Автомобиль добавлен." : "Автомобиль обновлён.");
  }catch(error){
    console.error("Garage vehicle save failed",error);
    showToast(error?.code==="conflict" ? "Этот VIN уже есть в вашем гараже." : "Не удалось сохранить автомобиль.","warn");
  }finally{
    if(button) button.disabled=false;
  }
}

function prefillGarageSearch(query){
  navigate("home");
  const input=document.getElementById("searchInput");
  if(input){
    input.value=query;
    input.dispatchEvent(new Event("input"));
    input.focus();
  }
}

function showAccountTab(tab){
  document.querySelectorAll(".account-pane").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll("[data-account-tab]").forEach(x=>x.classList.remove("active"));
  document.getElementById("account-"+tab)?.classList.add("active");
  const navTab=tab==="order-detail" ? "orders" : tab;
  const activeAccountTabs=document.querySelectorAll('[data-account-tab="'+navTab+'"]');
  activeAccountTabs.forEach(x=>x.classList.add("active"));
  const activeNav=[...activeAccountTabs].find(x=>x.closest(".account-nav"));
  if(activeNav){
    requestAnimationFrame(()=>activeNav.scrollIntoView({behavior:"auto",block:"nearest",inline:"center"}));
  }
  if(tab==="garage") renderGarageApp();
  if(sessionUser && (tab==="overview" || tab==="orders" || tab==="garage") && !accountDataHydrated){
    hydrateAccountData();
  }
  const profileViewActive=document.getElementById("view-profile")?.classList.contains("active");
  if(profileViewActive){
    if(tab==="orders" || tab==="order-detail") syncMobileNav("orders");
    else if(tab==="garage") syncMobileNav("garage");
  }
  try{ localStorage.setItem("zapformat-account-tab",tab); }catch{}
}

document.addEventListener("click",async e=>{
  const authTab=e.target.closest("[data-auth-tab]");
  if(authTab){ showAuthTab(authTab.dataset.authTab); return; }

  const garageVehicle=e.target.closest("[data-garage-vehicle]");
  if(garageVehicle){
    selectGarageVehicle(garageVehicle.dataset.garageVehicle);
    return;
  }

  if(e.target.closest("[data-garage-add-vehicle]")){
    openGarageVehicleEditor("new");
    return;
  }

  if(e.target.closest("[data-garage-edit-vehicle]")){
    openGarageVehicleEditor("edit");
    return;
  }

  if(e.target.closest("[data-garage-save-vin]")){
    saveGarageVin();
    return;
  }

  const garageTabButton=e.target.closest("[data-garage-tab]");
  if(garageTabButton){
    garageTab=garageTabButton.dataset.garageTab;
    garageMeasurementOpen=false;
    garageHistoryOpen=false;
    renderGarageApp();
    return;
  }

  if(e.target.closest("[data-garage-toggle-measurement]")){
    garageMeasurementOpen=!garageMeasurementOpen;
    renderGarageApp();
    return;
  }

  if(e.target.closest("[data-garage-toggle-history]")){
    garageHistoryOpen=!garageHistoryOpen;
    renderGarageApp();
    return;
  }

  const garagePrefill=e.target.closest("[data-garage-prefill]");
  if(garagePrefill){
    prefillGarageSearch(garagePrefill.dataset.garagePrefill);
    return;
  }

  const garageSearch=e.target.closest("[data-garage-search]");
  if(garageSearch){
    prefillGarageSearch(garageSearch.dataset.garageSearch);
    return;
  }

  if(e.target.closest("[data-garage-save-mileage]")){
    const input=document.getElementById("garageMileageInput");
    const raw=parseInt(String(input?.value||"").replace(/\D/g,""),10);
    const value=Number.isFinite(raw) ? Math.max(0,raw) : null;
    if(value===null){
      showToast("Укажите пробег числом.","warn");
      return;
    }

    if(backendConfigured() && sessionUser && garageState.vehicle.id){
      try{
        const result=await apiRequest("/api/garage/vehicles/"+encodeURIComponent(garageState.vehicle.id)+"/mileage",{
          method:"PATCH",
          body:JSON.stringify({mileage:value})
        });
        garageState.vehicle=normalizeGarageVehicle(result.vehicle);
        garageVehicles=garageVehicles.map(x=>String(x.id)===String(result.vehicle.id)?normalizeGarageVehicle(result.vehicle):x);
        saveGarageState();
        renderGarageApp();
        showToast("Пробег сохранён.");
      }catch(error){
        console.warn("ZapFormat mileage sync failed",error);
        showToast("Не удалось сохранить пробег.","warn");
      }
    }
    return;
  }

  const tab=e.target.closest("[data-account-tab]");
  if(tab){ showAccountTab(tab.dataset.accountTab); return; }

  const liveOrderDetail=e.target.closest("[data-live-order-detail]");
  if(liveOrderDetail){
    openLiveOrderDetail(liveOrderDetail.dataset.liveOrderDetail);
    return;
  }

  const liveDetail=e.target.closest("[data-live-request-detail]");
  if(liveDetail){
    openLiveRequestDetail(liveDetail.dataset.liveRequestDetail);
    return;
  }

  const liveRepeat=e.target.closest("[data-live-repeat-order]");
  if(liveRepeat){
    await repeatLiveOrder(liveRepeat.dataset.liveRepeatOrder,liveRepeat);
    return;
  }
});

document.getElementById("loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector('button[type="submit"]');
  const data=Object.fromEntries(new FormData(form).entries());
  button.disabled=true;
  setAuthStatus("Входим…");
  try{
    const result=await apiRequest("/api/auth/login",{
      method:"POST",
      body:JSON.stringify({login:data.login,password:data.password})
    });
    sessionUser=result.user;
    applySessionUser();
    await hydrateCartFromAccount();
    await hydrateAccountData();
    setAuthStatus("Готово.","success");
    navigate(pendingAccountRoute||"profile");
  }catch(error){
    setAuthStatus(authErrorText(error),"error");
  }finally{
    button.disabled=false;
  }
});

document.getElementById("registerForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const button=form.querySelector('button[type="submit"]');
  const data=Object.fromEntries(new FormData(form).entries());
  if(!String(data.phone||"").trim() && !String(data.email||"").trim()){
    setAuthStatus("Укажите телефон или email.","error");
    return;
  }
  button.disabled=true;
  setAuthStatus("Создаём аккаунт…");
  try{
    const result=await apiRequest("/api/auth/register",{
      method:"POST",
      body:JSON.stringify({
        name:data.name,
        surname:data.surname,
        phone:data.phone,
        email:data.email,
        password:data.password
      })
    });
    sessionUser=result.user;
    applySessionUser();
    await hydrateCartFromAccount();
    await hydrateAccountData();
    setAuthStatus("Аккаунт создан.","success");
    navigate(pendingAccountRoute||"profile");
  }catch(error){
    setAuthStatus(authErrorText(error),"error");
  }finally{
    button.disabled=false;
  }
});

document.getElementById("logoutButton")?.addEventListener("click",async()=>{
  try{
    if(backendConfigured()) await apiRequest("/api/auth/logout",{method:"POST"});
  }catch(error){
    console.warn("ZapFormat logout failed",error);
  }finally{
    sessionUser=null;
    cartSyncReady=false;
    cartHydratedUserId=null;
    garageVehicles=[];
    garageActiveVehicleId=null;
    garageState=structuredClone(defaultGarageState);
    clearTimeout(cartSyncTimer);
    saveGarageState();
    renderGarageApp();
    updateVehicleContextUi();
    applySessionUser();
    pendingAccountRoute="profile";
    navigate("auth");
  }
});

document.addEventListener("submit",async e=>{
  const garageMeasureForm=e.target.closest("#garageMeasurementForm");
  if(garageMeasureForm){
    e.preventDefault();
    if(!sessionUser || !garageState.vehicle?.id){
      showToast("Сначала добавьте автомобиль.","warn");
      return;
    }

    const data=Object.fromEntries(new FormData(garageMeasureForm).entries());
    const submit=garageMeasureForm.querySelector('button[type="submit"]');
    if(submit) submit.disabled=true;

    try{
      await apiRequest("/api/garage/vehicles/"+encodeURIComponent(garageState.vehicle.id)+"/measurements",{
        method:"POST",
        body:JSON.stringify({
          measurement_type:String(data.type||"").trim(),
          value:String(data.value||"").trim(),
          unit:String(data.unit||"").trim(),
          note:String(data.note||"").trim()
        })
      });
      garageMeasurementOpen=false;
      await hydrateRealGarage({vehicles:garageVehicles.map(x=>({
        id:x.id,brand:x.brand,model:x.model,generation:x.generation,year:x.year,engine:x.engine,
        vin:x.vin,plate_number:x.plate,current_mileage:x.mileage,is_default:x.isDefault
      }))});
      showToast("Замер сохранён.");
    }catch(error){
      console.error("Garage measurement save failed",error);
      showToast("Не удалось сохранить замер.","warn");
    }finally{
      if(submit) submit.disabled=false;
    }
    return;
  }

  const garageHistoryForm=e.target.closest("#garageHistoryForm");
  if(garageHistoryForm){
    e.preventDefault();
    if(!sessionUser || !garageState.vehicle?.id){
      showToast("Сначала добавьте автомобиль.","warn");
      return;
    }

    const data=Object.fromEntries(new FormData(garageHistoryForm).entries());
    const title=String(data.title||"").trim();
    if(!title){
      showToast("Укажите выполненную работу.","warn");
      return;
    }

    const submit=garageHistoryForm.querySelector('button[type="submit"]');
    if(submit) submit.disabled=true;
    try{
      await apiRequest("/api/garage/vehicles/"+encodeURIComponent(garageState.vehicle.id)+"/maintenance",{
        method:"POST",
        body:JSON.stringify({
          title,
          mileage:Math.max(0,parseInt(String(data.mileage||"0").replace(/\D/g,""),10)||0)||null,
          service_date:String(data.service_date||"").trim()||null,
          note:String(data.note||"").trim()
        })
      });
      garageHistoryOpen=false;
      await hydrateRealGarage({vehicles:garageVehicles.map(x=>({
        id:x.id,brand:x.brand,model:x.model,generation:x.generation,year:x.year,engine:x.engine,
        vin:x.vin,plate_number:x.plate,current_mileage:x.mileage,is_default:x.isDefault
      }))});
      showToast("Работа добавлена в историю.");
    }catch(error){
      console.error("Garage history save failed",error);
      showToast("Не удалось сохранить работу.","warn");
    }finally{
      if(submit) submit.disabled=false;
    }
    return;
  }

  const liveReturnForm=e.target.closest("[data-live-return-form]");
  if(liveReturnForm){
    e.preventDefault();
    const data=Object.fromEntries(new FormData(liveReturnForm).entries());
    const submit=liveReturnForm.querySelector('button[type="submit"]');
    if(submit) submit.disabled=true;
    try{
      const result=await apiRequest("/api/account/returns",{
        method:"POST",
        body:JSON.stringify({
          order_item_id:liveReturnForm.dataset.liveReturnForm,
          quantity:Number(data.quantity||1),
          reason:data.reason,
          comment:data.comment||""
        })
      });
      showToast("Возврат #"+result.return.return_number+" создан.");
      accountDataHydrated=false;
      await hydrateAccountData();
      await openLiveOrderDetail(liveReturnForm.dataset.liveReturnOrder);
    }catch(error){
      showToast(authErrorText(error),"warn");
      if(submit) submit.disabled=false;
    }
    return;
  }


});

function filterAccountOrders(){
  const query=String(document.getElementById("orderSearch")?.value||"").trim().toLowerCase();
  const status=String(document.getElementById("orderStatusFilter")?.value||"").trim().toLowerCase();
  document.querySelectorAll("#account-orders .account-table-row").forEach(row=>{
    const text=row.textContent.toLowerCase();
    const rowStatus=String(row.querySelector(".status")?.textContent||"").trim().toLowerCase();
    const matchesQuery=!query || text.includes(query);
    const matchesStatus=!status || rowStatus.includes(status);
    row.hidden=!(matchesQuery && matchesStatus);
  });
}

document.getElementById("orderSearch")?.addEventListener("input",filterAccountOrders);
document.getElementById("orderStatusFilter")?.addEventListener("change",filterAccountOrders);

document.addEventListener("keydown",e=>{
  if(e.key!=="Enter" && e.key!==" ") return;

  const liveOrder=e.target.closest?.("[data-live-order-detail][tabindex]");
  if(liveOrder){
    e.preventDefault();
    openLiveOrderDetail(liveOrder.dataset.liveOrderDetail);
    return;
  }

  const liveRequest=e.target.closest?.("[data-live-request-detail][tabindex]");
  if(liveRequest){
    e.preventDefault();
    openLiveRequestDetail(liveRequest.dataset.liveRequestDetail);
  }
});

document.getElementById("profileForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=Object.fromEntries(new FormData(form).entries());
  const btn=form.querySelector("button[type=submit]");
  const oldText=btn.textContent;
  btn.disabled=true;

  try{
    if(backendConfigured() && sessionUser){
      const result=await apiRequest("/api/account/profile",{
        method:"PATCH",
        body:JSON.stringify(data)
      });
      sessionUser=result.user;
      applySessionUser();
    }else{
      // Demo-only fallback while the public API endpoint is not configured.
      localStorage.setItem("zapformat-profile",JSON.stringify(data));
    }
    btn.textContent="Сохранено";
  }catch(error){
    btn.textContent="Ошибка";
    showToast(authErrorText(error),"warn");
  }finally{
    setTimeout(()=>{
      btn.textContent=oldText;
      btn.disabled=false;
    },900);
  }
});

document.getElementById("deliveryForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=Object.fromEntries(new FormData(form).entries());
  const btn=form.querySelector("button[type=submit]");
  const old=btn.textContent;
  btn.disabled=true;
  try{
    if(backendConfigured() && sessionUser){
      const result=await apiRequest("/api/account/delivery",{
        method:"PUT",
        body:JSON.stringify({
          city:data.city,
          address:data.address,
          recipient_name:data.recipient,
          recipient_phone:data.phone
        })
      });
      renderAccountPreferences({delivery:result.delivery});
    }else{
      localStorage.setItem("zapformat-delivery",JSON.stringify(data));
    }
    btn.textContent="Сохранено";
    showToast("Получение сохранено.");
  }catch(error){
    btn.textContent="Ошибка";
    showToast(authErrorText(error),"warn");
  }finally{
    setTimeout(()=>{
      btn.textContent=old;
      btn.disabled=false;
    },900);
  }
});

document.addEventListener("click",e=>{
  if(e.target.closest("[data-close-vehicle-editor]") || (e.target.classList?.contains("vehicle-editor-backdrop"))){
    closeGarageVehicleEditor();
  }
});

document.addEventListener("submit",e=>{
  if(e.target?.id==="garageVehicleForm"){
    e.preventDefault();
    saveGarageVehicleForm(e.target);
  }
});

try{
  const savedProfile=JSON.parse(localStorage.getItem("zapformat-profile")||"null");
  if(savedProfile && document.getElementById("profileForm")){
    for(const [key,value] of Object.entries(savedProfile)){
      const input=document.querySelector('#profileForm [name="'+key+'"]');
      if(input) input.value=value;
    }
  }
  const savedDelivery=JSON.parse(localStorage.getItem("zapformat-delivery")||"null");
  if(savedDelivery && document.getElementById("deliveryForm")){
    for(const [key,value] of Object.entries(savedDelivery)){
      const input=document.querySelector('#deliveryForm [name="'+key+'"]');
      if(input) input.value=value;
    }
  }

  const savedNotifications=JSON.parse(localStorage.getItem("zapformat-notifications")||"null");
  if(savedNotifications){
    document.querySelectorAll("[data-notification]").forEach(input=>{
      const key=input.dataset.notification;
      if(Object.prototype.hasOwnProperty.call(savedNotifications,key)) input.checked=Boolean(savedNotifications[key]);
    });
  }

  const savedTab=localStorage.getItem("zapformat-account-tab");
  if(savedTab==="order-detail"){
    showAccountTab("orders");
  }else if(savedTab){
    showAccountTab(savedTab);
  }
  renderGarageApp();
}catch{}


document.addEventListener("change",async e=>{
  const notification=e.target.closest?.("[data-notification]");
  if(!notification) return;
  const state={};
  document.querySelectorAll("[data-notification]").forEach(input=>state[input.dataset.notification]=input.checked);

  try{
    if(backendConfigured() && sessionUser){
      await apiRequest("/api/account/notifications",{
        method:"PUT",
        body:JSON.stringify({
          order_status:state.orderStatus,
          item_changes:state.positionChange,
          returns:state.returns,
          marketing:state.marketing
        })
      });
    }else{
      localStorage.setItem("zapformat-notifications",JSON.stringify(state));
    }
    showToast("Настройки уведомлений сохранены.");
  }catch(error){
    showToast("Не удалось сохранить уведомления.","warn");
    await hydrateAccountData().catch(()=>{});
  }
});
