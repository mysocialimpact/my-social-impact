"use client";
import { Arrow } from "./icons";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
      <header className="site-header campaign-header">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Image
            src="/brand/my-impact-director.png"
            alt="My Impact Director"
            width={2171}
            height={724}
            sizes="(max-width: 700px) 164px, 222px"
            priority
          />
        </Link>
        <a className="header-attribution" href="https://mysocialimpact.org">
          By{" "}
          <strong>
            My Social Impact <Arrow diagonal />
          </strong>
        </a>
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
            Saved reports
          </Link>
        </nav>
        <Link
          href="/#upload"
          className="header-review"
          onClick={() => setOpen(false)}
        >
          Review for free{" "}
          <span aria-hidden="true">
            <Arrow diagonal />
          </span>
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
