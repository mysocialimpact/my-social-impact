"use client";
import { useEffect, useState } from "react";
import type { Identity } from "@/lib/auth";
export function useSession() {
  const [user, setUser] = useState<Identity | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      fetch("/api/account", { signal: c.signal, cache: "no-store" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setUser(d.user);
          setError("");
          if (d.user && !d.user.anonymous && !d.user.emailVerified)
            timer = setTimeout(refresh, 5000);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
    };
    refresh();
    window.addEventListener("mid-session-refresh", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      c.abort();
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("mid-session-refresh", refresh);
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
