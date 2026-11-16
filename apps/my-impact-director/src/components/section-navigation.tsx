"use client";
import { useEffect, useRef, useState } from "react";
import { sectionsFor } from "@/lib/navigation";
export function SectionNavigation({ path }: { path: string }) {
  const items = sectionsFor(path),
    bar = useRef<HTMLElement>(null);
  const [active, setActive] = useState(items[0]?.id || "");
  useEffect(() => {
    const el = bar.current;
    if (!el) {
      document.documentElement.style.setProperty("--section-nav-height", "0px");
      return;
    }
    const measure = () =>
      document.documentElement.style.setProperty(
        "--section-nav-height",
        `${el.getBoundingClientRect().height}px`,
      );
    measure();
    const size = new ResizeObserver(measure);
    size.observe(el);
    return () => {
      size.disconnect();
      document.documentElement.style.setProperty("--section-nav-height", "0px");
    };
  }, [items]);
  useEffect(() => {
    if (!items.length) return;
    const targets = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    let observer: IntersectionObserver | undefined;
    const update = () => {
      const top = (bar.current?.getBoundingClientRect().bottom || 0) + 48;
      const passed = targets.filter(
        (el) => el.getBoundingClientRect().top <= top,
      );
      // A short final section may never reach the observation band because
      // the document cannot scroll any further. It is still the current section.
      const atEnd =
        Math.ceil(scrollY + innerHeight) >=
        document.documentElement.scrollHeight - 2;
      setActive(
        (atEnd
          ? targets[targets.length - 1]
          : passed[passed.length - 1] || targets[0]
        )?.id || "",
      );
    };
    const observe = () => {
      observer?.disconnect();
      const edge = Math.round(
        (bar.current?.getBoundingClientRect().bottom || 0) + 48,
      );
      observer = new IntersectionObserver(update, {
        rootMargin: `-${edge}px 0px -${Math.max(0, innerHeight - edge - 48)}px 0px`,
        threshold: 0,
      });
      targets.forEach((el) => observer!.observe(el));
      update();
    };
    const resize = new ResizeObserver(observe);
    if (bar.current) resize.observe(bar.current);
    const header = document.querySelector("header.site-header");
    if (header) resize.observe(header);
    // Recompute the observation band when orientation or viewport height changes.
    window.addEventListener("resize", observe);
    window.addEventListener("hashchange", update);
    let wasAtEnd = false;
    const endOfPage = () => {
      const atEnd =
        Math.ceil(scrollY + innerHeight) >=
        document.documentElement.scrollHeight - 2;
      if (atEnd || wasAtEnd) update();
      wasAtEnd = atEnd;
    };
    window.addEventListener("scroll", endOfPage, { passive: true });
    observe();
    return () => {
      observer?.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", observe);
      window.removeEventListener("hashchange", update);
      window.removeEventListener("scroll", endOfPage);
    };
  }, [path, items]);
  useEffect(() => {
    const strip = bar.current,
      link = strip?.querySelector<HTMLAnchorElement>(`[href="#${active}"]`);
    if (!strip || !link) return;
    const s = strip.getBoundingClientRect(),
      r = link.getBoundingClientRect();
    if (r.left < s.left || r.right > s.right)
      strip.scrollTo({
        left: link.offsetLeft - (strip.clientWidth - link.offsetWidth) / 2,
        behavior: "instant",
      });
  }, [active]);
  if (!items.length) return null;
  return (
    <nav
      ref={bar}
      className="section-navigation"
      aria-label="Sections on this page"
    >
      <span className="section-nav-label" aria-hidden="true">
        ON THIS PAGE
      </span>
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          aria-current={active === i.id ? "location" : undefined}
          onClick={(e) => {
            const target = document.getElementById(i.id);
            if (!target) return;
            e.preventDefault();
            history.pushState(null, "", `#${i.id}`);
            setActive(i.id);
            target.scrollIntoView({
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
              block: "start",
            });
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }}
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}
