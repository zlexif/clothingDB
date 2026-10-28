'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/utils';

export interface TourStep {
  target?: string;
  title: string;
  body: React.ReactNode;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 380;
const GAP = 16;

function place(r: Rect | null, cardH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!r || vw < 640) {
    return r
      ? { left: 16, top: vh - cardH - 16, width: vw - 32 }
      : {
          left: (vw - Math.min(CARD_W + 80, vw - 32)) / 2,
          top: (vh - cardH) / 2,
          width: Math.min(CARD_W + 80, vw - 32),
        };
  }
  const clampTop = (t: number) => Math.min(Math.max(16, t), vh - cardH - 16);
  if (r.left + r.width + GAP + CARD_W + 16 <= vw)
    return { left: r.left + r.width + GAP, top: clampTop(r.top), width: CARD_W };
  if (r.left - GAP - CARD_W >= 16) return { left: r.left - GAP - CARD_W, top: clampTop(r.top), width: CARD_W };
  const left = Math.min(Math.max(16, r.left + r.width / 2 - CARD_W / 2), vw - CARD_W - 16);
  if (r.top + r.height + GAP + cardH + 16 <= vh) return { left, top: r.top + r.height + GAP, width: CARD_W };
  return { left, top: Math.max(16, r.top - GAP - cardH), width: CARD_W };
}

export function Tour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(220);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const measure = useCallback(() => {
    const el = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = step?.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step, measure]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, open, rect]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, onClose, steps.length, i]);

  if (!open || !step || typeof document === 'undefined') return null;
  const pos = place(rect, cardH);

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-1 ring-fg-strong/40 transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ ...rect, boxShadow: '0 0 0 9999px rgba(5,5,5,0.72)' }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(5,5,5,0.72)]" />
      )}
      <div className="fixed inset-0" />

      <div
        ref={cardRef}
        tabIndex={-1}
        className="fixed rounded-lg border border-hairline-strong bg-card p-5 shadow-modal outline-none transition-[top,left] duration-300 ease-out motion-reduce:transition-none"
        style={pos}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-[13px] tabular-nums text-fg-3">
            Step {i + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the walkthrough"
            className="press -mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-full text-fg-3 hover:bg-elevated hover:text-fg"
          >
            <X size={14} />
          </button>
        </div>
        <h2 id="tour-title" className="mt-1 text-heading-sm text-fg-strong">
          {step.title}
        </h2>
        <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-fg-2">{step.body}</div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <div className="mr-auto flex shrink-0 gap-1.5" aria-hidden="true">
            {steps.map((_, n) => (
              <span
                key={n}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  n === i ? 'w-5 bg-ember' : 'w-1.5 bg-raised',
                )}
              />
            ))}
          </div>
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              className="press inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-hairline bg-canvas px-4 text-[14px] font-medium text-fg hover:bg-elevated"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? onClose() : setI(i + 1))}
            className="press inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-4 text-[14px] font-medium text-primary-ink hover:bg-primary/85"
          >
            {last ? 'Start creating' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
