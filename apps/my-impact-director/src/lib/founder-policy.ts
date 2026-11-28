export const FOUNDER_OWNER = "founder_marcus_warry";
export const FOUNDER_EMAILS = [
  "marcus@theideasshed.com",
  "marcus@mysocialimpact.org",
  "marcus.warry@gmail.com",
] as const;

export function approvedFounderEmail(email: string) {
  return (FOUNDER_EMAILS as readonly string[]).includes(
    email.trim().toLowerCase(),
  );
}

export function founderProof(email: string, verified: boolean) {
  return verified === true && approvedFounderEmail(email);
}

export function classifyAccount(user: {
  id: string;
  email: string;
  is_anonymous?: boolean;
}) {
  const email = user.email.trim().toLowerCase();
  if (approvedFounderEmail(email))
    return {
      classification: "founder",
      retire: false,
      reason:
        "Approved founder address; verified ownership is required for access.",
    } as const;
  if (
    user.id.startsWith("qa_direct_openai_") ||
    /@(?:[^@]+\.)?(?:example\.(?:invalid|com|org|net)|invalid|test|localhost)$/.test(
      email,
    ) ||
    /^marcus\+mid-(?:qa|reset)-[a-z0-9-]+@(?:mysocialimpact\.org|theideasshed\.com)$/.test(
      email,
    )
  )
    return {
      classification: "test",
      retire: true,
      reason: "Known verification identity or reserved test email domain.",
    } as const;
  return {
    classification: "unclassified",
    retire: false,
    reason:
      "Preserved pending review; names and unverified email strings do not establish whether an account is a test.",
  } as const;
}
