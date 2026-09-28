"use strict";

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.list)) return value.list;
  return Object.values(value).filter((item) => item && typeof item === "object");
}

function rowId(row) {
  const value = row?.id ?? row?.value ?? row?.code ?? null;
  return value === null || value === undefined || value === "" ? null : String(value);
}

function pickSingle(rows, override, code) {
  if (override !== undefined && override !== null && String(override).trim() !== "") {
    return String(override).trim();
  }

  const ids = asArray(rows).map(rowId).filter(Boolean);
  if (ids.length === 0) return null;
  if (ids.length === 1) return ids[0];

  const error = new Error(code);
  error.code = code;
  error.optionsCount = ids.length;
  throw error;
}

function isPickupMethod(row) {
  const text = [row?.name, row?.type, row?.title, row?.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /самовывоз|pickup/.test(text);
}

function resolveSupplierCheckout(input = {}) {
  const paymentMethods = asArray(input.paymentMethods);
  const shipmentMethods = asArray(input.shipmentMethods);
  const shipmentAddresses = asArray(input.shipmentAddresses);
  const shipmentOffices = asArray(input.shipmentOffices);
  const overrides = input.overrides || {};

  const paymentMethod = pickSingle(
    paymentMethods,
    overrides.paymentMethodId,
    "supplier_payment_method_selection_required"
  );
  const shipmentMethod = pickSingle(
    shipmentMethods,
    overrides.shipmentMethodId,
    "supplier_shipment_method_selection_required"
  );

  const shipmentRow = shipmentMethods.find((row) => rowId(row) === shipmentMethod) || null;
  const pickup = shipmentRow ? isPickupMethod(shipmentRow) : false;

  let shipmentAddress = null;
  if (
    overrides.shipmentAddressId !== undefined &&
    overrides.shipmentAddressId !== null &&
    String(overrides.shipmentAddressId).trim() !== ""
  ) {
    shipmentAddress = String(overrides.shipmentAddressId).trim();
  } else if (pickup) {
    shipmentAddress = "0";
  } else {
    shipmentAddress = pickSingle(
      shipmentAddresses,
      null,
      "supplier_shipment_address_selection_required"
    );
  }

  let shipmentOffice = null;
  if (pickup) {
    shipmentOffice = pickSingle(
      shipmentOffices,
      overrides.shipmentOfficeId,
      "supplier_shipment_office_selection_required"
    );
  } else if (
    overrides.shipmentOfficeId !== undefined &&
    overrides.shipmentOfficeId !== null &&
    String(overrides.shipmentOfficeId).trim() !== ""
  ) {
    shipmentOffice = String(overrides.shipmentOfficeId).trim();
  }

  return {
    paymentMethod,
    shipmentMethod,
    shipmentAddress,
    shipmentOffice,
    pickup
  };
}

function normalizeSupplierOrders(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.orders)) return payload.orders;
  if (payload.orders && typeof payload.orders === "object") {
    return Object.values(payload.orders).filter((item) => item && typeof item === "object");
  }
  if (Array.isArray(payload.list)) return payload.list;
  return [];
}

function supplierOrderNumber(order) {
  const value = order?.number ?? order?.orderNumber ?? order?.id ?? null;
  return value === null || value === undefined || value === "" ? null : String(value);
}

function supplierOrderStatus(order) {
  const value = order?.status ?? order?.statusName ?? null;
  return value === null || value === undefined || value === "" ? null : String(value);
}

function supplierOrderStatusCode(order) {
  const value = order?.statusCode ?? order?.status_code ?? null;
  return value === null || value === undefined || value === "" ? null : String(value);
}

function supplierOrderPositions(order) {
  return asArray(order?.positions ?? order?.items ?? []);
}

function supplierPositionStatus(position) {
  const value = position?.status ?? position?.statusName ?? null;
  return value === null || value === undefined || value === "" ? null : String(value);
}

function supplierPositionStatusCode(position) {
  const value = position?.statusCode ?? position?.status_code ?? null;
  return value === null || value === undefined || value === "" ? null : String(value);
}

function positionKey(brand, article) {
  const b = String(brand || "").trim().toUpperCase().replace(/\s+/g, "");
  const a = String(article || "").trim().toUpperCase().replace(/[^A-ZА-Я0-9]/gi, "");
  return b + "|" + a;
}

function internalItemStatusFromSupply(statusCode, statusName) {
  const value = String(statusCode || statusName || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (!value) return "processing";
  if (/cancel|canceled|cancelled|reject|отмен|аннулир|supordercanceled/.test(value)) {
    return "cancelled";
  }
  if (/finished|complete|completed|delivered|issued|выдан|заверш/.test(value)) {
    return "completed";
  }
  if (/ready|готов|pickupready|availableforpickup/.test(value)) {
    return "ready";
  }
  return "processing";
}

function aggregateOrderStatusFromItems(statuses, currentStatus = "") {
  const current = String(currentStatus || "").trim().toLowerCase();
  if (["completed", "cancelled"].includes(current)) return current;

  const values = (Array.isArray(statuses) ? statuses : [])
    .map((status) => String(status || "").trim().toLowerCase())
    .filter(Boolean);

  if (!values.length) return current || "processing";

  const active = values.filter((status) => status !== "cancelled");
  if (!active.length) return "cancelled";
  if (active.every((status) => status === "completed")) return "completed";
  if (active.every((status) => status === "ready" || status === "completed")) return "ready";
  return "processing";
}

module.exports = {
  asArray,
  resolveSupplierCheckout,
  normalizeSupplierOrders,
  supplierOrderNumber,
  supplierOrderStatus,
  supplierOrderStatusCode,
  supplierOrderPositions,
  supplierPositionStatus,
  supplierPositionStatusCode,
  positionKey,
  internalItemStatusFromSupply,
  aggregateOrderStatusFromItems
};
