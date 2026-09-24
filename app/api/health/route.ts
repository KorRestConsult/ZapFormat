export async function GET() {
  return Response.json({
    ok: true,
    service: "parts-ai",
    provider: "partgrade-mock",
    version: "0.2.0"
  });
}
