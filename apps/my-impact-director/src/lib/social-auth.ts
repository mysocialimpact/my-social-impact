import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { PostgresDialect, type PostgresPool } from "kysely";
import { importPKCS8, SignJWT } from "jose";
import { database } from "./db";
import { AppError } from "./security";

export const AUTH_PREFIX = "mid-auth";
export function socialConfigured() {
  return {
    google: !!(
      process.env.AUTH_SECRET &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET
    ),
    apple: !!(
      process.env.AUTH_SECRET &&
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
    ),
  };
}

export function authOrigin(req: Request) {
  const origin = new URL(req.url).origin;
  const allowed = [
    "https://www.myimpactdirector.com",
    "https://myimpactdirector.com",
    process.env.APP_ORIGIN,
    process.env.AUTH_PREVIEW_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined,
  ].filter((value): value is string => !!value);
  if (!allowed.includes(origin))
    throw new AppError(403, "Please sign in from My Impact Director.");
  return origin;
}

export async function appleClientSecret(settings: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}) {
  const key = await importPKCS8(
    settings.privateKey.replaceAll("\\n", "\n"),
    "ES256",
  );
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: settings.keyId })
    .setIssuer(settings.teamId)
    .setSubject(settings.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}

async function buildAuth(origin: string) {
  const ready = socialConfigured();
  const socialProviders = {
    ...(ready.google
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {}),
    ...(ready.apple
      ? {
          apple: {
            clientId: process.env.APPLE_CLIENT_ID!,
            clientSecret: await appleClientSecret({
              clientId: process.env.APPLE_CLIENT_ID!,
              teamId: process.env.APPLE_TEAM_ID!,
              keyId: process.env.APPLE_KEY_ID!,
              privateKey: process.env.APPLE_PRIVATE_KEY!,
            }),
          },
        }
      : {}),
  };
  return betterAuth({
    appName: "My Impact Director",
    secret: process.env.AUTH_SECRET!,
    baseURL: origin,
    basePath: "/api/auth",
    trustedOrigins: [origin],
    database: {
      dialect: new PostgresDialect({
        pool: database() as unknown as PostgresPool,
      }),
      type: "postgres",
      schemaName: "director",
    },
    user: { modelName: "auth_users" },
    session: {
      modelName: "auth_sessions",
      expiresIn: 30 * 86400,
      updateAge: 86400,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: "auth_accounts",
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        requireLocalEmailVerified: true,
        trustedProviders: [],
        allowDifferentEmails: true,
        updateUserInfoOnLink: false,
      },
    },
    verification: { modelName: "auth_verifications" },
    emailAndPassword: { enabled: false },
    socialProviders,
    // The route uses durable, HMAC-pseudonymised limits. Better Auth's IP
    // limiter is disabled alongside raw session-IP collection.
    rateLimit: { enabled: false },
    advanced: {
      cookiePrefix: AUTH_PREFIX,
      useSecureCookies: origin.startsWith("https://"),
      ipAddress: { disableIpTracking: true },
    },
    onAPIError: { errorURL: `${origin}/login?auth_error=1` },
    plugins: [nextCookies()],
  });
}

type SocialAuth = Awaited<ReturnType<typeof buildAuth>>;
const instances = new Map<
  string,
  { until: number; auth: Promise<SocialAuth> }
>();
export function getSocialAuth(req: Request) {
  if (!process.env.AUTH_SECRET)
    throw new AppError(
      503,
      "Social sign-in is temporarily unavailable. Please continue with email.",
    );
  const origin = authOrigin(req),
    current = instances.get(origin);
  if (current && current.until > Date.now()) return current.auth;
  const auth = buildAuth(origin);
  instances.set(origin, { until: Date.now() + 5 * 60000, auth });
  auth.catch(() => instances.delete(origin));
  return auth;
}

export function hasSocialCookie(req: Request) {
  return /(?:^|;\s*)(?:__Secure-)?mid-auth\.session_token=/.test(
    req.headers.get("cookie") || "",
  );
}
