"use strict";

// Mobile-first owner workspace. Every detail and mutation is authenticated by
// /api/admin on the server; hiding a tab alone is never a permission boundary.
(function () {
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const money = value => Number(value).toLocaleString("ru-RU", {
    style:"currency", currency:"RUB", maximumFractionDigits:2
  });
  const safe = value => escapeHtml(String(value ?? ""));
  const format = value => value ? formatDateTimeRu(value) : "Не подтверждена";
  const validPhone = value => String(value || "").replace(/[^\d+]/g, "");
  const loaded = new Map();

  function selectTab(tab) {
    if (typeof isManagementUser !== "function" || !isManagementUser()) return;
    const options = ["orders","pricing","customers","requests"];
    if (!options.includes(tab)) return;
    $$("[data-admin-tab]").forEach(button => {
      const selected=button.dataset.adminTab===tab;
      button.classList.toggle("active",selected);
      button.setAttribute("aria-pressed",String(selected));
    });
    $$("[data-admin-pane]").forEach(pane => {
      pane.hidden=pane.dataset.adminPane!==tab;
    });
    $(".management-more")?.removeAttribute("open");
  }
  $$("[data-admin-tab]").forEach(button => button.addEventListener("click",()=>{
    selectTab(button.dataset.adminTab);
  }));
  selectTab("orders");

  function lineMarkup(item) {
    const received=Number(item.received_quantity || 0);
    const ordered=Number(item.quantity || 0);
    const unit=Number(item.unit_price || 0);
    const rawSupplier=String(item.supplier_status || "").trim();
    const supplier=rawSupplier
      ? '<p class="owner-item-supplier">Поставщик: '+safe(rawSupplier)+'</p>'
      : '<p class="owner-item-supplier">Поставщик: статус не получен</p>';
    const note=item.expected_at && received<ordered
      ? '<p class="owner-item-eta">Ожидаемый срок: '+safe(format(item.expected_at))+'</p>'
      : '';
    const readiness=received===ordered ? "Получено полностью" :
      received===0 ? "Фактическая приёмка не отмечена" : "Получено частично";
    return '<article class="owner-item-row">'+
      '<div class="owner-item-copy">'+
        '<strong>'+safe(item.description || [item.brand,item.article].filter(Boolean).join(" ") || "Запчасть")+'</strong>'+
        '<span>'+safe(item.brand)+' · '+safe(item.article)+' · '+ordered+' шт.</span>'+
        '<p>Продажа: '+money(unit)+' / шт. · '+money(unit*ordered)+' всего</p>'+
        supplier+note+
        '<b class="owner-item-state">'+safe(readiness)+' · '+received+' из '+ordered+'</b>'+
      '</div>'+
      '<form class="owner-intake-form" data-item-id="'+safe(item.id)+'" data-prior="'+received+'">'+
        '<label>Принято, шт.<input type="number" name="qty" inputmode="numeric" required min="0" max="'+ordered+'" step="1" value="'+received+'"></label>'+
        '<button type="submit" class="management-desk-reload">Сохранить</button>'+
      '</form>'+
    '</article>';
  }

  function detailMarkup(payload) {
    const o=payload.order, f=payload.finance, i=payload.intake, parts=payload.items||[];
    const customer=o.customer_name || o.recipient_name || "Не указан";
    const recipient=o.recipient_name && o.recipient_name!==customer
      ? '<p>Получатель: '+safe(o.recipient_name)+'</p>' : '';
    const tel=o.recipient_phone || o.customer_phone;
    const contact=tel
      ? '<a class="owner-contact-link" href="tel:'+safe(validPhone(tel))+'">'+safe(tel)+'</a>'
      : '<span>Телефон отсутствует</span>';
    const cityAddress=[o.delivery_city,o.delivery_address].filter(Boolean).join(", ");
    const purchaseLabel=f.missing_cost_items > 0
      ? "Известная закупка ("+f.missing_cost_items+" поз. без цены)" : "Закупка";
    const gross=f.gross_profit==null ? "Не рассчитана: нет себестоимости всех позиций"
      : money(f.gross_profit)+" · до налогов, доставки и иных расходов";
    const pack=i.ready_for_packaging && !o.packed_at && !["completed","cancelled"].includes(o.status);
    const packed=o.packed_at
      ? '<p class="owner-pack-confirmed">Комплектация подтверждена: '+safe(format(o.packed_at))+'</p>'
      : '';
    const incomplete=i.missing_quantity
      ? '<div class="owner-intake-alert">Принято '+i.received_quantity+' из '+i.total_quantity+
        ' шт. Не получено: '+i.missing_quantity+'. Нельзя отмечать заказ готовым.</div>' : '';
    return '<div class="owner-order-contact">'+
      '<strong>'+safe(customer)+'</strong>'+recipient+
      '<p>'+contact+'</p><p>'+safe(cityAddress || "Адрес доставки не указан")+'</p>'+
      '<small>Способ получения и точное время согласовываются отдельно.</small>'+
    '</div>'+
    incomplete+
    '<h3 class="owner-card-title">Позиции заказа</h3>'+
    '<div class="owner-item-list">'+parts.map(lineMarkup).join("")+'</div>'+
    '<div class="owner-finance">'+
      '<div><span>Продажа клиенту</span><strong>'+money(f.sale_amount)+'</strong></div>'+
      '<div><span>'+safe(purchaseLabel)+'</span><strong>'+money(f.known_purchase_amount)+'</strong></div>'+
      '<div><span>Валовая прибыль</span><strong>'+safe(gross)+'</strong></div>'+
      '<div><span>Наличные поставщику</span><strong>Не подтверждены</strong></div>'+
    '</div>'+
    '<small class="owner-cash-note">'+safe(f.cash_due_reason)+'</small>'+
    packed+
    '<div class="owner-order-actions">'+
      '<button type="button" class="account-primary" data-pack-order '+(pack?"":"disabled")+'>'+
        (o.packed_at?"Уже укомплектован":"Подтвердить комплектацию")+'</button>'+
      '<button type="button" class="management-desk-reload" disabled title="Следующий этап разработки">PDF · позже</button>'+
      '<button type="button" class="management-desk-reload" disabled title="Следующий этап разработки">Доставка · позже</button>'+
      '<button type="button" class="management-desk-reload" disabled title="Следующий этап разработки">Уведомить · позже</button>'+
    '</div>'+
    '<p class="owner-detail-status" role="status" aria-live="polite"></p>';
  }

  async function loadOrder(card, {force=false}={}) {
    if (!card.open || typeof isManagementUser!=="function" || !isManagementUser()) return;
    const mount=$("[data-owner-order-detail]",card);
    if(!mount) return;
    const id=card.dataset.ownerOrder;
    if (!id || (loaded.get(id)==="loading" && !force)) return;
    if (!force && loaded.get(id)==="loaded") return;
    loaded.set(id,"loading");
    mount.innerHTML='<p class="management-order-loading">Загружаем данные заказа…</p>';
    try {
      const data=await apiRequest("/api/admin/orders/"+encodeURIComponent(id));
      if (!card.isConnected || !card.open || !isManagementUser()) return;
      mount.innerHTML=detailMarkup(data);
      loaded.set(id,"loaded");
    } catch (error) {
      loaded.delete(id);
      mount.innerHTML='<p class="owner-intake-alert">Не удалось загрузить заказ. Закройте и откройте карточку для повтора.</p>';
      console.warn("Owner order loading failed",error?.status || error?.message);
    }
  }

  const list=$("#adminOrderList");
  list?.addEventListener("toggle",event=>{
    const card=event.target;
    if(card instanceof HTMLDetailsElement && card.matches("[data-owner-order]") && card.open){
      loadOrder(card);
    }
  },true);

  list?.addEventListener("submit",async event=>{
    const form=event.target.closest(".owner-intake-form");
    if(!form) return;
    event.preventDefault();
    const card=form.closest("[data-owner-order]");
    if(!card || !isManagementUser()) return;
    const input=$('input[name="qty"]',form);
    const raw=String(input?.value ?? "");
    const quantity=Number(raw), prior=Number(form.dataset.prior);
    if(!/^\d+$/.test(raw) || !Number.isSafeInteger(quantity) || !input.checkValidity()){
      input.reportValidity();return;
    }
    if(quantity===prior) return;
    if(quantity<prior && !window.confirm("Уменьшить фактически принятое количество? Это сбросит подтверждение комплектации.")) return;
    const submit=$('button[type="submit"]',form);
    submit.disabled=true;
    try {
      await apiRequest("/api/admin/orders/"+encodeURIComponent(card.dataset.ownerOrder)+"/intake",{
        method:"POST",body:JSON.stringify({item_id:form.dataset.itemId,received_quantity:quantity})
      });
      loaded.delete(card.dataset.ownerOrder);
      await loadOrder(card,{force:true});
    } catch (error) {
      submit.disabled=false;
      alert("Не удалось сохранить приёмку. Попробуйте позже.");
      console.warn("Owner intake failed",error?.status||error?.message);
    }
  });

  list?.addEventListener("click",async event=>{
    const button=event.target.closest("[data-pack-order]");
    if(!button || button.disabled || !isManagementUser()) return;
    const card=button.closest("[data-owner-order]");
    if(!card) return;
    button.disabled=true;
    try{
      await apiRequest("/api/admin/orders/"+encodeURIComponent(card.dataset.ownerOrder)+"/pack",{
        method:"POST",body:JSON.stringify({})
      });
      loaded.delete(card.dataset.ownerOrder);
      await loadOrder(card,{force:true});
    }catch(error){
      button.disabled=false;
      const status=$(".owner-detail-status",card);
      if(status) status.textContent="Комплектация не подтверждена. Проверьте фактическую приёмку.";
      console.warn("Owner packing failed",error?.status||error?.message);
    }
  });
})();
