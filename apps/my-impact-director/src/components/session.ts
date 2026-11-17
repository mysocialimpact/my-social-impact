"use client";
import { useEffect, useState } from "react";
import type { Identity } from "@/lib/auth";
export function useSession() {
  const [user, setUser] = useState<Identity | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let c: AbortController;
    const refresh = () => {
      c?.abort();
      c = new AbortController();
      const request = c;
      fetch("/api/account", { signal: request.signal })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          if (!request.signal.aborted) {
            setUser(d.user);
            setError("");
          }
        })
        .catch((e) => {
          if (!request.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!request.signal.aborted) setLoading(false);
        });
    };
    refresh();
    window.addEventListener("mid-session-refresh", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      c.abort();
      window.removeEventListener("mid-session-refresh", refresh);
      window.removeEventListener("focus", refresh);
    };
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
