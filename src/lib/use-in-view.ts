"use client";

import { useEffect, useRef, useState } from "react";

// true once the element has scrolled into view (and stays true) — for
// draw-in animations that should play when the visitor gets there.
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, seen] as const;
}
