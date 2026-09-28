"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveSupplierCheckout,
  normalizeSupplierOrders,
  positionKey,
  internalItemStatusFromSupply,
  aggregateOrderStatusFromItems
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
  assert.equal(internalItemStatusFromSupply("canceled"), "cancelled");
  assert.equal(internalItemStatusFromSupply("delivery"), "processing");
  assert.equal(internalItemStatusFromSupply("orderPicking"), "processing");
  assert.equal(internalItemStatusFromSupply("finished"), "completed");
  assert.equal(internalItemStatusFromSupply(null, "Готов к выдаче"), "ready");
});

test("supplier item statuses roll up to a customer order status", () => {
  assert.equal(aggregateOrderStatusFromItems(["processing", "ready"], "new"), "processing");
  assert.equal(aggregateOrderStatusFromItems(["ready", "completed"], "processing"), "ready");
  assert.equal(aggregateOrderStatusFromItems(["completed", "completed"], "processing"), "completed");
  assert.equal(aggregateOrderStatusFromItems(["completed", "cancelled"], "processing"), "completed");
  assert.equal(aggregateOrderStatusFromItems(["cancelled", "cancelled"], "processing"), "cancelled");
  assert.equal(aggregateOrderStatusFromItems(["processing"], "completed"), "completed");
});
