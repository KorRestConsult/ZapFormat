"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveVehicleCatalog,
  selectVerifiedArticles
} = require("../src/vehicle-catalog");

function fakeClient() {
  return {
    async carbaseManufacturers() {
      return [
        { id: 10, name: "FORD" },
        { id: 20, name: "BMW" }
      ];
    },
    async carbaseModels(id) {
      assert.equal(String(id), "10");
      return {
        Focus: [
          { id: 101, name: "Focus II", groupName: "Focus", yearFrom: "2004", yearTo: "2011" }
        ]
      };
    },
    async carbaseModifications(id) {
      assert.equal(String(id), "101");
      return {
        id: 101,
        model: "Focus",
        modifications: [
          {
            id: 1001,
            modificationName: "1.8 16V",
            yearFrom: "2005",
            yearTo: "2010",
            fuelType: "Бензин",
            cylinderCapacityCcm: 1798,
            motorCodes: "QQDB"
          },
          {
            id: 1002,
            modificationName: "2.0 16V",
            yearFrom: "2005",
            yearTo: "2010",
            fuelType: "Бензин",
            cylinderCapacityCcm: 1999,
            motorCodes: "AODA"
          }
        ]
      };
    },
    async carbaseModificationInfo(id) {
      assert.equal(String(id), "1001");
      return {
        modification: {
          id: 1001,
          manufacturerId: 10,
          manufacturerName: "FORD",
          modelId: 101,
          modelName: "Focus",
          modificationName: "1.8 16V"
        },
        articles: [
          {
            brandName: "ATE",
            brandNumber: "13.0460-7193.2",
            goodsGroupCode: "brake_pad",
            goodsGroupName: "Тормозные колодки",
            description: "Колодки тормозные передние",
            fitAxle: "Передняя ось"
          },
          {
            brandName: "ATE",
            brandNumber: "13.0460-7194.2",
            goodsGroupCode: "brake_pad",
            goodsGroupName: "Тормозные колодки",
            description: "Колодки тормозные задние",
            fitAxle: "Задняя ось"
          }
        ]
      };
    }
  };
}

test("vehicle catalog resolves a modification conservatively from saved vehicle facts", async () => {
  const result = await resolveVehicleCatalog(fakeClient(), {
    brand: "Ford",
    model: "Focus",
    generation: "II",
    year: 2006,
    engine: "1.8 бензин QQDB"
  });
  assert.equal(result.status, "resolved");
  assert.equal(result.modification.id, "1001");
});

test("verified article selection enforces requested axle and uses only catalog articles", async () => {
  const resolved = await resolveVehicleCatalog(fakeClient(), {
    brand: "Ford",
    model: "Focus",
    generation: "II",
    year: 2006,
    engine: "1.8 бензин QQDB"
  });
  const articles = selectVerifiedArticles(
    resolved.info,
    {
      category: "brake_pad",
      goods_group_hints: ["brake_pad"],
      part_name: "тормозные колодки",
      axle: "front"
    },
    "передние тормозные колодки"
  );
  assert.equal(articles.length, 1);
  assert.equal(articles[0].article, "13.0460-7193.2");
  assert.equal(articles[0].fit_axle, "Передняя ось");
});

test("vehicle catalog does not guess between ambiguous modifications", async () => {
  const client = fakeClient();
  client.carbaseModifications = async () => ({
    id: 101,
    model: "Focus",
    modifications: [
      { id: 1001, modificationName: "1.8 16V", yearFrom: "2005", yearTo: "2010", fuelType: "Бензин" },
      { id: 1002, modificationName: "1.8 16V Flex", yearFrom: "2005", yearTo: "2010", fuelType: "Бензин" }
    ]
  });
  client.carbaseModificationInfo = async () => {
    throw new Error("must not resolve ambiguous modification");
  };

  const result = await resolveVehicleCatalog(client, {
    brand: "Ford",
    model: "Focus",
    generation: "II",
    year: 2006,
    engine: ""
  });
  assert.equal(result.status, "modification_ambiguous");
  assert.equal(result.candidates.length, 2);
});
