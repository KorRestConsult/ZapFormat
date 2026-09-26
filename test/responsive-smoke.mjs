import { chromium, webkit } from "playwright";

const browserName = process.env.BROWSER === "webkit" ? "webkit" : "chromium";
const browserType = browserName === "webkit" ? webkit : chromium;
const browser = await browserType.launch({ headless: true });
const allViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "ipad", width: 1024, height: 1366 },
  { name: "ipad-pro-11-portrait", width: 834, height: 1194 },
  { name: "ipad-pro-11-landscape", width: 1194, height: 834 },
  { name: "iphone", width: 390, height: 844 }
];
const viewports = process.env.MOBILE_ONLY === "1"
  ? allViewports.filter(x => ["ipad-pro-11-portrait", "iphone"].includes(x.name))
  : allViewports;

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll("body *")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 120),
          id: el.id || "",
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          text: String(el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 90)
        };
      })
      .filter((x) => x.right > clientWidth + 1 || x.left < -1)
      .sort((a,b) => b.right - a.right)
      .slice(0, 8);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth,
      bodyWidth: document.body.scrollWidth,
      offenders
    };
  });
  if (metrics.scrollWidth > metrics.clientWidth + 1 || metrics.bodyWidth > metrics.clientWidth + 1) {
    throw new Error(`${label} horizontal overflow: ${JSON.stringify(metrics)}`);
  }
}

async function assertDialogFits(page, selector, label) {
  const fits = await page.evaluate((sel) => {
    const d = document.querySelector(sel).getBoundingClientRect();
    return d.left >= -1 && d.right <= innerWidth + 1 && d.top >= -1 && d.bottom <= innerHeight + 1;
  }, selector);
  if (!fits) throw new Error(`${label} does not fit viewport`);
}

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);

    for (const screen of ["home", "catalogs", "garage", "orders", "cart", "checkout", "account", "operator"]) {
      await page.evaluate((name) => window.go(name, false), screen);
      await page.waitForTimeout(50);
      await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/${screen}/guest`);
    }

    await page.evaluate(() => {
      S.user = {
        id: "u1",
        name: "Илья",
        surname: "Коробицин",
        phone: "+79000000000",
        email: "test@example.com",
        created_at: "2026-09-01T10:00:00Z"
      };
      S.overview = { stats: { active_orders: 2, ready_orders: 1, vehicles: 2, active_returns: 1 } };
      S.notifications = { order_status: true, item_changes: true, returns: true, marketing: false };
      S.addresses = [{
        id: "a1", label: "Дом", city: "Рязань",
        address: "Очень длинное тестовое название улицы, дом 123, квартира 456",
        recipient_name: "Илья", recipient_phone: "+79000000000", is_default: true
      }];
    });
    await page.evaluate(() => window.renderAccount());
    await page.waitForTimeout(120);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/account/authenticated`);

    await page.evaluate(() => {
      S.offers = [
        {
          offer_ref: "offer1", brand: "PATRON", article: "PRS3420",
          description: "Длинное описание реальной автозапчасти для проверки плотной выдачи на маленьком экране",
          availability: 12, packing: 1, delivery_hours: 24, delivery_hours_max: 48,
          delivery_probability: 96, returnable: true, price: 5284.25
        },
        {
          offer_ref: "offer2", brand: "PATRON", article: "PRS3420",
          description: "Вариант поставки с кратностью упаковки",
          availability: 20, packing: 2, delivery_hours: 72, delivery_hours_max: 96,
          delivery_probability: 88, returnable: false, price: 4999
        }
      ];
      S.offerSort = "price";
      S.offerOnlyAvailable = false;
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="catalog"));
      renderOfferTable();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/catalog/offers`);

    await page.evaluate(() => {
      S.activeVehicle = { id: "v2", brand: "Ford", model: "Focus", generation: "II", year: 2006, engine: "1.8" };
      S.currentPartData = {
        part: { brand: "PATRON", article: "PRS3420", description: "Тестовая реальная карточка детали" },
        summary: {
          count: 2, available_count: 2, price_min: 4999, price_max: 5284.25,
          stock_total: 32, fastest_hours: 24, returnable_offers: 1,
          high_probability_offers: 1, balance_offer_ref: "offer1"
        },
        offers: [...S.offers],
        alternatives: [
          { brand: "BREMBO", article: "P24061", description: "Каталожный вариант", available: true },
          { brand: "TRW", article: "GDB0001", description: "Очень длинное описание другого варианта каталога для проверки мобильной ширины", available: true }
        ]
      };
      S.partOfferSort = "balance";
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="part"));
      renderPartDetail();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/part/detail`);

    await page.evaluate(() => {
      S.aiOriginalQuery = "передние колодки для моего Focus";
      S.aiResult = {
        ai: true,
        mode: "candidates",
        vehicle: { brand: "Ford", model: "Focus", generation: "II", year: "2006" },
        intent: {
          kind: "part_name",
          article: "",
          normalized_query: "передние тормозные колодки",
          part_name: "передние тормозные колодки",
          position: "передняя ось",
          search_terms: ["тормозные колодки", "колодки передние"],
          assistant_text: "Понял запрос. Совместимость подтверждаем только каталогом.",
          needs_article: true,
          confidence: 0.96
        }
      };
      S.aiCandidates = [
        { brand: "PATRON", article: "PRS3420", description: "Каталожная подсказка" },
        { brand: "BREMBO", article: "P24061", description: "Каталожная подсказка" }
      ];
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="catalog"));
      renderAiResult();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/catalog/ai`);

    await page.evaluate(() => {
      S.cart = [
        {
          id: "offer1", offer_ref: "offer1", brand: "PATRON", article: "PRS3420",
          description: "Актуальная позиция", qty: 2, packing: 1, availability: 12,
          delivery_hours: 24, price: 5284.25, checked_at: new Date().toISOString(), found: true
        },
        {
          id: "old1", brand: "SKF", article: "HK0810",
          description: "Позиция из старого заказа", qty: 1, historical: true, price: 1000
        }
      ];
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="cart"));
      renderCart();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/cart/mixed`);

    await page.evaluate(() => {
      S.cart = [{
        id: "offer1", offer_ref: "offer1", brand: "PATRON", article: "PRS3420",
        description: "Актуальная позиция", qty: 2, packing: 1, availability: 12,
        delivery_hours: 24, delivery_hours_max: 48, price: 5284.25,
        checked_at: new Date().toISOString(), found: true, returnable: true
      }];
      S.checkoutOptions = {
        customer: S.user,
        addresses: [{
          id: "a1", label: "Дом", city: "Рязань",
          address: "Очень длинное тестовое название улицы, дом 123, квартира 456",
          recipient_name: "Илья", recipient_phone: "+79000000000", is_default: true
        }],
        pickup_points: [],
        vehicles: [{
          id: "v2", brand: "Ford", model: "Focus", generation: "II", year: 2006,
          engine: "1.8", vin: "X9F5XXEED56R37916", is_default: true
        }],
        fulfillment_methods: [
          { code: "delivery", label: "Доставка", description: "Используйте сохранённый адрес.", ready: true },
          { code: "confirmation", label: "Согласовать получение", description: "Менеджер согласует способ получения.", ready: true }
        ],
        payment_methods: [
          { code: "after_confirmation", label: "После подтверждения", description: "Оплата после подтверждения.", online: false }
        ]
      };
      S.checkoutDraft = { fulfillment_method: "delivery", payment_method: "after_confirmation" };
      S.checkoutResult = null;
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="checkout"));
      renderCheckout();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/checkout/form`);

    await page.evaluate(() => {
      S.checkoutResult = {
        request_id: "Q-20260926-ABCDEF",
        verified_total: 10568.5,
        fulfillment_method: "delivery",
        payment_method: "after_confirmation"
      };
      renderCheckoutSuccess();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/checkout/success`);

    await page.evaluate(() => {
      S.vehicles = [
        {
          id: "v1", brand: "BMW", model: "X3", generation: "F25", year: 2010,
          engine: "2.0 Diesel N47", transmission: "АКПП", body_type: "SUV",
          tire_front: "245/50 R18", tire_rear: "245/50 R18", wheel_size: "8Jx18",
          oil_spec: "5W-30 · BMW LL-04", coolant_spec: "BMW HT-12",
          vin: "WBA00000000000001", plate_number: "А000АА62",
          current_mileage: 186420, is_default: true
        },
        {
          id: "v2", brand: "Ford", model: "Focus", generation: "II", year: 2006,
          engine: "1.8", transmission: "МКПП", body_type: "хэтчбек",
          tire_front: "205/55 R16", tire_rear: "205/55 R16", wheel_size: "6.5Jx16",
          oil_spec: "5W-30", coolant_spec: "Ford spec",
          vin: "X9F5XXEED56R37916", current_mileage: 210000, is_default: false
        }
      ];
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="garage"));
      renderGarage();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/garage/cards`);

    await page.evaluate(() => {
      S.activeVehicle = S.vehicles[1];
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="catalogs"));
      renderCatalogs();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/catalogs/vehicle`);

    await page.evaluate(() => {
      S.vehicleDetail = {
        vehicle: {
          id: "v1", brand: "BMW", model: "X3", generation: "F25", year: 2010,
          engine: "2.0 Diesel N47", transmission: "АКПП", body_type: "SUV",
          tire_front: "245/50 R18", tire_rear: "245/50 R18", wheel_size: "8Jx18",
          oil_spec: "5W-30 · BMW LL-04", coolant_spec: "BMW HT-12",
          vin: "WBA00000000000001", plate_number: "А000АА62",
          current_mileage: 186420, is_default: true, updated_at: "2026-09-26T10:00:00Z"
        },
        maintenance: [
          { id: "p1", title: "Масло двигателя + фильтр", next_service_mileage: 190000, next_service_at: "2027-01-15" }
        ],
        measurements: [
          { id: "m1", measurement_type: "Передние колодки", value: 6, unit: "мм", measured_at: "2026-09-20T10:00:00Z" }
        ],
        history: [
          { id: "h1", title: "Замена масла", service_date: "2026-05-20", mileage: 176000 }
        ],
        reminders: [
          { id: "r1", title: "Проверить тормозную жидкость", due_mileage: 190000, due_at: "2026-11-20", is_done: false }
        ]
      };
      renderVehicleDetail();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/garage/detail`);

    await page.evaluate(() => {
      S.quoteRequests = [{
        id: "Q-20260926-ABCDEF", status: "new", item_count: 2, quoted_total: 12000, created_at: "2026-09-26T10:00:00Z"
      }];
      S.vinRequests = [{
        id: "vr1", vehicle_id: "v2", vin: "X9F5XXEED56R37916",
        request_text: "Передние тормозные колодки среднего ценового сегмента",
        status: "in_progress", manager_note: "", created_at: "2026-09-26T11:00:00Z",
        brand: "Ford", model: "Focus", generation: "II", year: 2006, engine: "1.8"
      }];
      S.returns = [{
        id: "ret1", return_number: 1, quantity: 1, reason: "Не подошла деталь", status: "created",
        brand: "PATRON", article: "PRS3420", unit_price: 5284.25, order_number: 101, created_at: "2026-09-25T10:00:00Z"
      }];
      S.orders = [{
        id: "o1", order_number: 101, status: "ready", total_amount: 15284.25, item_count: 2, created_at: "2026-09-24T10:00:00Z"
      }];
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="orders"));
      renderOrders();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/orders/data`);

    await page.evaluate(() => {
      S.quoteDetail = {
        request: {
          id: "Q-20260926-ABCDEF", status: "in_progress", name: "Илья",
          recipient_name: "Илья Коробицин", recipient_phone: "+79000000000",
          fulfillment_method: "delivery", payment_method: "after_confirmation",
          manager_note: "Проверяем поставщика и срок.", created_at: "2026-09-26T10:00:00Z"
        },
        items: [{
          id: "qi1", brand: "PATRON", article: "PRS3420",
          description: "Передние тормозные колодки", quantity: 2,
          quoted_price: 5284.25, needs_confirmation: false
        }],
        history: [
          { id: 1, status: "new", actor_type: "customer", note: "Заявка создана.", created_at: "2026-09-26T10:00:00Z" },
          { id: 2, status: "in_progress", actor_type: "staff", note: "Проверяем поставщика и срок.", created_at: "2026-09-26T10:15:00Z" }
        ]
      };
      renderQuoteDetail();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/orders/quote-detail`);

    await page.evaluate(() => {
      S.vinDetail = {
        request: {
          id: "vr1", vin: "X9F5XXEED56R37916",
          request_text: "Передние тормозные колодки среднего ценового сегмента",
          status: "answered", manager_note: "Подобраны два подтверждённых артикула.",
          created_at: "2026-09-26T11:00:00Z",
          brand: "Ford", model: "Focus", generation: "II", year: 2006, engine: "1.8"
        },
        history: [
          { id: 1, status: "new", actor_type: "customer", note: "Запрос создан.", created_at: "2026-09-26T11:00:00Z" },
          { id: 2, status: "answered", actor_type: "staff", note: "Подобраны два подтверждённых артикула.", created_at: "2026-09-26T11:30:00Z" }
        ]
      };
      renderVinDetail();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/orders/vin-detail`);

    await page.evaluate(() => {
      S.returnDetail = {
        return: {
          id: "ret1", return_number: 7, quantity: 1, reason: "Не подошла деталь",
          comment: "Упаковка сохранена.", status: "in_progress",
          manager_note: "Проверяем условия возврата.", created_at: "2026-09-25T10:00:00Z",
          brand: "PATRON", article: "PRS3420", unit_price: 5284.25,
          order_id: "o1", order_number: 101
        },
        history: [
          { id: 1, status: "created", actor_type: "customer", note: "Запрос на возврат создан.", created_at: "2026-09-25T10:00:00Z" },
          { id: 2, status: "in_progress", actor_type: "staff", note: "Проверяем условия возврата.", created_at: "2026-09-25T10:20:00Z" }
        ]
      };
      renderReturnDetail();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/orders/return-detail`);

    await page.evaluate(() => {
      S.user.role = "admin";
      S.operatorOverview = {
        quotes: { new: 2, in_progress: 1, confirmed: 0 },
        vin: { new: 1, in_progress: 1, answered: 0 },
        returns: { created: 1, in_progress: 0, approved: 0 },
        orders: { active: 3, ready: 1 }
      };
      S.operatorPickupPoints = [{
        id: "pp1", code: "P-TEST0001", city: "Рязань",
        name: "ZapFormat · тестовая геометрия", address: "Очень длинное название улицы для проверки адаптивности, дом 123",
        is_active: true, created_at: "2026-09-26T12:00:00Z"
      }];
      S.operatorReadiness = {
        "Q-20260926-ABCDEF": {
          request_id: "Q-20260926-ABCDEF",
          write_enabled: false,
          confirmed: false,
          all_items_ready: false,
          can_submit: false,
          items: [
            { brand: "PATRON", article: "PRS3420", quantity: 2, found: true, write_ready: false, missing: ["item_key"] }
          ]
        }
      };
      S.operatorQueue = {
        quotes: [{
          id: "Q-20260926-ABCDEF", status: "new", fulfillment_method: "delivery",
          payment_method: "after_confirmation", verified_total: 10568.5,
          customer_comment: "Связаться вечером", manager_note: "",
          recipient_name: "Илья Коробицин", recipient_phone: "+79000000000",
          item_count: 2, created_at: "2026-09-26T12:00:00Z",
          brand: "Ford", model: "Focus", generation: "II", year: 2006
        }],
        vin: [{
          id: "vin1", status: "in_progress", request_text: "Передние тормозные колодки",
          manager_note: "", vin: "X9F5XXEED56R37916", created_at: "2026-09-26T12:10:00Z",
          brand: "Ford", model: "Focus", generation: "II", year: 2006,
          user_name: "Илья", user_phone: "+79000000000"
        }],
        returns: [{
          id: "ret1", return_number: 7, quantity: 1, reason: "Не подошла деталь",
          status: "created", manager_note: "", created_at: "2026-09-26T12:20:00Z",
          brand: "PATRON", article: "PRS3420", unit_price: 5284.25, order_number: 101,
          user_name: "Илья", user_phone: "+79000000000"
        }]
      };
      document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.dataset.page==="operator"));
      renderOperator();
    });
    await page.waitForTimeout(50);
    await assertNoHorizontalOverflow(page, `${browserName}/${viewport.name}/operator/data`);

    for (const dialog of [
      ["#authDialog", () => window.openAuth("login")],
      ["#vehicleDialog", () => window.openVehicleDialog()],
      ["#vinDialog", async () => {
        S.user = S.user || { id: "u1", name: "Илья", phone: "+79000000000" };
        S.vehicles = [{
          id: "v2", brand: "Ford", model: "Focus", generation: "II", year: 2006,
          engine: "1.8", vin: "X9F5XXEED56R37916", current_mileage: 210000, is_default: true
        }];
        S.activeVehicle = S.vehicles[0];
        await window.openVinRequest("передние тормозные колодки");
      }],
      ["#returnDialog", () => {
        S.orderDetail = { items: [{ id: "oi1", brand: "PATRON", article: "PRS3420", quantity: 2, unit_price: 5284.25 }] };
        window.openReturnDialog("oi1");
      }]
    ]) {
      await page.evaluate(dialog[1]);
      await page.waitForTimeout(30);
      await assertDialogFits(page, dialog[0], `${viewport.name} ${dialog[0]}`);
      await page.evaluate((sel) => document.querySelector(sel).close(), dialog[0]);
    }

    await page.close();
  }

  console.log("Responsive smoke passed:", viewports.map((v) => v.name).join(", "));
} finally {
  await browser.close();
}
