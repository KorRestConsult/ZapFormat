"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { qualifyReferralForCompletedOrder } = require("../src/server");

test("qualified referrals are not rewarded retroactively on a later completed order", async () => {
  const oldEnabled = process.env.REFERRAL_REWARDS_ENABLED;
  const oldPoints = process.env.REFERRAL_REWARD_POINTS;
  process.env.REFERRAL_REWARDS_ENABLED = "true";
  process.env.REFERRAL_REWARD_POINTS = "100";
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM referral_attributions")) {
        return { rows: [{ id: "r1", referrer_user_id: "u-ref", status: "qualified" }], rowCount: 1 };
      }
      throw new Error("unexpected query");
    }
  };

  try {
    const result = await qualifyReferralForCompletedOrder(db, "u-new", "order-2");
    assert.deepEqual(result, { qualified: true, rewarded: false });
    assert.equal(calls.length, 1);
    assert.equal(calls.some(x => x.sql.includes("loyalty_ledger")), false);
  } finally {
    if (oldEnabled === undefined) delete process.env.REFERRAL_REWARDS_ENABLED;
    else process.env.REFERRAL_REWARDS_ENABLED = oldEnabled;
    if (oldPoints === undefined) delete process.env.REFERRAL_REWARD_POINTS;
    else process.env.REFERRAL_REWARD_POINTS = oldPoints;
  }
});

test("first completed order qualifies a registered referral without issuing disabled rewards", async () => {
  const oldEnabled = process.env.REFERRAL_REWARDS_ENABLED;
  const oldPoints = process.env.REFERRAL_REWARD_POINTS;
  process.env.REFERRAL_REWARDS_ENABLED = "false";
  process.env.REFERRAL_REWARD_POINTS = "100";
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM referral_attributions")) {
        return { rows: [{ id: "r1", referrer_user_id: "u-ref", status: "registered" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }
  };

  try {
    const result = await qualifyReferralForCompletedOrder(db, "u-new", "order-1");
    assert.deepEqual(result, { qualified: true, rewarded: false });
    assert.equal(calls.some(x => x.sql.includes("SET status = 'qualified'")), true);
    assert.equal(calls.some(x => x.sql.includes("INSERT INTO notifications")), true);
    assert.equal(calls.some(x => x.sql.includes("INSERT INTO loyalty_ledger")), false);
  } finally {
    if (oldEnabled === undefined) delete process.env.REFERRAL_REWARDS_ENABLED;
    else process.env.REFERRAL_REWARDS_ENABLED = oldEnabled;
    if (oldPoints === undefined) delete process.env.REFERRAL_REWARD_POINTS;
    else process.env.REFERRAL_REWARD_POINTS = oldPoints;
  }
});
