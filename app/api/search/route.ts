import { partGrade } from "@/lib/partgrade";
import { toPublicOffer } from "@/lib/partgrade/public-offer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const offers = (await partGrade.search(query)).map(toPublicOffer);
  return Response.json({ query, offers });
}
