"use strict";
(async () => {
  if (!new URLSearchParams(location.search).has("prelaunch_reset")) return;
  const token = localStorage.getItem("zapformat-admin-access-token");
  if (!token) return;
  const api = async (path, options={}) => {
    const response = await fetch("https://api.zapformat.ru"+path, {
      method: options.method || "GET", credentials: "include",
      headers: {Authorization:"Bearer "+token,Accept:"application/json",
        ...(options.body?{"Content-Type":"application/json"}:{})},
      ...(options.body?{body:JSON.stringify(options.body)}:{})
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || "http_"+response.status);
    return data;
  };
  const me = await api("/api/auth/me");
  if (me.user?.role !== "owner") return;
  const initial = await api("/api/admin/customers?limit=5");
  const users = initial.customers || [];
  if (users.length !== 1 || Number(users[0].orders_count) !== 8) return;
  const customer = users[0];
  const target = document.getElementById("page");
  if(!target || document.getElementById("prelaunchOneShot")) return;
  const section = document.createElement("section");
  section.id="prelaunchOneShot";
  section.className="panel";
  const head = document.createElement("h2");
  head.textContent="Сброс тестовой регистрации";
  const button=document.createElement("button");
  button.id="prelaunchOneShotButton";
  button.type="button"; button.className="secondary";
  button.textContent="Удалить тестовый профиль и 8 заказов";
  const state=document.createElement("p");
  state.setAttribute("role","status");
  section.append(head,button,state);
  target.prepend(section);
  button.addEventListener("click",async () => {
    button.disabled=true;
    state.textContent="Сверяем заказы и очищаем тестовые данные…";
    try {
      const result = await api("/api/admin/maintenance/reset-test-customer",{
        method:"POST",body:{phone:customer.phone,confirmation:"RESET_PRELAUNCH_CUSTOMER"}
      });
      const checks=await Promise.all([
        api("/api/admin/customers?limit=5"),
        api("/api/admin/orders?limit=12")
      ]);
      const customerRemaining=(checks[0].customers||[]).some(x=>x.id===customer.id);
      const ordersRemaining=(checks[1].orders||[]).filter(x=>x.recipient_phone===customer.phone).length;
      state.textContent = result.ok && !customerRemaining && ordersRemaining===0
        ? "ОЧИЩЕНО. Профиль удалён, заказов удалено: "+result.orders_deleted+". Список клиентов и тестовая история проверены."
        : "Операция выполнена, но контрольная проверка требует внимания.";
      if(result.ok && !customerRemaining && ordersRemaining===0){
        button.textContent="Тестовые данные удалены";button.disabled=true;
      } else { button.disabled=false; }
    } catch(error) {
      button.disabled=false;
      state.textContent="Сброс не выполнен: "+String(error.message||"ошибка");
    }
  });
})().catch(e=>{const e1=document.getElementById("prelaunchOneShot");if(e1){const p=e1.querySelector('[role=status]');if(p)p.textContent="Подключение: "+String(e.message||"ошибка")}})
