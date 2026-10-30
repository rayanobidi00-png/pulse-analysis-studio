/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        soft: 'var(--soft)',
        teal: 'var(--teal)',
        coral: 'var(--coral)',
        amber: 'var(--amber)',
        violet: 'var(--violet)',
        sky: 'var(--sky)',
        tint: 'var(--tint)',
        'coral-tint': 'var(--coral-tint)',
        code: 'var(--code-bg)',
        band: 'var(--band)',
      },
      fontFamily: {
        display: ['"Source Serif 4 Variable"', 'Georgia', '"IBM Plex Sans Arabic"', 'serif'],
        body: ['"IBM Plex Sans"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        ar: ['"IBM Plex Sans Arabic"', 'Tahoma', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { card: '8px' },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.05)' },
    },
  },
  plugins: [],
};
