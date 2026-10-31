"use strict";
(() => {
  const API = "https://api.168.113.211.246.sslip.io";
  const KEY = "zapformat-admin-access-token";
  const PAGE_SIZE = 30;
  const $ = id => document.getElementById(id);
  const formatRub = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat("ru-RU",{maximumFractionDigits:2}).format(Number(n)) + " ₽" : "—";
  const formatInt = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat("ru-RU").format(Number(n)) : "—";
  const dateRu = d => d && !Number.isNaN(new Date(d).getTime()) ? new Date(d).toLocaleString("ru-RU",{timeZone:"Europe/Moscow",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const statusLabels = {new:"Новый",received:"Получен",confirmed:"Подтверждён",processing:"В обработке",ready:"Готов",completed:"Завершён",cancelled:"Отменён"};
  const captions = {
    overview:["Обзор бизнеса","Актуальные показатели магазина","ОБЗОР"],
    orders:["Заказы","Очередь и состояние клиентских заказов","ЗАКАЗЫ"],
    requests:["Обращения","Заявки клиентов и запросы на подбор","ОБРАЩЕНИЯ"],
    pricing:["Ценовая политика","Настройка наценок по себестоимости","НАЦЕНКИ"],
    customers:["Клиенты","Покупатели, автосервисы и история обращений","КЛИЕНТЫ"],
    logistics:["Склад и доставка","Контроль статусов поставок и готовности","ЛОГИСТИКА"],
    analytics:["Аналитика","Финансовые показатели и качество данных","АНАЛИТИКА"],
    security:["Безопасность","Смена пароля и защита учётной записи","БЕЗОПАСНОСТЬ"]
  };
  const state = {token:"",user:null,page:"overview",seq:0,overview:null,orders:[],requests:[],customers:[],filterOrders:"",filterRequests:"",searchCustomers:"",offsets:{orders:0,requests:0,customers:0},more:{orders:false,requests:false,customers:false},pricing:null,savedPricing:null,pricingAt:null,busy:false};
  function alertMessage(message,type="info"){
    const el=$("globalAlert");
    if(!message){el.hidden=true;el.textContent="";return;}
    el.hidden=false;el.className="alert "+type;el.textContent=message;
  }
  async function request(path,{method="GET",body,token=state.token}={}){
    const controller = new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try {
      const response=await fetch(API+path,{
        method,signal:controller.signal,credentials:"include",
        headers:{"Accept":"application/json",...(body!==undefined?{"Content-Type":"application/json"}:{}),...(token?{"Authorization":"Bearer "+token}:{})},
        ...(body!==undefined?{body:JSON.stringify(body)}:{})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){const err=new Error(data.error||"http_"+response.status);err.status=response.status;throw err;}
      return data;
    } finally {clearTimeout(timer);}
  }
  function setToken(value){state.token=String(value||"");try{if(value)localStorage.setItem(KEY,state.token);else localStorage.removeItem(KEY);}catch{}}
  function authorized(user){return !!user && ["owner","admin"].includes(String(user.role));}
  function loggedOut(reason=""){
    state.seq++;state.user=null;state.overview=null;state.savedPricing=null;state.pricing=null;
    setToken("");$("appScreen").hidden=true;$("authScreen").hidden=false;
    $("password").value="";$("authError").textContent=reason;
  }
  function loggedIn(user){
    state.user=user;$("authScreen").hidden=true;$("appScreen").hidden=false;
    $("userName").textContent=[user.name,user.surname].filter(Boolean).join(" ")||"Владелец";
    openPage("overview");
  }
  async function restoreSession(){
    let token="";try{token=String(localStorage.getItem(KEY)||"");}catch{}
    if(!token){loggedOut();return;}
    state.token=token;
    try {const data=await request("/api/auth/me");if(!authorized(data.user))throw Error("forbidden");loggedIn(data.user);}
    catch {loggedOut("Сеанс закончился. Войдите как владелец.");}
  }
  async function signIn(event){
    event.preventDefault();const button=$("loginButton");if(button.disabled)return;
    button.disabled=true;$("authError").textContent="";
    try{
      const login=$("login").value.trim(), password=$("password").value;
      const data=await request("/api/auth/login",{method:"POST",body:{login,password},token:""});
      if(!authorized(data.user)){
        if(data.access_token) await request("/api/auth/logout",{method:"POST",token:data.access_token}).catch(()=>{});
        $("authError").textContent="Этой учётной записи не предоставлены права управления магазином.";
        return;
      }
      if(!data.access_token)throw Error("token_missing");
      setToken(data.access_token);
      const verified=await request("/api/auth/me");
      if(!authorized(verified.user)){loggedOut("Доступ владельца не подтверждён сервером.");return;}
      loggedIn(verified.user);
    }catch(error){$("authError").textContent=error.status===401?"Неверный логин или пароль.":error.status===429?"Слишком много попыток. Повторите позже.":"Не удалось войти. Проверьте связь с сервером.";}
    finally{button.disabled=false;$("password").value="";}
  }
  async function logout(){
    const token=state.token;loggedOut();
    if(token)await request("/api/auth/logout",{method:"POST",token}).catch(()=>{});
  }
  function table(headers,rows,empty="Записей пока нет."){
    if(!rows.length)return '<div class="empty">'+escape(empty)+'</div>';
    return '<div class="table-scroll"><table><thead><tr>'+headers.map(h=>'<th>'+escape(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
  }
  function badge(value){const key=String(value||"");return '<span class="badge badge-'+(Object.hasOwn(statusLabels,key)?key:"unknown")+'">'+escape(statusLabels[key]||value||"—")+'</span>';}
  function orderRows(items){
    return items.map(i=>'<tr><td><strong>№ '+escape(i.order_number||i.id||"—")+'</strong><small>'+dateRu(i.created_at)+'</small></td><td>'+escape(i.recipient_name||"Получатель не указан")+'<small>'+escape(i.recipient_phone||"")+'</small></td><td class="nowrap">'+formatRub(i.total_amount)+'</td><td>'+formatInt(i.items_count)+'</td><td>'+badge(i.status)+'</td></tr>');
  }
  function requestRows(items){
    return items.map(i=>'<tr><td><strong>№ '+escape(i.id)+'</strong><small>'+dateRu(i.created_at)+'</small></td><td>'+escape(i.name||"—")+'<small>'+escape(i.phone||"")+'</small></td><td>'+escape(i.articles||"—")+'</td><td>'+formatInt(i.items_count)+'</td><td>'+badge(i.status)+'</td></tr>');
  }
  function customerRows(items){
    return items.map(i=>'<tr><td><strong>'+escape([i.name,i.surname].filter(Boolean).join(" ")||"Не указано")+'</strong><small>С '+dateRu(i.created_at)+'</small></td><td>'+escape(i.phone||"—")+'<small>'+escape(i.email||"")+'</small></td><td>'+formatInt(i.orders_count)+'</td><td>'+formatInt(i.requests_count)+'</td></tr>');
  }
  function card(label,value,detail=""){return '<article class="metric"><div class="metric-label">'+escape(label)+'</div><div class="metric-value">'+value+'</div><div class="metric-detail">'+escape(detail)+'</div></article>';}
  function panel(title,body,extra=""){return '<section class="panel"><div class="panel-head"><h2>'+escape(title)+'</h2>'+extra+'</div>'+body+'</section>';}
  function renderOverview(summary,queue){
    const o=summary?.orders||{},q=summary?.requests||{},g=summary?.gross_profit||{};
    const tiles='<div class="metrics">'+
      card("Сумма оформленных заказов",formatRub(o.booked_revenue),"Без отменённых; не равно поступившей оплате")+
      card("Всего заказов",formatInt(o.total),"В базе магазина")+
      card("Активные заказы",formatInt(o.active),"Не завершены и не отменены")+
      card("Активные обращения",formatInt(q.active),"Ожидают обработки")+
      '</div>';
    const profit=Number(g.costed_items)>0?formatRub(g.known_amount):"—";
    const coverage='<div class="insight-grid"><div><div class="metric-label">Валовая прибыль по известной закупке</div><div class="large-number">'+profit+'</div><p>До расходов, налогов и возвратов. Не является чистой прибылью.</p></div><div><div class="metric-label">Полнота себестоимости</div><div class="large-number">'+formatInt(g.costed_items)+' / '+formatInt(Number(g.costed_items||0)+Number(g.missing_cost_items||0))+'</div><p>'+formatInt(g.missing_cost_items)+' позиций без закупочной цены. '+(g.complete?"По зарегистрированным позициям себестоимость заполнена.":"Общая прибыль по всем позициям пока неизвестна.")+'</p></div></div>';
    $("page").innerHTML=tiles+'<div class="split">'+panel("Последние заказы",table(["Заказ","Получатель","Сумма","Поз.","Статус"],orderRows(queue),"Заказов пока нет."),'<button class="link" data-open="orders">Все заказы →</button>')+panel("Финансовый контроль",coverage,'<button class="link" data-open="analytics">Подробнее →</button>')+'</div><p class="section-caption">Обновлено '+dateRu(new Date())+' по московскому времени.</p>';
    bindNavigation();
  }
  function renderOrders(){
    const options=[["","Все статусы"],...Object.entries(statusLabels)];
    $("page").innerHTML=panel("Очередь заказов",'<div class="toolbar"><label>Статус <select id="orderFilter">'+options.map(([v,t])=>'<option value="'+escape(v)+'"'+(v===state.filterOrders?" selected":"")+'>'+escape(t)+'</option>').join("")+'</select></label><span class="muted">Только просмотр. Закупка поставщику не выполняется.</span></div><div id="ordersList">'+table(["Заказ","Получатель","Сумма","Поз.","Статус"],orderRows(state.orders))+'</div><div class="pagination"><span id="ordersCount">Показано: '+formatInt(state.orders.length)+'</span><button id="ordersMore" class="secondary" '+(!state.more.orders?"hidden":"")+'>Загрузить ещё</button></div>');
    $("orderFilter").addEventListener("change",e=>{state.filterOrders=e.target.value;loadList("orders");});
    $("ordersMore").addEventListener("click",()=>loadList("orders",true));
  }
  function renderRequests(){
    $("page").innerHTML=panel("Клиентские обращения",'<div class="toolbar"><label>Статус <select id="requestFilter">'+[["","Все статусы"],...Object.entries(statusLabels)].map(([v,t])=>'<option value="'+escape(v)+'"'+(v===state.filterRequests?" selected":"")+'>'+escape(t)+'</option>').join("")+'</select></label><span class="muted">История обращений без изменения данных клиента.</span></div><div id="requestsList">'+table(["Обращение","Клиент","Артикулы","Поз.","Статус"],requestRows(state.requests))+'</div><div class="pagination"><span>Показано: '+formatInt(state.requests.length)+'</span><button id="requestsMore" class="secondary" '+(!state.more.requests?"hidden":"")+'>Загрузить ещё</button></div>');
    $("requestFilter").addEventListener("change",e=>{state.filterRequests=e.target.value;loadList("requests");});
    $("requestsMore").addEventListener("click",()=>loadList("requests",true));
  }
  function renderCustomers(){
    $("page").innerHTML=panel("Клиенты",'<div class="toolbar"><label>Поиск <input id="customerSearch" placeholder="Имя, телефон или почта" value="'+escape(state.searchCustomers)+'" maxlength="80"></label><span class="muted">Только просмотр клиентских данных.</span></div><div id="customersList">'+table(["Клиент","Контакты","Заказы","Обращения"],customerRows(state.customers))+'</div><div class="pagination"><span>Показано: '+formatInt(state.customers.length)+'</span><button id="customersMore" class="secondary" '+(!state.more.customers?"hidden":"")+'>Загрузить ещё</button></div>');
    let debounce;$("customerSearch").addEventListener("input",e=>{const value=e.target.value;clearTimeout(debounce);debounce=setTimeout(()=>{state.searchCustomers=value;loadList("customers");},400);});
    $("customersMore").addEventListener("click",()=>loadList("customers",true));
  }
  function renderLogistics(queue){
    const active=queue.filter(i=>!["completed","cancelled"].includes(i.status));
    const ready=active.filter(i=>i.status==="ready");
    $("page").innerHTML='<div class="metrics metrics-two">'+card("Готовы к выдаче",formatInt(ready.length),"Среди последних "+queue.length+" заказов")+
    card("В процессе",formatInt(active.length),"Среди загруженных заказов, не общий итог")+'</div>'+
    panel("Позиции под контролем",'<p class="muted">Статус «Готов» берётся из системы заказов. Фактическое местонахождение детали, маршрут и время прибытия курьера пока не фиксируются отдельным складским модулем.</p>'+
    table(["Заказ","Получатель","Сумма","Поз.","Статус"],orderRows(active),"Среди загруженных заказов активных нет.")+
    '<div class="pagination"><button class="secondary" data-open="orders">Перейти ко всем заказам</button></div>');
    bindNavigation();
  }
  function renderAnalytics(o){
    const orders=o.orders||{},g=o.gross_profit||{},requests=o.requests||{};
    $("page").innerHTML='<div class="metrics">'+card("Оформлено заказов",formatInt(orders.total))+card("Сумма заказов",formatRub(orders.booked_revenue),"Это не подтверждённая оплата")+card("Обращений всего",formatInt(requests.total))+card("Отменено заказов",formatInt(orders.cancelled))+'</div>'+
    panel("Валовая прибыль по известной себестоимости",'<div class="analytics-grid">'+
      card("Продажи позиций с известной закупкой",formatRub(g.revenue_on_costed_lines))+
      card("Закупка по этим позициям",formatRub(g.procurement_on_costed_lines))+
      card("Разница до расходов",Number(g.costed_items)>0?formatRub(g.known_amount):"—")+'</div>'+
      '<p>Покрытие: '+formatInt(g.costed_items)+' позиций с себестоимостью; '+formatInt(g.missing_cost_items)+' без неё. '+(g.complete?"":"Общая валовая прибыль не может быть рассчитана достоверно.")+'</p>'+
      '<div class="callout">Операционные расходы, курьерские выплаты, возвраты и налоги не учтены. Данные не являются чистой прибылью или отчётом о движении денег.</div>');
  }
  function pricingDraft(){
    return {tiers:["low","medium","high","premium"].map(id=>({id,percent:Number($("tier-"+id)?.value)})),
      min_markup_rub:Number($("minMarkup")?.value),round_to:Number($("rounding")?.value)};
  }
  function validPricing(policy){
    return policy.tiers.every(t=>Number.isFinite(t.percent)&&t.percent>=0&&t.percent<=300) &&
      Number.isFinite(policy.min_markup_rub)&&policy.min_markup_rub>=0&&policy.min_markup_rub<=50000&&
      [0.01,1,10,50,100].includes(policy.round_to);
  }
  function previewPrice(){
    if(!state.savedPricing)return;
    const p=pricingDraft();
    for(const tier of p.tiers){const label=$("val-"+tier.id);if(label)label.textContent=tier.percent+"%";}
    const cost=Number($("exampleCost").value);
    const preview=$("pricePreview");
    if(!validPricing(p)||!Number.isFinite(cost)||cost<0||cost>10000000){preview.textContent="Проверьте указанные значения.";return;}
    const index=cost<500?0:cost<2000?1:cost<10000?2:3;
    const pennies=Math.round(cost*100),surcharge=Math.max(Math.round(pennies*p.tiers[index].percent/100),Math.round(p.min_markup_rub*100));
    const step=Math.round(p.round_to*100);
    const sale=Math.ceil((pennies+surcharge)/step)*step/100;
    preview.textContent="Закупка "+formatRub(cost)+" → продажа "+formatRub(sale)+" · валовая разница "+formatRub(sale-cost)+" · маржа "+(sale?((sale-cost)/sale*100).toFixed(1):"0")+"%";
    const dirty=JSON.stringify(p)!==JSON.stringify(state.savedPricing);
    $("savePricing").disabled=!dirty||state.busy;
    $("discardPricing").disabled=!dirty||state.busy;
    $("pricingDirty").textContent=dirty?"Есть несохранённые изменения":"Настройки совпадают с сохранёнными";
  }
  function renderPricing(){
    const p=state.pricing||state.savedPricing;
    if(!p){$("page").innerHTML=panel("Наценки",'<div class="empty">Не удалось загрузить серверные правила. Изменения заблокированы.</div>');return;}
    const titles=[["low","До 499 ₽"],["medium","От 500 до 1 999 ₽"],["high","От 2 000 до 9 999 ₽"],["premium","От 10 000 ₽"]];
    $("page").innerHTML=panel("Торговая наценка",'<p class="muted">Наценка рассчитывается от закупочной цены. Ползунки не меняют цены до нажатия «Сохранить правила».</p>'+
      '<div class="pricing-grid">'+titles.map(([id,title])=>{const row=p.tiers.find(t=>t.id===id);const n=row?.percent??15;return '<label class="tier"><span>'+title+'</span><strong id="val-'+id+'">'+n+'%</strong><input id="tier-'+id+'" type="range" min="0" max="300" step=".1" value="'+n+'"><small>От 0 до 300%</small></label>';}).join("")+'</div>'+
      '<div class="settings-row"><label>Минимальная наценка, ₽<input id="minMarkup" type="number" min="0" max="50000" step=".01" value="'+p.min_markup_rub+'"></label>'+
      '<label>Округление цены<select id="rounding">'+[.01,1,10,50,100].map(n=>'<option value="'+n+'"'+(n===p.round_to?" selected":"")+'>'+formatRub(n)+'</option>').join("")+'</select></label>'+
      '<label>Пример закупочной цены, ₽<input id="exampleCost" type="number" min="0" max="10000000" value="2500"></label></div>'+
      '<div class="preview"><small>ПРЕДВАРИТЕЛЬНЫЙ РАСЧЁТ</small><strong id="pricePreview">—</strong><p>Это пример. Сохранение новых правил не пересчитывает уже оформленные заказы.</p></div>'+
      '<div class="savebar"><span id="pricingDirty">Настройки совпадают с сохранёнными</span><button class="secondary" id="discardPricing" disabled>Отменить изменения</button><button class="primary" id="savePricing" disabled>Сохранить правила</button></div>'+
      '<p class="muted" id="pricingSaved"> '+(state.pricingAt?"Последнее сохранение: "+dateRu(state.pricingAt):"Используются исходные правила на сервере.")+'</p>');
    for(const id of ["low","medium","high","premium","minMarkup","rounding","exampleCost"])$(["low","medium","high","premium"].includes(id)?"tier-"+id:id).addEventListener("input",previewPrice);
    $("discardPricing").addEventListener("click",()=>{state.pricing=structuredClone(state.savedPricing);renderPricing();});
    $("savePricing").addEventListener("click",savePricing);previewPrice();
  }
  async function savePricing(){
    if(!state.savedPricing||state.busy)return;
    const p=pricingDraft();
    if(!validPricing(p)){alertMessage("Некорректные значения наценок.","error");return;}
    if(JSON.stringify(p)===JSON.stringify(state.savedPricing))return;
    if(!window.confirm("Сохранить новые правила наценки? Они начнут действовать для новых расчётов цен."))return;
    state.busy=true;$("savePricing").disabled=true;alertMessage("Сохраняем правила на сервере…");
    try{
      const result=await request("/api/admin/pricing",{method:"PUT",body:{policy:p}});
      if(!result.ok||!result.policy)throw Error("save_not_confirmed");
      state.savedPricing=result.policy;state.pricing=structuredClone(result.policy);state.pricingAt=result.updated_at;
      alertMessage("Правила подтверждены сервером. Новые расчёты используют эти наценки.","success");renderPricing();
    }catch(error){handleError(error,"Не удалось сохранить правила. Действующие цены не менялись.");}
    finally{state.busy=false;if($("savePricing"))previewPrice();}
  }
  async function loadList(kind,more=false){
    if(!state.user)return;
    const seq=++state.seq;
    const filter=kind==="orders"?state.filterOrders:kind==="requests"?state.filterRequests:state.searchCustomers;
    const key=kind==="customers"?"q":"status";
    const offset=more?state.offsets[kind]:0;
    if(!more){state[kind]=[];state.offsets[kind]=0;state.more[kind]=false;}
    alertMessage("Загружаем данные…");
    try{
      const data=await request("/api/admin/"+kind+"?limit="+(PAGE_SIZE+1)+"&offset="+offset+(filter?"&"+key+"="+encodeURIComponent(filter):""));
      if(seq!==state.seq||!state.user||state.page!==kind)return;
      const all=Array.isArray(data[kind])?data[kind]:[];
      const page=all.slice(0,PAGE_SIZE);
      state[kind]=more?state[kind].concat(page):page;state.offsets[kind]=offset+page.length;state.more[kind]=all.length>PAGE_SIZE;
      if(kind==="orders")renderOrders();else if(kind==="requests")renderRequests();else renderCustomers();
      alertMessage("");
    }catch(error){if(seq!==state.seq)return;handleError(error,"Сервер не вернул список. Проверьте соединение и права доступа.");}
  }
  function handleError(error,fallback){
    if(error.status===401||error.status===403){loggedOut("Сеанс завершён либо нет прав владельца.");return;}
    alertMessage(fallback||"Данные временно недоступны.","error");
  }
  function renderSecurity(){
    $("page").innerHTML=panel("Пароль владельца", `<p class="muted">Для смены пароля укажите действующий пароль и придумайте новый длиной от 12 до 128 символов. После успешной смены все прежние сеансы будут отключены, потребуется войти снова.</p>
      <form id="passwordChangeForm" class="security-form" autocomplete="off">
        <label>Действующий пароль<input type="password" name="current_password" autocomplete="current-password" required></label>
        <label>Новый пароль<input type="password" name="new_password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
        <label>Повторите новый пароль<input type="password" name="new_password_confirmation" autocomplete="new-password" minlength="12" maxlength="128" required></label>
        <button class="primary" type="submit" id="passwordChangeButton">Сменить пароль</button>
      </form>
      <p class="muted">Пароль не передаётся через чат и не хранится в исходном коде. При включении двухфакторной проверки она будет действовать дополнительно к паролю.</p>`);
    $("passwordChangeForm").addEventListener("submit", async event => {
      event.preventDefault();
      if(state.busy)return;
      const form=event.currentTarget;
      const values=Object.fromEntries(new FormData(form));
      if(values.new_password!==values.new_password_confirmation) {
        alertMessage("Новые пароли не совпадают.","error");return;
      }
      if(values.new_password.length<12) {
        alertMessage("Новый пароль должен содержать минимум 12 символов.","error");return;
      }
      state.busy=true;$("passwordChangeButton").disabled=true;
      try {
        const result=await request("/api/account/password/change",{method:"POST",body:values});
        if(result.ok && result.reauthenticate) {
          loggedOut("Пароль изменён. Войдите с новым паролем.");
        } else throw new Error("not_confirmed");
      } catch(error) {
        handleError(error,error.status===404?"Сервер ещё не обновлён. Смена пароля станет доступна после развёртывания новой версии.":error.status===401?"Действующий пароль указан неверно.":"Не удалось изменить пароль. Данные не сохранены.");
      } finally {
        state.busy=false;
        if($("passwordChangeButton")) $("passwordChangeButton").disabled=false;
      }
    });
  }
  async function openPage(page){
    if(!state.user||!captions[page])return;
    const seq=++state.seq;state.page=page;
    const [title,subtitle,bread]=captions[page];
    $("pageTitle").textContent=title;$("pageSubtitle").textContent=subtitle;$("breadcrumbs").textContent=bread;
    document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    alertMessage("");$("page").innerHTML='<div class="loading"><span class="spinner"></span>Загружаем данные из ZapFormat…</div>';
    try{
      if(["orders","requests","customers"].includes(page)){await loadList(page);return;}
      if(page==="security"){renderSecurity();return;}
      if(page==="pricing"){
        const data=await request("/api/admin/pricing");
        if(seq!==state.seq||!state.user)return;
        if(!data?.policy)throw Error("policy_unavailable");
        state.savedPricing=structuredClone(data.policy);state.pricing=structuredClone(data.policy);state.pricingAt=data.updated_at;renderPricing();return;
      }
      if(page==="overview"){
        const [overview,queue]=await Promise.all([request("/api/admin/overview"),request("/api/admin/orders?limit=8")]);
        if(seq!==state.seq||!state.user)return;
        state.overview=overview;renderOverview(overview,queue.orders||[]);return;
      }
      if(page==="analytics"){
        const overview=await request("/api/admin/overview");
        if(seq!==state.seq||!state.user)return;
        state.overview=overview;renderAnalytics(overview);return;
      }
      if(page==="logistics"){
        const queue=await request("/api/admin/orders?limit=50");
        if(seq!==state.seq||!state.user)return;
        renderLogistics(queue.orders||[]);return;
      }
    }catch(error){if(seq!==state.seq)return;$("page").innerHTML='<div class="panel"><div class="empty">Этот раздел сейчас не доступен. Данные не заменяются вымышленными цифрами.</div></div>';handleError(error,"Не удалось получить сведения с сервера.");}
  }
  function bindNavigation(){
    $("page").querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openPage(b.dataset.open)));
  }
  $("loginForm").addEventListener("submit",signIn);
  $("logoutButton").addEventListener("click",logout);
  $("refreshButton").addEventListener("click",()=>openPage(state.page));
  $("menu").addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b)openPage(b.dataset.page);});
  restoreSession();
})();