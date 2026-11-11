import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'Cascadia Mono', 'Consolas', 'monospace'],
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
      },
      colors: {
        obsidian: 'var(--obsidian)',
        panel: 'var(--panel)',
        raised: 'var(--panel-raised)',
        well: 'var(--well)',
        hairline: 'var(--hairline)',
        'hairline-strong': 'var(--hairline-strong)',
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        amber: {
          DEFAULT: 'var(--amber)',
          dim: 'var(--amber-dim)',
        },
        cryo: 'var(--cryo)',
        violet: 'var(--violet)',
        alarm: 'var(--alarm)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
    },
  },
  plugins: [],
};

export default config;
