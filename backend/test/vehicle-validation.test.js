"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { validVehicleYear, validMileage } = require("../src/server");

test("vehicle year accepts realistic values and rejects invalid ranges", () => {
  const nextYear = new Date().getFullYear() + 1;
  assert.equal(validVehicleYear(2006), true);
  assert.equal(validVehicleYear(nextYear), true);
  assert.equal(validVehicleYear(1949), false);
  assert.equal(validVehicleYear(nextYear + 1), false);
  assert.equal(validVehicleYear("not-a-year"), false);
  assert.equal(validVehicleYear(null), true);
});

test("vehicle mileage must be a non-negative integer", () => {
  assert.equal(validMileage(0), true);
  assert.equal(validMileage(210000), true);
  assert.equal(validMileage(-1), false);
  assert.equal(validMileage(1.5), false);
  assert.equal(validMileage(10000001), false);
  assert.equal(validMileage(null), true);
});
