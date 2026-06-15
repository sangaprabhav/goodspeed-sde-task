/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        main: 'var(--bg-main)',
        sidebar: 'var(--bg-sidebar)',
        input: 'var(--bg-input)',
        border: 'var(--border)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
      },
    },
  },
  plugins: [],
};
