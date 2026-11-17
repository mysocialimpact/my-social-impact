import { Intake } from "@/components/intake";
import { ready } from "@/lib/reviews";
export const dynamic = "force-dynamic";
export default function Review() {
  return (
    <div className="start-review-page">
      <section className="workspace-welcome">
        <div className="campaign-width welcome-columns">
          <div>
            <p className="eyebrow">YOUR FIRST JOB. THREE FRESH PERSPECTIVES.</p>
            <h1>
              Your report
              <br />
              starts <em>here.</em>
            </h1>
          </div>
          <div>
            <p className="welcome-lead">
              Let’s discover what your impact report reveals.
            </p>
            <p>
              Create your free account or log in, then drop in your PDF. We’ll
              keep your reviews, progress and results together.
            </p>
            <p>
              One upload. Three complementary assessments. Practical next steps.
            </p>
          </div>
        </div>
      </section>
      <section className="campaign-width start-review-content">
        <div className="start-review-notes">
          <p className="eyebrow">A LITTLE CLARITY. A USEFUL NEXT STEP.</p>
          <h2>
            Give your Impact Director
            <br />
            <em>its first job.</em>
          </h2>
          <p>Your account is free. Your reviews are free.</p>
          <ol>
            <li>Make yourself at home: create an account or log in.</li>
            <li>Drag in your PDF, up to 50 MB and 100 pages.</li>
            <li>Choose a review. Explore its methodology while we work.</li>
          </ol>
          <p>
            Your report stays private. We’ll use your account email for
            delivery, so you only enter it once.
          </p>
        </div>
        <div className="start-review-intake">
          <Intake enabled={ready()} hero />
        </div>
      </section>
    </div>
  );
}
