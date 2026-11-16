import { Arrow } from "./icons";
import Link from "next/link";
export function ServiceStories() {
  return (
    <div className="service-lines">
      <Link href="/services/expert-review">
        <span>01</span>
        <div>
          <h3>Expert report review.</h3>
          <p>A professional perspective. A practical way forward.</p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
      <Link href="/services/preparation">
        <span>02</span>
        <div>
          <h3>Create an impact report.</h3>
          <p>Find the evidence. Tell the story that matters.</p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
      <Link href="/services/digitisation">
        <span>03</span>
        <div>
          <h3>Digitise your report.</h3>
          <p>Bring your impact to life beyond the PDF.</p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
      <Link href="/your-impact-director">
        <span>04</span>
        <div>
          <h3>Ongoing impact management.</h3>
          <p>Embed impact into strategy, leadership and daily decisions.</p>
        </div>
        <span aria-hidden="true">
          <Arrow diagonal />
        </span>
      </Link>
    </div>
  );
}
