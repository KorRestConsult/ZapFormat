const test = require("node:test");
const assert = require("node:assert/strict");
const { selectFapiNodes, selectFapiModification, uniqueOemRows, catalogNodePartRows, analogCandidates } = require("../src/fapi-fitment");

test("selectFapiNodes prefers the requested part group", () => {
  const tree = [
    { i: 1, pi: 0, d: "Тормозная система" },
    { i: 2, pi: 1, d: "Тормозные колодки передние" },
    { i: 3, pi: 1, d: "Тормозные диски передние" }
  ];
  const result = selectFapiNodes(tree, {
    category: "brake_pad",
    axle: "front",
    side: "any",
    part_name: "передние тормозные колодки"
  }, "передние тормозные колодки");
  assert.equal(result[0].id, 2);
});

test("uniqueOemRows deduplicates normalized OEM numbers", () => {
  const rows = [
    { mfi: 10, mfd: "BMW", n: "34 11 6 864 060", ns: "34116864060", d: "Колодки" },
    { mfi: 10, mfd: "BMW", n: "34116864060", ns: "34116864060", d: "Колодки" }
  ];
  const result = uniqueOemRows(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].article_normalized, "34116864060");
});

test("analogCandidates maps cross links to manufacturer and product", () => {
  const response = {
    manufacturerList: { mf: [
      { i: 10, ds: "BMW" },
      { i: 20, ds: "ATE" }
    ] },
    productList: { p: [
      { mfi: 10, ns: "34116864060", n: "34 11 6 864 060", d: "Колодки BMW" },
      { mfi: 20, ns: "13046071932", n: "13.0460-7193.2", d: "Колодки ATE" }
    ] },
    analogList: { a: [
      { mfi: 10, ns: "34116864060", mfai: 20, nsa: "13046071932", rp: 5, rm: 0 }
    ] }
  };
  const result = analogCandidates(response, "34 11 6 864 060");
  assert.equal(result.length, 1);
  assert.equal(result[0].brand, "ATE");
  assert.equal(result[0].article, "13.0460-7193.2");
});


test("partial VIN resolves BMW F25 135 kW to xDrive20d modification", () => {
  const result = selectFapiModification({
    m: [
      {
        dbi: 33778,
        d: "xDrive 20 d",
        fd: "BMW X3 (F25) xDrive 20 d",
        cb: 1283284800000,
        ce: 1393617600000,
        engineType: "Дизель",
        engineCode: "N47 D20 C",
        power: "135",
        capacity: "2 l",
        driveType: "Привод на все колеса",
        bodyType: "SUV"
      },
      {
        dbi: 58611,
        d: "xDrive 20 d",
        fd: "BMW X3 (F25) xDrive 20 d",
        cb: 1283284800000,
        ce: 1501534800000,
        engineType: "Дизель",
        engineCode: "B47 D20 A",
        power: "120",
        capacity: "2 l",
        driveType: "Привод на все колеса",
        bodyType: "SUV"
      }
    ]
  }, {
    model_name: "X3 (F25)",
    engine_code: "N47N",
    power_kw: 135,
    production_date: "2010-12-10"
  });
  assert.equal(result.id, 33778);
  assert.equal(result.short_name, "xDrive 20 d");
  assert.equal(result.power_kw, 135);
});

test("catalogNodePartRows prefers original OEM numbers without a second paid call", async () => {
  const calls=[];
  const client={
    oem: async()=>{calls.push("oem");return [{mfd:"BMW",mfi:1,n:"11127807293",ns:"11127807293",d:"Головка цилиндра"}]},
    products:async()=>{calls.push("products");return []}
  };
  const result=await catalogNodePartRows(client,33778,100225);
  assert.equal(result.kind,"oem");
  assert.equal(result.items.length,1);
  assert.deepEqual(calls,["oem"]);
});

test("catalogNodePartRows checks aftermarket entries when OEM catalogue is empty",async()=>{
  const calls=[];
  const client={
    oem:async(mod,node)=>{calls.push(["oem",mod,node]);return []},
    products:async(mod,node)=>{calls.push(["products",mod,node]);return [
      {mfd:"ELRING",mfi:12,n:"123.456",ns:"123456",d:"Комплект прокладок"}
    ]}
  };
  const result=await catalogNodePartRows(client,33778,100224);
  assert.equal(result.kind,"aftermarket");
  assert.equal(result.items.length,1);
  assert.equal(result.items[0].brand,"ELRING");
  assert.deepEqual(calls.map(x=>x[0]),["oem","products"]);
});

test("catalogNodePartRows reports genuinely empty when both FAPI sources have no rows",async()=>{
  const client={oem:async()=>[],products:async()=>[]};
  const result=await catalogNodePartRows(client,33778,100404);
  assert.deepEqual(result,{kind:"empty",items:[]});
});


test("Missing power must not be scored as 0 kW when VIN is partial", () => {
  const candidate = {m: [{dbi: 501, d: "UNKNOWN", power: 0}]};
  const result = selectFapiModification(candidate, {
    confidence: "partial",
    model_name: "Unknown",
    power_kw: null,
    engine_code: null,
    production_date: null
  });
  assert.equal(result, null);
});
