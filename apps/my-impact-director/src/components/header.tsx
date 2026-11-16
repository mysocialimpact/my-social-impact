"use client";
import { MAIN_LINKS, isPageActive, pageLabel } from "@/lib/navigation";
import { SectionNavigation } from "./section-navigation";
import { Arrow } from "./icons";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
export function Header() {
  const [open, setOpen] = useState(false),
    path = usePathname();
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = header.current;
    if (!el) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--header-height",
        `${el.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
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
      <header ref={header} className="site-header campaign-header">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Image
            src="/brand/my-impact-director-horizontal.svg"
            alt="My Impact Director"
            width={580}
            height={190}
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
          {MAIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isPageActive(path, item.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/review"
            className="mobile-nav-review"
            onClick={() => setOpen(false)}
          >
            Review for free <Arrow diagonal />
          </Link>
        </nav>
        <Link
          href="/reviews#login"
          className="header-login"
          onClick={() => setOpen(false)}
        >
          LOGIN
        </Link>
        <Link
          href="/review"
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
          <span className="mobile-current-page">{pageLabel(path)}</span>
          <span className="mobile-menu-label">
            {open ? "Close" : "Menu"}{" "}
            <span aria-hidden="true">{open ? "×" : "+"}</span>
          </span>
        </button>
      </header>
      <SectionNavigation path={path} />
    </>
  );
}
