const test = require("node:test");
const assert = require("node:assert/strict");
const { selectFapiNodes, uniqueOemRows, analogCandidates } = require("../src/fapi-fitment");

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
