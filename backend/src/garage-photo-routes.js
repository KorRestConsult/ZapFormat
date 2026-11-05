"use strict";

// Vehicle photos are private. Never expose them as public static assets.
const MAX_VEHICLE_PHOTO_BYTES = 230 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeVehicleJpeg(value) {
  const input = String(value || "");
  if (!input || input.length > Math.ceil(MAX_VEHICLE_PHOTO_BYTES * 4 / 3) + 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(input)) return null;
  const bytes = Buffer.from(input, "base64");
  if (bytes.length < 4 || bytes.length > MAX_VEHICLE_PHOTO_BYTES ||
      bytes.toString("base64") !== input ||
      bytes[0] !== 0xff || bytes[1] !== 0xd8 ||
      bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  return bytes;
}

function registerGaragePhotoRoutes({app, pool, requireUser, rateLimit}) {
  const writeLimit = rateLimit({
    windowMs: 60 * 60 * 1000, limit: 25,
    standardHeaders: "draft-8", legacyHeaders: false
  });
  app.get("/api/garage/vehicles/:vehicleId/photo", requireUser, async(req,res,next)=>{
    try {
      const id = String(req.params.vehicleId || "");
      if (!UUID_RE.test(id)) return res.status(400).json({error:"invalid_vehicle_id"});
      const found = await pool.query(
        "SELECT p.image_data FROM vehicle_photos p JOIN vehicles v ON v.id = p.vehicle_id " +
        "WHERE v.id = $1 AND v.user_id = $2 LIMIT 1", [id, req.user.id]);
      if (!found.rowCount) return res.status(404).json({error:"vehicle_photo_not_found"});
      res.set("Content-Type","image/jpeg");
      res.set("Cache-Control","private, no-store");
      res.set("X-Content-Type-Options","nosniff");
      return res.send(found.rows[0].image_data);
    } catch(error) { next(error); }
  });
  app.put("/api/garage/vehicles/:vehicleId/photo", requireUser, writeLimit, async(req,res,next)=>{
    try {
      const id = String(req.params.vehicleId || "");
      if (!UUID_RE.test(id)) return res.status(400).json({error:"invalid_vehicle_id"});
      const bytes = decodeVehicleJpeg(req.body?.image_base64);
      if (!bytes) return res.status(400).json({error:"invalid_photo_jpeg_or_size"});
      const saved = await pool.query(
        "INSERT INTO vehicle_photos (vehicle_id, user_id, image_data) " +
        "SELECT v.id, v.user_id, $3::bytea FROM vehicles v WHERE v.id = $1 AND v.user_id = $2 " +
        "ON CONFLICT (vehicle_id) DO UPDATE " +
        "SET image_data = EXCLUDED.image_data, updated_at = now() RETURNING vehicle_id",
        [id, req.user.id, bytes]);
      if (!saved.rowCount) return res.status(404).json({error:"vehicle_not_found"});
      res.set("Cache-Control","no-store");
      return res.json({ok:true,vehicle_id:id});
    } catch(error) { next(error); }
  });
  app.delete("/api/garage/vehicles/:vehicleId/photo", requireUser, writeLimit, async(req,res,next)=>{
    try {
      const id = String(req.params.vehicleId || "");
      if (!UUID_RE.test(id)) return res.status(400).json({error:"invalid_vehicle_id"});
      const owned = await pool.query(
        "SELECT 1 FROM vehicles WHERE id = $1 AND user_id = $2 LIMIT 1",
        [id, req.user.id]);
      if (!owned.rowCount) return res.status(404).json({error:"vehicle_not_found"});
      await pool.query("DELETE FROM vehicle_photos WHERE vehicle_id = $1 AND user_id = $2",
        [id,req.user.id]);
      return res.json({ok:true});
    } catch(error) { next(error); }
  });
}

module.exports = { MAX_VEHICLE_PHOTO_BYTES, decodeVehicleJpeg, registerGaragePhotoRoutes };
