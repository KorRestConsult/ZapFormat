const MARKUP = 15;

const inventory = [
  {id:"bosch-0250603006",article:"0250603006",brand:"BOSCH",name:"Свеча накаливания",purchase:1803,quantity:10,days:2},
  {id:"bmw-11277810456",article:"11277810456",brand:"BMW",name:"Элемент привода / ролик",purchase:2713,quantity:5,days:2},
  {id:"masuma-mip-e475",article:"MIP-E475",brand:"MASUMA",name:"Ролик натяжителя",purchase:3147,quantity:1,days:2},
  {id:"gates-t39198",article:"T39198",brand:"GATES",name:"Натяжитель приводного ремня",purchase:6810,quantity:7,days:1},
  {id:"trw-gdb1956",article:"GDB1956",brand:"TRW",name:"Колодки тормозные передние",purchase:6240,quantity:6,days:1},
  {id:"mann-hu816x",article:"HU816X",brand:"MANN-FILTER",name:"Фильтр масляный",purchase:1280,quantity:18,days:1}
].map(x => ({...x, price: Math.round(x.purchase * (1 + MARKUP/100))}));

let currentResults = [...inventory];
let currentFilter = "all";
let cart = loadCart();

function rub(n){return new Intl.NumberFormat("ru-RU").format(n)+" ₽"}

function loadCart(){
  try{return JSON.parse(localStorage.getItem("parts-ai-cart")||"[]")}catch{return []}
}
function saveCart(){localStorage.setItem("parts-ai-cart",JSON.stringify(cart));renderCart()}

function navigate(route){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const target=document.getElementById("view-"+route);
  if(target) target.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}

function search(query){
  const q=(query||"").trim().toLowerCase();
  currentResults = inventory.filter(x =>
    !q ||
    x.article.toLowerCase().includes(q) ||
    x.brand.toLowerCase().includes(q) ||
    x.name.toLowerCase().includes(q) ||
    q.includes("bmw") ||
    q.includes("торм") ||
    q.includes("двиг") ||
    q.includes("то")
  );
  if(!currentResults.length) currentResults=[...inventory];
  document.getElementById("resultTitle").textContent = query ? "«"+query+"»" : "Поиск";
  document.getElementById("searchInput2").value=query||"";
  navigate("search");
  renderResults();
}

function filtered(){
  const arr=[...currentResults];
  if(currentFilter==="cheap") return arr.sort((a,b)=>a.price-b.price);
  if(currentFilter==="fast") return arr.sort((a,b)=>a.days-b.days);
  if(currentFilter==="stock") return arr.filter(x=>x.quantity>0);
  return arr;
}

function renderResults(){
  const root=document.getElementById("results");
  const data=filtered();
  root.innerHTML=data.map(x=>`
    <article class="offer">
      <div>
        <div class="offer-brand">${x.brand}</div>
        <h3>${x.name}</h3>
        <div class="article">${x.article}</div>
      </div>
      <div class="offer-meta">
        <div><small>Наличие</small><b>${x.quantity} шт.</b></div>
        <div><small>Срок</small><b>${x.days===0?"Сегодня":x.days+" дн."}</b></div>
      </div>
      <div class="offer-buy">
        <strong>${rub(x.price)}</strong>
        <button data-add="${x.id}">В корзину</button>
      </div>
    </article>
  `).join("") || '<div class="empty">Ничего не найдено.</div>';
}

function addToCart(id,btn){
  const item=inventory.find(x=>x.id===id);
  if(!item)return;
  const existing=cart.find(x=>x.id===id);
  if(existing) existing.qty+=1;
  else cart.push({...item,qty:1});
  saveCart();
  if(btn){btn.classList.add("added");btn.textContent="Добавлено";setTimeout(()=>{btn.classList.remove("added");btn.textContent="В корзину"},900)}
}

function removeFromCart(id){cart=cart.filter(x=>x.id!==id);saveCart()}

function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0);
  const total=cart.reduce((s,x)=>s+x.price*x.qty,0);
  document.getElementById("cartCount").textContent=count;
  document.getElementById("mobileCartCount").textContent=count;
  document.getElementById("cartTotal").textContent=rub(total);
  const root=document.getElementById("cartItems");
  root.innerHTML=cart.length?cart.map(x=>`
    <div class="cart-row">
      <div><small>${x.brand}</small><h4>${x.name}</h4><span>${x.article} · ${x.days} дн.</span><button data-remove="${x.id}">Удалить</button></div>
      <b>${x.qty} × ${rub(x.price)}</b>
    </div>
  `).join(""):'<div class="cart-empty">Корзина пока пустая.</div>';
}

function openCart(){
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("drawerBackdrop").classList.add("show");
}
function closeCart(){
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("drawerBackdrop").classList.remove("show");
}

document.addEventListener("click",e=>{
  const route=e.target.closest("[data-route]"); if(route){navigate(route.dataset.route);return}
  const query=e.target.closest("[data-query]"); if(query){search(query.dataset.query);return}
  const add=e.target.closest("[data-add]"); if(add){addToCart(add.dataset.add,add);return}
  const remove=e.target.closest("[data-remove]"); if(remove){removeFromCart(remove.dataset.remove);return}
  const filter=e.target.closest("[data-filter]");
  if(filter){
    document.querySelectorAll("[data-filter]").forEach(x=>x.classList.remove("active"));
    filter.classList.add("active");currentFilter=filter.dataset.filter;renderResults();return
  }
});

document.getElementById("searchForm").addEventListener("submit",e=>{e.preventDefault();search(document.getElementById("searchInput").value)});
document.getElementById("searchForm2").addEventListener("submit",e=>{e.preventDefault();search(document.getElementById("searchInput2").value)});
document.getElementById("openCart").addEventListener("click",openCart);
document.getElementById("mobileCart").addEventListener("click",openCart);
document.getElementById("closeCart").addEventListener("click",closeCart);
document.getElementById("drawerBackdrop").addEventListener("click",closeCart);
document.getElementById("checkoutButton").addEventListener("click",()=>alert("Оформление подключим после API PartGrade."));

renderCart();
renderResults();
