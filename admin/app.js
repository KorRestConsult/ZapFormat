"use strict";
(() => {
  const el = id => document.getElementById(id);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[ch]);
  const money = amount => Number(amount).toLocaleString("ru-RU",{
    style:"currency", currency:"RUB", maximumFractionDigits:2
  });
  const dateTime = value => value ? new Intl.DateTimeFormat("ru-RU",{
    dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Moscow"
  }).format(new Date(value)) : "Дата не подтверждена";
  const stateLabels = {
    new:"Новый",received:"Принят",confirmed:"Подтверждён",
    processing:"В работе",ready:"Готов",completed:"Завершён",cancelled:"Отменён"
  };
  const pricingNames = [
    ["low","До 500 ₽","Недорогие расходники и мелкие детали"],
    ["medium","500–1 999 ₽","Фильтры, свечи и типовые комплектующие"],
    ["high","2 000–9 999 ₽","Средняя ценовая категория"],
    ["premium","От 10 000 ₽","Дорогие узлы и агрегаты"]
  ];
  const appState = { demo:false, user:null, tab:"orders", orders:[], orderOffset:0,
    orderHasMore:false, loadedOrders:new Map(), loadingOrders:new Set(),
    pricing:null, savedPricing:null, customers:[], customerOffset:0,
    moreCustomers:false, customerSearch:"", busy:false
  };
  const fakeOrders = [
    {id:"demo-1042",order_number:1042,recipient_name:"Иван Петров",recipient_phone:"+7 (900) ***-**-21",status:"processing",total_amount:4000,items_count:3,created_at:"2026-10-31T07:24:00+03:00"},
    {id:"demo-1043",order_number:1043,recipient_name:"Сергей Иванов",recipient_phone:"+7 (900) ***-**-32",status:"ready",total_amount:5200,items_count:2,created_at:"2026-10-31T08:11:00+03:00"},
    {id:"demo-1044",order_number:1044,recipient_name:"Алексей Смирнов",recipient_phone:"+7 (900) ***-**-43",status:"new",total_amount:3800,items_count:2,created_at:"2026-10-31T08:47:00+03:00"}
  ];
  const fakeDetails = {
    "demo-1042": {order:{...fakeOrders[0],customer_name:"Иван Петров",delivery_city:"Рязань",delivery_address:"Условный адрес, 12",packed_at:null},
      items:[
        {id:"d1",brand:"MANN",article:"W712/95",description:"Фильтр масляный",quantity:1,unit_price:850,purchase_price:450,received_quantity:1,status:"processing",supplier_status:"Выдан"},
        {id:"d2",brand:"FILTRON",article:"K1234",description:"Фильтр салона",quantity:1,unit_price:1150,purchase_price:450,received_quantity:1,status:"processing",supplier_status:"Выдан"},
        {id:"d3",brand:"NGK",article:"12345",description:"Свечи зажигания, комплект",quantity:1,unit_price:2000,purchase_price:600,received_quantity:0,status:"processing",supplier_status:"Задержка — срок уточняется"}
      ]},
    "demo-1043": {order:{...fakeOrders[1],customer_name:"Сергей Иванов",delivery_city:"Рязань",delivery_address:"Условный адрес, 5",packed_at:"2026-10-31T10:43:00+03:00"},
      items:[
        {id:"d4",brand:"BOSCH",article:"F026",description:"Воздушный фильтр",quantity:1,unit_price:1800,purchase_price:1100,received_quantity:1,status:"ready",supplier_status:"Выдан"},
        {id:"d5",brand:"SKF",article:"VK",description:"Подшипник",quantity:1,unit_price:3400,purchase_price:2400,received_quantity:1,status:"ready",supplier_status:"Выдан"}]},
    "demo-1044": {order:{...fakeOrders[2],customer_name:"Алексей Смирнов",delivery_city:"Рязань",delivery_address:"Условный адрес, 20",packed_at:null},
      items:[
        {id:"d6",brand:"MAHLE",article:"OC521",description:"Фильтр масляный",quantity:1,unit_price:1250,purchase_price:710,received_quantity:0,status:"processing",supplier_status:"Заказано"},
        {id:"d7",brand:"NGK",article:"BKR6E",description:"Свечи зажигания",quantity:4,unit_price:637.5,purchase_price:null,received_quantity:0,status:"processing",supplier_status:"Ожидается"}
      ]}
  };
  const fakeCustomers = [
    {id:"c1",name:"Иван",surname:"Петров",phone:"+7 (900) ***-**-21",email:"—",orders_count:1,requests_count:0},
    {id:"c2",name:"Сергей",surname:"Иванов",phone:"+7 (900) ***-**-32",email:"—",orders_count:1,requests_count:0},
    {id:"c3",name:"Алексей",surname:"Смирнов",phone:"+7 (900) ***-**-43",email:"—",orders_count:1,requests_count:0}
  ];
  const originalDemoPolicy = {
    tiers:[{id:"low",percent:30},{id:"medium",percent:40},
      {id:"high",percent:25},{id:"premium",percent:15}],
    min_markup_rub:150,round_to:10
  };
  const clone = object => JSON.parse(JSON.stringify(object));
  function withFinance(detail) {
    const items=detail.items||[];
    const known=items.reduce((sum,item)=>sum+(item.purchase_price==null?0:Number(item.purchase_price)*Number(item.quantity)),0);
    const missing=items.filter(item=>item.purchase_price==null).length;
    const total=Number(detail.order.total_amount||0);
    const recv=items.reduce((sum,item)=>sum+Number(item.received_quantity||0),0);
    const qty=items.reduce((sum,item)=>sum+Number(item.quantity),0);
    return {...detail,finance:{sale_amount:total,known_purchase_amount:known,
      missing_cost_items:missing,gross_profit:missing?null:total-known,
      cash_due_supplier:null,
      cash_due_reason:"Сумма наличных рассчитывается по подтверждённым неоплаченным счетам поставщика."},
      intake:{total_quantity:qty,received_quantity:recv,missing_quantity:qty-recv,
      ready_for_packaging:!!items.length&&recv===qty&&!items.some(item=>item.status==="cancelled")}};
  }
  async function api(path, options={}) {
    const response=await fetch(path,{credentials:"include",...options,
      headers:{"Content-Type":"application/json",...(options.headers||{})}});
    if(!response.ok) {const error=new Error("HTTP "+response.status);error.status=response.status;throw error}
    if(response.status===204)return null;
    return response.json();
  }
  const setMessage=(id,text)=>{el(id).textContent=text||""};
  function showWorkspace(){
    el("loginScreen").hidden=true; el("workspace").hidden=false;
    el("signOut").hidden=false;
    el("demoNote").hidden=!appState.demo;
    el("connectionState").textContent=appState.demo?"Демонстрация":"Защищённая сессия";
    el("dateLabel").textContent=new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Moscow"}).format(new Date());
    el("welcomeLine").textContent=appState.demo
      ?"Демонстрационный интерфейс · все данные вымышлены"
      :"Текущие заказы, деньги и клиенты в одном кабинете.";
  }
  function showLogin(message=""){
    el("workspace").hidden=true;el("loginScreen").hidden=false;el("signOut").hidden=true;
    el("connectionState").textContent="Закрытый доступ";
    setMessage("loginMessage",message);
  }
  function isOwner(user){return ["owner","admin"].includes(String(user?.role||""))}
  function enterDemo() {
    appState.demo=true;appState.user={role:"owner",name:"Демонстрация"};
    appState.loadedOrders.clear();showWorkspace();selectTab("orders");loadOrders();
  }
  async function checkAuth(){
    if(location.protocol==="file:" || new URLSearchParams(location.search).has("demo")){enterDemo();return;}
    try{
      const session=await api("/api/auth/me");
      if(!isOwner(session.user)){showLogin("У этой учётной записи нет прав администратора.");return}
      appState.user=session.user;appState.demo=false;showWorkspace();selectTab("orders");loadOrders();
    }catch{showLogin()}
  }
  el("loginForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=el("loginSubmit");submit.disabled=true;
    setMessage("loginMessage","Проверяем вход…");
    const data=new FormData(event.target);
    try{
      const auth=await api("/api/auth/login",{method:"POST",
        body:JSON.stringify({login:data.get("login"),password:data.get("password")})});
      if(!isOwner(auth.user)){
        await api("/api/auth/logout",{method:"POST"}).catch(()=>{});
        throw new Error("Нет прав владельца или администратора");
      }
      appState.user=auth.user;appState.demo=false;showWorkspace();selectTab("orders");loadOrders();
    }catch(err){
      setMessage("loginMessage",err.status===401?"Неверный логин или пароль.":err.message||"Не удалось войти.");
    }finally{submit.disabled=false}
  });
  el("enterDemo").addEventListener("click",enterDemo);
  el("exitDemo").addEventListener("click",()=>{appState.demo=false;showLogin()});
  el("signOut").addEventListener("click",async()=>{
    if(!appState.demo)await api("/api/auth/logout",{method:"POST"}).catch(()=>{});
    appState.user=null;appState.demo=false;appState.loadedOrders.clear();showLogin();
  });
  function selectTab(tab){
    appState.tab=tab;
    all("[data-tab]").forEach(button=>{
      const active=button.dataset.tab===tab;
      button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));
    });
    all("[data-pane]").forEach(section=>section.hidden=section.dataset.pane!==tab);
    if(tab==="pricing"&&!appState.savedPricing)loadPricing();
    if(tab==="customers")loadCustomers();
  }
  all("[data-tab]").forEach(button=>button.addEventListener("click",()=>selectTab(button.dataset.tab)));
  function statusClass(value){return ["ready","processing","cancelled"].includes(value)?value:""}
  function orderMarkup(order) {
    const status=String(order.status||"new");
    return '<details class="order-card" data-order="'+escape(order.id)+'">'+
      '<summary class="order-toggle"><div class="order-title">'+
      '<strong>№'+escape(order.order_number)+' · '+escape(order.recipient_name||"Покупатель")+'</strong>'+
      '<small>'+escape(dateTime(order.created_at))+' · '+Number(order.items_count||0)+' поз.</small>'+
      (status==="processing"?'<em>Откройте заказ, чтобы проверить поступление</em>':"")+'</div>'+
      '<div class="order-summary"><strong>'+money(order.total_amount)+'</strong>'+
      '<span class="state '+statusClass(status)+'">'+escape(stateLabels[status]||status)+'</span></div>'+
      '<span class="chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="order-detail"><div class="empty-state">Загружаем детали…</div></div></details>';
  }
  async function loadOrders({more=false}={}){
    if(appState.busy)return;
    appState.busy=true;el("refreshButton").disabled=true;
    const filter=el("orderFilter").value;
    const offset=more?appState.orderOffset:0;
    try{
      const result=appState.demo
        ? {orders:fakeOrders.filter(x=>!filter||x.status===filter),limit:30}
        : await api("/api/admin/orders?limit=31&offset="+offset+(filter?"&status="+encodeURIComponent(filter):""));
      const rows=(result.orders||[]).slice(0,30);
      const hadMore=(result.orders||[]).length>30;
      appState.orders=more?appState.orders.concat(rows):rows;
      appState.orderOffset+=more?rows.length:0;
      if(!more)appState.orderOffset=rows.length;
      appState.orderHasMore=hadMore;
      if(!more){el("orderList").innerHTML="";appState.loadedOrders.clear()}
      if(rows.length)el("orderList").insertAdjacentHTML("beforeend",rows.map(orderMarkup).join(""));
      if(!appState.orders.length)el("orderList").innerHTML='<div class="empty-state">Заказов с выбранным статусом пока нет.</div>';
      el("orderCount").textContent="Показано: "+appState.orders.length;
      el("loadMore").hidden=!hadMore;
      let active=appState.orders.filter(x=>!["completed","cancelled"].includes(x.status)).length;
      el("activeOrders").textContent=String(active);
      el("allOrders").textContent=String(appState.orders.length)+(hadMore?"+":"");
      if(appState.demo){
        const sum=appState.orders.reduce((n,item)=>n+(withFinance(fakeDetails[item.id]).finance.gross_profit||0),0);
        el("grossProfit").textContent=money(sum);
        el("grossNote").textContent="Пример, до налогов и расходов";
      }else{
        const overview=await api("/api/admin/overview");
        const gross=overview.gross_profit||{};
        el("activeOrders").textContent=overview.orders?.active??"—";
        el("allOrders").textContent=overview.orders?.total??"—";
        el("grossProfit").textContent=gross.missing_cost_items?"Неполные данные":
          (gross.costed_items?money(gross.known_amount):"Нет данных");
        el("grossNote").textContent=gross.missing_cost_items
          ?"Не указана себестоимость "+gross.missing_cost_items+" позиций"
          :"Валовая прибыль по учтённой себестоимости";
      }
      setMessage("dashboardMessage","Данные обновлены.");
    }catch(error){
      setMessage("dashboardMessage","Не удалось загрузить заказы. Проверьте соединение и доступ.");
      if(!more)el("orderList").innerHTML='<div class="empty-state">Не удалось получить заказы.</div>';
    }finally{appState.busy=false;el("refreshButton").disabled=false}
  }
  function itemMarkup(item) {
    const n=Number(item.quantity),received=Number(item.received_quantity||0);
    const complete=received>=n;
    const value=Number(item.unit_price||0);
    const canIntake=!["cancelled","completed"].includes(item.status);
    const status=complete?"Получено полностью":
      received?"Получено частично":"Фактическая приёмка не подтверждена";
    const eta=item.expected_at ? " · ожидается: "+escape(dateTime(item.expected_at)):"";
    return '<div class="item"><div class="item-copy">'+
      '<strong>'+escape(item.description||[item.brand,item.article].filter(Boolean).join(" "))+'</strong>'+
      '<small>'+escape(item.brand)+' · '+escape(item.article)+' · '+n+' шт.</small>'+
      '<p>Цена клиенту: '+money(value)+' / шт. · '+money(value*n)+' всего</p>'+
      '<p>Поставщик: '+escape(item.supplier_status||"Нет данных")+eta+'</p>'+
      '<p class="'+(complete?"item-received":"item-missing")+'">'+escape(status)+' · '+received+' из '+n+'</p>'+
      '</div><form class="intake-form" data-item="'+escape(item.id)+'">'+
      '<label>Принято, шт.<input name="received" type="number" min="0" max="'+n+
      '" value="'+received+'" step="1" inputmode="numeric" required '+(canIntake?"":"disabled")+'></label>'+
      '<button type="submit" class="ghost" '+(canIntake?"":"disabled")+'>Сохранить</button></form></div>';
  }
  function orderDetailMarkup(result) {
    const o=result.order||{}, items=result.items||[], moneyInfo=result.finance||{}, intake=result.intake||{};
    const ready=!!intake.ready_for_packaging&&!o.packed_at&&
      !["cancelled","completed"].includes(o.status);
    const received=Number(intake.received_quantity||0), total=Number(intake.total_quantity||0);
    const contact=o.recipient_phone||o.customer_phone||"";
    const contactHtml=appState.demo
      ? '<p>'+escape(contact)+'</p>'
      : contact ? '<p><a href="tel:'+escape(String(contact).replace(/[^+\d]/g,""))+'">'+escape(contact)+'</a></p>'
      : '<p>Телефон не указан</p>';
    const warning=received<total?'<div class="note-warning">Принято '+received+' из '+total+
      ' шт. · Не получено '+(total-received)+'. Заказ пока нельзя отметить готовым.</div>':"";
    const gross=moneyInfo.gross_profit==null
      ?"Себестоимость указана не для всех позиций"
      :money(moneyInfo.gross_profit);
    return '<div class="customer-meta"><strong>'+escape(o.customer_name||o.recipient_name||"Покупатель")+'</strong>'+
      contactHtml+
      '<p>Адрес: '+escape([o.delivery_city,o.delivery_address].filter(Boolean).join(", ")||"Не указан")+'</p>'+
      '<p>Получатель: '+escape(o.recipient_name||"Не указан")+'</p></div>'+
      warning+'<h3 class="section-heading">Состав заказа</h3>'+
      '<div class="items">'+items.map(itemMarkup).join("")+'</div>'+
      '<div class="finance"><div><span>Продажа клиенту</span><strong>'+money(moneyInfo.sale_amount)+'</strong></div>'+
      '<div><span>Закупка (по известным позициям)</span><strong>'+money(moneyInfo.known_purchase_amount)+'</strong></div>'+
      '<div class="total"><span>Валовая прибыль</span><strong>'+escape(gross)+'</strong></div>'+
      '<div><span>Наличные к выдаче поставщику</span><strong>Не подтверждены</strong></div></div>'+
      '<small class="finance-note">Не является чистой прибылью: налоги и расходы отдельно. Сумма наличных не равна автоматически сумме закупки.</small>'+
      '<div class="detail-actions"><button type="button" class="primary" data-pack '+(ready?"":"disabled")+'>'+
      (o.packed_at?"Уже укомплектован":"Подтвердить комплектацию")+'</button>'+
      '<button type="button" class="ghost" disabled title="В следующем этапе">PDF · скоро</button>'+
      '<button type="button" class="ghost" disabled title="В следующем этапе">Доставка · скоро</button></div>'+
      '<p class="inline-status" role="status"></p>';
  }
  async function detail(card,{force=false}={}){
    if(!card.open)return;
    const id=card.dataset.order;
    if(!force&&appState.loadedOrders.has(id))return;
    const mount=card.querySelector(".order-detail");
    mount.innerHTML='<div class="empty-state">Загружаем детали…</div>';
    try{
      const info=appState.demo?withFinance(fakeDetails[id]):
        await api("/api/admin/orders/"+encodeURIComponent(id));
      if(!card.open||!card.isConnected)return;
      mount.innerHTML=orderDetailMarkup(info);
      appState.loadedOrders.set(id,info);
    }catch{mount.innerHTML='<div class="note-warning">Не получилось загрузить заказ. Закройте и откройте карточку ещё раз.</div>'}
  }
  el("orderList").addEventListener("toggle",event=>{
    const card=event.target.closest(".order-card");
    if(card&&card.open)detail(card);
  },true);
  el("orderList").addEventListener("submit",async event=>{
    const form=event.target.closest(".intake-form");
    if(!form)return;
    event.preventDefault();
    const card=form.closest(".order-card"),id=card.dataset.order;
    const itemId=form.dataset.item,quantity=Number(form.elements.received.value);
    const info=appState.loadedOrders.get(id);
    const item=info?.items?.find(x=>x.id===itemId);
    if(!item||!Number.isInteger(quantity)||quantity<0||quantity>item.quantity){
      form.elements.received.reportValidity();return;
    }
    const prior=Number(item.received_quantity||0);
    if(quantity===prior)return;
    if(quantity<prior&&!window.confirm("Уменьшить фактически принятое количество? Подтверждение комплектации будет сброшено."))return;
    const button=form.querySelector("button");
    button.disabled=true;
    try {
      if(appState.demo){item.received_quantity=quantity;info.order.packed_at=null;info.order.status="processing"}
      else await api("/api/admin/orders/"+encodeURIComponent(id)+"/intake",{
        method:"POST",body:JSON.stringify({item_id:itemId,received_quantity:quantity})});
      appState.loadedOrders.delete(id);await detail(card,{force:true});
    }catch{button.disabled=false;alert("Не удалось сохранить приёмку.")}
  });
  el("orderList").addEventListener("click",async event=>{
    const button=event.target.closest("[data-pack]");
    if(!button||button.disabled)return;
    const card=button.closest(".order-card"),id=card.dataset.order;
    button.disabled=true;
    try{
      if(appState.demo){
        fakeDetails[id].order.packed_at=new Date().toISOString();
        fakeDetails[id].order.status="ready";
      }else await api("/api/admin/orders/"+encodeURIComponent(id)+"/pack",{
        method:"POST",body:"{}"});
      appState.loadedOrders.delete(id);await detail(card,{force:true});
    }catch{
      button.disabled=false;
      const message=card.querySelector(".inline-status");
      if(message)message.textContent="Комплектация не подтверждена. Проверьте приёмку.";
    }
  });
  el("orderFilter").addEventListener("change",()=>loadOrders());
  el("loadMore").addEventListener("click",()=>loadOrders({more:true}));
  el("refreshButton").addEventListener("click",()=>{
    if(appState.tab==="orders")loadOrders();
    else if(appState.tab==="pricing")loadPricing();
    else loadCustomers();
  });

  function draftPolicy(){
    return {
      tiers:pricingNames.map(([id])=>({id,percent:Number(el("range-"+id).value)})),
      min_markup_rub:Number(el("minimumMarkup").value),
      round_to:Number(el("roundTo").value)
    };
  }
  function renderPricing(policy){
    el("pricingControls").innerHTML=pricingNames.map(([id,label,descr])=>{
      const percent=policy.tiers.find(t=>t.id===id)?.percent??15;
      return '<div class="pricing-band"><div class="row"><strong>'+escape(label)+'</strong>'+
        '<output id="percent-'+id+'">'+percent+'%</output></div>'+
        '<input id="range-'+id+'" type="range" min="0" max="300" step="1" value="'+percent+
        '" aria-label="Наценка '+escape(label)+'"><small>'+escape(descr)+'</small></div>';
    }).join("");
    el("minimumMarkup").value=policy.min_markup_rub;
    el("roundTo").value=String(policy.round_to);
    refreshPricingPreview();
  }
  function refreshPricingPreview(){
    if(!el("range-low"))return;
    const draft=draftPolicy();
    pricingNames.forEach(([id])=>{el("percent-"+id).textContent=el("range-"+id).value+"%"});
    const cost=Number(el("exampleCost").value);
    if(!Number.isFinite(cost)||cost<0||cost>10000000||draft.min_markup_rub<0||draft.min_markup_rub>50000){
      setMessage("pricingPreview","Проверьте введённые суммы.");return;
    }
    const tier=cost<500?0:cost<2000?1:cost<10000?2:3;
    const step=Math.round(draft.round_to*100),raw=Math.round(cost*100);
    const extra=Math.max(Math.round(raw*draft.tiers[tier].percent/100),Math.round(draft.min_markup_rub*100));
    const retail=Math.ceil((raw+extra)/step)*step/100;
    const profit=retail-cost;
    setMessage("pricingPreview","Закупка "+money(cost)+" → продажа "+money(retail)+
      " · валовая прибыль "+money(profit)+" · маржа "+(retail?100*profit/retail:0).toFixed(1)+"%. Это предварительный расчёт.");
    el("savePricing").disabled=appState.busy || !appState.savedPricing ||
      JSON.stringify(draft)===JSON.stringify(appState.savedPricing);
  }
  async function loadPricing(){
    try{
      const value=appState.demo?{policy:clone(originalDemoPolicy)}:await api("/api/admin/pricing");
      appState.savedPricing=clone(value.policy);
      renderPricing(value.policy);
      setMessage("pricingMessage",appState.demo?"Демо: изменения сохраняются только на этом экране.":"Действующие настройки загружены.");
    }catch{setMessage("pricingMessage","Не удалось загрузить настройки. Сохранение недоступно.");el("savePricing").disabled=true;}
  }
  el("pricingControls").addEventListener("input",refreshPricingPreview);
  ["minimumMarkup","roundTo","exampleCost"].forEach(id=>el(id).addEventListener("input",refreshPricingPreview));
  el("resetPricing").addEventListener("click",()=>{if(appState.savedPricing)renderPricing(appState.savedPricing)});
  el("savePricing").addEventListener("click",async()=>{
    if(!appState.savedPricing||appState.busy)return;
    const policy=draftPolicy();
    appState.busy=true;el("savePricing").disabled=true;
    try{
      const updated=appState.demo?{policy}:await api("/api/admin/pricing",{
        method:"PUT",body:JSON.stringify({policy})});
      appState.savedPricing=clone(updated.policy);
      setMessage("pricingMessage",appState.demo?"Демо-настройки изменены, сервер не затронут.":"Настройки сохранены для новых предложений.");
      renderPricing(updated.policy);
    }catch{setMessage("pricingMessage","Ошибка сохранения. Прежние правила остались без изменений.")}
    finally{appState.busy=false;refreshPricingPreview()}
  });
  function customerMarkup(item){
    return '<div class="customer-row"><div><strong>'+escape([item.name,item.surname].filter(Boolean).join(" "))+'</strong>'+
      '<small>'+escape(item.email||"Почта не указана")+'</small></div>'+
      '<div><small>Телефон: '+escape(item.phone||"не указан")+'</small>'+
      '<small>Заявок: '+Number(item.requests_count||0)+'</small></div>'+
      '<b>'+Number(item.orders_count||0)+' заказ(ов)</b></div>';
  }
  async function loadCustomers({more=false}={}){
    const filter=String(el("customerSearch").value||"").trim().slice(0,80);
    if(!more)appState.customerOffset=0;
    try{
      const result=appState.demo?
        {customers:fakeCustomers.filter(x=>(x.name+" "+x.surname+" "+x.phone).toLowerCase().includes(filter.toLowerCase()))}:
        await api("/api/admin/customers?limit=31&offset="+appState.customerOffset+"&q="+encodeURIComponent(filter));
      const rows=(result.customers||[]).slice(0,30);
      appState.customers=more?appState.customers.concat(rows):rows;
      appState.customerOffset+=rows.length;
      el("customerList").innerHTML=appState.customers.length?appState.customers.map(customerMarkup).join(""):
        '<div class="empty-state">Покупателей по этому запросу нет.</div>';
      el("customerCount").textContent="Показано клиентов: "+appState.customers.length;
      el("loadMoreCustomers").hidden=(result.customers||[]).length<=30;
    }catch{el("customerList").innerHTML='<div class="empty-state">Не удалось загрузить клиентов.</div>'}
  }
  let debounce;
  el("customerSearch").addEventListener("input",()=>{
    clearTimeout(debounce);debounce=setTimeout(()=>loadCustomers(),300);
  });
  el("loadMoreCustomers").addEventListener("click",()=>loadCustomers({more:true}));
  checkAuth();
})();
