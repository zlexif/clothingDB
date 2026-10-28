'use client';

import { useEffect } from 'react';

export function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      for (const el of els) el.classList.add('is-in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, []);
  return null;
}
