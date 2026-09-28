"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveSupplierCheckout,
  normalizeSupplierOrders,
  positionKey,
  internalItemStatusFromSupply
} = require("../src/supplier-orders");

test("supplier checkout auto-selects unique options", () => {
  const result = resolveSupplierCheckout({
    paymentMethods: [{ id: 7, name: "Безнал" }],
    shipmentMethods: [{ id: 11, name: "Самовывоз" }],
    shipmentAddresses: [{ id: 99, name: "Не используется" }],
    shipmentOffices: [{ id: 3, name: "Склад" }]
  });

  assert.equal(result.paymentMethod, "7");
  assert.equal(result.shipmentMethod, "11");
  assert.equal(result.shipmentAddress, "0");
  assert.equal(result.shipmentOffice, "3");
  assert.equal(result.pickup, true);
});

test("supplier checkout refuses to guess among multiple payment methods", () => {
  assert.throws(
    () => resolveSupplierCheckout({
      paymentMethods: [{ id: 1 }, { id: 2 }],
      shipmentMethods: []
    }),
    (error) => error.code === "supplier_payment_method_selection_required"
  );
});

test("supplier order helpers normalize payloads and statuses", () => {
  assert.equal(normalizeSupplierOrders({ orders: { a: { number: 10 } } }).length, 1);
  assert.equal(positionKey("Patron", "PRS-3420"), "PATRON|PRS3420");
  assert.equal(internalItemStatusFromSupply("supOrderCanceled"), "cancelled");
  assert.equal(internalItemStatusFromSupply("delivery"), "processing");
});
