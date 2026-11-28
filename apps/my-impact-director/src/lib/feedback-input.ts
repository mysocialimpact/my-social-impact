import { z } from "zod";
import { services } from "./services";

const publicPages = new Set([
  "/",
  "/review",
  "/reviews",
  "/shared",
  "/services",
  "/methodology",
  "/feedback",
  "/privacy",
  "/terms",
  "/contact",
  "/account",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/your-impact-director",
]);
export function feedbackPage(path: string) {
  if (publicPages.has(path)) return path;
  if (path.startsWith("/reviews/")) return "/reviews";
  if (path.startsWith("/services/") && Object.hasOwn(services, path.slice(10)))
    return path;
  if (/^\/methodology\/impact-report-excellence(?:\/v[\d-]+)?$/.test(path))
    return path;
  return "/feedback";
}
export const feedbackInput = z
  .object({
    requestId: z.uuid().optional(),
    rating: z.number().int().min(1).max(5).nullable().default(null),
    comment: z.string().trim().max(3000).default(""),
    page: z
      .string()
      .max(200)
      .regex(/^\/(?!\/)[^?#\\\s]*$/)
      .transform(feedbackPage),
    email: z.union([z.email().max(254), z.literal("")]).default(""),
    consent: z.boolean().default(false),
    website: z.string().max(200).default(""),
    reviewId: z.uuid().optional(),
    sharedToken: z.string().max(82).optional(),
    section: z
      .string()
      .max(65)
      .regex(
        /^(?:|score|finding|clarity|usability|criterion-[.a-zA-Z0-9_-]{1,50})$/,
      )
      .default(""),
  })
  .strict()
  .refine((v) => !!v.rating || !!v.comment)
  .refine((v) => !!v.email === v.consent);
