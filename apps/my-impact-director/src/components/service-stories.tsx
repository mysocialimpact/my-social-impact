import { Arrow } from "./icons";
import Link from "next/link";
export function ServiceStories() {
  return (
    <div className="service-lines">
      <Link href="/services/discussion">
        <span>01</span>
        <div>
          <h3>Let’s discuss your report.</h3>
          <p>Free introductory conversation. No obligation.</p>
        </div>
        <Arrow diagonal />
      </Link>
      <Link href="/services/improvement">
        <span>02</span>
        <div>
          <h3>Improve your existing report.</h3>
          <p>Creative improvements from £500, with scope agreed.</p>
        </div>
        <Arrow diagonal />
      </Link>
      <Link href="/services/preparation">
        <span>03</span>
        <div>
          <h3>Create an impact report.</h3>
          <p>From £1,000 for an appropriately scoped report.</p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
      <Link href="/services/digitisation">
        <span>04</span>
        <div>
          <h3>Digitise your report.</h3>
          <p>Digital starter from £500. Larger builds quoted separately.</p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
      <Link href="/#human-support">
        <span>05</span>
        <div>
          <h3>Ongoing impact management.</h3>
          <p>
            Supported from £149, Director from £495 and Bespoke from £1,500 per
            month.
          </p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
    </div>
  );
}
