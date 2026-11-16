export type SectionLink = { id: string; label: string };
export const MAIN_LINKS = [
  { href: "/", label: "Home" },
  { href: "/review", label: "Review a Report" },
  { href: "/methodology", label: "Methodology" },
  { href: "/your-impact-director", label: "Your Impact Director" },
  { href: "/contact", label: "Contact" },
  { href: "/reviews", label: "My Reports" },
];
const home: SectionLink[] = [
  { id: "introduction", label: "Introduction" },
  { id: "upload", label: "Free Review" },
  { id: "how-it-works", label: "Three Assessments" },
  { id: "human-support", label: "Human Support" },
  { id: "our-vision", label: "Our Vision" },
  { id: "contact", label: "Contact" },
];
const methodology: SectionLink[] = [
  { id: "overview", label: "Overview" },
  { id: "claims", label: "Claims Code" },
  { id: "excellence", label: "Social Impact Excellence" },
  { id: "impact-edit", label: "The Impact Edit" },
  { id: "scoring", label: "Scoring" },
];
const detail: SectionLink[] = [
  { id: "overview", label: "Overview" },
  { id: "visual-inspection", label: "Visual Inspection" },
  { id: "scoring", label: "Scoring" },
  { id: "criteria", label: "25 Criteria" },
  { id: "limitations", label: "Judgement & Limits" },
];
const support: SectionLink[] = [
  { id: "introduction", label: "Introduction" },
  { id: "human-support", label: "Human Support" },
  { id: "support-pricing", label: "Pricing" },
  { id: "ai", label: "AI" },
  { id: "ai-readiness", label: "AI Readiness" },
  { id: "enquire", label: "Talk to Us" },
];
const none: SectionLink[] = [];
export function sectionsFor(path: string) {
  return path === "/"
    ? home
    : path === "/methodology"
      ? methodology
      : path === "/methodology/impact-report-excellence"
        ? detail
        : path === "/your-impact-director"
          ? support
          : none;
}
export function isPageActive(path: string, href: string) {
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(href + "/");
}
export function pageLabel(path: string) {
  return (
    MAIN_LINKS.find((l) => isPageActive(path, l.href))?.label ||
    (path.startsWith("/services")
      ? "Expert Help"
      : [
            "/login",
            "/register",
            "/account",
            "/verify-email",
            "/forgot-password",
          ].includes(path)
        ? {
            "/login": "Log in",
            "/register": "Create account",
            "/account": "Account",
            "/verify-email": "Confirm email",
            "/forgot-password": "Password recovery",
          }[path] || "Account"
        : path === "/admin"
          ? "Founder Centre"
          : "Information")
  );
}
