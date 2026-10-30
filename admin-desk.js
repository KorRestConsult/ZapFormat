"use strict";

// Additional read-only sections for the role-gated owner/admin dashboard.
// No supplier order placement, pricing updates, or customer-account mutations.
(function () {
  const PAGE_SIZE = 30;
  const states = {
    requests: { busy: false, offset: 0, more: false, filter: "" },
    customers: { busy: false, offset: 0, more: false, filter: "" }
  };

  const byId = id => document.getElementById(id);

  function renderPagination(type) {
    const state=states[type];
    const label=byId(type==="requests"?"adminRequestsCount":"adminCustomersCount");
    const button=byId(type==="requests"?"adminRequestsMore":"adminCustomersMore");
    const wrap=byId(type==="requests"?"adminRequestsPagination":"adminCustomersPagination");
    if(label) label.textContent="Показано: "+state.offset+(state.more?" · есть ещё":"");
    if(wrap) wrap.hidden=state.offset===0;
    if(button) {
      button.hidden=!state.more;
      button.disabled=state.busy;
      button.textContent=state.busy?"Загрузка…":"Показать ещё";
    }
  }

  function requestRow(item) {
    const articles=String(item.articles||"").slice(0,220);
    return '<article class="management-desk-row">'+
      '<div><strong>Заявка '+escapeHtml(item.id)+'</strong>'+
      '<small>'+escapeHtml(formatDateTimeRu(item.created_at))+' · '+Number(item.items_count||0)+' поз.</small>'+
      (articles?'<small class="management-desk-articles">'+escapeHtml(articles)+'</small>':"")+'</div>'+
      '<div><b>'+escapeHtml(item.name||"Имя не указано")+'</b>'+
      '<small>'+escapeHtml(item.phone||"Телефон не указан")+'</small></div>'+
      '<span class="status '+escapeHtml(requestStatusClass(item.status))+'">'+
      escapeHtml(requestStatusLabel(item.status))+'</span></article>';
  }

  function customerRow(item) {
    return '<article class="management-desk-row">'+
      '<div><strong>'+escapeHtml([item.name,item.surname].filter(Boolean).join(" ")||"Без имени")+'</strong>'+
      '<small>С нами с '+escapeHtml(formatDateTimeRu(item.created_at))+'</small></div>'+
      '<div><small>'+escapeHtml(item.phone||"Телефон не указан")+'</small>'+
      '<small>'+escapeHtml(item.email||"Почта не указана")+'</small></div>'+
      '<div class="management-desk-counters"><b>'+Number(item.orders_count||0)+' заказов</b>'+
      '<small>'+Number(item.requests_count||0)+' заявок</small></div></article>';
  }

  async function load(type,{more=false}={}) {
    if(typeof isManagementUser!=="function" || !isManagementUser()) return;
    const state=states[type];
    if(state.busy) return;
    const field=byId(type==="requests"?"adminRequestFilter":"adminCustomerSearch");
    const filter=String(field?.value||"").trim();
    const list=byId(type==="requests"?"adminRequestList":"adminCustomerList");
    const summary=byId(type==="requests"?"adminRequestsStatus":"adminCustomersStatus");
    if(!list) return;
    if(more && (!state.more || state.filter!==filter)) more=false;
    state.busy=true;
    if(field) field.disabled=true;
    if(summary) summary.textContent="Загружаем данные…";
    renderPagination(type);
    try {
      const offset=more?state.offset:0;
      const param=type==="requests"?"status":"q";
      const url="/api/admin/"+type+"?limit="+(PAGE_SIZE+1)+"&offset="+offset+
        (filter?"&"+param+"="+encodeURIComponent(filter):"");
      const data=await apiRequest(url);
      if(!isManagementUser()) return;
      const all=Array.isArray(data?.[type])?data[type]:[];
      const page=all.slice(0,PAGE_SIZE);
      const markup=page.map(type==="requests"?requestRow:customerRow).join("");
      if(more) {
        if(markup) list.insertAdjacentHTML("beforeend",markup);
      } else {
        list.innerHTML=markup||'<div class="management-empty">Ничего не найдено.</div>';
      }
      state.offset=offset+page.length;
      state.more=all.length>PAGE_SIZE;
      state.filter=filter;
      if(summary) summary.textContent=state.offset+" записей загружено · только просмотр.";
    } catch(error) {
      console.warn("Admin "+type+" loading failed",error?.status||error?.message);
      if(!more) {
        list.innerHTML='<div class="management-empty">Данные пока недоступны. Проверьте сервер и права доступа.</div>';
        state.offset=0;
        state.more=false;
      }
      if(summary) summary.textContent="Ошибка загрузки. Повторите запрос.";
    } finally {
      state.busy=false;
      if(field) field.disabled=false;
      renderPagination(type);
    }
  }


  // Pricing is persisted on the API server, not in localStorage. A slider
  // never changes retail prices until the owner explicitly saves the policy.
  const pricingIds=["low","medium","high","premium"];
  let savedPricing=null;
  let pricingBusy=false;
  const pricingInput=key=>byId("pricing-"+key);
  const money=value=>new Intl.NumberFormat("ru-RU",{minimumFractionDigits:0,maximumFractionDigits:2}).format(value)+" ₽";
  const getDraftPricing=()=>({
    tiers:pricingIds.map(id=>({id,percent:Number(pricingInput(id)?.value)})),
    min_markup_rub:Number(byId("pricingMinRub")?.value),
    round_to:Number(byId("pricingRounding")?.value)
  });
  function renderPricingPreview(){
    const draft=getDraftPricing();
    pricingIds.forEach(id=>{
      const label=byId("pricing-"+id+"-value");
      if(label) label.textContent=String(pricingInput(id)?.value||"0")+"%";
    });
    const cost=Number(byId("pricingExampleCost")?.value);
    const preview=byId("pricingLivePreview");
    if(!preview) return;
    if(!Number.isFinite(cost)||cost<0||cost>10000000||!Number.isFinite(draft.min_markup_rub)||
       draft.min_markup_rub<0||draft.min_markup_rub>50000){
      preview.textContent="Проверьте введённые суммы.";
      return;
    }
    const tier=cost<500?0:cost<2000?1:cost<10000?2:3;
    const percent=draft.tiers[tier].percent;
    const rawKopecks=Math.round(cost*100)+
      Math.max(Math.round(Math.round(cost*100)*percent/100),Math.round(draft.min_markup_rub*100));
    const roundStep=Math.round(draft.round_to*100);
    const retail=Math.ceil(rawKopecks/roundStep)*roundStep/100;
    const profit=retail-cost;
    const margin=retail?profit/retail*100:0;
    preview.textContent="Пример: закупка "+money(cost)+" → продажа "+money(retail)+
      " · наценка "+money(profit)+" · маржа "+margin.toFixed(1)+"%.";
    const save=byId("pricingSave");
    const dirty=savedPricing && JSON.stringify(draft)!==JSON.stringify(savedPricing);
    if(save) save.disabled=pricingBusy||!dirty;
  }
  function applyPricing(policy){
    for(const tier of policy.tiers||[]){
      const input=pricingInput(tier.id);
      if(input) input.value=String(tier.percent);
    }
    if(byId("pricingMinRub")) byId("pricingMinRub").value=String(policy.min_markup_rub);
    if(byId("pricingRounding")) byId("pricingRounding").value=String(policy.round_to);
    renderPricingPreview();
  }
  async function loadPricing(){
    if(typeof isManagementUser!=="function"||!isManagementUser())return;
    const status=byId("pricingSaveStatus");
    pricingBusy=true;
    if(status) status.textContent="Загружаем правила магазина…";
    renderPricingPreview();
    try {
      const response=await apiRequest("/api/admin/pricing");
      if(!isManagementUser())return;
      savedPricing=response.policy;
      applyPricing(savedPricing);
      if(status) status.textContent=response.updated_at
        ?"Правила действуют · обновлены "+formatDateTimeRu(response.updated_at)
        :"Действуют начальные настройки. Новые правила ещё не сохранялись.";
    } catch (error) {
      console.warn("Pricing loading failed",error?.code||error?.message);
      if(status) status.textContent="Не удалось загрузить правила с сервера. Сохранение отключено.";
      savedPricing=null;
    } finally {
      pricingBusy=false;
      renderPricingPreview();
    }
  }
  async function savePricing(){
    if(pricingBusy||!savedPricing||!isManagementUser())return;
    const policy=getDraftPricing();
    const status=byId("pricingSaveStatus");
    pricingBusy=true;
    if(status) status.textContent="Сохраняем на сервере…";
    renderPricingPreview();
    try {
      const response=await apiRequest("/api/admin/pricing",{
        method:"PUT",
        body:JSON.stringify({policy})
      });
      if(!response.ok)throw new Error("pricing_not_saved");
      savedPricing=response.policy;
      applyPricing(savedPricing);
      if(status) status.textContent="Правила сохранены. Новые цены будут рассчитаны по этим настройкам.";
    } catch(error) {
      console.warn("Pricing saving failed",error?.code||error?.message);
      if(status) status.textContent="Ошибка сохранения: прежние правила остались без изменений.";
    } finally {
      pricingBusy=false;
      renderPricingPreview();
    }
  }
  document.querySelectorAll("[data-pricing-tier]").forEach(input=>input.addEventListener("input",renderPricingPreview));
  ["pricingMinRub","pricingRounding","pricingExampleCost"].forEach(id=>{
    byId(id)?.addEventListener("input",renderPricingPreview);
    byId(id)?.addEventListener("change",renderPricingPreview);
  });
  byId("pricingDiscard")?.addEventListener("click",()=>{
    if(savedPricing)applyPricing(savedPricing);
  });
  byId("pricingSave")?.addEventListener("click",savePricing);

  let searchDebounce;
  function hydrateAdminDesk(){
    load("requests");
    load("customers");
    loadPricing();
  }

  byId("adminRequestFilter")?.addEventListener("change",()=>load("requests"));
  byId("adminCustomerSearch")?.addEventListener("input",()=>{
    clearTimeout(searchDebounce);
    searchDebounce=setTimeout(()=>load("customers"),350);
  });
  byId("adminRequestsMore")?.addEventListener("click",()=>load("requests",{more:true}));
  byId("adminCustomersMore")?.addEventListener("click",()=>load("customers",{more:true}));
  byId("adminRequestsReload")?.addEventListener("click",()=>load("requests"));
  byId("adminCustomersReload")?.addEventListener("click",()=>load("customers"));
  window.hydrateAdminDesk=hydrateAdminDesk;
})();
