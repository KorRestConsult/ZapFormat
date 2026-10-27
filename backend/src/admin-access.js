"use strict";

// Dedicated privileged view, never inferred from an email address or client flag.
function isAdminRole(role) {
  return role === "admin" || role === "owner";
}

module.exports = { isAdminRole };
