"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  checkoutPaymentMethods,
  checkoutFulfillmentMethods
} = require("../src/server");

test("checkout never advertises fake online payment", () => {
  assert.deepEqual(checkoutPaymentMethods(), [{
    code: "after_confirmation",
    label: "После подтверждения",
    description: "Сначала ZapFormat повторно проверяет цену и наличие. Оплата подключается после подтверждения заявки.",
    online: false
  }]);
});

test("checkout exposes pickup only when real pickup points exist", () => {
  const none = checkoutFulfillmentMethods({ hasAddresses: true, hasPickupPoints: false });
  assert.equal(none.some(x => x.code === "pickup"), false);

  const withPickup = checkoutFulfillmentMethods({ hasAddresses: true, hasPickupPoints: true });
  assert.equal(withPickup.some(x => x.code === "pickup" && x.ready === true), true);
});

test("delivery readiness reflects saved customer addresses", () => {
  const without = checkoutFulfillmentMethods({ hasAddresses: false, hasPickupPoints: false });
  assert.equal(without.find(x => x.code === "delivery").ready, false);
  assert.equal(without.find(x => x.code === "confirmation").ready, true);

  const withAddress = checkoutFulfillmentMethods({ hasAddresses: true, hasPickupPoints: false });
  assert.equal(withAddress.find(x => x.code === "delivery").ready, true);
});
