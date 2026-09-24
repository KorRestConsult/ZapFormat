const MARKUP = 15;

const datasets = {
  "0250603006": {
    title: "BOSCH 0 250 603 006",
    subtitle: "Свеча накаливания",
    exact: [
      {id:"b1",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"03",source:"Поставка 1",purchase:1803,qty:10,days:2},
      {id:"b2",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"07",source:"Поставка 2",purchase:1865,qty:22,days:1},
      {id:"b3",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"11",source:"Поставка 3",purchase:1940,qty:5,days:1},
      {id:"b4",type:"exact",brand:"BOSCH",article:"0250603006",name:"Свеча накаливания",warehouse:"18",source:"Поставка 4",purchase:1725,qty:40,days:5}
    ],
    analogs: [
      {id:"ba1",type:"analog",brand:"BERU",article:"GE102",name:"Свеча накаливания",warehouse:"02",source:"Аналог",purchase:1510,qty:12,days:1},
      {id:"ba2",type:"analog",brand:"NGK",article:"97256",name:"Свеча накаливания",warehouse:"05",source:"Аналог",purchase:1640,qty:7,days:2},
      {id:"ba3",type:"analog",brand:"DENSO",article:"DG-193",name:"Свеча накаливания",warehouse:"09",source:"Аналог",purchase:1435,qty:3,days:2},
      {id:"ba4",type:"analog",brand:"FEBI",article:"176214",name:"Свеча накаливания",warehouse:"13",source:"Аналог",purchase:1190,qty:16,days:3},
      {id:"ba5",type:"analog",brand:"SWAG",article:"20 94 6721",name:"Свеча накаливания",warehouse:"21",source:"Аналог",purchase:1280,qty:9,days:4},
      {id:"ba6",type:"analog",brand:"MEYLE",article:"314 860 0004",name:"Свеча накаливания",warehouse:"25",source:"Аналог",purchase:1345,qty:6,days:2},
      {id:"ba7",type:"analog",brand:"STELLOX",article:"202 084-SX",name:"Свеча накаливания",warehouse:"31",source:"Аналог",purchase:790,qty:28,days:3},
      {id:"ba8",type:"analog",brand:"PATRON",article:"PGP002",name:"Свеча накаливания",warehouse:"44",source:"Аналог",purchase:860,qty:34,days:5}
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
let cart = loadCart();

function retail(p){ return Math.round(p * (1 + MARKUP/100)); }
function rub(n){ return new Intl.NumberFormat("ru-RU").format(n) + " ₽"; }
function loadCart(){ try { return JSON.parse(localStorage.getItem("parts-ai-cart") || "[]"); } catch { return []; } }
function saveCart(){ localStorage.setItem("parts-ai-cart", JSON.stringify(cart)); renderCart(); }

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
  currentKey=resolveDataset(query);
  const data=datasets[currentKey];
  document.getElementById("resultTitle").textContent=data.title;
  document.getElementById("resultSubtitle").textContent=data.subtitle+" · точные предложения и аналоги";
  document.getElementById("crumbQuery").textContent=currentKey;
  document.getElementById("exactHeading").textContent=data.subtitle;
  document.getElementById("searchInput2").value=currentKey;
  document.getElementById("headerSearchInput").value=currentKey;
  showRoute("search");
  renderCatalog();
  history.pushState({route:"search",query}, "", location.pathname+"?q="+encodeURIComponent(query));
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

function rowHtml(x){
  const q=quantities[x.id]||1;
  return `
    <div class="pg-offer-row">
      <div class="pg-part">
        <div class="pg-brand">${x.brand.slice(0,5)}</div>
        <div>
          <b>${x.brand} · ${x.name}</b>
          <small class="pg-code">${x.article}</small>
        </div>
      </div>
      <div class="pg-cell warehouse"><small>Склад</small><b>${x.warehouse}</b></div>
      <div class="pg-cell fast"><small>Срок</small><b>${x.days===0?"Сегодня":x.days+" дн."}</b></div>
      <div class="pg-cell"><small>Наличие</small><b>${x.qty} шт.</b></div>
      <div class="pg-price">${rub(retail(x.purchase))}</div>
      <div class="pg-buy">
        <div class="pg-qty">
          <button data-qty-minus="${x.id}">−</button>
          <span id="qty-${x.id}">${q}</span>
          <button data-qty-plus="${x.id}">+</button>
        </div>
        <button class="pg-add" data-add="${x.id}">В корзину</button>
      </div>
      <div class="pg-meta-mobile" style="display:none">
        <span><b>${x.days===0?"Сегодня":x.days+" дн."}</b></span>
        <span>${x.qty} шт.</span>
        <span>склад ${x.warehouse}</span>
      </div>
    </div>`;
}

function renderCatalog(){
  const exact=baseList("exact");
  const analog=baseList("analog");
  document.getElementById("exactResults").innerHTML=exact.map(rowHtml).join("") || '<div class="offer-row"><div>Нет предложений по выбранному фильтру.</div></div>';
  document.getElementById("analogResults").innerHTML=analog.map(rowHtml).join("") || '<div class="offer-row"><div>Нет аналогов по выбранному фильтру.</div></div>';
  document.getElementById("analogSection").style.display=(currentFilter==="exact")?"none":"block";
  const count=exact.length+analog.length;
  document.getElementById("offerCount").textContent=count;

  const all=[...exact,...analog];
  const best=[...all].sort((a,b)=>retail(a.purchase)-retail(b.purchase))[0];
  if(best){
    document.getElementById("bestOfferTitle").textContent=best.brand+" "+best.article;
    document.getElementById("bestOfferName").textContent=best.name;
    document.getElementById("bestOfferPrice").textContent=rub(retail(best.purchase));
    document.getElementById("bestOfferTerm").textContent=best.days===0?"Сегодня":best.days+" дн.";
    document.getElementById("bestOfferStock").textContent=best.qty+" шт.";
    const button=document.getElementById("bestOfferAdd");
    button.dataset.add=best.id;
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
  const qty=quantities[id]||1;
  const existing=cart.find(x=>x.id===id);
  if(existing) existing.qty+=qty;
  else cart.push({...item,price:retail(item.purchase),qty});
  saveCart();
  if(btn){
    btn.classList.add("added");btn.textContent="Добавлено";
    setTimeout(()=>{btn.classList.remove("added");btn.textContent="В корзину"},850);
  }
}

function changeCartQty(id,delta){
  const item=cart.find(x=>x.id===id); if(!item) return;
  item.qty=Math.max(1,item.qty+delta);
  saveCart();
}
function removeFromCart(id){ cart=cart.filter(x=>x.id!==id); saveCart(); }

function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0);
  const total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  document.getElementById("cartCount").textContent=count;
  document.getElementById("mobileCartCount").textContent=count;
  document.getElementById("cartSubtotal").textContent=rub(total);
  document.getElementById("cartTotal").textContent=rub(total);

  const root=document.getElementById("cartItems");
  root.innerHTML=cart.length ? cart.map(x=>`
    <div class="cart-row">
      <div class="cart-row-top">
        <div><small>${x.brand}</small><h4>${x.name}</h4><span class="cart-row-meta">${x.article} · ${x.days} дн.</span></div>
        <b>${rub(x.price*x.qty)}</b>
      </div>
      <div class="cart-row-bottom">
        <button class="remove-btn" data-remove="${x.id}">Удалить</button>
        <div class="qty">
          <button data-cart-minus="${x.id}">−</button>
          <span>${x.qty}</span>
          <button data-cart-plus="${x.id}">+</button>
        </div>
      </div>
    </div>
  `).join("") : '<div class="cart-row"><span class="cart-row-meta">Корзина пока пустая.</span></div>';
}

function openCart(){ document.getElementById("cartDrawer").classList.add("open"); document.getElementById("drawerBackdrop").classList.add("show"); }
function closeCart(){ document.getElementById("cartDrawer").classList.remove("open"); document.getElementById("drawerBackdrop").classList.remove("show"); }

document.addEventListener("click",e=>{
  const route=e.target.closest("[data-route]"); if(route){ navigate(route.dataset.route); return; }
  const query=e.target.closest("[data-query]"); if(query){ search(query.dataset.query); return; }
  const filter=e.target.closest("[data-filter]");
  if(filter){
    document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));
    filter.classList.add("active"); currentFilter=filter.dataset.filter; renderCatalog(); return;
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
document.getElementById("headerSearchForm").addEventListener("submit",e=>{e.preventDefault();search(document.getElementById("headerSearchInput").value)});
document.getElementById("sortSelect").addEventListener("change",e=>{currentSort=e.target.value;renderCatalog()});
document.getElementById("openCart").addEventListener("click",openCart);
document.getElementById("mobileCart").addEventListener("click",openCart);
document.getElementById("closeCart").addEventListener("click",closeCart);
document.getElementById("drawerBackdrop").addEventListener("click",closeCart);
document.getElementById("checkoutButton").addEventListener("click",()=>alert("Оформление заказа подключим после получения API PartGrade."));

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
    document.getElementById("resultTitle").textContent=data.title;
    document.getElementById("resultSubtitle").textContent=data.subtitle+" · точные предложения и аналоги";
    document.getElementById("exactHeading").textContent=data.subtitle;
    document.getElementById("searchInput2").value=currentKey;
    document.getElementById("headerSearchInput").value=currentKey;
    showRoute("search");
    renderCatalog();
  } else if(view){
    showRoute(view);
  } else {
    showRoute("home");
  }
}
window.addEventListener("popstate",restoreFromUrl);
document.getElementById("backButton").addEventListener("click",()=>history.back());
restoreFromUrl();
