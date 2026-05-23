/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode by default/manually via class
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        crm: {
          dark: 'rgb(var(--color-bg-dark) / <alpha-value>)',
          darker: 'rgb(var(--color-bg-darker) / <alpha-value>)',
          card: 'rgb(var(--color-bg-card) / <alpha-value>)',
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          primaryHover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          textMuted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(to right bottom, #0f172a, #1e293b, #0f172a)',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}
