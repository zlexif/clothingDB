import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'micro',
            'mono',
            'ui',
            'eyebrow',
            'body-sm',
            'body',
            'heading-sm',
            'heading',
            'heading-lg',
            'display-sm',
            'display',
            'step-2',
            'step-3',
            'step-4',
            'step-5',
          ],
        },
      ],
      shadow: [{ shadow: ['window', 'modal', 'popover'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
