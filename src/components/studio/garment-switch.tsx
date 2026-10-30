'use client';

import { PersonStanding, Shirt } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

const spring = { type: 'spring', stiffness: 520, damping: 34 } as const;

export function GarmentSwitch({
  on,
  onChange,
  piece,
  pieces,
  onPiece,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  piece: string;
  pieces: string[];
  onPiece: (slot: string) => void;
  label: (slot: string) => string;
}) {
  return (
    <div
      className={cn('rounded-2xl border transition-colors', on ? 'border-ember bg-card' : 'border-hairline bg-card')}
    >
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-canvas">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={on ? 'shirt' : 'ped'}
              initial={{ y: 18, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -18, opacity: 0, scale: 0.7 }}
              transition={spring}
              className={on ? 'text-ember' : 'text-fg-2'}
            >
              {on ? <Shirt size={20} strokeWidth={1.5} /> : <PersonStanding size={20} strokeWidth={1.5} />}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-fg">Only the garment</span>
          <span className="block text-[13px] text-fg-2">
            {on ? 'No body, just the piece' : 'The whole ped is in the shot'}
          </span>
        </span>
        <span
          className={cn(
            'relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200',
            on ? 'bg-ember' : 'bg-outline',
          )}
        >
          <motion.span
            layout
            transition={spring}
            className={cn('absolute top-1 h-4 w-4 rounded-full bg-fg-strong shadow', on ? 'right-1' : 'left-1')}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {on && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 border-t border-hairline px-3 pb-3 pt-2.5">
              <span className="w-full text-[12px] text-fg-3">Which piece</span>
              {pieces.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === piece}
                  onClick={() => onPiece(s)}
                  className={cn(
                    'h-8 rounded-full px-3 text-[13px] transition-colors',
                    s === piece
                      ? 'bg-primary text-primary-ink'
                      : 'border border-hairline bg-canvas text-fg-2 hover:text-fg',
                  )}
                >
                  {label(s)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
