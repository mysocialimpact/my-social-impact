import { readPublication } from "@/lib/publication-sharing";
import { sameOrigin, readJson, failure } from "@/lib/security";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { token, statusOnly } = z
      .object({
        token: z.string().max(100),
        statusOnly: z.boolean().optional(),
      })
      .strict()
      .parse(await readJson(req, 512));
    return Response.json(await readPublication(token, !!statusOnly), {
      headers: {
        "cache-control": "private,no-store",
        "referrer-policy": "no-referrer",
        "x-robots-tag": "noindex, noarchive",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
