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
const defaultGarageState = {
  vehicle:{
    id:"demo-bmw-x3",
    brand:"BMW",
    model:"X3 F25",
    year:2010,
    engine:"2.0 Diesel · N47",
    vin:"",
    plate:"",
    mileage:186420
  },
  maintenance:[
    {id:"oil",title:"Масло двигателя + фильтр",intervalKm:10000,lastKm:180000,nextKm:190000,status:"soon",query:"BMW X3 F25 N47 масло двигателя масляный фильтр комплект ТО"},
    {id:"air",title:"Воздушный фильтр",intervalKm:20000,lastKm:180000,nextKm:200000,status:"ok",query:"BMW X3 F25 N47 воздушный фильтр"},
    {id:"cabin",title:"Салонный фильтр",intervalKm:15000,lastKm:180000,nextKm:195000,status:"ok",query:"BMW X3 F25 салонный фильтр"},
    {id:"fuel",title:"Топливный фильтр",intervalKm:30000,lastKm:180000,nextKm:210000,status:"ok",query:"BMW X3 F25 N47 топливный фильтр"},
    {id:"brakes",title:"Тормоза",intervalKm:null,lastKm:null,nextKm:null,status:"measure",query:"BMW X3 F25 тормозные колодки диски по VIN"}
  ],
  measurements:[
    {id:"m1",type:"Передние колодки",value:"6",unit:"мм",date:"24.09.2026",note:"пример замера"},
    {id:"m2",type:"Протектор перед",value:"5.2",unit:"мм",date:"24.09.2026",note:"пример замера"},
    {id:"m3",type:"Протектор зад",value:"4.8",unit:"мм",date:"24.09.2026",note:"пример замера"},
    {id:"m4",type:"АКБ без нагрузки",value:"12.6",unit:"В",date:"24.09.2026",note:"пример замера"}
  ],
  history:[
    {id:"h1",date:"12.07.2026",mileage:180000,title:"ТО",note:"Масло двигателя, масляный фильтр, салонный фильтр"},
    {id:"h2",date:"20.03.2026",mileage:174600,title:"Замена",note:"Передние тормозные колодки"}
  ]
};
const garageServicePackages = {
  oil:{
    id:"oil",
    title:"ТО · масло двигателя",
    dueKm:190000,
    description:"Базовый комплект для замены масла. Точные артикулы будут подтверждаться по VIN и реальному каталогу.",
    items:[
      {id:"svc-oil-fluid",required:true,work:"Замена масла двигателя",brand:"BMW LL-04",article:"подбор по VIN",name:"Моторное масло 5W-30 · 5 л",price:6990,warehouse:"Подбор",days:2,availableQty:12,query:"BMW X3 F25 N47 моторное масло LL-04 5W-30"},
      {id:"svc-oil-filter",required:true,work:"Масляный фильтр",brand:"MANN-FILTER",article:"подбор по VIN",name:"Масляный фильтр двигателя",price:1390,warehouse:"Подбор",days:2,availableQty:18,query:"BMW X3 F25 N47 масляный фильтр"},
      {id:"svc-oil-seal",required:true,work:"Сливная пробка / уплотнение",brand:"OE / аналог",article:"подбор по VIN",name:"Уплотнение сливной пробки",price:240,warehouse:"Подбор",days:2,availableQty:30,query:"BMW X3 F25 N47 уплотнение сливной пробки"},
      {id:"svc-oil-air",required:false,work:"Воздушный фильтр",brand:"MANN-FILTER",article:"подбор по VIN",name:"Воздушный фильтр",price:1690,warehouse:"Подбор",days:2,availableQty:14,query:"BMW X3 F25 N47 воздушный фильтр"},
      {id:"svc-oil-cabin",required:false,work:"Салонный фильтр",brand:"MANN-FILTER",article:"подбор по VIN",name:"Салонный фильтр угольный",price:2890,warehouse:"Подбор",days:2,availableQty:9,query:"BMW X3 F25 салонный фильтр угольный"}
    ]
  },
  air:{
    id:"air",
    title:"ТО · воздушный фильтр",
    dueKm:200000,
    description:"Замена воздушного фильтра двигателя.",
    items:[
      {id:"svc-air-filter",required:true,work:"Воздушный фильтр",brand:"MANN-FILTER",article:"подбор по VIN",name:"Воздушный фильтр двигателя",price:1690,warehouse:"Подбор",days:2,availableQty:14,query:"BMW X3 F25 N47 воздушный фильтр"}
    ]
  },
  cabin:{
    id:"cabin",
    title:"ТО · салонный фильтр",
    dueKm:195000,
    description:"Замена фильтра салона с быстрым подбором подходящего исполнения.",
    items:[
      {id:"svc-cabin-filter",required:true,work:"Салонный фильтр",brand:"MANN-FILTER",article:"подбор по VIN",name:"Салонный фильтр угольный",price:2890,warehouse:"Подбор",days:2,availableQty:9,query:"BMW X3 F25 салонный фильтр угольный"}
    ]
  },
  fuel:{
    id:"fuel",
    title:"ТО · топливный фильтр",
    dueKm:210000,
    description:"Плановая замена топливного фильтра.",
    items:[
      {id:"svc-fuel-filter",required:true,work:"Топливный фильтр",brand:"MANN-FILTER",article:"подбор по VIN",name:"Топливный фильтр дизель",price:3490,warehouse:"Подбор",days:3,availableQty:7,query:"BMW X3 F25 N47 топливный фильтр"}
    ]
  },
  brakes:{
    id:"brakes",
    title:"Тормоза · по замерам",
    dueKm:null,
    description:"Комплект формируется по фактическому состоянию колодок и дисков.",
    items:[
      {id:"svc-brake-pads",required:false,work:"Передние колодки",brand:"ATE / аналог",article:"подбор по VIN",name:"Комплект передних тормозных колодок",price:6290,warehouse:"Подбор",days:2,availableQty:8,query:"BMW X3 F25 передние тормозные колодки"},
      {id:"svc-brake-discs",required:false,work:"Передние диски",brand:"ATE / аналог",article:"подбор по VIN",name:"Комплект передних тормозных дисков",price:13980,warehouse:"Подбор",days:3,availableQty:5,query:"BMW X3 F25 передние тормозные диски"}
    ]
  }
};
let garageServiceId=null;
let garageServiceSelection={};

function ensureGarageServiceSelection(serviceId){
  const pkg=garageServicePackages[serviceId];
  if(!pkg) return;
  if(!garageServiceSelection[serviceId]){
    garageServiceSelection[serviceId]=Object.fromEntries(pkg.items.map(item=>[item.id,Boolean(item.required)]));
  }
}

let garageTab="overview";
let garageMeasurementOpen=false;
let garageState=loadGarageState();

function loadGarageState(){
  try{
    const saved=JSON.parse(localStorage.getItem("zapformat-garage")||"null");
    return saved ? {...structuredClone(defaultGarageState),...saved,vehicle:{...defaultGarageState.vehicle,...saved.vehicle}} : structuredClone(defaultGarageState);
  }catch{
    return structuredClone(defaultGarageState);
  }
}
function saveGarageState(){
  try{localStorage.setItem("zapformat-garage",JSON.stringify(garageState))}catch{}
}


function retail(p){ return Math.round(p * (1 + MARKUP/100)); }
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

const API_BASE = (() => {
  const configured=String(window.ZAPFORMAT_CONFIG?.apiBase || "").trim().replace(/\/$/,"");
  if(configured) return configured;
  return location.hostname.endsWith("github.io") ? "" : location.origin;
})();
let sessionUser=null;
let pendingAccountRoute="profile";

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
    throw error;
  }
  return data;
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

function search(query){
  const raw=(query||"").trim();
  if(!raw) return;

  document.querySelector(".compact-filters")?.classList.remove("open");
  const filtersToggle=document.querySelector(".filters-toggle");
  if(filtersToggle){
    filtersToggle.textContent="Показать фильтры";
    filtersToggle.setAttribute("aria-expanded","false");
  }

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
  const buttons=document.querySelectorAll('#saveCartButton,[data-cart-action="save"]');
  buttons.forEach(btn=>{
    const old=btn.textContent;
    btn.textContent="✓ Сохранено";
    setTimeout(()=>btn.textContent=old,900);
  });
}

function checkoutCart(){
  const selected=selectedCartItems();
  if(!selected.length){ showToast("Отметьте хотя бы одну доступную позицию.","warn"); return; }
  showToast("Корзина готова к оформлению. Подключение отправки заказа — следующий серверный этап.");
}


document.addEventListener("click",e=>{
  const cartAction=e.target.closest("[data-cart-action]");
  if(cartAction){
    const action=cartAction.dataset.cartAction;
    if(action==="clear") clearCart();
    else if(action==="delete-selected") deleteSelected();
    else if(action==="save") saveCartManual();
    else if(action==="checkout") checkoutCart();
    return;
  }

  const route=e.target.closest("[data-route]"); if(route){ navigate(route.dataset.route); return; }
  const query=e.target.closest("[data-query]"); if(query){ search(query.dataset.query); return; }

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
hydrateSession();

document.addEventListener("change",e=>{
  const garageServiceToggle=e.target.closest("[data-garage-service-toggle]");
  if(garageServiceToggle && garageServiceId){
    ensureGarageServiceSelection(garageServiceId);
    garageServiceSelection[garageServiceId][garageServiceToggle.dataset.garageServiceToggle]=garageServiceToggle.checked;
    renderGarageApp();
    return;
  }

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
      <div class="order-detail-toolbar">
        <button class="order-detail-back" data-account-tab="orders">← Заказы</button>
        <button class="order-repeat-compact" data-repeat-order="${order.id}">Повторить</button>
      </div>
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
    </div>

    <div class="order-quickfacts">
      <div><span>Позиций</span><b>${order.items.length}</b></div>
      <div><span>Количество</span><b>${order.items.reduce((s,x)=>s+x.qty,0)} шт.</b></div>
      <div><span>Получение</span><b>${order.receive.method}</b></div>
      <div><span>Город</span><b>${order.receive.city}</b></div>
    </div>

    <section class="order-detail-block">
      <div class="order-detail-block-head"><span class="eyebrow">ДВИЖЕНИЕ ЗАКАЗА</span><h3>Временная шкала</h3></div>
      ${orderTimelineHtml(order.timeline)}
    </section>

    <section class="order-detail-block positions-block">
      <div class="order-detail-block-head"><span class="eyebrow">ПОЗИЦИИ</span><h3>Состав заказа</h3></div>
      <div class="order-positions">${itemsHtml}</div>
    </section>

    <div class="order-detail-grid ${order.comment==="Без комментария." ? "single" : ""}">
      ${order.comment!=="Без комментария." ? `
        <section class="order-detail-block">
          <div class="order-detail-block-head"><span class="eyebrow">КОММЕНТАРИЙ</span><h3>К заказу</h3></div>
          <p class="order-comment">${order.comment}</p>
        </section>
      ` : ""}
      <section class="order-detail-block">
        <div class="order-detail-block-head"><span class="eyebrow">ПОЛУЧЕНИЕ</span><h3>${order.receive.method}</h3></div>
        <dl class="receive-info">
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

  return `
    <div class="garage-owner-grid">
      <section class="garage-owner-main">
        <div class="garage-car-hero">
          <div class="garage-car-badge">${v.brand}</div>
          <div class="garage-car-title">
            <span class="eyebrow">МОЙ АВТОМОБИЛЬ</span>
            <h2>${v.brand} ${v.model}</h2>
            <p>${v.year} · ${v.engine}</p>
          </div>
          <button class="garage-outline" data-garage-search="${v.brand} ${v.model} ${v.engine}">Найти запчасть</button>
        </div>

        <div class="garage-mileage-card">
          <div>
            <small>Текущий пробег</small>
            <strong>${new Intl.NumberFormat("ru-RU").format(v.mileage)} км</strong>
            <span>Обновляйте пробег — от него считаются ближайшие работы.</span>
          </div>
          <div class="garage-mileage-edit">
            <input id="garageMileageInput" inputmode="numeric" value="${v.mileage}" aria-label="Пробег">
            <button data-garage-save-mileage>Сохранить</button>
          </div>
        </div>

        <section class="garage-panel">
          <div class="garage-panel-head">
            <div><span class="eyebrow">БЛИЖАЙШЕЕ ТО</span><h3>${next?.title||"План обслуживания"}</h3></div>
            <button data-garage-tab="maintenance">Все работы →</button>
          </div>
          <div class="garage-next-service">
            <div><small>Следующий рубеж</small><b>${next?.nextKm ? new Intl.NumberFormat("ru-RU").format(next.nextKm)+" км" : "по состоянию"}</b></div>
            <div><small>Осталось</small><b>${next ? maintenanceRemaining(next) : "—"}</b></div>
            <button class="garage-primary" data-garage-service="${next?.id||"oil"}">Открыть комплект ТО</button>
          </div>
        </section>
      </section>

      <aside class="garage-owner-side">
        <section class="garage-panel">
          <div class="garage-panel-head"><div><span class="eyebrow">ЗАМЕРЫ</span><h3>Состояние</h3></div><button data-garage-tab="measurements">Все →</button></div>
          <div class="garage-measure-mini">
            ${garageState.measurements.slice(0,4).map(x=>`
              <div><span>${x.type}</span><b>${x.value} ${x.unit}</b></div>
            `).join("")}
          </div>
        </section>

        <section class="garage-panel">
          <div class="garage-panel-head"><div><span class="eyebrow">ИСТОРИЯ</span><h3>Последние работы</h3></div><button data-garage-tab="history">Вся история →</button></div>
          <div class="garage-history-mini">
            ${garageState.history.slice(0,2).map(x=>`
              <article><small>${x.date} · ${new Intl.NumberFormat("ru-RU").format(x.mileage)} км</small><b>${x.title}</b><span>${x.note}</span></article>
            `).join("")}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function renderGarageMaintenance(){
  return `
    <section class="garage-panel garage-full-panel">
      <div class="garage-panel-head">
        <div><span class="eyebrow">ТЕХОБСЛУЖИВАНИЕ</span><h3>План ТО</h3><p>Пробег, состояние и быстрый переход к подбору нужных деталей.</p></div>
      </div>
      <div class="garage-maintenance-list">
        ${garageState.maintenance.map(item=>`
          <article class="garage-maintenance-row">
            <div class="garage-maintenance-main">
              ${maintenanceStateLabel(item)}
              <b>${item.title}</b>
              <small>${item.nextKm ? "Следующее: "+new Intl.NumberFormat("ru-RU").format(item.nextKm)+" км · "+maintenanceRemaining(item) : "Интервал определяется по состоянию и замерам"}</small>
            </div>
            <button data-garage-service="${item.id}">Открыть</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGarageService(){
  const pkg=garageServicePackages[garageServiceId]||garageServicePackages.oil;
  ensureGarageServiceSelection(pkg.id);
  const selected=garageServiceSelection[pkg.id];
  const items=pkg.items.filter(item=>selected[item.id]);
  const total=items.reduce((sum,item)=>sum+item.price,0);
  const v=garageState.vehicle;
  const remaining=pkg.dueKm ? pkg.dueKm-v.mileage : null;

  return `
    <div class="garage-service-layout">
      <section class="garage-service-main">
        <div class="garage-service-head">
          <button class="garage-service-back" data-garage-tab="maintenance">← План ТО</button>
          <div class="garage-service-heading">
            <div>
              <span class="eyebrow">КОМПЛЕКТ ТО</span>
              <h3>${pkg.title}</h3>
              <p>${pkg.description}</p>
            </div>
            <div class="garage-service-due">
              <small>${pkg.dueKm ? "Рубеж" : "Основание"}</small>
              <b>${pkg.dueKm ? new Intl.NumberFormat("ru-RU").format(pkg.dueKm)+" км" : "Замеры"}</b>
              <span>${remaining===null ? "по состоянию" : remaining<=0 ? "пора делать" : "через "+new Intl.NumberFormat("ru-RU").format(remaining)+" км"}</span>
            </div>
          </div>
        </div>

        <div class="garage-fitment ${v.vin?"verified":"pending"}">
          <div>
            <small>Применимость</small>
            <b>${v.vin ? "VIN сохранён" : "Предварительный подбор по автомобилю"}</b>
            <span>${v.vin ? v.vin : v.brand+" "+v.model+" · "+v.engine+". Для точных артикулов нужен VIN."}</span>
          </div>
          ${v.vin ? "" : `
            <div class="garage-vin-entry">
              <input id="garageVinInput" maxlength="17" autocomplete="off" placeholder="VIN · 17 символов">
              <button data-garage-save-vin>Сохранить VIN</button>
            </div>
          `}
        </div>

        <div class="garage-service-list">
          ${pkg.items.map((item,index)=>`
            <article class="garage-service-item ${selected[item.id]?"selected":""}">
              <label class="garage-service-check">
                <input type="checkbox" data-garage-service-toggle="${item.id}" ${selected[item.id]?"checked":""}>
                <span></span>
              </label>
              <div class="garage-service-number">${index+1}</div>
              <div class="garage-service-copy">
                <div class="garage-service-work">
                  <span class="garage-service-kind ${item.required?"required":"optional"}">${item.required?"Нужно":"Дополнительно"}</span>
                  <b>${item.work}</b>
                </div>
                <div class="garage-service-product">
                  <strong>${item.brand}</strong>
                  <span>${item.article}</span>
                  <small>${item.name}</small>
                </div>
                <div class="garage-service-meta">
                  <span>${item.days} дн.</span>
                  <span>${item.availableQty} шт.</span>
                  <button data-garage-prefill="${item.query}">Другой вариант</button>
                </div>
              </div>
              <div class="garage-service-price">${rub(item.price)}</div>
            </article>
          `).join("")}
        </div>
      </section>

      <aside class="garage-service-summary">
        <span class="eyebrow">ИТОГО</span>
        <div class="garage-service-summary-line"><span>Выбрано</span><b>${items.length} поз.</b></div>
        <div class="garage-service-summary-total"><span>Комплект</span><strong>${rub(total)}</strong></div>
        <button class="garage-primary" data-garage-add-service="${pkg.id}" ${items.length?"":"disabled"}>В корзину комплектом</button>
        <small>Цена и наличие будут перепроверены перед оформлением заказа.</small>
      </aside>
    </div>
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
  return `
    <section class="garage-panel garage-full-panel">
      <div class="garage-panel-head">
        <div><span class="eyebrow">ИСТОРИЯ АВТОМОБИЛЯ</span><h3>Работы и обслуживание</h3><p>Сервисная история остаётся у владельца и привязана к автомобилю.</p></div>
      </div>
      <div class="garage-history-list">
        ${garageState.history.map(x=>`
          <article>
            <div class="garage-history-date"><b>${x.date}</b><span>${new Intl.NumberFormat("ru-RU").format(x.mileage)} км</span></div>
            <div><b>${x.title}</b><p>${x.note}</p></div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGarageApp(){
  const root=document.getElementById("garageApp");
  if(!root) return;
  const v=garageState.vehicle;
  root.innerHTML=`
    <div class="garage-owner-head">
      <div>
        <span class="eyebrow">ГАРАЖ</span>
        <h2>Мой автомобиль</h2>
        <p>Мини-приложение владельца: ТО, замеры, история и заказ деталей из одного места.</p>
      </div>
      <button class="account-primary" id="addCarButton">Изменить автомобиль</button>
    </div>

    <div class="garage-vehicle-strip">
      <button class="active"><span class="car-mark">${v.brand}</span><span><b>${v.brand} ${v.model}</b><small>${v.year} · ${v.engine}</small></span></button>
      <button class="garage-add-small" id="addCarButtonCompact" aria-label="Изменить автомобиль">✎</button>
    </div>

    <nav class="garage-tabs" aria-label="Разделы автомобиля">
      <button class="${garageTab==="overview"?"active":""}" data-garage-tab="overview">Обзор</button>
      <button class="${garageTab==="maintenance"||garageTab==="service"?"active":""}" data-garage-tab="maintenance">ТО</button>
      <button class="${garageTab==="measurements"?"active":""}" data-garage-tab="measurements">Замеры</button>
      <button class="${garageTab==="history"?"active":""}" data-garage-tab="history">История</button>
    </nav>

    <div class="garage-tab-body">
      ${garageTab==="overview" ? renderGarageOverview() :
        garageTab==="maintenance" ? renderGarageMaintenance() :
        garageTab==="measurements" ? renderGarageMeasurements() :
        garageTab==="service" ? renderGarageService() :
        renderGarageHistory()}
    </div>
  `;
}

function openGarageService(serviceId){
  if(!garageServicePackages[serviceId]) return;
  garageServiceId=serviceId;
  ensureGarageServiceSelection(serviceId);
  garageTab="service";
  renderGarageApp();
  window.scrollTo({top:0,behavior:"auto"});
}

function addGarageServiceToCart(serviceId){
  const pkg=garageServicePackages[serviceId];
  if(!pkg) return;
  ensureGarageServiceSelection(serviceId);
  const selected=garageServiceSelection[serviceId];

  for(const item of pkg.items.filter(x=>selected[x.id])){
    const existing=cart.find(x=>x.id===item.id);
    if(existing){
      existing.orderQty+=1;
      existing.selected=true;
      existing.price=item.price;
      existing.availableQty=item.availableQty;
    }else{
      cart.push({
        id:item.id,
        type:"garage-service",
        brand:item.brand,
        article:item.article,
        name:item.name,
        warehouse:item.warehouse,
        source:"Гараж · "+pkg.title,
        days:item.days,
        qty:item.availableQty,
        price:item.price,
        priceAtAdd:item.price,
        previousPrice:null,
        orderQty:1,
        availableQty:item.availableQty,
        selected:true,
        comment:pkg.title+" · "+garageState.vehicle.brand+" "+garageState.vehicle.model,
        priceChanged:false,
        availabilityChanged:false
      });
    }
  }
  saveCart();
  navigate("cart");
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

function openGarageVehicleEditor(){
  closeGarageVehicleEditor();
  const v=garageState.vehicle;
  const esc=value=>String(value??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const root=document.createElement("div");
  root.id="garageVehicleEditor";
  root.className="vehicle-editor-backdrop";
  root.innerHTML=`
    <div class="vehicle-editor" role="dialog" aria-modal="true" aria-labelledby="vehicleEditorTitle">
      <div class="vehicle-editor-head">
        <div><span class="eyebrow">ГАРАЖ</span><h3 id="vehicleEditorTitle">Автомобиль</h3></div>
        <button type="button" class="vehicle-editor-close" data-close-vehicle-editor aria-label="Закрыть">×</button>
      </div>
      <form id="garageVehicleForm" class="vehicle-editor-form">
        <label><span>Марка</span><input name="brand" value="${esc(v.brand)}" required></label>
        <label><span>Модель</span><input name="model" value="${esc(v.model)}" required></label>
        <label><span>Год</span><input name="year" inputmode="numeric" value="${esc(v.year)}" required></label>
        <label><span>Двигатель</span><input name="engine" value="${esc(v.engine)}" required></label>
        <label class="wide"><span>VIN</span><input name="vin" maxlength="17" autocomplete="off" value="${esc(v.vin)}" placeholder="17 символов"></label>
        <label class="wide"><span>Пробег, км</span><input name="mileage" inputmode="numeric" value="${esc(v.mileage)}"></label>
        <div class="vehicle-editor-actions">
          <button type="button" data-close-vehicle-editor>Отмена</button>
          <button type="submit" class="account-primary">Сохранить</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(root);
  requestAnimationFrame(()=>root.classList.add("show"));
  root.querySelector('input[name="brand"]')?.focus();
}

function saveGarageVehicleForm(form){
  const data=Object.fromEntries(new FormData(form).entries());
  const vin=String(data.vin||"").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g,"");
  if(vin && vin.length!==17){
    showToast("VIN должен содержать 17 символов.","warn");
    form.querySelector('[name="vin"]')?.focus();
    return;
  }
  const year=Math.max(1900,Math.min(2100,parseInt(data.year,10)||garageState.vehicle.year));
  const mileage=Math.max(0,parseInt(String(data.mileage||"0").replace(/\D/g,""),10)||0);
  garageState.vehicle={
    ...garageState.vehicle,
    brand:String(data.brand||"").trim().toUpperCase(),
    model:String(data.model||"").trim(),
    year,
    engine:String(data.engine||"").trim(),
    vin,
    mileage
  };
  saveGarageState();
  renderGarageApp();
  closeGarageVehicleEditor();
  showToast("Автомобиль сохранён.");
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
  const profileViewActive=document.getElementById("view-profile")?.classList.contains("active");
  if(profileViewActive){
    if(tab==="orders" || tab==="order-detail") syncMobileNav("orders");
    else if(tab==="garage") syncMobileNav("garage");
  }
  try{ localStorage.setItem("zapformat-account-tab",tab); }catch{}
}

document.addEventListener("click",e=>{
  const authTab=e.target.closest("[data-auth-tab]");
  if(authTab){ showAuthTab(authTab.dataset.authTab); return; }

  const garageServiceButton=e.target.closest("[data-garage-service]");
  if(garageServiceButton){
    openGarageService(garageServiceButton.dataset.garageService);
    return;
  }

  const garageAddService=e.target.closest("[data-garage-add-service]");
  if(garageAddService){
    addGarageServiceToCart(garageAddService.dataset.garageAddService);
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
    renderGarageApp();
    return;
  }

  if(e.target.closest("[data-garage-toggle-measurement]")){
    garageMeasurementOpen=!garageMeasurementOpen;
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
    const value=Math.max(0,parseInt(String(input?.value||"").replace(/\D/g,""),10)||0);
    if(value){
      garageState.vehicle.mileage=value;
      saveGarageState();
      renderGarageApp();

      if(backendConfigured() && sessionUser && garageState.vehicle.id && !String(garageState.vehicle.id).startsWith("demo-")){
        apiRequest("/api/garage/vehicles/"+encodeURIComponent(garageState.vehicle.id)+"/mileage",{
          method:"PATCH",
          body:JSON.stringify({mileage:value})
        }).catch(error=>console.warn("ZapFormat mileage sync failed",error));
      }
    }
    return;
  }

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
    applySessionUser();
    pendingAccountRoute="profile";
    navigate("auth");
  }
});

document.addEventListener("submit",e=>{
  const garageMeasureForm=e.target.closest("#garageMeasurementForm");
  if(garageMeasureForm){
    e.preventDefault();
    const data=Object.fromEntries(new FormData(garageMeasureForm).entries());
    const now=new Date();
    garageState.measurements.unshift({
      id:"m"+Date.now(),
      type:String(data.type||"").trim(),
      value:String(data.value||"").trim(),
      unit:String(data.unit||"").trim(),
      note:String(data.note||"").trim(),
      date:now.toLocaleDateString("ru-RU")
    });
    garageMeasurementOpen=false;
    saveGarageState();
    renderGarageApp();
    return;
  }

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
  const order=e.target.closest?.("[data-order-detail][tabindex]");
  if(order && (e.key==="Enter" || e.key===" ")){
    e.preventDefault();
    openOrderDetail(order.dataset.orderDetail);
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

document.getElementById("deliveryForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=Object.fromEntries(new FormData(form).entries());
  try{ localStorage.setItem("zapformat-delivery",JSON.stringify(data)); }catch{}
  const btn=form.querySelector("button[type=submit]");
  const old=btn.textContent;
  btn.textContent="Сохранено";
  showToast("Настройки получения сохранены.");
  setTimeout(()=>btn.textContent=old,900);
});

document.addEventListener("click",e=>{
  if(e.target.closest("#addCarButton, #addCarButtonCompact")){
    openGarageVehicleEditor();
    return;
  }
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
  renderGarageApp();
}catch{}


document.addEventListener("change",e=>{
  const notification=e.target.closest?.("[data-notification]");
  if(!notification) return;
  const state={};
  document.querySelectorAll("[data-notification]").forEach(input=>state[input.dataset.notification]=input.checked);
  try{localStorage.setItem("zapformat-notifications",JSON.stringify(state))}catch{}
  showToast("Настройки уведомлений сохранены.");
});
