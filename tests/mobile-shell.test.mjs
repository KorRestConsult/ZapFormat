import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root=resolve(import.meta.dirname,"..");
const html=readFileSync(resolve(root,"index.html"),"utf8");
const js=readFileSync(resolve(root,"app.js"),"utf8");
const css=readFileSync(resolve(root,"premium.css"),"utf8");

test("storefront uses one brand header without redundant footer",()=>{
  assert.match(html,/class="topbar"/);
  assert.doesNotMatch(html,/<footer\b/);
  assert.doesNotMatch(html,/site-footer-brand/);
});
test("mobile customer entry can return to catalog without losing auth controls",()=>{
  assert.match(html,/id="sessionEntryButton"[^>]*data-route="auth"/);
  assert.match(html,/id="authHomeButton"[^>]*data-route="home"/);
  assert.match(css,/body\.auth-route #authHomeButton\{display:inline-flex!important\}/);
  assert.match(css,/body\.auth-route #sessionEntryButton\{display:none!important\}/);
  assert.match(js,/headerStatus\.textContent=sessionUser\?/);
  assert.match(js,/:"Войти"/);
});
test("mobile forms preserve real authentication and verification elements",()=>{
  for(const id of ["loginForm","emailRegisterForm","forgotForm","authStatus","loginPassword","emailRegisterStart","emailRegisterVerify"]){
    assert.ok(html.includes("id=\""+id+"\""),id);
  }
  assert.match(css,/body\.auth-route #view-auth \.auth-card/);
  assert.match(css,/scroll-behavior:auto!important/);
  assert.match(css,/min-height:100dvh/);
});
test("home mobile layout keeps search and bottom navigation",()=>{
  assert.match(html,/id="searchForm"/);
  assert.match(html,/class="mobile-nav"/);
  assert.match(css,/body:has\(#view-home\.active\) main/);
});
