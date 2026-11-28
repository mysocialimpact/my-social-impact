import Link from "next/link";
import Image from "next/image";
export { Header } from "./header";
export function Brand({ className = "" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/brand/my-impact-director-horizontal.svg"
      width={580}
      height={190}
      alt="My Impact Director"
      sizes="(max-width: 700px) 164px, 222px"
    />
  );
}
export function Footer() {
  return (
    <footer className="signature-footer">
      <div className="signature-inner">
        <p className="signature-statement">
          Good intelligence informs.
          <br />
          <em>Human intelligence transforms.</em>
        </p>
        <div className="signature-pair">
          <a href="https://www.mysocialimpact.org/">
            <span className="signature-credit">
              Developed by My Social Impact
            </span>
            <span className="signature-art">
              <Image
                src="/brand/my-social-impact.png"
                alt="My Social Impact"
                width={1088}
                height={124}
                sizes="280px"
              />
            </span>
            <p>
              Our professional assessment frameworks are developed by My Social
              Impact, bringing strategy, reporting, evidence and human support
              together.
            </p>
            <strong>Explore My Social Impact</strong>
          </a>
          <a href="https://www.theideasshed.com/">
            <span className="signature-credit">Built by The Ideas Shed</span>
            <span className="signature-art shed-art">
              <Image
                src="/brand/the-ideas-shed.png"
                alt="The Ideas Shed"
                width={1254}
                height={1254}
                sizes="96px"
              />
            </span>
            <p>
              The Ideas Shed turns ideas into working websites, software, apps
              and useful AI-powered tools.
            </p>
            <strong>See what else we’re building.</strong>
          </a>
        </div>
        <div className="signature-end">
          <div>
            © {new Date().getFullYear()} My Social Impact
            <br />
            The Ideas Shed Limited · Registered in England and Wales ·{" "}
            <a href="https://find-and-update.company-information.service.gov.uk/company/17380053">
              Company number 17380053
            </a>
          </div>
          <nav aria-label="Footer navigation">
            {[
              ["About", "/about"],
              ["Contact", "/about#contact"],
              ["Methodology", "/methodology"],
              ["Ongoing support", "/#human-support"],
              ["Expert help", "/services"],
              ["Feedback", "/feedback"],
              ["Privacy", "/privacy"],
              ["Terms & accessibility", "/terms"],
            ].map(([name, url]) => (
              <Link key={url} href={url}>
                {name}
              </Link>
            ))}
          </nav>
        </div>
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
