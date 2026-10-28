'use client';

import { useEffect, useState } from 'react';
import { Dither } from '../ui/dither';

const FIELD_RAMP = ['#0a0a0a', '#11130a', '#2b330f', '#5a5a12', '#c2410c', '#ff5c00'];
const LAND_RAMP = ['#0a0a0a', '#1f1f1f', '#9a2400', '#ff5c00', '#ffb347'];

export function HeroField() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide ? (
    <Dither
      mode="field"
      ramp={FIELD_RAMP}
      glows={[
        [0.0, 1.0, 0.34, 0.45, 1.4],
        [1.0, 0.45, 0.22, 0.5, 1.2],
      ]}
      sun={[0.97, 0.66, 0.24]}
    />
  ) : (
    <Dither
      mode="field"
      ramp={FIELD_RAMP}
      glows={[
        [1.0, 0.0, 0.5, 0.25, 1.2],
        [0.0, 1.0, 0.5, 0.2, 1.1],
      ]}
      sun={[1.0, 1.0, 0.09]}
    />
  );
}

export function CtaField() {
  return (
    <Dither
      mode="field"
      motif="threads"
      cell={2}
      ramp={FIELD_RAMP}
      glows={[
        [1.0, 0.7, 0.4, 0.6, 1.3],
        [0.95, 0.0, 0.22, 0.3, 0.8],
      ]}
    />
  );
}

export function AnatomyField() {
  return (
    <Dither
      mode="field"
      motif="folds"
      cell={2}
      ramp={FIELD_RAMP}
      glows={[
        [1.0, 0.0, 0.5, 0.7, 1.35],
        [1.0, 1.0, 0.22, 0.3, 0.9],
      ]}
    />
  );
}

export function SidebarField() {
  return (
    <Dither
      mode="field"
      motif="threads"
      cell={2}
      ramp={FIELD_RAMP}
      glows={[
        [1.05, 0.2, 0.55, 0.9, 1.1],
        [0.7, 1.1, 0.4, 0.5, 0.6],
      ]}
    />
  );
}

export function Landscape({ cell = 3 }: { cell?: number }) {
  return <Dither mode="image" src="/art/landscape.jpg" cell={cell} ramp={LAND_RAMP} tone={[0.22, 0.95, 1.6]} />;
}
