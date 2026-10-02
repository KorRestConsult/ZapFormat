const test = require("node:test");
const assert = require("node:assert/strict");
const { selectFapiNodes, selectFapiModification, uniqueOemRows, analogCandidates } = require("../src/fapi-fitment");

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
