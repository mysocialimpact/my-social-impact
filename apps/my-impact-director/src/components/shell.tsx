import Link from "next/link";
import Image from "next/image";
export { Header } from "./header";
export function Brand({ className = "" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/brand/my-impact-director.png"
      width={2171}
      height={724}
      alt="My Impact Director"
      sizes="(max-width: 700px) 164px, 222px"
    />
  );
}
export function Footer() {
  return (
    <footer className="footer campaign-footer">
      <div className="campaign-width footer-signatures">
        <a href="https://mysocialimpact.org" className="signature-msi">
          <span>Developed by My Social Impact</span>
          <Image
            src="/brand/my-social-impact.png"
            width={1088}
            height={124}
            alt="My Social Impact"
            sizes="260px"
          />
        </a>
        <a href="https://www.theideasshed.com/" className="signature-shed">
          <Image
            src="/brand/the-ideas-shed.png"
            width={1254}
            height={1254}
            alt="The Ideas Shed"
            sizes="76px"
          />
          <span>Built by The Ideas Shed</span>
        </a>
      </div>
      <div className="campaign-width footer-legal">
        <span>© {new Date().getFullYear()} My Social Impact</span>
        <nav aria-label="Footer navigation">
          <Link href="/#contact">Contact Us</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/services">Expert help</Link>
          <Link href="/feedback">Feedback</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms & accessibility</Link>
        </nav>
        <span>Automated insight. Human judgement.</span>
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
