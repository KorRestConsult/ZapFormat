"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {parseArgs,provisionOwner}=require("../scripts/provision-owner");
const fs=require("node:fs");
const path=require("node:path");

function dbFixture({hasOwner=false,hasIdentity=false}={}) {
  const queries=[];
  let released=false;
  const client={
    async query(sql,values){
      queries.push([sql,values]);
      if(sql.includes("WHERE role = 'owner'"))return {rowCount:Number(hasOwner),rows:hasOwner?[{id:"existing-owner"}]:[]};
      if(sql.includes("SELECT id FROM users WHERE lower(email)"))return {rowCount:Number(hasIdentity),rows:hasIdentity?[{id:"existing-user"}]:[]};
      if(sql.includes("INSERT INTO users"))return {rowCount:1,rows:[{id:"test-uuid",email:values[2],role:"owner"}]};
      return {rows:[],rowCount:0};
    },
    release(){released=true;}
  };
  return {db:{async connect(){return client;}},queries,wasReleased:()=>released};
}

test("owner provisioning requires explicit name and a valid email",()=>{
  assert.deepEqual(parseArgs(["--name","Operator","--email","TEST@Example.com"]),{name:"Operator",email:"test@example.com"});
  assert.throws(()=>parseArgs(["--name","Operator"]),/email are required/);
  assert.throws(()=>parseArgs(["--name","Operator","--email","bad"]),/Invalid owner email/);
  assert.throws(()=>parseArgs(["--name","Operator","--email","test@example.com","--role","owner"]),/Invalid arguments/);
  assert.deepEqual(parseArgs(["--name","Operator","--email","a@b.com","--phone","89161234567"]).phone,"+79161234567");
});

test("bootstrap creates first owner in atomic locked transaction",async()=>{
  const fixture=dbFixture();
  const created=await provisionOwner(fixture.db,{name:"Operator",email:"test@example.com"},"server-generated-strong-secret");
  assert.deepEqual(created,{id:"test-uuid",email:"test@example.com",role:"owner"});
  assert.ok(fixture.queries.some(([sql])=>sql==="BEGIN"));
  assert.ok(fixture.queries.some(([sql])=>sql.includes("pg_advisory_xact_lock")));
  const insert=fixture.queries.find(([sql])=>sql.includes("INSERT INTO users"));
  assert.ok(insert);
  assert.ok(insert[0].includes("'owner'"));
  assert.notEqual(insert[1][4],"server-generated-strong-secret");
  assert.ok(insert[1][4].startsWith("$2"));
  assert.ok(fixture.queries.some(([sql])=>sql==="COMMIT"));
  assert.equal(fixture.wasReleased(),true);
});

test("second owner is rejected without modifying users",async()=>{
  const fixture=dbFixture({hasOwner:true});
  await assert.rejects(provisionOwner(fixture.db,{name:"Operator",email:"test@example.com"},"secret"),/owner_already_exists/);
  assert.ok(fixture.queries.some(([sql])=>sql==="ROLLBACK"));
  assert.ok(!fixture.queries.some(([sql])=>sql.includes("INSERT INTO users")));
  assert.equal(fixture.wasReleased(),true);
});

test("existing customer identity is not silently elevated",async()=>{
  const fixture=dbFixture({hasIdentity:true});
  await assert.rejects(provisionOwner(fixture.db,{name:"Operator",email:"test@example.com"},"secret"),/identity_already_registered/);
  assert.ok(fixture.queries.some(([sql])=>sql==="ROLLBACK"));
  assert.ok(!fixture.queries.some(([sql])=>sql.includes("INSERT INTO users")));
});

test("password change requires previous password and invalidates all sessions",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../src/server.js"),"utf8");
  const part=source.split('app.post("/api/account/password/change"')[1].split('app.post("/api/auth/logout"')[0];
  assert.match(part,/requireUser, authLimiter/);
  assert.match(part,/bcrypt\.compare\(currentPassword, req\.user\.password_hash\)/);
  assert.match(part,/newPassword\.length < 12/);
  assert.match(part,/UPDATE users SET password_hash/);
  assert.match(part,/DELETE FROM user_sessions WHERE user_id/);
  assert.match(part,/reauthenticate: true/);
});
