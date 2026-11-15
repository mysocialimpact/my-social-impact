import Link from "next/link";
import Image from "next/image";
import { Arrow } from "./icons";
export { Header } from "./header";
export function Brand({ className = "" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/brand/my-impact-director.png"
      width={2160}
      height={720}
      alt="My Impact Director"
      sizes="(max-width: 700px) 178px, 240px"
    />
  );
}
export function Footer() {
  return (
    <footer className="footer brand-footer">
      <div className="footer-invitation section">
        <p>
          Good intentions deserve
          <br />
          <em>good evidence.</em>
        </p>
        <Link href="/#upload" className="button primary">
          Review a report — free
          <Arrow />
        </Link>
      </div>
      <div className="footer-partners section">
        <section>
          <p className="eyebrow">Developed by My Social Impact</p>
          <a href="https://mysocialimpact.org" className="footer-msi">
            <Image
              src="/brand/my-social-impact.png"
              width={1088}
              height={124}
              alt="My Social Impact"
              sizes="320px"
            />
          </a>
          <h2>
            Serious about impact.
            <br />
            <em>Human about everything else.</em>
          </h2>
          <a href="https://mysocialimpact.org" className="text-link">
            Meet the people behind the thinking
            <Arrow diagonal />
          </a>
        </section>
        <section>
          <a className="footer-shed" href="https://www.theideasshed.com/">
            <Image
              src="/brand/the-ideas-shed.png"
              width={1254}
              height={1254}
              alt="The Ideas Shed"
              sizes="130px"
            />
            <span>
              Built by
              <br />
              <strong>The Ideas Shed</strong>
            </span>
          </a>
          <h2>
            Good ideas.
            <br />
            <em>Made real.</em>
          </h2>
          <a href="https://www.theideasshed.com/" className="text-link">
            See what’s in the Shed
            <Arrow diagonal />
          </a>
        </section>
      </div>
      <div className="footer-bottom section">
        <span>© {new Date().getFullYear()} My Social Impact</span>
        <nav aria-label="Footer navigation">
          <Link href="/methodology">Methodology</Link>
          <Link href="/services">Expert help</Link>
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
