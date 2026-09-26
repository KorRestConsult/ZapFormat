"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { safePublicUrl, publicPublicationConfig } = require("../src/server");

test("public legal links allow only http and https URLs", () => {
  assert.equal(safePublicUrl("https://example.com/privacy"), "https://example.com/privacy");
  assert.equal(safePublicUrl("http://example.com/terms"), "http://example.com/terms");
  assert.equal(safePublicUrl("javascript:alert(1)"), null);
  assert.equal(safePublicUrl("data:text/html,hello"), null);
  assert.equal(safePublicUrl("not a url"), null);
  assert.equal(safePublicUrl(""), null);
});

test("public publication config exposes only seller identity and safe policy links", () => {
  const config = publicPublicationConfig({
    SELLER_LEGAL_NAME: "  ООО ЗапФормат  ",
    PRIVACY_POLICY_URL: "https://example.com/privacy",
    TERMS_URL: "javascript:alert(1)",
    RETURNS_POLICY_URL: "https://example.com/returns",
    PARTGRADE_API_PASSWORD_MD5: "secret"
  });

  assert.deepEqual(config, {
    seller: { legal_name: "ООО ЗапФормат" },
    links: {
      privacy: "https://example.com/privacy",
      terms: null,
      returns: "https://example.com/returns"
    }
  });
  assert.equal(JSON.stringify(config).includes("secret"), false);
});
