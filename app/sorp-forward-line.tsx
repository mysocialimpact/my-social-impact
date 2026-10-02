"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import "./sorp-forward-line.css";

const SPEED = 48; // CSS pixels per second, shared by desktop and mobile.

export const SorpScreenContext = createContext("");

/** One shared title band anchors the route, independent of each screen's body. */
export function SorpScreenHero({ children, line = true }: { children: ReactNode; line?: boolean }) {
  const screen = useContext(SorpScreenContext);
  const hero = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const workspace = hero.current?.closest<HTMLElement>(".scr-workspace");
    const navigation = workspace?.parentElement?.querySelector<HTMLElement>(".scr-top");
    if (!workspace || !navigation) return;
    // A wrapped active stage can add a few pixels to the existing navigation.
    // Absorb that in the content gutter, without changing the navigation itself.
    const align = () => workspace.style.setProperty("--scr-nav-extra", `${window.innerWidth > 760 ? Math.max(0, navigation.getBoundingClientRect().height - 47) : 0}px`);
    align();
    const observer = new ResizeObserver(align);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, [screen]);
  return <><header ref={hero} className="scr-screen-hero">{children}</header>{line && <SorpForwardLine screen={screen} />}</>;
}

/** Decorative continuity, never a percentage or a claim of completed work. */
export function SorpForwardLine({ screen, working = false }: { screen: string; working?: boolean }) {
  const path = useRef<SVGPathElement>(null);
  const benefits = screen === "benefits";
  const shaped = working || ["homework", "quick-generating", "generating"].includes(screen);
  const route = benefits ? "M60 58H195C280 58 260 114 350 114H525C610 114 590 170 680 170H920" : shaped
    ? "M0 24H190C225 24 235 30 270 30H440C475 30 485 42 520 42H690C725 42 735 24 770 24H1000"
    : "M0 24H1000";

  useEffect(() => {
    const element = path.current;
    if (!element?.ownerSVGElement) return;
    const measure = () => {
      const transform = element.getScreenCTM();
      if (!transform) return;
      const length = element.getTotalLength();
      let previous = element.getPointAtLength(0).matrixTransform(transform);
      let pixels = 0;
      // Measure the displayed curve, including non-uniform responsive scaling.
      for (let i = 1; i <= 160; i++) {
        const next = element.getPointAtLength(length * i / 160).matrixTransform(transform);
        pixels += Math.hypot(next.x - previous.x, next.y - previous.y);
        previous = next;
      }
      if (!pixels) return;
      const trail = 52 / pixels * 100;
      element.style.setProperty("--forward-trail", String(trail));
      element.style.setProperty("--forward-end", String(-100 - trail));
      element.style.setProperty("--forward-duration", `${(pixels + 52) / SPEED}s`);
      element.dataset.measured = "true";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element.ownerSVGElement);
    return () => observer.disconnect();
  }, [route, screen]);

  return <div className={`scr-forward-line${benefits ? " scr-forward-line--benefits" : ""}`} aria-hidden="true">
    <div className="scr-forward-line-inner">
      <svg viewBox={benefits ? "0 0 1000 220" : "0 0 1000 48"} preserveAspectRatio="none" fill="none">
        <path className="scr-forward-track" d={route} pathLength="100" />
        <path key={screen} ref={path} className="scr-forward-trace" d={route} pathLength="100" />
      </svg>
    </div>
  </div>;
}
