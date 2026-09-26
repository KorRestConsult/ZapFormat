"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DEFAULT_MARKUP_PERCENT = "15";
process.env.MIN_MARKUP_RUB = "0";

const {
  normalizeSupplierRows,
  publicSearchTipCandidates,
  supplierOfferRef,
  publicSupplierOffer
} = require("../src/server");

test("supplier offer reference stays stable when commercial terms change", () => {
  const base = {
    brand: "PATRON",
    number: "PRS3420",
    supplierCode: "supplier-a",
    itemKey: "item-42",
    warehouse: "msk-1",
    packing: 1,
    price: 4595,
    deliveryPeriod: 24,
    deliveryPeriodMax: 48
  };
  const changed = {
    ...base,
    price: 4870,
    deliveryPeriod: 72,
    deliveryPeriodMax: 96
  };
  assert.equal(supplierOfferRef(base), supplierOfferRef(changed));
});

test("public supplier offer contains only customer-facing commercial data", () => {
  const row = {
    brand: "PATRON",
    number: "PRS3420",
    supplierCode: "secret-route",
    itemKey: "secret-item",
    warehouse: "internal-warehouse",
    price: 4595,
    purchase_price: 4595,
    deliveryPeriod: 24,
    deliveryPeriodMax: 48,
    availability: 3,
    description: "Test part"
  };
  const offer = publicSupplierOffer(row, {});
  assert.equal(offer.price, 5284.25);
  assert.equal(offer.brand, "PATRON");
  assert.equal(offer.article, "PRS3420");
  assert.equal(offer.availability, 3);
  for (const forbidden of ["purchase_price", "supplierCode", "itemKey", "warehouse", "userpsw", "password"]) {
    assert.equal(Object.hasOwn(offer, forbidden), false);
  }
  assert.match(offer.offer_ref, /^[a-f0-9]{24}$/);
});

test("supplier row normalizer preserves object-shaped ABCP results", () => {
  const result = normalizeSupplierRows({
    first: { brand: "PATRON" },
    second: { brand: "SKF" }
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((x) => x.brand), ["PATRON", "SKF"]);
});


test("search tips expose only public catalog fields and deduplicate brand/article", () => {
  const rows = publicSearchTipCandidates([
    {
      brand: "PATRON",
      number: "PRS3420",
      description: "Brake pads",
      supplierCode: "secret-supplier",
      itemKey: "secret-key",
      price: 4595
    },
    {
      brand: "patron",
      number: "prs3420",
      description: "Duplicate",
      supplierCode: "different-secret"
    },
    {
      brand: "BREMBO",
      code: "P24061",
      description: "Alternative"
    }
  ]);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    brand: "PATRON",
    article: "PRS3420",
    description: "Brake pads"
  });
  assert.deepEqual(rows[1], {
    brand: "BREMBO",
    article: "P24061",
    description: "Alternative"
  });
  assert.equal(JSON.stringify(rows).includes("secret"), false);
});
