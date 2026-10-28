const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        card: token('card'),
        elevated: token('elevated'),
        raised: token('raised'),
        outline: token('outline'),
        hairline: 'rgb(255 255 255 / 0.1)',
        'hairline-strong': 'rgb(255 255 255 / 0.15)',
        primary: { DEFAULT: token('primary'), ink: token('primary-ink') },
        fg: {
          DEFAULT: token('fg'),
          strong: token('fg-strong'),
          2: token('fg-2'),
          3: token('fg-3'),
        },
        icon: token('icon'),
        ember: token('ember'),
        amber: token('amber'),
        forest: token('forest'),
        verdant: token('verdant'),
        crimson: token('crimson'),
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        md: '8px',
        lg: '18px',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Sans"', 'system-ui', 'sans-serif'],
        system: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        micro: ['11px', { lineHeight: '1.45' }],
        mono: ['12px', { lineHeight: '1.67' }],
        ui: ['13px', { lineHeight: '1.5' }],
        eyebrow: ['12px', { lineHeight: '1.63' }],
        'body-sm': ['14px', { lineHeight: '1.5', letterSpacing: '0.14px' }],
        body: ['16px', { lineHeight: '1.5' }],
        'heading-sm': ['22px', { lineHeight: '1.3', letterSpacing: '-0.11px' }],
        heading: ['26px', { lineHeight: '1.25', letterSpacing: '-0.312px' }],
        'heading-lg': ['36px', { lineHeight: '1.2', letterSpacing: '-0.72px' }],
        'display-sm': ['48px', { lineHeight: '1.1', letterSpacing: '-1.2px' }],
        display: ['72px', { lineHeight: '1.1', letterSpacing: '-2.16px' }],
        'step-2': ['17px', { lineHeight: '1.55' }],
        'step-3': ['24px', { lineHeight: '1.25', letterSpacing: '-0.3px' }],
        'step-4': ['clamp(34px, 4vw, 60px)', { lineHeight: '1.04', letterSpacing: '-0.025em' }],
        'step-5': ['clamp(40px, 6.2vw, 92px)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        window: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgb(255 255 255 / 0.1)',
        modal: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgb(255 255 255 / 0.1)',
        popover: '0 0 1rem rgba(0,0,0,0.25), 0 0 0.5rem rgba(0,0,0,0.15)',
      },
      maxWidth: {
        page: '1300px',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};
