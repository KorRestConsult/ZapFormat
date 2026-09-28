"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createOfferTokenCodec } = require("../src/offer-token");

test("offer token encrypts supplier identity and round-trips", () => {
  const codec = createOfferTokenCodec({ secret: "test-secret" });
  const payload = {
    v: 1,
    qn: "PRS3420",
    qb: "PATRON",
    n: "61250",
    b: "OSSCA",
    s: "supplier-42",
    k: "item-99"
  };

  const token = codec.seal(payload);
  assert.match(token, /^v1\./);
  assert.equal(token.includes("supplier-42"), false);
  assert.equal(token.includes("item-99"), false);
  assert.deepEqual(codec.open(token), payload);
});

test("offer token rejects tampering", () => {
  const codec = createOfferTokenCodec({ secret: "test-secret" });
  const token = codec.seal({
    v: 1,
    qn: "PRS3420",
    qb: "PATRON",
    n: "PRS3420",
    b: "PATRON",
    s: "supplier",
    k: "item"
  });

  const parts = token.split(".");
  const tag = Buffer.from(parts[2], "base64url");
  tag[0] ^= 0x01;
  parts[2] = tag.toString("base64url");
  const tampered = parts.join(".");

  assert.throws(() => codec.open(tampered), /Invalid offer token/);
});
