"use strict";

// Keep supplier logistics and physical stock confirmation separate.
function normalizedQuantity(value, ordered) {
  if (!Number.isInteger(value) || !Number.isInteger(ordered) || ordered < 1 ||
      value < 0 || value > ordered) {
    const error = new Error("invalid_received_quantity");
    error.code = "invalid_received_quantity";
    throw error;
  }
  return value;
}

function summarizeIntake(items) {
  const rows = Array.isArray(items) ? items : [];
  const total = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const received = rows.reduce((sum, row) => sum + Number(row.received_quantity || 0), 0);
  // Cancelled items require an explicit resolution; they are not silently "ready".
  const unresolved = rows.some(row => row.status === "cancelled");
  const ready = rows.length > 0 && !unresolved &&
    rows.every(row => Number(row.received_quantity || 0) === Number(row.quantity));
  return {
    total_quantity: total,
    received_quantity: received,
    missing_quantity: Math.max(0, total - received),
    ready_for_packaging: ready,
    intake_state: ready ? "received" : received > 0 ? "partial" : "awaiting"
  };
}

module.exports = { normalizedQuantity, summarizeIntake };
