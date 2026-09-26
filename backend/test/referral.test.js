"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeReferralCode } = require("../src/server");

test("referral code normalization is strict and case-insensitive", () => {
  assert.equal(normalizeReferralCode(" ab-cd 234 "), "ABCD234");
  assert.equal(normalizeReferralCode("qwerty99"), "QWERTY99");
  assert.equal(normalizeReferralCode("12345"), null);
  assert.equal(normalizeReferralCode(""), null);
  assert.equal(normalizeReferralCode("abcdefghijklmnopq"), "ABCDEFGHIJKLMNOP");
});
