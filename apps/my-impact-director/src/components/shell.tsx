import Link from "next/link";
import { Mark, Arrow } from "./icons";
export function Header() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="parent-line">
        A product brought to you by{" "}
        <a href="https://mysocialimpact.org">
          My Social Impact <span aria-hidden="true">↗</span>
        </a>
      </div>
      <header className="header">
        <Link href="/" className="brand" aria-label="My Impact Director home">
          <Mark />
          <span>
            my impact
            <span className="brand-second">
              director<span className="brand-dot">.</span>
            </span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/methodology">Our methodology</Link>
          <Link href="/services">Expert help</Link>
          <Link href="/reviews" className="nav-account">
            My reviews <Arrow />
          </Link>
        </nav>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <Link href="/" className="brand">
          <Mark />
          <span>
            my impact<span className="brand-second">director.</span>
          </span>
        </Link>
        <p>
          Good intentions deserve
          <br />
          good evidence.
        </p>
      </div>
      <div className="footer-links">
        <div>
          Developed by{" "}
          <a href="https://mysocialimpact.org">My Social Impact ↗</a>
          <br />
          Built by <a href="https://www.theideasshed.com/">The Ideas Shed ↗</a>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/methodology">Methodology</Link>
          <Link href="/services">Professional services</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms & accessibility</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} My Social Impact</span>
        <span>Automated insight. Professional judgement still matters.</span>
      </div>
    </footer>
  );
}
export function PageIntro({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1>
      {children && <div className="intro-copy">{children}</div>}
    </div>
  );
}
