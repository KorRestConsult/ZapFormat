"use strict";

const crypto = require("node:crypto");

const ISSUER = "https://token.actions.githubusercontent.com";
const OPENID_URL = ISSUER + "/.well-known/openid-configuration";
const AUDIENCE = "zapformat-deploy";
const REPOSITORY = "KorRestConsult/ZapFormat";
const REF = "refs/heads/main";

let cache = { expiresAt: 0, jwksUri: null, keys: [] };

function decodeJson(value) {
  return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
}

async function loadKeys() {
  const now = Date.now();
  if (cache.expiresAt > now && cache.keys.length) return cache;

  const discoveryResponse = await fetch(OPENID_URL, { headers: { Accept: "application/json" } });
  if (!discoveryResponse.ok) throw new Error("github_oidc_discovery_failed");
  const discovery = await discoveryResponse.json();
  if (discovery.issuer !== ISSUER || !discovery.jwks_uri) {
    throw new Error("github_oidc_discovery_invalid");
  }

  const jwksResponse = await fetch(discovery.jwks_uri, { headers: { Accept: "application/json" } });
  if (!jwksResponse.ok) throw new Error("github_oidc_jwks_failed");
  const jwks = await jwksResponse.json();
  const keys = Array.isArray(jwks.keys) ? jwks.keys : [];
  if (!keys.length) throw new Error("github_oidc_jwks_empty");

  cache = {
    expiresAt: now + 60 * 60 * 1000,
    jwksUri: discovery.jwks_uri,
    keys
  };
  return cache;
}

function audienceMatches(aud, expectedAudience = AUDIENCE) {
  if (Array.isArray(aud)) return aud.includes(expectedAudience);
  return aud === expectedAudience;
}

async function verifyGitHubActionsToken(token, options = {}) {
  const expectedAudience = String(options.audience || AUDIENCE);
  const expectedRef = String(options.ref || REF);
  const expectedEventName = String(options.eventName || "push");
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("invalid_token");

  const header = decodeJson(parts[0]);
  const payload = decodeJson(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("invalid_token_header");

  let keySet = await loadKeys();
  let jwk = keySet.keys.find((item) => item.kid === header.kid);
  if (!jwk) {
    cache.expiresAt = 0;
    keySet = await loadKeys();
    jwk = keySet.keys.find((item) => item.kid === header.kid);
  }
  if (!jwk) throw new Error("signing_key_not_found");

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const verified = crypto.verify(
    "RSA-SHA256",
    Buffer.from(parts[0] + "." + parts[1]),
    publicKey,
    Buffer.from(parts[2], "base64url")
  );
  if (!verified) throw new Error("invalid_token_signature");

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== ISSUER) throw new Error("invalid_token_issuer");
  if (!audienceMatches(payload.aud, expectedAudience)) throw new Error("invalid_token_audience");
  if (!Number.isFinite(payload.exp) || payload.exp < now - 30) throw new Error("token_expired");
  if (Number.isFinite(payload.nbf) && payload.nbf > now + 30) throw new Error("token_not_yet_valid");
  if (payload.repository !== REPOSITORY) throw new Error("invalid_repository");
  if (payload.ref !== expectedRef) throw new Error("invalid_ref");
  if (payload.event_name !== expectedEventName) throw new Error("invalid_event");
  if (!/^[a-f0-9]{40}$/.test(String(payload.sha || ""))) throw new Error("invalid_sha");

  return payload;
}

module.exports = {
  verifyGitHubActionsToken,
  DEPLOY_AUDIENCE: AUDIENCE,
  DEPLOY_REPOSITORY: REPOSITORY,
  DEPLOY_REF: REF
};
