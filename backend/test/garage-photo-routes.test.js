"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {decodeVehicleJpeg, MAX_VEHICLE_PHOTO_BYTES, registerGaragePhotoRoutes} = require("../src/garage-photo-routes");

test("a small JPEG can be stored, bad or oversized data cannot",()=>{
  const good = Buffer.from([0xff,0xd8,0x11,0x22,0xff,0xd9]);
  assert.deepEqual(decodeVehicleJpeg(good.toString("base64")),good);
  assert.equal(decodeVehicleJpeg(Buffer.from("<svg/>").toString("base64")),null);
  assert.equal(decodeVehicleJpeg("!!!"),null);
  assert.equal(decodeVehicleJpeg(Buffer.concat([good, Buffer.alloc(MAX_VEHICLE_PHOTO_BYTES)]).toString("base64")),null);
});

test("vehicle photo routes require authentication and have a separate write rate-limit",()=>{
  const endpoints=[];
  const app={
    get(...args){endpoints.push({verb:"GET",args});},
    put(...args){endpoints.push({verb:"PUT",args});},
    delete(...args){endpoints.push({verb:"DELETE",args});}
  };
  const requireUser=(_r,_s,next)=>next();
  const rateLimit=()=> (_r,_s,next)=>next();
  registerGaragePhotoRoutes({app,pool:{},requireUser,rateLimit});
  assert.deepEqual(endpoints.map(e=>e.verb),["GET","PUT","DELETE"]);
  for(const e of endpoints) {
    assert.equal(e.args[0],"/api/garage/vehicles/:vehicleId/photo");
    assert.equal(e.args[1],requireUser);
  }
});

test("production release installs private vehicle photo storage before API starts",()=>{
  const fs=require("node:fs");
  const migration=fs.readFileSync(require("node:path").join(__dirname,"../db/018_vehicle_photos.sql"),"utf8");
  const release=fs.readFileSync(require("node:path").join(__dirname,"../deploy/release-live-catalog.sh"),"utf8");
  assert.match(migration,/CREATE TABLE IF NOT EXISTS vehicle_photos/);
  assert.match(migration,/vehicle_id uuid PRIMARY KEY REFERENCES vehicles\(id\)/);
  assert.match(migration,/image_data bytea NOT NULL/);
  assert.match(release,/database_migrations[\s\S]*?db\/018_vehicle_photos\.sql[\s\S]*?service_restart/);
});
