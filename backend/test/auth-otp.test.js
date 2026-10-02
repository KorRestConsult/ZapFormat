const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createOtpCode,
  otpHash,
  otpMatches,
  createSmsRuSender,
  maskPhone
} = require("../src/auth-otp");

test("OTP code is six digits", () => {
  const code = createOtpCode();
  assert.match(code, /^\d{6}$/);
});

test("OTP hash verifies without storing the plain code", () => {
  const secret = "test-secret";
  const id = "challenge-1";
  const hash = otpHash(secret, id, "123456");
  assert.equal(otpMatches(secret, id, "123456", hash), true);
  assert.equal(otpMatches(secret, id, "654321", hash), false);
});

test("SMS.RU sender posts verification message", async () => {
  let captured;
  const sender = createSmsRuSender({
    apiId: "secret-api-id",
    test: true,
    fetchImpl: async (url, options) => {
      captured = { url, options, body: String(options.body) };
      return {
        ok: true,
        async json() {
          return {
            status: "OK",
            status_code: 100,
            sms: {
              "79061234567": { status: "OK", status_code: 100, sms_id: "test-1" }
            }
          };
        }
      };
    }
  });

  const result = await sender({ phone: "+7 (906) 123-45-67", code: "123456" });
  assert.equal(result.provider, "sms.ru");
  assert.equal(result.test, true);
  assert.equal(captured.url, "https://sms.ru/sms/send");
  assert.match(captured.body, /to=79061234567/);
  assert.match(captured.body, /test=1/);
  assert.match(decodeURIComponent(captured.body), /123456/);
});

test("maskPhone does not reveal the full phone", () => {
  assert.equal(maskPhone("+79061234567"), "+79 ••• •••-67");
});
