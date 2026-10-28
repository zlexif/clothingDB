import type * as React from 'react';
import { cn } from '../../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'amber' | 'forest' | 'link';
export type ButtonSize = 'sm' | 'md' | 'icon';

const base =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent font-medium transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] active:translate-y-px focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-fg-2/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink hover:bg-primary/85',
  secondary: 'border-hairline bg-canvas text-fg hover:bg-elevated',
  ghost: 'text-fg/60 hover:text-fg hover:underline underline-offset-4',
  amber: 'bg-amber text-fg-strong hover:bg-amber/85',
  forest: 'bg-forest text-fg-strong hover:bg-forest/85',
  link: 'link-ember',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[14px] [&_svg]:size-3.5',
  md: 'h-9 px-4 text-[14px] [&_svg]:size-4',
  icon: 'h-8 w-8 text-fg-2 hover:text-fg [&_svg]:size-4',
};

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    base,
    variants[variant],
    variant === 'ghost' || variant === 'link' ? '' : sizes[size],
    (variant === 'ghost' || variant === 'link') && size !== 'icon' ? 'text-body-sm' : '',
    className,
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}
