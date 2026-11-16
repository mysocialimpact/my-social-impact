"use client";
import { useEffect, useState } from "react";
import { api } from "./session";
import { ReviewResults } from "./review-results";
import type { ReviewResult } from "@/lib/pipeline";
export function SharedReview() {
  const [data, setData] = useState<{
      title: string;
      result: ReviewResult;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", "/shared");
    api("/api/shared", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      {error ? (
        <div role="alert" className="alert">
          {error}
        </div>
      ) : data ? (
        <>
          <p className="eyebrow">SHARED ASSESSMENT · READ ONLY</p>
          <h1>{data.title}</h1>
          <p>
            The owner shared this assessment and its quoted evidence. The
            original private document is not included.
          </p>
          <ReviewResults id="" admin result={data.result} />
        </>
      ) : (
        <p role="status">Opening shared assessment…</p>
      )}
    </>
  );
}
