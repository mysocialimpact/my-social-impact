import { Account } from "@/components/account";
export const metadata = {
  title: "Sign in — My Impact Director",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    auth_error?: string;
    connect?: string;
  }>;
}) {
  const q = await searchParams;
  return (
    <section className="signin-page">
      <div className="signin-story">
        <p className="eyebrow">Your free Impact Director</p>
        <h1>
          Good to
          <br />
          have you <em>here.</em>
        </h1>
        <p>
          One upload. Three perspectives.
          <br />A clearer way forward.
        </p>
        <div className="signin-benefits">
          <p>
            <span>01</span> All your reports, together.
          </p>
          <p>
            <span>02</span> Pick up where you left off.
          </p>
          <p>
            <span>03</span> Private until you choose to share.
          </p>
        </div>
      </div>
      <div className="signin-panel">
        {q.auth_error && (
          <p className="alert error" role="alert">
            Sign-in wasn’t completed. Please try again or continue with email.
          </p>
        )}
        {q.connect && (
          <p className="alert">
            Sign in to the account you want to keep. We’ll connect the workspace
            you just authorised, including its existing reports.
          </p>
        )}
        <Account next={q.next} />
      </div>
    </section>
  );
}
