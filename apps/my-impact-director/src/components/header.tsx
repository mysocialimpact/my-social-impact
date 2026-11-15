"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Arrow } from "./icons";
export function Header() {
  const [open, setOpen] = useState(false),
    path = usePathname();
  useEffect(() => {
    setOpen(false);
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
      <header className="site-header">
        <div className="parent-line">
          A product brought to you by{" "}
          <a href="https://mysocialimpact.org">
            My Social Impact
            <Arrow diagonal />
          </a>
        </div>
        <div className="header-row">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <Image
              src="/brand/my-impact-director.png"
              alt="My Impact Director"
              width={2160}
              height={720}
              sizes="(max-width: 700px) 178px, 240px"
              priority
            />
          </Link>
          <button
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Menu"}
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
          <nav
            id="main-nav"
            aria-label="Main navigation"
            className={open ? "is-open" : ""}
          >
            <Link href="/#how-it-works" onClick={() => setOpen(false)}>
              How it works
            </Link>
            <Link href="/methodology" onClick={() => setOpen(false)}>
              Methodology
            </Link>
            <Link href="/services" onClick={() => setOpen(false)}>
              Expert help
            </Link>
            <Link href="/reviews" onClick={() => setOpen(false)}>
              Saved reviews
            </Link>
            <Link
              href="/#upload"
              className="button primary nav-review"
              onClick={() => setOpen(false)}
            >
              Review a report — free
              <Arrow />
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
