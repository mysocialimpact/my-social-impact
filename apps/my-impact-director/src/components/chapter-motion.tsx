"use client";
import { useEffect } from "react";

/** Progressive enhancement: content stays visible without JS or observers. */
export function ChapterMotion() {
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !("IntersectionObserver" in window)) return;
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (preference.matches) continue;
          const animation = entry.target.animate(
            [
              { opacity: 0.65, transform: "translateY(12px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 320, easing: "cubic-bezier(.2,.7,.2,1)" },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(".creative-home [data-reveal]")
      .forEach((el) => observer.observe(el));
    const stop = () => {
      if (preference.matches) {
        observer.disconnect();
        animations.forEach((a) => a.cancel());
      }
    };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
      preference.removeEventListener("change", stop);
    };
  }, []);
  return null;
}
