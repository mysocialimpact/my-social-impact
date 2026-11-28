"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { safeReturnPath } from "@/lib/return-path";
import { api } from "@/components/session";
function Complete() {
  const params = useSearchParams(),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/account")
      .then((d) => {
        if (!d.user || !d.user.emailVerified)
          throw new Error(
            "We couldn’t verify your sign-in. Please continue with email.",
          );
        window.location.replace(
          safeReturnPath(params.get("next") || undefined),
        );
      })
      .catch((e) => setError(e.message));
  }, [params]);
  return (
    <section className="section">
      <h1>
        {error
          ? "Let’s try that again."
          : "Welcome. Your workspace is opening."}
      </h1>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <a href="/login">Return to sign in →</a>
        </>
      ) : (
        <p role="status">Restoring your reports securely…</p>
      )}
    </section>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening your account…</p>}>
      <Complete />
    </Suspense>
  );
}
