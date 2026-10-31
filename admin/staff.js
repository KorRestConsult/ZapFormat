"use strict";
(() => {
  const names = {
    "courier.application": "Подал заявку курьера",
    "courier.approved": "Одобрил курьера",
    "courier.rejected": "Отклонил заявку",
    "courier.assigned": "Назначил доставку",
    "courier.accepted": "Принял заказ",
    "courier.picked_up": "Забрал заказ",
    "courier.delivered": "Передал заказ клиенту",
    "courier.problem": "Сообщил о проблеме",
    "courier.blocked": "Отключил доступ курьера"
  };
  const states = {
    assigned: "Назначен",
    accepted: "Принят",
    picked_up: "В пути",
    delivered: "Доставлен",
    problem: "Проблема",
    cancelled: "Снят"
  };
  const el = id => document.getElementById(id);
  const full = person => [person.name, person.surname].filter(Boolean).join(" ") || "Сотрудник";
  const formError = text => { if(el("authError")) el("authError").textContent=text; };
  const getError = error => {
    const m = { user_already_exists:"Такой номер уже зарегистрирован. Войдите с паролем и подайте заявку.",
      invalid_phone:"Нужен корректный российский номер.", invalid_credentials:"Неверный номер или пароль.",
      invalid_verification_code:"Код неверный.", verification_code_invalid:"Код неверный.",
      verification_expired:"Код устарел. Начните регистрацию заново.",
      otp_not_configured:"Проверка телефона временно недоступна.",
      application_already_pending:"Заявка уже передана владельцу.",
      verified_phone_required:"Необходимо подтвердить телефон.",
      application_not_pending:"Заявка уже обработана." };
    return m[error.message] || "Не удалось выполнить действие (" + error.message + ").";
  };

  function initRegistration({request,setToken,loggedIn}) {
    const toggle=el("courierRegisterToggle"), register=el("courierRegisterForm");
    const verify=el("courierVerifyForm"), login=el("loginForm");
    if(!toggle || !register || !verify || !login)return;
    let challenge="";
    toggle.addEventListener("click", () => {
      const show=register.hidden && verify.hidden;
      register.hidden=!show;verify.hidden=true;login.hidden=show;
      toggle.textContent=show?"Вернуться ко входу":"Подать заявку курьера";
      formError("");
    });
    register.addEventListener("submit",async event=>{
      event.preventDefault();
      const submit=el("courierRegisterSubmit");submit.disabled=true;formError("");
      try{
        const name=el("courierName").value.trim();
        const surname=el("courierSurname").value.trim();
        const phone=el("courierPhone").value.trim();
        const password=el("courierPassword").value;
        const password_confirmation=el("courierPasswordAgain").value;
        const data=await request("/api/auth/register/start",{method:"POST",body:{
          name,surname,phone,password,password_confirmation,customer_type:"individual"},token:""});
        if(!data.challenge_id)throw new Error("missing_verification");
        challenge=data.challenge_id;register.hidden=true;verify.hidden=false;
        el("courierVerificationHelp").textContent="Введите " +
          (data.verification_method==="call"?"последние 4 цифры номера входящего звонка":"6-значный код из SMS")+".";
      }catch(error){formError(getError(error));}
      finally{submit.disabled=false;}
    });
    verify.addEventListener("submit",async event=>{
      event.preventDefault();
      const submit=el("courierVerifySubmit");submit.disabled=true;formError("");
      try{
        const data=await request("/api/auth/register/verify",{method:"POST",body:{
          challenge_id:challenge,code:el("courierCode").value.trim()
        },token:""});
        if(!data.access_token)throw new Error("token_missing");
        setToken(data.access_token);
        await request("/api/staff/apply",{method:"POST",body:{}});
        register.hidden=true;verify.hidden=true;login.hidden=false;
        el("courierPassword").value="";el("courierPasswordAgain").value="";
        loggedIn(data.user);
      }catch(error){formError(getError(error));}
      finally{submit.disabled=false;}
    });
  }
  const label = v => states[v] || v || "—";
  const show = api => api.page;
  const wrapper = (title,html) => '<section class="panel"><div class="panel-head"><h2>'+apiEscape(title)+'</h2></div>'+html+'</section>';
  function apiEscape(text){return String(text??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function noteFor(action, details) {
    if(action==="courier.problem" && details?.note)return details.note;
    return "";
  }

  async function renderOwner(api) {
    const [data,available]=await Promise.all([
      api.request("/api/admin/staff/overview"),api.request("/api/admin/staff/assignable-orders")
    ]);
    const e=apiEscape,d=api.dateRu;
    const pending=data.applications||[],couriers=data.couriers||[],assignments=data.assignments||[],activity=data.activity||[];
    const availableCouriers=couriers.filter(x=>x.status==="active");
    let html='<div class="metrics">'+
      '<div class="metric"><div class="metric-label">На согласовании</div><div class="metric-value">'+pending.length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Активные курьеры</div><div class="metric-value">'+availableCouriers.length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Доставки в работе</div><div class="metric-value">'+assignments.filter(x=>!["delivered","cancelled"].includes(x.status)).length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Доставлено</div><div class="metric-value">'+assignments.filter(x=>x.status==="delivered").length+'</div></div></div>';
    html+='<section class="panel"><div class="panel-head"><h2>Заявки сотрудников</h2></div>';
    if(!pending.length)html+='<p class="muted">Новых заявок нет. Для регистрации сотрудник открывает эту админку и выбирает «Подать заявку курьера».</p>';
    pending.forEach(x=>{
      html+='<div class="staff-line"><div><b>'+e(full(x))+'</b><div class="muted">'+e(x.phone||x.email||"")+' · '+e(d(x.submitted_at))+'</div></div>'+
        '<div class="staff-actions"><button type="button" class="primary" data-staff-decision="approve" data-staff-id="'+e(x.id)+'">Одобрить</button>'+
        '<button type="button" class="secondary" data-staff-decision="reject" data-staff-id="'+e(x.id)+'">Отклонить</button></div></div>';
    });
    html+='</section>';
    html+='<section class="panel"><div class="panel-head"><h2>Назначить доставку</h2></div>'+
      '<p class="muted">Курьер получает только назначенный заказ. Смена статусов доставки не отправляет заказы поставщику и не завершает оплату.</p>'+
      '<form id="staffAssignForm" class="staff-assign"><label>Заказ<select id="staffOrder" required><option value="">Выберите заказ</option>'+
      (available.orders||[]).map(x=>'<option value="'+e(x.id)+'">ZF-'+e(x.order_number)+' · '+e(x.recipient_name||"Клиент")+' · '+e(x.status)+(x.delivery_status?' · '+e(label(x.delivery_status)):'')+'</option>').join("")+
      '</select></label><label>Курьер<select id="staffCourier" required><option value="">Выберите курьера</option>'+
      availableCouriers.map(x=>'<option value="'+e(x.id)+'">'+e(full(x))+'</option>').join("")+
      '</select></label><button class="primary" type="submit"'+(!availableCouriers.length?' disabled':'')+'>Назначить</button></form></section>';
    html+='<section class="panel"><div class="panel-head"><h2>Доставки</h2></div>';
    if(!assignments.length)html+='<p class="muted">Доставки пока не назначены.</p>';
    assignments.forEach(x=>{
      html+='<div class="staff-line"><div><b>ZF-'+e(x.order_number)+'</b> · '+e(x.recipient_name||"Клиент")+
        '<div class="muted">'+e([x.courier_name,x.courier_surname].filter(Boolean).join(" "))+' · '+e(label(x.status))+' · '+e(d(x.updated_at))+'</div></div></div>';
    });
    html+='</section><section class="panel"><div class="panel-head"><h2>Журнал действий</h2></div>';
    if(!activity.length)html+='<p class="muted">Пока нет событий сотрудников.</p>';
    activity.forEach(x=>{
      html+='<div class="staff-line"><div><b>'+e(names[x.action]||x.action)+'</b> · '+e(full(x))+
        (x.order_number?' · ZF-'+e(x.order_number):"")+
        (noteFor(x.action,x.details)?'<div class="muted">'+e(noteFor(x.action,x.details))+'</div>':"")+
        '<div class="muted">'+e(d(x.created_at))+'</div></div></div>';
    });
    html+='</section><section class="panel"><div class="panel-head"><h2>Сотрудники и доступ</h2></div>';
    if(!couriers.length)html+='<p class="muted">Активных и бывших курьеров пока нет.</p>';
    couriers.forEach(x=>{
      html+='<div class="staff-line"><div><b>'+e(full(x))+'</b><div class="muted">'+e(x.phone||"")+' · '+e(x.status==="active"?"Доступ активен":"Доступ заблокирован")+'</div></div>'+
        (x.status==="active"?'<button class="secondary" type="button" data-staff-block="'+e(x.id)+'">Заблокировать</button>':"")+'</div>';
    });
    html+='</section>';
    show(api).innerHTML=html;
    show(api).querySelectorAll("[data-staff-decision]").forEach(b=>b.addEventListener("click",async ()=>{
      const decision=b.dataset.staffDecision;
      if(!window.confirm(decision==="approve"?"Предоставить этому человеку доступ курьера?":"Отклонить заявку курьера?"))return;
      b.disabled=true;
      try{await api.request("/api/admin/staff/applications/"+b.dataset.staffId+"/decision",{method:"POST",body:{decision}});api.alert("Заявка обработана.","success");await api.openPage("staff");}
      catch(error){api.alert(getError(error),"error");b.disabled=false;}
    }));
    show(api).querySelectorAll("[data-staff-block]").forEach(b=>b.addEventListener("click",async()=>{
      if(!window.confirm("Заблокировать сотрудника, отключить его сеансы и снять незавершённые доставки?"))return;
      b.disabled=true;
      try{await api.request("/api/admin/staff/couriers/"+b.dataset.staffBlock+"/block",{method:"POST",body:{}});await api.openPage("staff");}
      catch(error){api.alert(getError(error),"error");b.disabled=false;}
    }));
    el("staffAssignForm").addEventListener("submit",async event=>{
      event.preventDefault();const button=event.target.querySelector("button");button.disabled=true;
      try{
        const order_id=el("staffOrder").value,courier_id=el("staffCourier").value;
        if(!window.confirm("Назначить заказ выбранному курьеру?"))return;
        await api.request("/api/admin/staff/assignments",{method:"POST",body:{order_id,courier_id}});
        await api.openPage("staff");
      }catch(error){api.alert(getError(error),"error");}
      finally{button.disabled=false;}
    });
  }

  async function renderCourier(api){
    const data=await api.request("/api/staff/courier/orders");
    const orders=data.orders||[],e=apiEscape,d=api.dateRu;
    let html='<div class="metrics">'+
      '<div class="metric"><div class="metric-label">Активные</div><div class="metric-value">'+orders.filter(x=>!["delivered","cancelled"].includes(x.delivery_status)).length+'</div></div>'+
      '<div class="metric"><div class="metric-label">Доставлено</div><div class="metric-value">'+orders.filter(x=>x.delivery_status==="delivered").length+'</div></div></div>';
    if(!orders.length)html+='<div class="panel"><div class="empty">Пока нет назначенных заказов. Как только владелец назначит доставку, она появится здесь.</div></div>';
    orders.forEach(x=>{
      const addr=[x.delivery_city,x.delivery_address].filter(Boolean).join(", ");
      const actions={assigned:[["accepted","Принял заказ"]],accepted:[["picked_up","Забрал заказ"]],picked_up:[["delivered","Доставил клиенту"]]};
      html+='<section class="panel"><div class="panel-head"><h2>Заказ ZF-'+e(x.order_number)+'</h2><span class="badge">'+e(label(x.delivery_status))+'</span></div>'+
        '<div class="staff-info"><div><span class="muted">Получатель</span><strong>'+e(x.recipient_name||"Клиент")+'</strong></div>'+
        '<div><span class="muted">Адрес доставки</span><strong>'+e(addr||"Адрес не указан")+'</strong></div>'+
        '<div><span class="muted">Контакт</span><strong>'+(x.recipient_phone?'<a href="tel:'+e(String(x.recipient_phone).replace(/[^0-9+]/g,""))+'">'+e(x.recipient_phone)+'</a>':"Не указан")+'</strong></div></div>'+
        '<div class="staff-positions">'+(x.items||[]).map(i=>'<div>'+e([i.brand,i.article].filter(Boolean).join(" "))+' × '+e(i.quantity)+(i.description?' <span class="muted">'+e(i.description)+'</span>':"")+'</div>').join("")+'</div>'+
        '<div class="staff-actions">'+(actions[x.delivery_status]||[]).map(a=>'<button class="primary" data-delivery-id="'+e(x.assignment_id)+'" data-delivery-status="'+e(a[0])+'">'+e(a[1])+'</button>').join("")+
        (!["delivered","problem","cancelled"].includes(x.delivery_status)?'<button class="secondary" data-delivery-id="'+e(x.assignment_id)+'" data-delivery-status="problem">Проблема</button>':"")+
        '</div><p class="muted">Назначено: '+e(d(x.assigned_at))+'</p></section>';
    });
    show(api).innerHTML=html;
    show(api).querySelectorAll("[data-delivery-id]").forEach(b=>b.addEventListener("click",async ()=>{
      const status=b.dataset.deliveryStatus;
      let note="";
      if(status==="problem"){note=window.prompt("Опишите проблему с доставкой для владельца:","")||"";if(!note.trim())return;}
      else if(!window.confirm("Подтвердить действие «"+(status==="delivered"?"Доставил клиенту":status==="picked_up"?"Забрал заказ":"Принял заказ")+"»?"))return;
      b.disabled=true;
      try{
        await api.request("/api/staff/courier/assignments/"+b.dataset.deliveryId+"/status",{method:"POST",body:{status,note}});
        await api.openPage("deliveries");
      }catch(error){api.alert(getError(error),"error");b.disabled=false;}
    }));
  }
  async function renderApplicant(api){
    const data=await api.request("/api/staff/application");
    const status=data.application?.status || null;
    const text=status==="pending"?"Ваша заявка курьера получена. Доступ к заказам появится только после одобрения владельца.":status==="approved"?"Заявка одобрена. Выйдите и войдите снова.":status==="rejected"?"Владелец отклонил заявку. Можно отправить новую.":"Аккаунт подтверждён. Для работы курьером необходимо подать заявку владельцу.";
    show(api).innerHTML='<section class="panel"><div class="panel-head"><h2>Работа в ZapFormat</h2></div><p>'+apiEscape(text)+'</p>'+
      (status==="pending"||status==="approved"?"":'<button type="button" class="primary" id="applyCourier">Подать заявку курьера</button>')+
      '<p class="muted">Наличие обычного аккаунта не даёт доступа к данным магазина.</p></section>';
    const button=el("applyCourier");if(button)button.addEventListener("click",async()=>{
      button.disabled=true;try{await api.request("/api/staff/apply",{method:"POST",body:{}});await api.openPage("apply");}
      catch(error){api.alert(getError(error),"error");button.disabled=false;}
    });
  }
  function appendStaffPreview(api,data){
    const target=api.page;
    if(!target)return;
    const pending=(data.applications||[]).length;
    const events=(data.activity||[]).slice(0,5);
    const e=apiEscape;
    const section=document.createElement("section");section.className="panel";section.dataset.staffPreview="1";
    section.innerHTML='<div class="panel-head"><h2>Сотрудники · оперативная лента</h2><button type="button" class="secondary" id="openStaffFromOverview">Управление</button></div>'+
      '<p class="muted">Заявок на согласование: <b>'+pending+'</b></p>'+
      (events.length?events.map(x=>'<div class="staff-line"><span>'+e(names[x.action]||x.action)+' · '+e(full(x))+
      (x.order_number?' · ZF-'+e(x.order_number):"")+'</span><span class="muted">'+e(api.dateRu(x.created_at))+'</span></div>').join(""):'<p class="muted">Действий сотрудников пока нет.</p>');
    const previous=target.querySelector("[data-staff-preview]");
    if(previous)previous.replaceWith(section);else target.append(section);
    section.querySelector("#openStaffFromOverview").addEventListener("click",()=>api.openPage("staff"));
  }
  window.ZapFormatStaffUI={initRegistration,renderOwner,renderCourier,renderApplicant,appendStaffPreview};
})();