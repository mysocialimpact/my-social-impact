"use client";
import { useEffect, useState } from "react";
import type { Identity } from "@/lib/auth";
export function useSession() {
  const [user, setUser] = useState<Identity | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/account", { signal: c.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setUser(d.user);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, []);
  return { user, loading, error };
}
export async function api(url: string, init?: RequestInit) {
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch {
    throw new Error(
      "The connection was interrupted. Please try again — your selected report and saved work are safe.",
    );
  }
  const d = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(
      d?.error || "We couldn’t complete this request. Please try again.",
    );
  if (d === null)
    throw new Error("We couldn’t read the response. Please try again.");
  return d;
}
