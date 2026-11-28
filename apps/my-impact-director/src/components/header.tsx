"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "./session";
import { recordVisit } from "./service-contact";
export function Header() {
  const [open, setOpen] = useState(false),
    path = usePathname(),
    header = useRef<HTMLElement>(null);
  const { user } = useSession(),
    signedIn = !!user && !user.anonymous;
  const inReview = /^\/reviews\/[a-f0-9-]{36}/.test(path);
  useEffect(() => {
    recordVisit();
  }, []);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--header-height",
        `${el.getBoundingClientRect().height}px`,
      );
    measure();
    const o = new ResizeObserver(measure);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  useEffect(() => {
    setOpen(false);
    if (path === "/" && location.hash === "#upload")
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            '#hero-report-file, #upload input[name="email"]',
          )
          ?.focus({ preventScroll: true }),
      );
  }, [path]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header
        ref={header}
        className="site-header campaign-header simple-header"
      >
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <Image
            src="/brand/my-impact-director-horizontal.svg"
            alt="My Impact Director — Home"
            width={580}
            height={190}
            sizes="(max-width:700px) 130px, 194px"
            priority
          />
        </Link>
        <nav
          id="main-nav"
          aria-label="Main navigation"
          className={open ? "is-open" : ""}
        >
          <Link
            href="/contact"
            aria-current={path === "/contact" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Contact
          </Link>
          <Link
            href="/reviews"
            aria-current={path.startsWith("/reviews") ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            My Reports
          </Link>
          <Link
            href={signedIn ? "/account" : "/login"}
            aria-current={
              path === (signedIn ? "/account" : "/login") ? "page" : undefined
            }
            onClick={() => setOpen(false)}
          >
            {signedIn ? "Account" : "Log in"}
          </Link>
          {user?.founder && (
            <Link
              href="/founder"
              aria-current={path === "/founder" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              Founder
            </Link>
          )}
        </nav>
        <Link
          href={inReview ? "/reviews" : "/review"}
          className="header-review"
          onClick={(e) => {
            setOpen(false);
          }}
        >
          {inReview ? "My review workspace" : "Try your first free review"}
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden="true">{open ? "×" : "+"}</span>
        </button>
      </header>
    </>
  );
}
