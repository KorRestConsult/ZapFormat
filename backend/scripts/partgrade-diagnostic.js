"use strict";

require("dotenv").config();
const { createPartGradeClient, PartGradeError } = require("../src/partgrade");

const client = createPartGradeClient();

function safeError(label, error) {
  if (error instanceof PartGradeError) {
    console.log(label, {
      ok: false,
      code: error.code,
      http: error.status,
      upstreamCode: error.upstreamCode,
      upstreamMessage: error.upstreamMessage
    });
  } else {
    console.log(label, { ok: false, error: error?.message || String(error) });
  }
}

(async () => {
  console.log("PartGrade live diagnostic: credentials are read from server ENV and are never printed.");

  try {
    const info = await client.userInfo();
    console.log("user/info", { ok: true, keys: info && typeof info === "object" ? Object.keys(info).slice(0, 12) : [] });
  } catch (error) {
    safeError("user/info", error);
  }

  try {
    const brands = await client.searchBrands("PRS3420");
    console.log("search/brands", {
      ok: true,
      count: Array.isArray(brands) ? brands.length : 0,
      first: Array.isArray(brands) && brands[0] ? {
        brand: brands[0].brand,
        number: brands[0].number,
        availability: brands[0].availability
      } : null
    });
  } catch (error) {
    safeError("search/brands", error);
  }

  try {
    const offers = await client.searchArticles("PRS3420", "PATRON");
    console.log("search/articles", {
      ok: true,
      count: Array.isArray(offers) ? offers.length : 0,
      first: Array.isArray(offers) && offers[0] ? {
        brand: offers[0].brand,
        number: offers[0].number,
        price: offers[0].price,
        availability: offers[0].availability,
        deliveryPeriod: offers[0].deliveryPeriod
      } : null
    });
  } catch (error) {
    safeError("search/articles", error);
  }
})().catch((error) => {
  console.error("Diagnostic failed", error?.message || error);
  process.exit(1);
});
