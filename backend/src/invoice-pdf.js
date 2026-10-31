"use strict";

const fs = require("node:fs");
const PDFDocument = require("pdfkit");

const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf"
];
const FONT_BOLD_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
];

function firstExisting(candidates) {
  return candidates.find((file) => {
    try { return fs.existsSync(file); } catch { return false; }
  }) || null;
}
function rub(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(value || 0)) + " ₽";
}
function clean(value, fallback = "—") {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  return text || fallback;
}
function orderDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(date);
}

function createOrderInvoicePdf({ order, items = [], supplierOrders = [], test = false }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 36,
      info: {
        Title: "ZapFormat — заказ-накладная ZF-" + clean(order?.order_number || order?.id),
        Author: "ZapFormat"
      }
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const regular = firstExisting(FONT_CANDIDATES);
    const bold = firstExisting(FONT_BOLD_CANDIDATES) || regular;
    if (regular) doc.registerFont("ZF", regular);
    if (bold) doc.registerFont("ZF-Bold", bold);
    const font = regular ? "ZF" : "Helvetica";
    const fontBold = bold ? "ZF-Bold" : "Helvetica-Bold";

    const orange = "#FF8200";
    const ink = "#172434";
    const muted = "#66717F";
    const line = "#D9DEE5";
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const x = doc.page.margins.left;
    let y = 36;

    doc.fillColor(orange).rect(x, y, 9, 44).fill();
    doc.fillColor(ink).font(fontBold).fontSize(24).text("ZapFormat", x + 18, y + 1, { width: 220 });
    doc.fillColor(muted).font(font).fontSize(9).text(test ? "ТЕСТОВЫЙ ДОКУМЕНТ" : "ЗАКАЗ-НАКЛАДНАЯ", x + 18, y + 31, { characterSpacing: 0.8 });

    const orderNo = "ZF-" + clean(order?.order_number || order?.id);
    doc.fillColor(ink).font(fontBold).fontSize(13).text(orderNo, x + pageWidth - 180, y + 2, { width: 180, align: "right" });
    doc.fillColor(muted).font(font).fontSize(9).text(orderDate(order?.created_at), x + pageWidth - 220, y + 24, { width: 220, align: "right" });
    doc.text("Рязань", x + pageWidth - 220, y + 38, { width: 220, align: "right" });

    y += 60;
    doc.moveTo(x, y).lineTo(x + pageWidth, y).lineWidth(1).strokeColor(line).stroke();
    y += 14;

    const leftW = Math.floor(pageWidth * 0.56);
    const rightX = x + leftW + 20;
    const rightW = pageWidth - leftW - 20;
    const pair = (label, value, px, py, w) => {
      doc.fillColor(muted).font(font).fontSize(8.5).text(label.toUpperCase(), px, py, { width: w });
      doc.fillColor(ink).font(fontBold).fontSize(10.5).text(clean(value), px, py + 12, { width: w });
    };

    pair("Клиент", order?.recipient_name, x, y, leftW);
    pair("Телефон", order?.recipient_phone, rightX, y, rightW);
    y += 40;
    pair("Доставка", [order?.delivery_city, order?.delivery_address].filter(Boolean).join(", ") || "Самовывоз / уточняется", x, y, leftW);
    pair("Оплата", order?.payment_label || "Наличными при получении", rightX, y, rightW);
    y += 48;

    if (supplierOrders.length) {
      doc.fillColor(muted).font(font).fontSize(8.5).text("ПОСТАВКА", x, y);
      doc.fillColor(ink).font(fontBold).fontSize(9.5).text(
        [...new Set(supplierOrders.map((v) => String(v || "").trim()).filter(Boolean))]
          .map((n) => "PartGrade №" + n).join(" · "),
        x + 74, y - 1, { width: pageWidth - 74 }
      );
      y += 24;
    }

    const cols = [28, 108, 211, 40, 76, 84];
    const headers = ["№", "Бренд / артикул", "Наименование", "Кол-во", "Цена", "Сумма"];
    const tableX = x;

    function drawHeader() {
      doc.fillColor("#F4F6F8").rect(tableX, y, pageWidth, 24).fill();
      let cx = tableX;
      headers.forEach((h, i) => {
        doc.fillColor(muted).font(fontBold).fontSize(8).text(h, cx + 5, y + 8, {
          width: cols[i] - 10, align: i >= 3 ? "right" : "left"
        });
        cx += cols[i];
      });
      y += 24;
    }
    function ensureSpace(height) {
      if (y + height <= doc.page.height - 72) return;
      doc.addPage({ size: "A4", margin: 36 });
      y = 40;
      doc.fillColor(ink).font(fontBold).fontSize(12).text("ZapFormat · " + orderNo, x, y);
      y += 24;
      drawHeader();
    }

    drawHeader();
    (Array.isArray(items) ? items : []).forEach((item, index) => {
      const desc = clean(item?.description, "Автозапчасть");
      const title = [item?.brand, item?.article].filter(Boolean).map(String).join("\n");
      const qty = Math.max(1, Number(item?.quantity || 1));
      const price = Number(item?.unit_price || 0);
      const total = qty * price;
      const h1 = doc.heightOfString(title, { width: cols[1] - 10 });
      const h2 = doc.heightOfString(desc, { width: cols[2] - 10 });
      const rowH = Math.max(34, Math.ceil(Math.max(h1, h2)) + 14);
      ensureSpace(rowH);

      let cx = tableX;
      const cells = [String(index + 1), title, desc, String(qty), rub(price), rub(total)];
      cells.forEach((value, i) => {
        doc.fillColor(ink).font(i === 1 ? fontBold : font).fontSize(9).text(value, cx + 5, y + 8, {
          width: cols[i] - 10, align: i >= 3 ? "right" : "left"
        });
        cx += cols[i];
      });
      doc.moveTo(tableX, y + rowH).lineTo(tableX + pageWidth, y + rowH).lineWidth(0.6).strokeColor(line).stroke();
      y += rowH;
    });

    y += 14;
    doc.fillColor(muted).font(font).fontSize(9).text("ИТОГО", x + pageWidth - 240, y + 3, { width: 90, align: "right" });
    doc.fillColor(ink).font(fontBold).fontSize(18).text(rub(order?.total_amount), x + pageWidth - 140, y, { width: 140, align: "right" });
    y += 36;

    if (order?.comment) {
      ensureSpace(48);
      doc.fillColor(muted).font(font).fontSize(8.5).text("КОММЕНТАРИЙ К ЗАКАЗУ", x, y);
      doc.fillColor(ink).font(font).fontSize(9.5).text(clean(order.comment), x, y + 13, { width: pageWidth });
      y += 44;
    }

    ensureSpace(74);
    doc.moveTo(x, y).lineTo(x + pageWidth, y).lineWidth(1).strokeColor(line).stroke();
    y += 18;
    const signW = (pageWidth - 36) / 2;
    doc.fillColor(muted).font(font).fontSize(8).text("СОБРАЛ / ПРОВЕРИЛ", x, y, { width: signW });
    doc.text("ПОЛУЧИЛ КЛИЕНТ", x + signW + 36, y, { width: signW });
    doc.moveTo(x, y + 32).lineTo(x + signW, y + 32).strokeColor(line).stroke();
    doc.moveTo(x + signW + 36, y + 32).lineTo(x + pageWidth, y + 32).strokeColor(line).stroke();

    const footerY = doc.page.height - 38;
    doc.fillColor(muted).font(font).fontSize(7.5).text(
      test
        ? "Тестовая заказ-накладная ZapFormat. Не является кассовым чеком."
        : "Документ заказа ZapFormat. Не является кассовым чеком. Оплата - наличными при получении.",
      x, footerY, { width: pageWidth, align: "center" }
    );
    doc.end();
  });
}

module.exports = { createOrderInvoicePdf };
