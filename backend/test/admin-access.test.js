"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isAdminRole } = require("../src/admin-access");

test("only exact privileged role values are accepted", () => {
  assert.equal(isAdminRole("owner"), true);
  assert.equal(isAdminRole("admin"), true);
  for (const role of ["customer", "guest", "staff", "Owner", "ADMIN", "", null, undefined, true, ["owner"], {role: "owner"}]) {
    assert.equal(isAdminRole(role), false);
  }
});

test("client-provided role hints do not confer admin access", () => {
  assert.equal(isAdminRole({role:"owner"}), false);
  assert.equal(isAdminRole("owner admin"), false);
});
