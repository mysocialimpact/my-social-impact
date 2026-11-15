"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section narrow">
      <h1>Something didn’t load.</h1>
      <p className="intro-copy">
        Please try again. Your saved reviews remain private.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
